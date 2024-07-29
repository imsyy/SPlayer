import { contextBridge } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

// 如果启用了上下文隔离，使用 `contextBridge` 将 Electron API 暴露给渲染进程
if (process.contextIsolated) {
  try {
    // 使用 contextBridge 暴露 electronAPI 到渲染进程的全局对象中
    contextBridge.exposeInMainWorld("electron", electronAPI);
  } catch (error) {
    console.error(error);
  }
} else {
  // 如果上下文隔离未启用，将 electronAPI 添加到 DOM 全局对象
  window.electron = electronAPI;
}
