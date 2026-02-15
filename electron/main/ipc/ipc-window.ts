import { app, BrowserWindow, ipcMain } from "electron";
import { useStore } from "../store";
import { isDev } from "../utils/config";
import { initThumbar } from "../thumbar";
import { processProtocolFromCommand } from "../utils/protocol";
import mainWindow from "../windows/main-window";
import loadWindow from "../windows/load-window";
import loginWindow from "../windows/login-window";

/** 是否已首次启动 */
let isFirstLaunch = false;
/** 是否已处理协议 */
let isProtocolProcessed = false;

/**
 * 窗口 IPC 通信
 * @returns void
 */
const initWindowsIpc = (): void => {
  // store
  const store = useStore();

  // 当前窗口状态
  ipcMain.on("win-state", (event) => {
    const mainWin = mainWindow.getWin();
    if (!mainWin) return;
    event.returnValue = mainWin?.isMaximized();
  });

  // 加载完成
  ipcMain.on("win-loaded", () => {
    const loadWin = loadWindow.getWin();
    const mainWin = mainWindow.getWin();
    if (loadWin && !loadWin.isDestroyed()) loadWin.destroy();
    const { maximized, zoomFactor } = store.get("window");
    if (maximized) mainWin?.maximize();
    if (!mainWin) return;
    // 应用缩放
    if (zoomFactor) mainWin.webContents.setZoomFactor(zoomFactor);
    mainWin?.show();
    mainWin?.focus();
    if (!isFirstLaunch) {
      // 解决窗口不立即显示
      mainWin?.setAlwaysOnTop(true);
      // 100ms 后取消置顶
      const timer = setTimeout(() => {
        if (mainWin && !mainWin.isDestroyed()) {
          mainWin.setAlwaysOnTop(false);
          mainWin.focus();
          clearTimeout(timer);
        }
      }, 100);
      isFirstLaunch = true;
    }
    // 初始化缩略图工具栏
    if (mainWin) {
      initThumbar(mainWin);
      // 检查是否有自定义协议启动（仅执行一次）
      if (!isProtocolProcessed) {
        processProtocolFromCommand(process.argv);
        isProtocolProcessed = true;
      }
    }
  });

  // 设置缩放系数
  ipcMain.handle("set-zoom-factor", (event, factor: number) => {
    // 获取窗口
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    // 限制范围 0.5 - 2.0
    const safeFactor = Math.max(0.5, Math.min(2.0, factor));
    win.webContents.setZoomFactor(safeFactor);
    // 保存到 store
    const windowConfig = store.get("window") || {};
    store.set("window", { ...windowConfig, zoomFactor: safeFactor });
    return true;
  });

  // 获取缩放系数
  ipcMain.handle("get-zoom-factor", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return 1.0;
    return win.webContents.getZoomFactor();
  });

  // 最小化
  ipcMain.on("win-min", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    event.preventDefault();
    win.minimize();
  });

  // 最大化
  ipcMain.on("win-max", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    win.maximize();
  });

  // 还原
  ipcMain.on("win-restore", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    win.restore();
  });

  // 隐藏
  ipcMain.on("win-hide", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    win.hide();
  });

  // 显示
  ipcMain.on("win-show", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    win.show();
    win.focus();
  });

  // 显示主窗口
  ipcMain.on("win-show-main", () => {
    const mainWin = mainWindow.getWin();
    if (!mainWin) return;
    mainWin.show();
    mainWin.focus();
  });

  // 重载
  ipcMain.on("win-reload", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    win.reload();
  });

  // 重启
  ipcMain.on("win-restart", () => {
    app.relaunch();
    app.quit();
  });

  // 向主窗口发送事件
  ipcMain.on("send-to-main-win", (_, eventName, ...args) => {
    const mainWin = mainWindow.getWin();
    if (!mainWin) return;
    mainWin.webContents.send(eventName, ...args);
  });

  // 进度条状态
  let currentProgress = -1;
  let currentMode: "normal" | "paused" | "error" | "indeterminate" = "normal";

  // 更新进度条
  const updateProgressBar = () => {
    const mainWin = mainWindow.getWin();
    if (!mainWin) return;
    if (currentProgress < 0) {
      mainWin.setProgressBar(-1);
    } else {
      mainWin.setProgressBar(currentProgress, { mode: currentMode });
    }
  };

  // 设置进度
  ipcMain.on("set-bar-progress", (_event, progress: number | "none") => {
    if (progress === "none") {
      currentProgress = -1;
    } else {
      currentProgress = progress / 100;
    }
    updateProgressBar();
  });

  // 设置模式
  ipcMain.on("set-bar-mode", (_event, mode: "normal" | "paused" | "error" | "indeterminate") => {
    currentMode = mode;
    updateProgressBar();
  });

  // 显示进度 (兼容旧版，建议使用 set-bar-progress 和 set-bar-mode)
  ipcMain.on(
    "set-bar",
    (
      _event,
      val:
        | number
        | "none"
        | "indeterminate"
        | "error"
        | "paused"
        | { progress: number; mode: "normal" | "paused" | "error" | "indeterminate" },
    ) => {
      if (typeof val === "object" && val !== null) {
        currentProgress = val.progress / 100;
        currentMode = val.mode === "normal" ? "normal" : val.mode;
        updateProgressBar();
        return;
      }

      switch (val) {
        case "none":
          currentProgress = -1;
          break;
        case "indeterminate":
          currentProgress = 2; // Electron treat > 1 as indeterminate usually, but let's stick to mode
          currentMode = "indeterminate";
          break;
        case "error":
          currentMode = "error";
          break;
        case "paused":
          currentMode = "paused";
          break;
        default:
          if (typeof val === "number") {
            currentProgress = val / 100;
          } else {
            currentProgress = -1;
          }
          break;
      }
      updateProgressBar();
    },
  );

  // 开启控制台
  ipcMain.on("open-dev-tools", () => {
    const mainWin = mainWindow.getWin();
    if (!mainWin) return;
    mainWin?.webContents.openDevTools({
      title: "SPlayer DevTools",
      mode: isDev ? "right" : "detach",
    });
  });

  // 开启登录窗口
  ipcMain.on("open-login-web", () => {
    const mainWin = mainWindow.getWin();
    if (!mainWin) return;
    loginWindow.create(mainWin);
  });

  // 开启设置
  ipcMain.on("open-setting", (_, type, scrollTo) => {
    const mainWin = mainWindow.getWin();
    if (!mainWin) return;
    mainWin?.show();
    mainWin?.focus();
    mainWin?.webContents.send("openSetting", type, scrollTo);
  });
};

export default initWindowsIpc;
