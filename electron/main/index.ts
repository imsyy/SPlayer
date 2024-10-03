import { app, shell, BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import { join } from "path";
import { release, type } from "os";
import { isDev, isMac, appName } from "./utils";
import { registerAllShortcuts, unregisterShortcuts } from "./shortcut";
import { initTray, MainTray } from "./tray";
import { initThumbar, Thumbar } from "./thumbar";
import initAppServer from "../server";
import initIpcMain from "./ipcMain";
import log from "./logger";
import store from "./store";
// icon
import icon from "../../public/icons/favicon.png?asset";

// 屏蔽报错
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

// 模拟打包
Object.defineProperty(app, "isPackaged", {
  get() {
    return true;
  },
});

// 主进程
class MainProcess {
  // 窗口
  mainWindow: BrowserWindow | null = null;
  lyricWindow: BrowserWindow | null = null;
  loadingWindow: BrowserWindow | null = null;
  // 托盘
  mainTray: MainTray | null = null;
  // 工具栏
  thumbar: Thumbar | null = null;
  // 是否退出
  isQuit: boolean = false;
  constructor() {
    log.info("🚀 Main process startup");
    // 禁用 Windows 7 的 GPU 加速功能
    if (release().startsWith("6.1") && type() == 'Windows_NT') app.disableHardwareAcceleration();
    // 单例锁
    if (!app.requestSingleInstanceLock()) {
      log.error("❌ There is already a program running and this process is terminated");
      app.quit();
      process.exit(0);
    } else this.showWindow();
    // 准备就绪
    app.whenReady().then(async () => {
      log.info("🚀 Application Process Startup");
      // 设置应用程序名称
      electronApp.setAppUserModelId(app.getName());
      // 启动主服务进程
      await initAppServer();
      // 启动进程
      this.createLoadingWindow();
      this.createMainWindow();
      this.createLyricsWindow();
      this.handleAppEvents();
      this.handleWindowEvents();
      // 注册其他服务
      this.mainTray = initTray(this.mainWindow!, this.lyricWindow!);
      this.thumbar = initThumbar(this.mainWindow!);
      // 注册主进程事件
      initIpcMain(
        this.mainWindow,
        this.lyricWindow,
        this.loadingWindow,
        this.mainTray,
        this.thumbar,
        store,
      );
      // 注册快捷键
      registerAllShortcuts(this.mainWindow!);
    });
  }
  // 创建窗口
  createWindow(options: BrowserWindowConstructorOptions = {}): BrowserWindow {
    const defaultOptions: BrowserWindowConstructorOptions = {
      title: appName,
      width: 1280,
      height: 720,
      frame: false,
      center: true,
      // 图标
      icon,
      webPreferences: {
        preload: join(__dirname, "../preload/index.mjs"),
        // 禁用渲染器沙盒
        sandbox: false,
        // 禁用同源策略
        webSecurity: false,
        // 允许 HTTP
        allowRunningInsecureContent: true,
        // 禁用拼写检查
        spellcheck: false,
        // 启用 Node.js
        nodeIntegration: true,
        nodeIntegrationInWorker: true,
        // 启用上下文隔离
        contextIsolation: false,
      },
    };
    // 合并参数
    options = Object.assign(defaultOptions, options);
    // 创建窗口
    const win = new BrowserWindow(options);
    return win;
  }
  // 创建主窗口
  createMainWindow() {
    // 窗口配置项
    const options: BrowserWindowConstructorOptions = {
      width: store.get("window").width,
      height: store.get("window").height,
      minHeight: 800,
      minWidth: 1280,
      // 菜单栏
      titleBarStyle: "customButtonsOnHover",
      // 立即显示窗口
      show: false,
    };
    // 初始化窗口
    this.mainWindow = this.createWindow(options);

    // 渲染路径
    if (isDev && process.env["ELECTRON_RENDERER_URL"]) {
      this.mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    } else {
      const port = Number(import.meta.env["VITE_SERVER_PORT"] || 25884);
      this.mainWindow.loadURL(`http://127.0.0.1:${port}`);
    }

    // 配置网络代理
    if (store.get("proxy")) {
      this.mainWindow.webContents.session.setProxy({ proxyRules: store.get("proxy") });
    }

    // 窗口打开处理程序
    this.mainWindow.webContents.setWindowOpenHandler((details) => {
      const { url } = details;
      if (url.startsWith("https://") || url.startsWith("http://")) {
        shell.openExternal(url);
      }
      return { action: "deny" };
    });
  }
  // 创建加载窗口
  createLoadingWindow() {
    // 初始化窗口
    this.loadingWindow = this.createWindow({
      width: 800,
      height: 560,
      maxWidth: 800,
      maxHeight: 560,
      resizable: false,
    });
    // 渲染路径
    this.loadingWindow.loadFile(join(__dirname, "../main/web/loading.html"));
  }
  // 创建桌面歌词窗口
  createLyricsWindow() {
    // 初始化窗口
    this.lyricWindow = this.createWindow({
      width: store.get("lyric").width || 800,
      height: store.get("lyric").height || 180,
      minWidth: 440,
      minHeight: 120,
      maxWidth: 1600,
      maxHeight: 300,
      // 窗口位置
      x: store.get("lyric").x,
      y: store.get("lyric").y,
      transparent: true,
      backgroundColor: "rgba(0, 0, 0, 0)",
      alwaysOnTop: true,
      resizable: true,
      movable: true,
      // 不在任务栏显示
      skipTaskbar: true,
      // 窗口不能最小化
      minimizable: false,
      // 窗口不能最大化
      maximizable: false,
      // 窗口不能进入全屏状态
      fullscreenable: false,
      show: false,
    });
    // 渲染路径
    this.lyricWindow.loadFile(join(__dirname, "../main/web/lyric.html"));
  }
  // 应用程序事件
  handleAppEvents() {
    // 窗口被关闭时
    app.on("window-all-closed", () => {
      if (!isMac) app.quit();
      this.mainWindow = null;
      this.loadingWindow = null;
    });

    // 应用被激活
    app.on("activate", () => {
      const allWindows = BrowserWindow.getAllWindows();
      if (allWindows.length) {
        allWindows[0].focus();
      } else {
        this.createMainWindow();
      }
    });

    // 新增 session
    app.on("second-instance", () => {
      this.showWindow();
    });

    // 开发环境控制台
    app.on("browser-window-created", (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    // 自定义协议
    app.on("open-url", (_, url) => {
      console.log("Received custom protocol URL:", url);
    });

    // 将要退出
    app.on("will-quit", () => {
      // 注销全部快捷键
      unregisterShortcuts();
    });

    // 退出前
    app.on("before-quit", () => {
      this.isQuit = true;
    });
  }
  // 窗口事件
  handleWindowEvents() {
    this.mainWindow?.on("show", () => {
      // this.mainWindow?.webContents.send("lyricsScroll");
    });
    this.mainWindow?.on("focus", () => {
      this.saveBounds();
    });
    // 移动或缩放
    this.mainWindow?.on("resized", () => {
      // 若处于全屏则不保存
      if (this.mainWindow?.isFullScreen()) return;
      this.saveBounds();
    });
    this.mainWindow?.on("moved", () => {
      this.saveBounds();
    });

    // 歌词窗口缩放
    this.lyricWindow?.on("resized", () => {
      const bounds = this.lyricWindow?.getBounds();
      if (bounds) {
        const { width, height } = bounds;
        store.set("lyric", { ...store.get("lyric"), width, height });
      }
    });

    // 窗口关闭
    this.mainWindow?.on("close", (event) => {
      event.preventDefault();
      if (this.isQuit) {
        app.exit();
      } else {
        this.mainWindow?.hide();
      }
    });
  }
  // 更新窗口大小
  saveBounds() {
    if (this.mainWindow?.isFullScreen()) return;
    const bounds = this.mainWindow?.getBounds();
    if (bounds) store.set("window", bounds);
  }
  // 显示窗口
  showWindow() {
    if (this.mainWindow) {
      this.mainWindow.show();
      if (this.mainWindow.isMinimized()) this.mainWindow.restore();
      this.mainWindow.focus();
    }
  }
}

export default new MainProcess();
