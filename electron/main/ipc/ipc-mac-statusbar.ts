import type { LyricLine } from "@applemusic-like-lyrics/lyric";
import { TASKBAR_IPC_CHANNELS, type SyncStatePayload, type SyncTickPayload } from "@shared";
import { ipcMain } from "electron";
import { useStore } from "../store";
import { getMainTray } from "../tray";
import mainWindow from "../windows/main-window";

let macLyricLines: LyricLine[] = [];
let macCurrentTime = 0;
let macOffset = 0;
let macIsPlaying = false;
let macLastLyricIndex = -1; // 上一次显示的歌词行索引
let interpolationTimer: NodeJS.Timeout | null = null; // 插值计时器
let macLastUpdateTime: number = 0; // 上次更新 macCurrentTime 的时间戳

const LYRIC_UPDATE_INTERVAL = 50; // ms, 歌词更新频率
const PROGRESS_SYNC_THRESHOLD_MS = 100; // ms, 进度同步阈值，如果误差超过此值才同步

/**
 * 停止插值计时器
 */
const stopInterpolation = () => {
  if (interpolationTimer) {
    clearInterval(interpolationTimer);
    interpolationTimer = null;
  }
};

/**
 * 启动插值计时器
 */
const startInterpolation = (store: ReturnType<typeof useStore>) => {
  stopInterpolation(); // 先停止任何已存在的计时器
  macLastUpdateTime = Date.now(); // 在启动新的插值计时器时，重置 macLastUpdateTime
  interpolationTimer = setInterval(() => {
    const now = Date.now();
    const elapsedTime = now - macLastUpdateTime;
    macCurrentTime += elapsedTime;
    macLastUpdateTime = now;
    updateMacStatusBarLyric(store);
  }, LYRIC_UPDATE_INTERVAL);
};

/**
 * 根据当前时间查找对应的歌词行索引
 */
const findCurrentLyricIndex = (
  currentTime: number,
  lyrics: LyricLine[],
  offset: number = 0,
): number => {
  // 提前 300ms 显示下一行歌词，以看起来更舒服
  const targetTime = currentTime - offset + 300;
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
 * 更新 macOS 状态栏歌词（只在新行时才更新）
 */
const updateMacStatusBarLyric = (store: ReturnType<typeof useStore>) => {
  const tray = getMainTray();
  if (!tray) return;

  const showWhenPaused = store.get("taskbar.showWhenPaused") ?? true;
  if (!macIsPlaying && !showWhenPaused) {
    // 如果不显示，则清空标题
    tray.setMacStatusBarLyricTitle("");
    return;
  }

  // 如果歌词为空，则清空标题并返回
  if (macLyricLines.length === 0) {
    tray.setMacStatusBarLyricTitle("");
    return;
  }

  const currentLyricIndex = findCurrentLyricIndex(macCurrentTime, macLyricLines, macOffset);

  // 如果行索引没有变化，不更新
  if (currentLyricIndex === macLastLyricIndex) return;
  macLastLyricIndex = currentLyricIndex;

  const currentLyric =
    currentLyricIndex !== -1
      ? macLyricLines[currentLyricIndex].words
          .map((w) => w.word ?? "")
          .join("")
          .trim()
      : "";

  tray.setMacStatusBarLyricTitle(currentLyric);
};

export const initMacStatusBarIpc = () => {
  const store = useStore();

  // 初始化时读取新的 macOS 专属设置
  const isMacosLyricEnabled = store.get("macos.statusBarLyric.enabled") ?? false;
  const tray = getMainTray();
  tray?.setMacStatusBarLyricShow(isMacosLyricEnabled); // 根据新设置初始化显示状态

  // 新增 macOS 专属设置切换监听
  ipcMain.on("macos-lyric:toggle", (_event, show: boolean) => {
    store.set("macos.statusBarLyric.enabled", show); // 更新 store
    const tray = getMainTray();

    // 触发 "mac-toggle-statusbar-lyric" 事件，让 ipc-tray 响应
    ipcMain.emit("mac-toggle-statusbar-lyric", null, show);

    const mainWin = mainWindow.getWin(); // 获取主窗口实例
    if (mainWin && !mainWin.isDestroyed()) {
      // 发送更新给渲染进程，同步 Pinia store
      mainWin.webContents.send("setting:update-macos-lyric-enabled", show);
      if (show) {
        mainWin.webContents.send(TASKBAR_IPC_CHANNELS.REQUEST_DATA); // 请求新数据
      } else {
        tray?.setMacStatusBarLyricTitle(""); // 关闭时清空歌词
        stopInterpolation(); // 关闭时停止计时器
      }
    } else if (!show) {
      // 如果主窗口不可用且正在关闭，也清空歌词
      tray?.setMacStatusBarLyricTitle("");
      stopInterpolation(); // 关闭时停止计时器
    }
  });

  ipcMain.on(TASKBAR_IPC_CHANNELS.SYNC_STATE, (_event, payload: SyncStatePayload) => {
    switch (payload.type) {
      case "lyrics-loaded": {
        macLyricLines = payload.data.lines;
        macLastLyricIndex = -1;
        // 确保新歌词到达后立即更新状态栏显示
        const mainWin = mainWindow.getWin();
        if (mainWin && !mainWin.isDestroyed()) {
          updateMacStatusBarLyric(useStore());
        }
        break;
      }

      case "playback-state":
        macIsPlaying = payload.data.isPlaying;
        if (!macIsPlaying) {
          stopInterpolation();
          updateMacStatusBarLyric(store);
        }
        break;

      case "full-hydration":
        if (payload.data.lyrics) {
          macLyricLines = payload.data.lyrics.lines;
          macLastLyricIndex = -1;
        }
        if (payload.data.playback) {
          macIsPlaying = payload.data.playback.isPlaying;
          if (payload.data.playback.tick) {
            const [currentTime, , offset] = payload.data.playback.tick;
            macCurrentTime = currentTime;
            macOffset = offset;
          }
        }
        updateMacStatusBarLyric(store);
        if (macIsPlaying) {
          startInterpolation(store);
        }
        break;
    }
  });

  ipcMain.on(TASKBAR_IPC_CHANNELS.SYNC_TICK, (_, payload: SyncTickPayload) => {
    const [currentTime, _duration, offset] = payload;

    // 进度到达，这是启动更新和插值的“门禁”
    if (currentTime !== undefined) {
      const diff = Math.abs(currentTime - macCurrentTime);

      // 如果误差在阈值之内，并且当前正在播放，则不进行时间同步，让内部状态保持稳定
      // 否则，进行校准
      if (!(diff <= PROGRESS_SYNC_THRESHOLD_MS && macIsPlaying)) {
        macCurrentTime = currentTime;
        macLastUpdateTime = Date.now(); // 校准时更新时间戳
      }
    }
    if (offset !== undefined) {
      macOffset = offset;
    }
    // 收到精确进度或误差较大同步后，立即更新一次歌词显示
    updateMacStatusBarLyric(store);
    // 如果此时是播放状态，确保插值器运行
    if (macIsPlaying) {
      startInterpolation(store);
    }
  });

  ipcMain.on(TASKBAR_IPC_CHANNELS.REQUEST_DATA, () => {
    // macOS 请求歌词数据，转发请求并等待响应
    const mainWin = mainWindow.getWin();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send(TASKBAR_IPC_CHANNELS.REQUEST_DATA);
    }
  });
};
