import { app, BrowserWindow, ipcMain, Menu, shell, dialog } from "electron";
import fs from "fs";
import path from "path";
import {
  addItem,
  getItems,
  pullItem,
  getPullItems,
  // updateItemQuantity,
  // deleteItem,
  editItem,
  // deleteItemFromTable,
  // addAddedItem,
  addLog,
  getLog,
  deleteAllLogs,
  // getAddedItems,
  prisma
} from "./database";
import { execSync } from "child_process";
import * as XLSX from "xlsx";
import {parse} from "csv-parse";

const isDev = !app.isPackaged;

if (!isDev) {
  try {
    console.log("Running Prisma Migration...");
    const output = execSync("npx prisma migrate deploy", {
      stdio: "pipe", // Capture logs
      encoding: "utf-8", // Ensure readable output
    });
    console.log("Migration Output:\n", output);
  } catch (error: any) {
    console.error("Migration Error:\n", error.message);
  }
}

function capitalizeWords(str: string) {
  return str
      .toLowerCase() // Convert entire string to lowercase first
      .split(" ") // Split into words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter
      .join(" "); // Join words back into a string
}

let mainWindow: BrowserWindow | null;
app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    icon: path.join(__dirname, "../assets/icons/cpsc-logo.png"), // Set icon path
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // Ensure TypeScript transpiles this correctly
      nodeIntegration: false, // Disable for security
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(app.getAppPath(), "public", "index.html"));

  mainWindow.maximize();

  // Apply the custom menu
  Menu.setApplicationMenu(menu);
});

const menu = Menu.buildFromTemplate([
  {
    label: "File",
    submenu: [
      {
        label: "All stock",
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send("load-page", "home.html");
          }
        },
      },
      {
        label: "Pulled items",
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send("load-page", "pulled.html");
          }
        },
      },
      {
        label: "PR/DRs",
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send("load-page", "prDr.html");
          }
        },
      },
      { type: "separator" },
      {
        label: "New Stock",
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send("load-page", "home.html");
          }
        },
      },
      { type: "separator" }, // Adds a divider
      {
        label: "Exit",
        role: "quit",
      },
    ],
  },
  {
    label: "Edit",
    submenu: [
      { label: "Undo", role: "undo" },
      { label: "Redo", role: "redo" },
      { type: "separator" },
      { label: "Cut", role: "cut" },
      { label: "Copy", role: "copy" },
      { label: "Paste", role: "paste" },
    ],
  },
  {
    label: "View",
    submenu: [
      {
        label: "Reload",
        role: "reload",
      },
      {
        label: "Toggle DevTools",
        role: "toggleDevTools",
      },
    ],
  },
  {
    label: "Help",
    submenu: [
      {
        label: "Developer",
        click: () => {
          shell.openExternal("https://www.facebook.com/a1yag/");
        },
      },
      {
        label: "About",
        click: () => {
          console.log("About clicked!");
        },
      },
    ],
  },
]);

