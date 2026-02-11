import { ipcMain } from "electron";
import { useStore } from "../store";
import { getMainTray } from "../tray";
import mainWindow from "../windows/main-window";
import { MacLyricLine } from "../../../src/types/lyric";
import {
  UpdateLyricsPayload,
  UpdateProgressPayload,
  UpdateStatePayload,
} from "../../../src/types/ipc";


let macLyricLines: MacLyricLine[] = [];
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
  lyrics: MacLyricLine[],
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
        
        mainWin.webContents.send("mac-statusbar:request-data"); // 请求新数据
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

  ipcMain.on("taskbar:update-lyrics", (_event, lyrics: UpdateLyricsPayload) => {
    // 新歌词到达，更新数据并重置索引
    macLyricLines = lyrics.lines ?? [];
    macLastLyricIndex = -1;
    // 确保新歌词到达后立即更新状态栏显示
    const mainWin = mainWindow.getWin();
    if (mainWin && !mainWin.isDestroyed()) {
      updateMacStatusBarLyric(useStore());
    }
  });

  // macOS 状态栏歌词专用进度更新
  ipcMain.on("mac-statusbar:update-progress", (_event, progress: UpdateProgressPayload) => {
    
    // 进度到达，这是启动更新和插值的“门禁”
    if (progress.currentTime !== undefined) {
      const diff = Math.abs(progress.currentTime - macCurrentTime);

      // 如果误差在阈值之内，并且当前正在播放，则不进行时间同步，让内部状态保持稳定
      // 否则，进行校准
      if (!(diff <= PROGRESS_SYNC_THRESHOLD_MS && macIsPlaying)) {
        macCurrentTime = progress.currentTime;
        macLastUpdateTime = Date.now(); // 校准时更新时间戳
      }
    }
    if (progress.offset !== undefined) {
      macOffset = progress.offset;
    }
    // 收到精确进度或误差较大同步后，立即更新一次歌词显示
    updateMacStatusBarLyric(store);
    // 如果此时是播放状态，确保插值器运行
    if (macIsPlaying) {
      startInterpolation(store);
    }
  });

  ipcMain.on("taskbar:update-state", (_event, state: UpdateStatePayload) => {
    // 根据播放状态更新 macOS 状态栏歌词显示逻辑
    if (state.isPlaying !== undefined) {
      macIsPlaying = state.isPlaying;
      // 当歌曲暂停时：停止歌词更新计时器，并进行一次最终更新以显示当前歌词
      if (!macIsPlaying) {
        stopInterpolation();
        updateMacStatusBarLyric(store);
      }
      // 当歌曲开始播放时：不在这里直接启动歌词更新，而是等待 'mac-statusbar:update-progress' 事件
      // 该事件作为“门禁”，负责启动歌词更新的插值计时器，以确保与播放进度的同步
    }
  });

  ipcMain.on("mac-statusbar:request-data", () => {
    // macOS 请求歌词数据，转发请求并等待响应
    const mainWin = mainWindow.getWin();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send("mac-statusbar:request-data");
    }
  });
};
