import { TASKBAR_IPC_CHANNELS, type SyncStatePayload, type TaskbarConfig } from "@shared";
import { app, ipcMain, nativeTheme } from "electron";
import type EventEmitter from "node:events";
import { useStore } from "../store";
import { getMainTray } from "../tray";
import mainWindow from "../windows/main-window";
import taskbarLyricWindow from "../windows/taskbar-lyric-window";

let cachedIsPlaying = false;

const getTaskbarConfig = (): TaskbarConfig => {
  const store = useStore();
  return {
    maxWidth: store.get("taskbar.maxWidth", 300),
    position: store.get("taskbar.position", "automatic"),
    autoShrink: store.get("taskbar.autoShrink", false),
    margin: store.get("taskbar.margin", 10),
    minWidth: store.get("taskbar.minWidth", 10),
    enabled: store.get("taskbar.enabled", false),
    showWhenPaused: store.get("taskbar.showWhenPaused", true),
    showCover: store.get("taskbar.showCover", true),
    themeMode: store.get("taskbar.themeMode", "auto"),
    fontFamily: store.get("taskbar.fontFamily", ""),
    globalFont: store.get("taskbar.globalFont", ""),
    fontWeight: store.get("taskbar.fontWeight", 0),
    animationMode: store.get("taskbar.animationMode", "slide-blur"),
    singleLineMode: store.get("taskbar.singleLineMode", false),
    showTranslation: store.get("taskbar.showTranslation", true),
    showRomaji: store.get("taskbar.showRomaji", true),
  };
};

const updateWindowVisibility = (config: TaskbarConfig) => {
  const tray = getMainTray();

  if (tray) {
    tray.setTaskbarLyricShow(config.enabled);
  }

  const shouldBeVisible = config.enabled && (cachedIsPlaying || config.showWhenPaused);

  taskbarLyricWindow.setVisibility(shouldBeVisible);
};

const updateWindowLayout = (animate: boolean = true) => {
  taskbarLyricWindow.updateLayout(animate);
};

const initTaskbarIpc = () => {
  // 在函数内部获取 store，确保在 app ready 事件之后
  const store = useStore();

  const initialConfig = getTaskbarConfig();
  if (initialConfig.enabled) {
    taskbarLyricWindow.create();
    updateWindowVisibility(initialConfig);
  }

  ipcMain.on(
    TASKBAR_IPC_CHANNELS.UPDATE_CONFIG,
    (_event, partialConfig: Partial<TaskbarConfig>) => {
      const oldConfig = getTaskbarConfig();

      Object.entries(partialConfig).forEach(([key, value]) => {
        store.set(`taskbar.${key}`, value);
      });

      const newConfig = getTaskbarConfig();

      if (newConfig.enabled && !oldConfig.enabled) {
        taskbarLyricWindow.create();
      }

      if (
        newConfig.enabled !== oldConfig.enabled ||
        newConfig.showWhenPaused !== oldConfig.showWhenPaused
      ) {
        updateWindowVisibility(newConfig);
      }

      if (newConfig.enabled) {
        if (
          newConfig.maxWidth !== oldConfig.maxWidth ||
          newConfig.position !== oldConfig.position ||
          newConfig.autoShrink !== oldConfig.autoShrink ||
          newConfig.margin !== oldConfig.margin ||
          newConfig.minWidth !== oldConfig.minWidth
        ) {
          updateWindowLayout(true);
        }
      }

      taskbarLyricWindow.send(TASKBAR_IPC_CHANNELS.SYNC_STATE, {
        type: "config-update",
        data: partialConfig,
      } as SyncStatePayload);
    },
  );

  ipcMain.on(TASKBAR_IPC_CHANNELS.SYNC_STATE, (_event, payload: SyncStatePayload) => {
    if (payload.type === "playback-state") {
      const wasPlaying = cachedIsPlaying;
      cachedIsPlaying = payload.data.isPlaying;

      if (wasPlaying !== cachedIsPlaying) {
        updateWindowVisibility(getTaskbarConfig());
      }
    } else if (payload.type === "full-hydration" && payload.data.playback) {
      cachedIsPlaying = payload.data.playback.isPlaying;
      updateWindowVisibility(getTaskbarConfig());
    }

    taskbarLyricWindow.send(TASKBAR_IPC_CHANNELS.SYNC_STATE, payload);
  });

  ipcMain.on(TASKBAR_IPC_CHANNELS.SYNC_TICK, (_event, payload) => {
    taskbarLyricWindow.send(TASKBAR_IPC_CHANNELS.SYNC_TICK, payload);
  });

  ipcMain.on(TASKBAR_IPC_CHANNELS.REQUEST_DATA, () => {
    const mainWin = mainWindow.getWin();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send(TASKBAR_IPC_CHANNELS.REQUEST_DATA);
    }

    taskbarLyricWindow.updateLayout(false);

    const isDark = nativeTheme.shouldUseDarkColors;
    taskbarLyricWindow.send(TASKBAR_IPC_CHANNELS.SYNC_STATE, {
      type: "system-theme",
      data: { isDark },
    } as SyncStatePayload);
  });

  ipcMain.on("taskbar:fade-done", () => {
    taskbarLyricWindow.handleFadeDone();
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
