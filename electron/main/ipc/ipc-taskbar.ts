import { app, ipcMain, nativeTheme } from "electron";
import type EventEmitter from "node:events";
import { useStore } from "../store";
import { getMainTray } from "../tray";
import mainWindow from "../windows/main-window";
import taskbarLyricWindow from "../windows/taskbar-lyric-window";

const initTaskbarIpc = () => {
  // 在函数内部获取 store，确保在 app ready 事件之后
  const store = useStore();
  const envEnabled = store.get("taskbar.enabled");
  const tray = getMainTray();

  tray?.setTaskbarLyricShow(envEnabled);

  if (envEnabled) {
    taskbarLyricWindow.create();
  }

  ipcMain.on("taskbar:toggle", (_event, show: boolean) => {
    store.set("taskbar.enabled", show);
    const tray = getMainTray();

    tray?.setTaskbarLyricShow(show);

    const mainWin = mainWindow.getWin(); // 获取主窗口实例
    if (mainWin && !mainWin.isDestroyed()) {
      // 发送更新给渲染进程，同步 Pinia store
      mainWin.webContents.send("setting:update-taskbar-lyric-enabled", show);
    }

    if (show) {
      taskbarLyricWindow.create();
    } else {
      taskbarLyricWindow.close();
    }
  });

  ipcMain.on("taskbar:set-max-width", (_event, width: number) => {
    store.set("taskbar.maxWidth", width);
    taskbarLyricWindow.updateLayout(true);
  });

  ipcMain.on("taskbar:set-show-cover", (_event, show: boolean) => {
    store.set("taskbar.showCover", show);
    taskbarLyricWindow.send("taskbar:update-settings", { showCover: show });
  });

  ipcMain.on("taskbar:set-position", (_event, position: "automatic" | "left" | "right") => {
    store.set("taskbar.position", position);
    taskbarLyricWindow.updateLayout(true);
  });

  ipcMain.on("taskbar:set-show-when-paused", (_event, show: boolean) => {
    store.set("taskbar.showWhenPaused", show);
    taskbarLyricWindow.send("taskbar:update-settings", { showWhenPaused: show });
  });

  ipcMain.on("taskbar:set-auto-shrink", (_event, shrink: boolean) => {
    store.set("taskbar.autoShrink", shrink);
    taskbarLyricWindow.updateLayout(true);
  });

  ipcMain.on("taskbar:set-theme-color", (_event, color: { light: string; dark: string } | null) => {
    taskbarLyricWindow.send("taskbar:update-theme-color", color);
  });

  ipcMain.on("taskbar:broadcast-settings", (_event, settings: unknown) => {
    taskbarLyricWindow.send("taskbar:update-settings", settings);
  });

  ipcMain.on("taskbar:update-metadata", (_event, metadata: unknown) => {
    taskbarLyricWindow.send("taskbar:update-metadata", metadata);
  });

  ipcMain.on("taskbar:update-lyrics", (_event, lyrics: unknown) => {
    taskbarLyricWindow.send("taskbar:update-lyrics", lyrics);
  });

  ipcMain.on("taskbar:update-progress", (_event, progress: unknown) => {
    taskbarLyricWindow.send("taskbar:update-progress", progress);
  });

  ipcMain.on("taskbar:update-state", (_event, state: unknown) => {
    taskbarLyricWindow.send("taskbar:update-state", state);
  });

  ipcMain.on("taskbar:request-data", () => {
    const mainWin = mainWindow.getWin();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send("taskbar:request-data");
    }

    taskbarLyricWindow.updateLayout();

    const isDark = nativeTheme.shouldUseDarkColors;
    const themePayload = { isDark };
    taskbarLyricWindow.send("taskbar:update-theme", themePayload);
  });

  // 把事件发射到 app 里不太好，但是我觉得也没有必要为了这一个事件创建一个事件总线
  // TODO: 如果有了事件总线，通过那个事件总线发射这个事件
  (app as EventEmitter).on("explorer-restarted", () => {
    const currentEnabled = store.get("taskbar.enabled");
    if (currentEnabled) {
      taskbarLyricWindow.close(false);
      setTimeout(() => {
        taskbarLyricWindow.create();
      }, 500);
    }
  });
};

export default initTaskbarIpc;
