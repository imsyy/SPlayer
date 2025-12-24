import { app, ipcMain } from "electron";
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
    const isMaximized = store.get("window")?.maximized;
    if (isMaximized) mainWin?.maximize();
    if (!mainWin) return;
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

  // 最小化
  ipcMain.on("win-min", (event) => {
    const mainWin = mainWindow.getWin();
    if (!mainWin) return;
    event.preventDefault();
    mainWin?.minimize();
  });

  // 最大化
  ipcMain.on("win-max", () => {
    const mainWin = mainWindow.getWin();
    if (!mainWin) return;
    mainWin?.maximize();
  });

  // 还原
  ipcMain.on("win-restore", () => {
    const mainWin = mainWindow.getWin();
    if (!mainWin) return;
    mainWin?.restore();
  });

  // 隐藏
  ipcMain.on("win-hide", () => {
    const mainWin = mainWindow.getWin();
    if (!mainWin) return;
    mainWin?.hide();
  });

  // 显示
  ipcMain.on("win-show", () => {
    const mainWin = mainWindow.getWin();
    if (!mainWin) return;
    mainWin?.show();
    mainWin?.focus();
  });

  // 重载
  ipcMain.on("win-reload", () => {
    const mainWin = mainWindow.getWin();
    if (!mainWin) return;
    mainWin.reload();
  });

  // 重启
  ipcMain.on("win-restart", () => {
    app.quit();
    app.relaunch();
  });

  // 向主窗口发送事件
  ipcMain.on("send-to-main-win", (_, eventName, ...args) => {
    const mainWin = mainWindow.getWin();
    if (!mainWin || mainWin.isDestroyed() || mainWin.webContents.isDestroyed()) return;
    mainWin.webContents.send(eventName, ...args);
  });

  // 显示进度
  ipcMain.on("set-bar", (_event, val: number | "none" | "indeterminate" | "error" | "paused") => {
    const mainWin = mainWindow.getWin();
    if (!mainWin) return;
    switch (val) {
      case "none":
        mainWin?.setProgressBar(-1);
        break;
      case "indeterminate":
        mainWin?.setProgressBar(2, { mode: "indeterminate" });
        break;
      case "error":
        mainWin?.setProgressBar(1, { mode: "error" });
        break;
      case "paused":
        mainWin?.setProgressBar(1, { mode: "paused" });
        break;
      default:
        if (typeof val === "number") {
          mainWin?.setProgressBar(val / 100);
        } else {
          mainWin?.setProgressBar(-1);
        }
        break;
    }
  });

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
