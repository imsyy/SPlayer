import { BrowserWindow, ipcMain, screen } from "electron";
import { useStore } from "../store";
import lyricWindow from "../windows/lyric-window";
import mainWindow from "../windows/main-window";

/**
 * 歌词相关 IPC
 */
const initLyricIpc = (): void => {
  const store = useStore();

  // 歌词窗口
  let lyricWin: BrowserWindow | null = null;

  /**
   * 窗口是否存活
   * @param win 窗口实例
   * @returns 是否存活
   */
  const isWinAlive = (win: BrowserWindow | null): win is BrowserWindow =>
    !!win && !win.isDestroyed();

  // 切换桌面歌词
  ipcMain.on("toggle-desktop-lyric", (_event, val: boolean) => {
    if (val) {
      if (!isWinAlive(lyricWin)) {
        lyricWin = lyricWindow.create();
        // 监听关闭，置空引用，防止后续调用报错
        lyricWin?.on("closed", () => {
          lyricWin = null;
        });
        // 设置位置
        const { x, y } = store.get("lyric");
        const xPos = Number(x);
        const yPos = Number(y);
        if (Number.isFinite(xPos) && Number.isFinite(yPos)) {
          lyricWin?.setPosition(Math.round(xPos), Math.round(yPos));
        }
      } else {
        lyricWin.show();
      }
      if (isWinAlive(lyricWin)) {
        lyricWin.setAlwaysOnTop(true, "screen-saver");
      }
    } else {
      // 关闭：不销毁窗口，直接隐藏，保留位置与状态
      if (!isWinAlive(lyricWin)) return;
      lyricWin.hide();
    }
  });

  // 更新歌词窗口数据
  ipcMain.on("update-desktop-lyric-data", (_, lyricData) => {
    if (!lyricData || !isWinAlive(lyricWin)) return;
    lyricWin.webContents.send("update-desktop-lyric-data", lyricData);
  });

  // 更新歌词窗口配置
  ipcMain.on("update-desktop-lyric-option", (_, option, callback: boolean = false) => {
    const mainWin = mainWindow.getWin();
    if (!option || !isWinAlive(lyricWin)) return;
    // 增量更新
    const prevOption = store.get("lyric.config");
    if (prevOption) {
      option = { ...prevOption, ...option };
    }
    store.set("lyric.config", option);
    // 触发窗口更新
    if (callback && isWinAlive(lyricWin)) {
      lyricWin.webContents.send("update-desktop-lyric-option", option);
    }
    if (isWinAlive(mainWin)) {
      mainWin?.webContents.send("update-desktop-lyric-option", option);
    }
  });

  // 播放状态更改
  ipcMain.on("play-status-change", (_, status) => {
    if (!isWinAlive(lyricWin)) return;
    lyricWin.webContents.send("update-desktop-lyric-data", { playStatus: status });
  });

  // 音乐歌词更改
  ipcMain.on("play-lyric-change", (_, lyricData) => {
    if (!lyricData || !isWinAlive(lyricWin)) return;
    lyricWin.webContents.send("update-desktop-lyric-data", lyricData);
  });

  // 获取窗口位置
  ipcMain.handle("get-window-bounds", () => {
    if (!isWinAlive(lyricWin)) return {};
    return lyricWin.getBounds();
  });

  // 获取屏幕尺寸
  ipcMain.handle("get-screen-size", () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    return { width, height };
  });

  // 获取多屏虚拟边界（支持负坐标）
  ipcMain.handle("get-virtual-screen-bounds", () => {
    const displays = screen.getAllDisplays();
    const bounds = displays.map((d) => d.workArea);
    const minX = Math.min(...bounds.map((b) => b.x));
    const minY = Math.min(...bounds.map((b) => b.y));
    const maxX = Math.max(...bounds.map((b) => b.x + b.width));
    const maxY = Math.max(...bounds.map((b) => b.y + b.height));
    return { minX, minY, maxX, maxY };
  });

  // 移动窗口
  ipcMain.on("move-window", (_, x, y, width, height) => {
    if (!isWinAlive(lyricWin)) return;
    lyricWin.setBounds({ x, y, width, height });
    // 保存配置
    store.set("lyric", { ...store.get("lyric"), x, y, width, height });
  });

  // 更新歌词窗口宽高
  ipcMain.on("update-lyric-size", (_, width, height) => {
    if (!isWinAlive(lyricWin)) return;
    // 更新窗口宽度
    lyricWin.setBounds({ width, height });
    store.set("lyric", { ...store.get("lyric"), width, height });
  });

  // 更新高度
  ipcMain.on("update-window-height", (_, height) => {
    if (!isWinAlive(lyricWin)) return;
    const store = useStore();
    const { width } = lyricWin.getBounds();
    // 更新窗口高度
    lyricWin.setBounds({ width, height });
    store.set("lyric", { ...store.get("lyric"), height });
  });

  // 是否固定当前最大宽高
  ipcMain.on(
    "toggle-fixed-max-size",
    (_, options: { width: number; height: number; fixed: boolean }) => {
      if (!isWinAlive(lyricWin)) return;
      const { width, height, fixed } = options;
      if (fixed) {
        lyricWin.setMaximumSize(width, height);
      } else {
        lyricWin.setMaximumSize(1400, 360);
      }
    },
  );

  // 请求歌词数据
  ipcMain.on("request-desktop-lyric-data", () => {
    const mainWin = mainWindow.getWin();
    if (!isWinAlive(lyricWin) || !isWinAlive(mainWin)) return;
    // 触发窗口更新
    mainWin?.webContents.send("request-desktop-lyric-data");
  });

  // 请求歌词配置
  ipcMain.handle("request-desktop-lyric-option", () => {
    const config = store.get("lyric.config");
    if (isWinAlive(lyricWin)) {
      lyricWin.webContents.send("update-desktop-lyric-option", config);
    }
    return config;
  });

  // 关闭桌面歌词
  ipcMain.on("close-desktop-lyric", () => {
    const mainWin = mainWindow.getWin();
    if (!isWinAlive(lyricWin) || !isWinAlive(mainWin)) return;
    lyricWin.hide();
    mainWin?.webContents.send("close-desktop-lyric");
  });

  // 锁定/解锁桌面歌词
  ipcMain.on("toggle-desktop-lyric-lock", (_, isLock: boolean, isTemp: boolean = false) => {
    const mainWin = mainWindow.getWin();
    if (!isWinAlive(lyricWin) || !isWinAlive(mainWin)) return;
    // 是否穿透
    if (isLock) {
      lyricWin.setIgnoreMouseEvents(true, { forward: true });
    } else {
      lyricWin.setIgnoreMouseEvents(false);
    }
    if (isTemp) return;
    store.set("lyric.config", { ...store.get("lyric.config"), isLock });
    // 触发窗口更新
    const config = store.get("lyric.config");
    mainWin?.webContents.send("update-desktop-lyric-option", config);
  });
};

export default initLyricIpc;
