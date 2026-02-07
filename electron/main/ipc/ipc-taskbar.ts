import { app, ipcMain, nativeTheme } from "electron";
import type EventEmitter from "node:events";
import { useStore } from "../store";
import { getMainTray } from "../tray";
import { isMac } from "../utils/config";
import mainWindow from "../windows/main-window";
import taskbarLyricWindow from "../windows/taskbar-lyric-window";

// macOS 状态栏歌词数据
interface MacLyricLine {
  words: Array<{ word?: string; startTime: number; endTime: number }>;
  startTime: number;
  endTime: number;
}

let macLyricLines: MacLyricLine[] = [];
let macCurrentTime = 0;
let macOffset = 0;
let macIsPlaying = false;
let macLastLyricIndex = -1; // 上一次显示的歌词行索引
let macUpdateTimer: NodeJS.Timeout | null = null; // 防抖定时器

/**
 * 根据当前时间查找对应的歌词行索引
 */
const findCurrentLyricIndex = (currentTime: number, lyrics: MacLyricLine[], offset: number = 0): number => {
  const targetTime = currentTime - offset;
  let index = -1;

  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (lyrics[i].startTime <= targetTime) {
      index = i;
      break;
    }
  }

  return index;
};

/**
 * 根据当前时间查找对应的歌词
 */
const findCurrentLyric = (currentTime: number, lyrics: MacLyricLine[], offset: number = 0): string => {
  const targetTime = currentTime - offset;
  let result = "";

  for (let i = lyrics.length - 1; i >= 0; i--) {
    const line = lyrics[i];
    if (line.startTime <= targetTime) {
      result = line.words.map((w) => w.word ?? "").join("").trim();
      break;
    }
  }

  return result;
};

/**
 * 更新 macOS 状态栏歌词（只在新行时才更新）
 */
const updateMacStatusBarLyric = (store: ReturnType<typeof useStore>) => {
  const tray = getMainTray();
  if (!tray) return;

  const showWhenPaused = store.get("taskbar.showWhenPaused") ?? true;
  if (!macIsPlaying && !showWhenPaused) return;

  const currentLyricIndex = findCurrentLyricIndex(macCurrentTime, macLyricLines, macOffset);

  // 如果行索引没有变化，不更新
  if (currentLyricIndex === macLastLyricIndex) return;
  macLastLyricIndex = currentLyricIndex;

  const currentLyric = findCurrentLyric(macCurrentTime, macLyricLines, macOffset);

  // 清除之前的定时器
  if (macUpdateTimer) {
    clearTimeout(macUpdateTimer);
  }

  // 防抖：延迟更新，避免频繁闪烁
  macUpdateTimer = setTimeout(() => {
    // 再次检查行索引，防止在等待期间发生变化
    const latestIndex = findCurrentLyricIndex(macCurrentTime, macLyricLines, macOffset);
    if (latestIndex === macLastLyricIndex) {
      tray.setMacStatusBarLyricTitle(currentLyric);
    }
    macUpdateTimer = null;
  }, 200);
};

const initTaskbarIpc = () => {
  // 在函数内部获取 store，确保在 app ready 事件之后
  const store = useStore();

  // macOS 使用状态栏歌词，不使用任务栏歌词窗口
  if (isMac) {
    const envEnabled = store.get("taskbar.enabled");
    const tray = getMainTray();
    tray?.setMacStatusBarLyricShow(envEnabled);
  } else {
    const envEnabled = store.get("taskbar.enabled");

    const tray = getMainTray();
    tray?.setTaskbarLyricShow(envEnabled);

    if (envEnabled) {
      taskbarLyricWindow.create();
    }
  }

  ipcMain.on("taskbar:toggle", (_event, show: boolean) => {
    store.set("taskbar.enabled", show);
    const tray = getMainTray();

    if (isMac) {
      // macOS 使用状态栏歌词，发送事件让 ipc-tray 处理
      // 通过发送事件来同步状态
      ipcMain.emit("mac-toggle-statusbar-lyric", null, show);
      // 如果开启，向渲染进程请求当前歌词数据
      if (show) {
        const mainWin = mainWindow.getWin();
        if (mainWin && !mainWin.isDestroyed()) {
          mainWin.webContents.send("taskbar:request-data");
        }
      }
      return;
    }

    tray?.setTaskbarLyricShow(show);

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

  ipcMain.on("taskbar:broadcast-settings", (_event, settings: unknown) => {
    taskbarLyricWindow.send("taskbar:update-settings", settings);
  });

  ipcMain.on("taskbar:update-metadata", (_event, metadata: unknown) => {
    if (isMac) return;
    taskbarLyricWindow.send("taskbar:update-metadata", metadata);
  });

  ipcMain.on("taskbar:update-lyrics", (_event, lyrics: unknown) => {
    if (isMac) {
      // macOS 使用状态栏歌词，只保存歌词数据，等待进度更新时再显示
      const lyricData = lyrics as { lines?: MacLyricLine[] };
      macLyricLines = lyricData?.lines ?? [];
      return;
    }
    taskbarLyricWindow.send("taskbar:update-lyrics", lyrics);
  });

  ipcMain.on("taskbar:update-progress", (_event, progress: unknown) => {
    if (isMac) {
      // macOS 使用状态栏歌词，更新进度并计算当前歌词
      const progressData = progress as { currentTime?: number; offset?: number };
      if (progressData.currentTime !== undefined) {
        macCurrentTime = progressData.currentTime;
      }
      if (progressData.offset !== undefined) {
        macOffset = progressData.offset;
      }
      // 只有收到进度数据后才更新歌词显示
      updateMacStatusBarLyric(store);
      return;
    }
    taskbarLyricWindow.send("taskbar:update-progress", progress);
  });

  ipcMain.on("taskbar:update-state", (_event, state: unknown) => {
    if (isMac) {
      // macOS 使用状态栏歌词，更新播放状态
      const stateData = state as { isPlaying?: boolean };
      if (stateData.isPlaying !== undefined) {
        macIsPlaying = stateData.isPlaying;
      }
      // 播放状态改变时也更新歌词显示
      updateMacStatusBarLyric(store);
      return;
    }
    taskbarLyricWindow.send("taskbar:update-state", state);
  });

  ipcMain.on("taskbar:request-data", () => {
    if (isMac) {
      // macOS 请求歌词数据，转发请求并等待响应
      const mainWin = mainWindow.getWin();
      if (mainWin && !mainWin.isDestroyed()) {
        mainWin.webContents.send("taskbar:request-data");
      }
      return;
    }
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
