import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  navigate: (page: string) => ipcRenderer.send("navigate", page),
  addItem: (data: any) => ipcRenderer.invoke("add-item", data),
  getItems: () => ipcRenderer.invoke("get-items"),
  pullItem: (data: any) => ipcRenderer.invoke("pull-item", data),
  getPullItems: (data: any) => ipcRenderer.invoke("get-pull-items", data),
  showToast: (message: string, success: boolean) => {
    window.postMessage({ type: "show-toast", message, success });
  },
  updateItemQuantity: (data: any) => ipcRenderer.invoke("update-item-quantity", data),
  deleteItem: (item: number) => ipcRenderer.invoke("delete-item", item),
  deleteItemFromTable: (id: string, table: "PulledItem" | "AddedItem") => ipcRenderer.invoke("delete-item-from-table", id, table),
  editItem: (data: any) => ipcRenderer.invoke("edit-item", data),
  exportItems: (tableName: string) => ipcRenderer.invoke("export-items", tableName),
  importItems: () => ipcRenderer.invoke("import-items"),
  addLog: (data: any) => ipcRenderer.invoke("add-log", data),
  getLog: () => ipcRenderer.invoke("get-log"),
  deleteAllLogs: () => ipcRenderer.invoke("delete-all-logs"),
  addNewPr: (data: any) => ipcRenderer.invoke("add-new-pr", data),
  fetchPrDr: (args: any) => ipcRenderer.invoke("fetch-pr-dr", args),
  getUniqueField: (args: any) => ipcRenderer.invoke("get-unique-field", args),
  deleteSelectedItems: (tableName: string, selectedIds: (string | number)[]) => 
    ipcRenderer.invoke("delete-selected-items", { tableName, selectedIds }),
  onLoadPage: (callback: (event: Electron.IpcRendererEvent, page: string) => void) => {
    ipcRenderer.on("load-page", callback);
  }
});

