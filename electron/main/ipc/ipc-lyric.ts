import { BrowserWindow, ipcMain, screen } from "electron";
import { useStore } from "../store";
import { isLinux } from "../utils/config";
import lyricWindow from "../windows/lyric-window";
import mainWindow from "../windows/main-window";

/**
 * 歌词相关 IPC
 */
const initLyricIpc = (): void => {
  const store = useStore();

  // 歌词窗口
  let lyricWin: BrowserWindow | null = null;
  // 是否锁定（从配置读取）
  let isLocked = store.get("lyric.config")?.isLock ?? false;
  // 恢复 forward 的定时器
  let restoreTimer: NodeJS.Timeout | null = null;

  /**
   * 窗口是否存活
   * @param win 窗口实例
   * @returns 是否存活
   */
  const isWinAlive = (win: BrowserWindow | null): win is BrowserWindow =>
    !!win && !win.isDestroyed();

  /**
   * 设置歌词窗口鼠标事件穿透
   * @param enableForward 是否启用 forward（传递鼠标事件到网页，用于悬浮显示解锁按钮）
   */
  const setLyricMouseEvents = (enableForward: boolean) => {
    if (!isWinAlive(lyricWin) || !isLocked) return;
    lyricWin.setIgnoreMouseEvents(true, enableForward ? { forward: true } : undefined);
  };

  // 主窗口移动/调整大小中：立即禁用 forward，并启动防抖恢复
  const onMoveOrResize = () => {
    if (!isLocked) return;
    // 立即禁用 forward
    setLyricMouseEvents(false);
    // 防抖恢复：300ms 内无新事件则恢复
    if (restoreTimer) clearTimeout(restoreTimer);
    restoreTimer = setTimeout(() => setLyricMouseEvents(true), 300);
  };

  // 主窗口移动/调整大小结束：立即恢复 forward（仅 Windows/macOS 支持）
  const onMoveOrResizeEnd = () => {
    if (!isLocked) return;
    if (restoreTimer) clearTimeout(restoreTimer);
    setLyricMouseEvents(true);
  };

  /**
   * 绑定主窗口事件监听
   * 监听 move 和 resize 事件，在操作时禁用 forward
   */
  const bindMainWinEvents = () => {
    const mainWin = mainWindow.getWin();
    if (!mainWin) return;

    // 监听 move（移动中，所有平台）
    mainWin.on("move", onMoveOrResize);
    // 监听 resize（调整大小中，所有平台）
    mainWin.on("resize", onMoveOrResize);

    // Linux 不支持 moved/resized 事件，仅在 Windows/macOS 上监听
    if (!isLinux) {
      // 监听 moved（移动结束，Windows/macOS）
      mainWin.on("moved", onMoveOrResizeEnd);
      // 监听 resized（调整大小结束，Windows/macOS）
      mainWin.on("resized", onMoveOrResizeEnd);
    }
  };

  /**
   * 解绑主窗口事件监听
   */
  const unbindMainWinEvents = () => {
    const mainWin = mainWindow.getWin();
    if (!mainWin) return;

    // 移除此模块添加的事件
    mainWin.removeListener("move", onMoveOrResize);
    mainWin.removeListener("resize", onMoveOrResize);

    // Linux 不支持 moved/resized 事件，仅在 Windows/macOS 上移除
    if (!isLinux) {
      mainWin.removeListener("moved", onMoveOrResizeEnd);
      mainWin.removeListener("resized", onMoveOrResizeEnd);
    }

    // 清理定时器
    if (restoreTimer) clearTimeout(restoreTimer);
    restoreTimer = null;
  };

  // 切换桌面歌词
  ipcMain.on("toggle-desktop-lyric", (_event, val: boolean) => {
    if (val) {
      if (!isWinAlive(lyricWin)) {
        lyricWin = lyricWindow.create();
        // 监听关闭，置空引用，防止后续调用报错
        lyricWin?.on("closed", () => {
          unbindMainWinEvents();
          lyricWin = null;
        });
        // 设置位置
        const { x, y } = store.get("lyric");
        const xPos = Number(x);
        const yPos = Number(y);
        if (Number.isFinite(xPos) && Number.isFinite(yPos)) {
          lyricWin?.setPosition(Math.round(xPos), Math.round(yPos));
        }
        // 绑定主窗口事件监听
        bindMainWinEvents();
      } else {
        lyricWin.show();
      }
      if (isWinAlive(lyricWin)) {
        lyricWin.setAlwaysOnTop(true, "screen-saver");
      }
    } else {
      if (!isWinAlive(lyricWin)) return;
      // 解绑事件
      unbindMainWinEvents();
      lyricWin.close();
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

    // 更新锁定状态
    if (!isTemp) isLocked = isLock;

    // 设置鼠标事件穿透
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
