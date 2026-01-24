import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    // Expose store API via preload
    contextBridge.exposeInMainWorld("api", {
      store: {
        get: (key: string) => ipcRenderer.invoke("store-get", key),
        set: (key: string, value: unknown) => ipcRenderer.invoke("store-set", key, value),
        has: (key: string) => ipcRenderer.invoke("store-has", key),
        delete: (key: string) => ipcRenderer.invoke("store-delete", key),
        reset: (keys?: string[]) => ipcRenderer.invoke("store-reset", keys),
        export: (data: any) => ipcRenderer.invoke("store-export", data),
        import: () => ipcRenderer.invoke("store-import"),
      },
      // Renderer logging API
      log: {
        info: (message: string, ...args: unknown[]) =>
          ipcRenderer.send("renderer-log", "info", message, args),
        warn: (message: string, ...args: unknown[]) =>
          ipcRenderer.send("renderer-log", "warn", message, args),
        error: (message: string, ...args: unknown[]) =>
          ipcRenderer.send("renderer-log", "error", message, args),
        debug: (message: string, ...args: unknown[]) =>
          ipcRenderer.send("renderer-log", "debug", message, args),
      },
      // Google Drive API
      googleDrive: {
        login: () => ipcRenderer.invoke("google-drive-login"),
        getStatus: () => ipcRenderer.invoke("google-drive-status"),
        getFiles: (pageSize?: number) => ipcRenderer.invoke("google-drive-files", pageSize),
        logout: () => ipcRenderer.invoke("google-drive-logout"),
        // 新增 API
        scanAudio: (pageSize?: number) => ipcRenderer.invoke("google-drive-scan", pageSize),
        getStreamInfo: (fileId: string) => ipcRenderer.invoke("google-drive-stream-info", fileId),
        downloadFile: (fileId: string, destPath: string) => 
          ipcRenderer.invoke("google-drive-download", fileId, destPath),
      },
    });
  } catch (error) {
    console.error(error);
  }
}
