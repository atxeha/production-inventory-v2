import * as XLSX from "xlsx";
import fs from "fs";
import { prisma } from "./database";

function parseDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  let date = new Date(value);
  if (!isNaN(date.getTime())) return date;

  if (typeof value === "number" && value > 59) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    date = new Date(excelEpoch.getTime() + (value - 1) * 86400000);
    if (!isNaN(date.getTime())) return date;
  }

  const patterns = [
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  ];

  if (typeof value === "string") {
    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match) {
        let y, m, d, h = 0, min = 0, s = 0;
        if (pattern === patterns[0]) {
          m = parseInt(match[1], 10) - 1;
          d = parseInt(match[2], 10);
          y = parseInt(match[3], 10);
          if (match[3].length === 2) y += y < 50 ? 2000 : 1900;
        } else if (pattern === patterns[1]) {
          y = parseInt(match[1], 10);
          m = parseInt(match[2], 10) - 1;
          d = parseInt(match[3], 10);
        } else {
          d = parseInt(match[1], 10);
          m = parseInt(match[2], 10) - 1;
          y = parseInt(match[3], 10);
        }
        if (match[4]) h = parseInt(match[4], 10);
        if (match[5]) min = parseInt(match[5], 10);
        if (match[6]) s = parseInt(match[6], 10);
        date = new Date(y, m, d, h, min, s);
        if (!isNaN(date.getTime())) return date;
      }
    }
  }

  const parsed = Date.parse(value);
  if (!isNaN(parsed)) return new Date(parsed);

  return null;
}

export async function importItemsFromFile(filePath: string) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    for (const row of rows) {
      const itemData = {
        itemCode: String(row.itemCode || row["Item Code"] || row["Code"]),
        itemName: String(row.itemName || row["Item Name"] || row["Name"]),
        quantity: Number(row.quantity || row["Quantity"] || row["QTY"] || 0),
        unit: String(row.unit || row["Unit"] || "pcs"),
        withdrawn: BigInt(row.withdrawn || row["Withdrawn"] || 0),
        addedBy: String(row.addedBy || row["Added By"] || ""),
        date: parseDate(row.date || row["Date"]) || new Date(),
        updatedBy: row.updatedBy || null,
        updatedOn: parseDate(row.updatedOn || row["Updated On"]) || null,
      };

      await prisma.item.upsert({
        where: { itemCode: itemData.itemCode },
        update: { ...itemData, isDeleted: false },
        create: itemData,
      });
    }

    return { success: true, message: "Import completed." };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function importPulledItemsFromFile(filePath: string) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);
  
      let imported = 0,
        skipped = 0;
      for (const row of rows) {
        const itemCode = String(row.itemCode || row["Item Code"]);
        const item = await prisma.item.findUnique({ where: { itemCode } });
        if (!item) {
          skipped++;
          continue;
        }
  
        const pulledItemData = {
          itemId: item.id,
          releasedQuantity: Number(
            row.releasedQuantity ||
              row["Released Quantity"] ||
              row["Quantity"] ||
              row["QTY"] ||
              0
          ),
          releasedBy: String(row.releasedBy || row["Released By"] || ""),
          receivedBy: String(row.receivedBy || row["Received By"] || ""),
          isDeleted: false,
          releasedDate:
            parseDate(
              row.releasedDate || row["Released Date"] || row["Date"]
            ) || new Date(),
        };
  
        await prisma.pulledItem.create({ data: pulledItemData });
        imported++;
      }
  
      return {
        success: true,
        message: `${imported} rows imported, ${skipped} skipped. `,
      };
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  }

export async function exportItemsToExcel(year: number | undefined | null, outputPath: string) {
  try {
    // Get all items that are not deleted
    const items = await prisma.item.findMany({
      where: { isDeleted: false },
      include: {
        PurchaseRequest: true,
        RequestDelivered: true,
        PulledItem: true,
      },
      orderBy: { itemName: "asc" },
    });

    // Filter and map items for the given year, or all if year is not set
    const filtered = items
      .filter(item => {
        if (!year) return true; // No year filter, include all
        const itemYear = item.date.getFullYear();
        return itemYear === year;
      })
      .map((item, idx) => {
        // Sum PR, RD, PI for the given year or all if year is not set
        const prTotal = item.PurchaseRequest
          .filter(pr => !year || pr.requestedDate.getFullYear() === year)
          .reduce((sum, pr) => sum + Number(pr.requestedQuantity), 0);

        const rdTotal = item.RequestDelivered
          .filter(rd => !year || rd.deliveredDate.getFullYear() === year)
          .reduce((sum, rd) => sum + Number(rd.deliveredQuantity), 0);

        const piTotal = item.PulledItem
          .filter(pi => !year || pi.releasedDate.getFullYear() === year)
          .reduce((sum, pi) => sum + Number(pi.releasedQuantity), 0);

        return {
          "No.": idx + 1,
          "Code": item.itemCode,
          "Item": item.itemName,
          "Unit": item.unit,
          "Stock": item.quantity,
          "Requested": prTotal,
          "Delivered": rdTotal,
          "Withdrawn": piTotal,
          "Date": item.date.toLocaleDateString("en-CA"),
        };
      });

    // Create worksheet and workbook
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Items");

    // Write to file
    XLSX.writeFile(wb, outputPath);

    return { success: true, message: `${filtered.length} items exported.` };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
  }