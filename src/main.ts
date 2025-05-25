import { app, BrowserWindow, ipcMain, Menu, shell, dialog } from "electron";
import fs from "fs";
import path from "path";
import {
  addItem,
  getItems,
  pullItem,
  getPullItems,
  updateItemQuantity,
  editItem,
  deleteItemFromAnyTable,
  addLog,
  getLog,
  deleteAllLogs,
  prisma
} from "./database";
import { execSync } from "child_process";
import * as XLSX from "xlsx";
import {parse} from "csv-parse";
import { nativeTheme } from "electron";
import { importItemsFromFile, importPulledItemsFromFile } from "./utils";

const isDev = !app.isPackaged;

// if (!isDev) {
//   try {
//     console.log("Running Prisma Migration...");
//     const output = execSync("npx prisma migrate deploy", {
//       stdio: "pipe", // Capture logs
//       encoding: "utf-8", // Ensure readable output
//     });
//     console.log("Migration Output:\n", output);
//   } catch (error: any) {
//     console.error("Migration Error:\n", error.message);
//   }
// }

function isoDate(date: string) {
  if (date.length === 16) {
    return new Date(date + ":00");
  }
  return new Date(date);
}

function capitalizeWords(str: string) {
  return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
}

let mainWindow: BrowserWindow | null;
app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    icon: path.join(__dirname, "../assets/icons/cpsc-logo.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  nativeTheme.themeSource = "light";

  mainWindow.loadFile(path.join(app.getAppPath(), "public", "index.html"));

  // mainWindow.maximize();

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
            mainWindow.webContents.send("load-page", "pr.html");
          }
        },
      },
      { type: "separator" },
      {
        label: "Exit",
        role: "quit",
      },
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
    ],
  },
]);

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
            itemData.releasedBy,
        );
        return { success: true, message: "Item successfully added.",  item: item};
    } catch (error: any) {
        return { success: false, message: error.message };
    }
});


ipcMain.handle("update-item-quantity", async (event, data) => {
  try {
    const result = await updateItemQuantity(data.itemId, data.newQuantity, data.updatedBy, data.date, data.deliveredBy);
    return result;
  } catch (error) {
    return { success: false, message: "Failed to update item quantity." };
  }
});

ipcMain.handle("edit-item", async (event, newData) => {
  try {
    return editItem(
      newData.itemId,
      newData.itemCode,
      newData.itemName,
      newData.itemUnit
    )
  } catch (error) {
    return;
  }
})

ipcMain.handle("get-items", async () => {
  try {
    return getItems();
  } catch (error) {
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
    return { success: false, message: item };
  }
});

ipcMain.handle("get-pull-items", async () => {
  try {
    return getPullItems();
  } catch (error) {
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

ipcMain.handle("add-new-pr", async (event, data) => {
  try {
    const prId = await prisma.item.findUnique({
      where: { itemCode: data.itemCode },
      select: {
        id: true,
      },
    })

    if (!prId) {
      return { success: false, message: "Item not found." };
    }

    const newPr = await prisma.purchaseRequest.create({
      data: {
        itemId: Number(prId.id),
        requestedQuantity: data.requestedQuantity,
        requestedBy: data.requestedBy,
        requestedDate: new Date(isoDate(data.requestedDate)),
        },
      include: {
        item: true,
      },
    })

    return {success: true, message: "Purchase Request added.", data: newPr}
  } catch (err: any) {
    return {success: false, message: err.message};
  }
});

ipcMain.handle("fetch-pr-dr", async (event, { tableName, orderBy = "requestedDate", order = "desc" }) => {
  try {
    const tableConfig: Record<string, { model: any, include?: any }> = {
      purchaseRequest: { model: prisma.purchaseRequest, include: { item: true } },
      requestDelivered: { model: prisma.requestDelivered, include: { item: true } },
    };

    const config = tableConfig[tableName];
    if (!config) {
      return { success: false, message: `Invalid table: ${tableName}` };
    }

    const items = await config.model.findMany({
      where: { isDeleted: false },
      include: config.include,
      orderBy: {
        [orderBy]: order,
      },
    });

    return items;
  } catch (error: any) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-unique-field", async (event, { table, field, relation, relationField }) => {
  try {
    const tableMap: Record<string, any> = {
      pulledItem: prisma.pulledItem,
      item: prisma.item,
      purchaseRequest: prisma.purchaseRequest,
      requestDelivered: prisma.requestDelivered,
    };

    const model = tableMap[table];
    if (!model) {
      return { success: false, message: `Invalid table: ${table}` };
    }

    let select: any = {};
    if (field) select[field] = true;
    if (relation && relationField) select[relation] = { select: { [relationField]: true } };

    const results = await model.findMany({
      where: { isDeleted: false },
      distinct: field,
      select,
    });

    let uniqueValues;
    if (relation && relationField) {
      uniqueValues = results
        .map((r: any) => r[relation]?.[relationField])
        .filter((v: any, i: number, arr: any[]) => v !== undefined && arr.indexOf(v) === i);
    } else {
      uniqueValues = results
        .map((r: any) => r[field])
        .filter((v: any, i: number, arr: any[]) => v !== undefined && arr.indexOf(v) === i);
    }

    return uniqueValues;
  } catch (error: any) {
    return { success: false, message: error.message };
  }
});

ipcMain.on("navigate", (event, page) => {
  const filePath = path.join(app.getAppPath(), "public", page);

  if (!fs.existsSync(filePath)) {
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

ipcMain.handle("delete-selected-items", async (event, { tableName, selectedIds }: { tableName: string, selectedIds: (string | number)[] }) => {
  try {
    const validTables = ["item", "pulledItem", "log", "purchaseRequest", "requestDelivered"];
    if (!validTables.includes(tableName)) {
      return { success: false, message: `Invalid table: ${tableName}` };
    }

    if (!selectedIds || selectedIds.length === 0) {
      return { success: false, message: "No items selected." };
    }

    const tablesWithIntIds = ["item", "log"];
    const formattedIds =
      tablesWithIntIds.includes(tableName)
        ? selectedIds.map(id => (typeof id === "string" ? parseInt(id, 10) : id))
        : selectedIds;

    let result;
    if (tableName === "item") {
      result = await (prisma as any)[tableName].updateMany({
        where: {
          id: {
            in: formattedIds
          }
        },
        data: {
          isDeleted: true
        }
      });
    } else {
      result = await (prisma as any)[tableName].deleteMany({
        where: {
          id: {
            in: formattedIds
          }
        }
      });
    }

    if (result.count === 0) {
      return { success: false, message: `No matching records found in ${tableName}.` };
    }

    return { success: true, message: `${result.count} item(s) deleted.` };
  } catch (error) {
    return { success: false, message: `Failed to delete items from ${tableName}. ${error instanceof Error ? error.message : ""}` };
  }
});

ipcMain.handle("delete-item-from-any-table", async (event, id, table) => {
  return await deleteItemFromAnyTable(id, table);
});

ipcMain.handle("import-items-from-file", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Select Excel File",
      filters: [{ name: "Excel Files", extensions: ["xlsx", "xls"] }],
      properties: ["openFile"]
  });
  if (canceled || filePaths.length === 0) {
      return { success: false, message: "No file selected." };
  }
  return await importItemsFromFile(filePaths[0]);
});

ipcMain.handle("import-pulled-items-from-file", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Select Excel File",
    filters: [{ name: "Excel Files", extensions: ["xlsx", "xls"] }],
    properties: ["openFile"],
  });
  if (canceled || filePaths.length === 0) {
    return { success: false, message: "No file selected." };
  }
  return await importPulledItemsFromFile(filePaths[0]);
});