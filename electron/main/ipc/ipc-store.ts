import { ipcMain, dialog } from "electron";
import { writeFile, readFile } from "fs/promises";
import { useStore } from "../store";
import type { StoreType } from "../store";
import { appName, appVersion } from "../utils/config";

/**
 * 初始化 store IPC 主进程
 */
const initStoreIpc = (): void => {
  const store = useStore();
  if (!store) return;

  // 获取配置项
  ipcMain.handle("store-get", (_event, key: keyof StoreType) => {
    return store.get(key);
  });

  // 设置配置项
  ipcMain.handle("store-set", (_event, key: keyof StoreType, value: unknown) => {
    store.set(key, value as StoreType[typeof key]);
    return true;
  });

  // 判断配置项是否存在
  ipcMain.handle("store-has", (_event, key: keyof StoreType) => {
    return store.has(key);
  });

  // 删除配置项
  ipcMain.handle("store-delete", (_event, key: keyof StoreType) => {
    store.delete(key);
    return true;
  });

  // 重置配置（支持指定 keys 或全部重置）
  ipcMain.handle("store-reset", (_event, keys?: (keyof StoreType)[]) => {
    if (keys && keys.length > 0) {
      store.reset(...keys);
    } else {
      store.reset();
    }
    return true;
  });

  // 导出配置
  ipcMain.handle("store-export", async (_event, rendererData: unknown) => {
    console.log("[IPC] store-export called");
    try {
      const now = new Date();
      // 使用 ISO 格式的时间字符串，文件名更友好
      const timeStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `${appName}_Settings_v${appVersion}_${timeStr}.json`;

      const { filePath } = await dialog.showSaveDialog({
        title: "导出设置",
        defaultPath: filename,
        filters: [{ name: "SPlayer Config", extensions: ["json"] }],
      });

      if (filePath) {
        console.log("[IPC] Exporting to:", filePath);
        const fullData = {
          meta: {
            appName,
            version: appVersion,
            timestamp: now.getTime(),
            date: now.toISOString(),
          },
          electron: store.store,
          renderer: rendererData,
        };
        const data = JSON.stringify(fullData, null, 2);
        await writeFile(filePath, data, "utf-8");
        return { success: true, path: filePath };
      }
      console.log("[IPC] Export cancelled");
      return { success: false, error: "cancelled" };
    } catch (error) {
      console.error("❌ Export settings failed:", error);
      return { success: false, error: String(error) };
    }
  });

  // 导入配置
  ipcMain.handle("store-import", async () => {
    console.log("[IPC] store-import called");
    try {
      const { filePaths } = await dialog.showOpenDialog({
        title: "导入设置",
        filters: [{ name: "SPlayer Config", extensions: ["json"] }],
        properties: ["openFile"],
      });

      if (filePaths && filePaths.length > 0) {
        console.log("[IPC] Importing from:", filePaths[0]);
        const fileContent = await readFile(filePaths[0], "utf-8");

        let settings;
        try {
          settings = JSON.parse(fileContent);
        } catch {
          return { success: false, error: "invalid_json" };
        }
        // 基础结构验证
        if (!settings || typeof settings !== "object") {
          return { success: false, error: "invalid_format" };
        }
        // 恢复 Electron Store 配置
        if (settings.electron) {
          try {
            // 过滤 window
            const { ...rest } = settings.electron;
            store.store = { ...store.store, ...rest };
          } catch (e) {
            console.error("Error restoring electron store:", e);
          }
        } else if (!settings.renderer && !settings.meta) {
          // 兼容旧版纯 Electron Store 导出
          store.store = settings;
        }
        return { success: true, data: settings };
      }
      console.log("[IPC] Import cancelled");
      return { success: false, error: "cancelled" };
    } catch (error) {
      console.error("❌ Import settings failed:", error);
      return { success: false, error: String(error) };
    }
  });
};

export default initStoreIpc;
