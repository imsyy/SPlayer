import { app, ipcMain, nativeTheme } from "electron";
import type EventEmitter from "node:events";
import { useStore } from "../store";
import { getMainTray } from "../tray";
import mainWindow from "../windows/main-window";
import taskbarLyricWindow from "../windows/taskbar-lyric-window";

const initTaskbarIpc = () => {
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

    if (show) {
      taskbarLyricWindow.create();
    } else {
      taskbarLyricWindow.close();
    }
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
