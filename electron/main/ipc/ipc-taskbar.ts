import { TASKBAR_IPC_CHANNELS, type SyncStatePayload, type TaskbarConfig } from "@shared";
import { app, ipcMain, nativeTheme } from "electron";
import type EventEmitter from "node:events";
import { useStore } from "../store";
import { getMainTray } from "../tray";
import mainWindow from "../windows/main-window";
import taskbarLyricManager from "../utils/taskbar-lyric-manager";

let cachedIsPlaying = false;

/** 读取完整任务栏配置 */
const getTaskbarConfig = (): TaskbarConfig => {
  return useStore().get("taskbar");
};

/** 根据配置更新窗口可见性 */
const updateWindowVisibility = (config: TaskbarConfig) => {
  const tray = getMainTray();
  if (tray) tray.setTaskbarLyricShow(config.enabled);
  if (!config.enabled) {
    taskbarLyricManager.close(false);
    return;
  }
  taskbarLyricManager.create(config.mode);
  const shouldBeVisible = cachedIsPlaying || config.showWhenPaused;
  taskbarLyricManager.setVisibility(shouldBeVisible);
};

const initTaskbarIpc = () => {
  const store = useStore();
  const initialConfig = getTaskbarConfig();
  if (initialConfig.enabled) {
    taskbarLyricManager.create(initialConfig.mode);
    updateWindowVisibility(initialConfig);
  }

  ipcMain.on("taskbar:set-width", (_event, width: number) => {
    taskbarLyricManager.setContentWidth(width);
  });

  ipcMain.handle(TASKBAR_IPC_CHANNELS.GET_OPTION, () => getTaskbarConfig());

  // 设置配置（增量合并）
  ipcMain.on(
    TASKBAR_IPC_CHANNELS.SET_OPTION,
    (_event, option: Partial<TaskbarConfig>, pushToWindow = true) => {
      if (!option) return;
      // 增量更新
      const prev = getTaskbarConfig();
      const next = { ...prev, ...option };
      Object.entries(option).forEach(([key, value]) => {
        store.set(`taskbar.${key}`, value);
      });
      // 推送到歌词窗口
      if (pushToWindow) {
        taskbarLyricManager.send(TASKBAR_IPC_CHANNELS.SYNC_STATE, {
          type: "config-update",
          data: option,
        } as SyncStatePayload);
      }
      updateWindowVisibility(next);
      if (next.enabled) {
        taskbarLyricManager.updateLayout(false);
      }
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

    taskbarLyricManager.send(TASKBAR_IPC_CHANNELS.SYNC_STATE, payload);
  });

  ipcMain.on(TASKBAR_IPC_CHANNELS.SYNC_TICK, (_event, payload) => {
    taskbarLyricManager.send(TASKBAR_IPC_CHANNELS.SYNC_TICK, payload);
  });

  ipcMain.on(TASKBAR_IPC_CHANNELS.REQUEST_DATA, () => {
    const mainWin = mainWindow.getWin();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send(TASKBAR_IPC_CHANNELS.REQUEST_DATA);
    }

    taskbarLyricManager.updateLayout(false);

    const isDark = nativeTheme.shouldUseDarkColors;
    taskbarLyricManager.send(TASKBAR_IPC_CHANNELS.SYNC_STATE, {
      type: "system-theme",
      data: { isDark },
    } as SyncStatePayload);
  });

  ipcMain.on("taskbar:fade-done", () => {
    taskbarLyricManager.handleFadeDone();
  });

  // 把事件发射到 app 里不太好，但是我觉得也没有必要为了这一个事件创建一个事件总线
  // TODO: 如果有了事件总线，通过那个事件总线发射这个事件
  (app as EventEmitter).on("explorer-restarted", () => {
    const currentConfig = getTaskbarConfig();
    if (currentConfig.enabled && currentConfig.mode === "taskbar") {
      taskbarLyricManager.close(false);
      setTimeout(() => {
        taskbarLyricManager.create("taskbar");
      }, 500);
    }
  });
};

export default initTaskbarIpc;
