import type { LyricLine } from "@applemusic-like-lyrics/lyric";
import { TASKBAR_IPC_CHANNELS, type SyncStatePayload, type SyncTickPayload } from "@shared";
import { ipcMain } from "electron";
import { useStore } from "../store";
import { getMainTray } from "../tray";
import mainWindow from "../windows/main-window";
import { getCurrentSongTitle } from "./ipc-tray";

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
const startInterpolation = () => {
  stopInterpolation(); // 先停止任何已存在的计时器
  macLastUpdateTime = Date.now(); // 在启动新的插值计时器时，重置 macLastUpdateTime
  interpolationTimer = setInterval(() => {
    const now = Date.now();
    const elapsedTime = now - macLastUpdateTime;
    macCurrentTime += elapsedTime;
    macLastUpdateTime = now;
    updateMacStatusBarLyric();
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
 * @param forceUpdate 是否强制更新，即便歌词行索引未变化
 */
const updateMacStatusBarLyric = (forceUpdate: boolean = false) => {
  const store = useStore();
  const tray = getMainTray();
  if (!tray) return;

  // 检查 macOS 状态栏歌词功能是否启用
  const isMacosLyricEnabled = store.get("macos.statusBarLyric.enabled") ?? false;
  if (!isMacosLyricEnabled) {
    // 如果功能被禁用，则确保托盘标题显示为当前歌曲名，并立即返回
    tray.setTitle(getCurrentSongTitle());
    return;
  }

  const showWhenPaused = store.get("taskbar.showWhenPaused") ?? true;
  if (!macIsPlaying && !showWhenPaused) {
    // 如果当前未播放且设置不允许暂停时显示歌词，则清空标题
    tray.setTitle("");
    return;
  }

  // 如果歌词数据为空，则清空标题并返回
  if (macLyricLines.length === 0) {
    tray.setTitle("");
    return;
  }

  const currentLyricIndex = findCurrentLyricIndex(macCurrentTime, macLyricLines, macOffset);

  // 如果不是强制更新模式，并且歌词行索引没有变化，则跳过更新
  // `forceUpdate` 用于在启动时或拖动进度条时，即使行索引未变，也强制更新
  if (!forceUpdate && currentLyricIndex === macLastLyricIndex) return;
  macLastLyricIndex = currentLyricIndex;

  const currentLyric =
    currentLyricIndex !== -1
      ? macLyricLines[currentLyricIndex].words
          .map((w) => w.word ?? "")
          .join("")
          .trim()
      : "";

  tray.setTitle(currentLyric);
};

export const initMacStatusBarIpc = () => {
  const store = useStore();

  // 初始化时读取 macOS 专属设置
  const isMacosLyricEnabled = store.get("macos.statusBarLyric.enabled") ?? false;
  const tray = getMainTray();

  // 根据初始设置状态更新托盘显示
  // 如果禁用，设置回歌曲标题
  if (!isMacosLyricEnabled) {
    tray?.setTitle(getCurrentSongTitle());
  }

  // 新增 macOS 专属设置切换监听
  ipcMain.on("macos-lyric:toggle", (_event, show: boolean) => {
    store.set("macos.statusBarLyric.enabled", show);
    const tray = getMainTray();
    const mainWin = mainWindow.getWin();

    // 强制更新托盘菜单，以响应新的开启/关闭状态
    tray?.initTrayMenu();

    if (mainWin && !mainWin.isDestroyed()) {
      // 发送更新给渲染进程，同步 Pinia store
      mainWin.webContents.send("setting:update-macos-lyric-enabled", show);
      if (show) {
        mainWin.webContents.send(TASKBAR_IPC_CHANNELS.REQUEST_DATA);
      } else {
        // 关闭时，将标题恢复为歌曲名，并停止歌词插值计时器
        tray?.setTitle(getCurrentSongTitle());
        stopInterpolation();
      }
    } else if (!show) {
      // 如果主窗口不可用且正在关闭，也恢复标题并停止计时器
      tray?.setTitle(getCurrentSongTitle());
      stopInterpolation();
    }
  });

  ipcMain.on(TASKBAR_IPC_CHANNELS.SYNC_STATE, (_event, payload: SyncStatePayload) => {
    switch (payload.type) {
      case "lyrics-loaded": {
        // 仅更新歌词数据，不立即更新状态栏显示
        macLyricLines = payload.data.lines;
        macLastLyricIndex = -1;
        break;
      }

      case "playback-state":
        macIsPlaying = payload.data.isPlaying;
        // 不在这里直接更新歌词，依赖 SYNC_TICK 来驱动
        if (!macIsPlaying) {
          // 如果是暂停状态，则停止插值器并进行一次最终更新
          stopInterpolation();
          updateMacStatusBarLyric();
        }
        break;

      case "full-hydration":
        // 接收完整的状态，但歌词更新仍然依赖 SYNC_TICK
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
        break;
    }
  });

  // macOS 状态栏歌词专用进度更新
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
    // 如果此时是播放状态，确保插值器运行
    updateMacStatusBarLyric(true);
    if (macIsPlaying) {
      startInterpolation();
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