// Handle adding items
ipcMain.handle("add-item", async (event, itemData) => {
    try {
        const item = await addItem(
            itemData.itemCode,
            itemData.itemName,
            itemData.quantity,
            itemData.unit,
            itemData.withdrawn,
            itemData.addedBy,
            itemData.deliveredBy,
            itemData.date,
            itemData.isDelivered,
        );
        return { success: true, message: "Item successfully added.",  item: item};
    } catch (error: any) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle("edit-item", async (event, newData) => {
  try {
    return editItem(
      newData.id,
      newData.itemCode,
      newData.itemName,
      newData.unit
    )
  } catch (error) {
    return;
  }
})

ipcMain.handle("get-items", async () => {
  try {
    return getItems(); // Fetch and return all items
  } catch (error) {
    console.error("Error fetching items:", error);
    return [];
  }
});

ipcMain.handle("pull-item", async (event, pullData) => {
  const item = await pullItem(
    pullData.itemId,
    pullData.releasedQuantity,
    pullData.releasedBy,
    pullData.receivedBy,
    pullData.releasedDate,
  );
  if (item.success) {
    return { success: true, message: "Item successfully pulled.", item: item };
  } else {
    console.log(item);
    return { success: false, message: item }; // Return the error message
  }
});

ipcMain.handle("get-pull-items", async () => {
  try {
    return getPullItems();
  } catch (error) {
    console.error("Error fetching pulled items.", error);
    return [];
  }
});

ipcMain.handle("add-log", async (event, logData) => {
    try {
        return await addLog(
            logData.itemId,
            logData.user,
            logData.log
        )
    } catch (error) {
        return;
    }
})

ipcMain.handle("get-log", async () => {
  try {
    return await getLog();
} catch (error) {
    return;
}
})

ipcMain.handle("delete-all-logs", async () => {
    return await deleteAllLogs();
  });

ipcMain.on("navigate", (event, page) => {
  const filePath = path.join(app.getAppPath(), "public", page);
  console.log("Loading file:", filePath);

  if (!fs.existsSync(filePath)) {
      console.error("File does not exist:", filePath);
      return;
  }

  if (mainWindow) {
      mainWindow.loadFile(filePath);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("export-items", async (event, { tableName, selectedIds }: { tableName: string, selectedIds: (string | number)[] }) => {
    try {
        const validTables = ["item", "pulledItem", "log", "addedItem"];
        if (!validTables.includes(tableName)) {
            return { success: false, message: `Invalid table: ${tableName}` };
        }

        if (!selectedIds || selectedIds.length === 0) {
            return { success: false, message: "No items selected." };
        }

        // Fetch only the selected items
        const data = await (prisma as any)[tableName].findMany({
            where: { id: { in: selectedIds } }
        });

        if (!data.length) {
            return { success: false, message: `No matching data found in ${tableName}.` };
        }

        // Define column mappings for each table
        const columnMappings: Record<string, Record<string, string>> = {
            item: {
                item_code: "Code",
                item_name: "Item",
                quantity: "Quantity",
                unit: "Unit",
                added_by: "Added by",
                date: "Date"
            },
            pulledItem: {
                itemCode: "Code",
                itemName: "Name",
                releasedQuantity: "Quantity",
                unit: "Unit",
                releasedBy: "Released by",
                receivedBy: "Received by",
                releasedDate: "Date"
            },
            addedItem: {
                itemCode: "Code",
                itemName: "Name",
                addedQuantity: "Quantity",
                unit: "Unit",
                addedBy: "Added by",
                addedDate: "Date"
            }
        };

        // Format data by renaming the columns
        const formattedData = data.map(({ id, updated_by, updatedAt, ...rest }: any) => {
            const formattedRow: Record<string, any> = {};
            for (const key in rest) {
                if (columnMappings[tableName]?.[key]) {
                    formattedRow[columnMappings[tableName][key]] = rest[key];
                }
            }
            return formattedRow;
        });

        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, tableName);

        const { filePath } = await dialog.showSaveDialog({
            title: `Save ${tableName}.xlsx`,
            defaultPath: `${tableName}.xlsx`,
            filters: [{ name: "Excel Files", extensions: ["xlsx"] }],
        });

        if (!filePath) return;

        XLSX.writeFile(workbook, filePath);
        return { success: true, message: `${capitalizeWords(tableName)} exported.` };
    } catch (error) {
        console.error("Export error:", error);
        return { success: false, message: `Failed to export ${tableName}.` };
    }
});


ipcMain.handle("import-items", async () => {
  try {
    // Step 1: Open file dialog for selecting CSV or XLSX
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: "Select CSV or XLSX File",
      filters: [
        { name: "CSV & Excel Files", extensions: ["csv", "xlsx"] },
      ],
      properties: ["openFile"],
    });

    if (canceled || filePaths.length === 0) {
      return;
    }

    const filePath = filePaths[0];

    // Step 2: Check file extension
    const fileExtension = filePath.split(".").pop()?.toLowerCase();
    let records: any[] = [];

    if (fileExtension === "csv") {
      // Parse CSV File
      const csvData = fs.readFileSync(filePath, "utf8");
      const parser = parse(csvData, { columns: true, trim: true });

      for await (const record of parser) {
        records.push(formatRecord(record));
      }
    } else if (fileExtension === "xlsx") {
      // Parse XLSX File
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Get first sheet
      const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      records = sheetData.map(formatRecord);
    } else {
      return { success: false, message: "Invalid file format." };
    }

    // Step 3: Insert into database using Prisma
    if (records.length > 0) {
      await prisma.item.createMany({ data: records });
      return { success: true, message: "Items imported." };
    } else {
      return { success: false, message: "No valid data found to import." };
    }
  } catch (error) {
    console.error("Import error:", error);
    return { success: false, message: "Failed to import items." };
  }
});

function formatRecord(record: any) {
  return {
    item_code: record.item_code?.toUpperCase() || "",
    item_name: record.item_name?.trim() || "",
    quantity: Number(record.quantity) || 0,
    unit: record.unit?.trim() || "pcs",
    added_by: record.added_by?.trim() || "Admin",
    date: record.date ? new Date(record.date) : new Date(),
  };
}

ipcMain.handle("delete-selected-items", async (event, { tableName, selectedIds }: { tableName: string, selectedIds: (string | number)[] }) => {
  try {
    const validTables = ["item", "pulledItem", "log", "addedItem"];
    if (!validTables.includes(tableName)) {
      return { success: false, message: `Invalid table: ${tableName} sdds` };
    }

    if (!selectedIds || selectedIds.length === 0) {
      return { success: false, message: "No items selected." };
    }

    // Convert IDs to numbers only for tables that require integer IDs
    const tablesWithIntIds = ["item", "log"]; // Tables that use integer IDs
    const formattedIds =
      tablesWithIntIds.includes(tableName) 
        ? selectedIds.map(id => (typeof id === "string" ? parseInt(id, 10) : id)) // Convert only if needed
        : selectedIds; // Keep as string if table allows string IDs

    // Delete only the selected items
    const result = await (prisma as any)[tableName].updateMany({
      where: {
        id: {
          in: formattedIds
        }
      },
      data: {
        isDeleted: true
      }
    });

    if (result.count === 0) {
      return { success: false, message: `No matching records found in ${tableName}.` };
    }

    return { success: true, message: `${result.count} item(s) deleted.` };
  } catch (error) {
    console.error("Delete error:", error);
    return { success: false, message: `Failed to delete items from ${tableName}.` + (error as Error).message };
  }
});
