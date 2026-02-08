import { ipcMain } from "electron";
import { useStore } from "../store";
import { getMainTray } from "../tray";
import mainWindow from "../windows/main-window";

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
  };

  const currentLyricIndex = findCurrentLyricIndex(macCurrentTime, macLyricLines, macOffset);

  // 如果行索引没有变化，不更新
  if (currentLyricIndex === macLastLyricIndex) return;
  macLastLyricIndex = currentLyricIndex;

  const currentLyric =
    currentLyricIndex !== -1
      ? macLyricLines[currentLyricIndex].words.map((w) => w.word ?? "").join("").trim()
      : "";

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
        mainWin.webContents.send("taskbar:request-data"); // 开启时请求数据
      } else {
        tray?.setMacStatusBarLyricTitle(""); // 关闭时清空歌词
      }
    } else if (!show) { // 如果主窗口不可用且正在关闭，也清空歌词
      tray?.setMacStatusBarLyricTitle("");
    }
  });

  ipcMain.on("taskbar:update-lyrics", (_event, lyrics: unknown) => {
    // macOS 使用状态栏歌词，只保存歌词数据，等待进度更新时再显示
    const lyricData = lyrics as { lines?: MacLyricLine[] };
    macLyricLines = lyricData?.lines ?? [];
  });

  ipcMain.on("taskbar:update-progress", (_event, progress: unknown) => {
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
  });

  ipcMain.on("taskbar:update-state", (_event, state: unknown) => {
    // macOS 使用状态栏歌词，更新播放状态
    const stateData = state as { isPlaying?: boolean };
    if (stateData.isPlaying !== undefined) {
      macIsPlaying = stateData.isPlaying;
    }
    // 播放状态改变时也更新歌词显示
    updateMacStatusBarLyric(store);
  });

  ipcMain.on("taskbar:request-data", () => {
    // macOS 请求歌词数据，转发请求并等待响应
    const mainWin = mainWindow.getWin();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send("taskbar:request-data");
    }
  });
};
