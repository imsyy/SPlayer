import { join } from "path";
import { app, protocol, shell, BrowserWindow, globalShortcut, nativeImage } from "electron";
import { platform, optimizer, is } from "@electron-toolkit/utils";
import { startNcmServer } from "@main/startNcmServer";
import { startMainServer } from "@main/startMainServer";
import createSystemTray from "@main/utils/createSystemTray";
import createGlobalShortcut from "@main/utils/createGlobalShortcut";
import mainIpcMain from "@main/mainIpcMain";
import Store from "electron-store";
import log from "electron-log";

// 屏蔽报错
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

// 配置 log
log.transports.file.resolvePathFn = () =>
  join(app.getPath("documents"), "/SPlayer/SPlayer-log.txt");
// 设置日志文件的最大大小为 2 MB
log.transports.file.maxSize = 2 * 1024 * 1024;
// 绑定 console 事件
console.error = log.error.bind(log);
console.warn = log.warn.bind(log);
console.info = log.info.bind(log);
console.debug = log.debug.bind(log);

// 主进程
class MainProcess {
  constructor() {
    // 主窗口
    this.mainWindow = null;
    // 主代理
    this.mainServer = null;
    // 网易云 API
    this.ncmServer = null;
    // Store
    this.store = new Store({
      // 窗口大小
      windowSize: {
        width: { type: "number", default: 1280 },
        height: { type: "number", default: 740 },
      },
    });
    // 设置应用程序名称
    if (process.platform === "win32") app.setAppUserModelId(app.getName());
    // 初始化
    this.checkApp().then(async (lockObtained) => {
      if (lockObtained) {
        await this.init();
      }
    });
  }

  // 单例锁
  async checkApp() {
    if (!app.requestSingleInstanceLock()) {
      log.error("已有一个程序正在运行，本次启动阻止");
      app.quit();
      // 未获得锁
      return false;
    }
    // 聚焦到当前程序
    else {
      app.on("second-instance", () => {
        if (this.mainWindow) {
          this.mainWindow.show();
          if (this.mainWindow.isMinimized()) this.mainWindow.restore();
          this.mainWindow.focus();
        }
      });
      // 获得锁
      return true;
    }
  }

  // 初始化程序
  async init() {
    log.info("主进程初始化");

    // 启动网易云 API
    try {
      this.ncmServer = await startNcmServer({
        port: import.meta.env.MAIN_VITE_SERVER_PORT,
        host: import.meta.env.MAIN_VITE_SERVER_HOST,
      });
    } catch (error) {
      console.error("启动网易云 API 失败:", error);
    }

    // 非开发环境启动代理
    if (!is.dev) {
      this.mainServer = await startMainServer();
    }

    // 注册应用协议
    app.setAsDefaultProtocolClient("SPlayer");
    // 应用程序准备好之前注册
    protocol.registerSchemesAsPrivileged([
      { scheme: "app", privileges: { secure: true, standard: true } },
    ]);

    // 主应用程序事件
    this.mainAppEvents();
  }

  // 创建主窗口
  createWindow() {
    // 创建浏览器窗口
    this.mainWindow = new BrowserWindow({
      title: app.getName() || "SPlayer",
      width: this.store.get("windowSize.width") || 1280, // 窗口宽度
      height: this.store.get("windowSize.height") || 740, // 窗口高度
      minHeight: 700, // 最小高度
      minWidth: 1200, // 最小宽度
      center: true, // 是否出现在屏幕居中的位置
      show: false, // 初始时不显示窗口
      frame: false, // 无边框
      titleBarStyle: "customButtonsOnHover", // Macos 隐藏菜单栏
      autoHideMenuBar: true, // 失去焦点后自动隐藏菜单栏
      // 图标配置
      icon: nativeImage.createFromPath(join(__dirname, "../../public/images/icons/favicon.png")),
      // 预加载
      webPreferences: {
        // devTools: is.dev,
        preload: join(__dirname, "../preload/index.mjs"),
        sandbox: false,
        webSecurity: false,
        hardwareAcceleration: true,
      },
    });

    // 窗口准备就绪时显示窗口
    this.mainWindow.once("ready-to-show", () => {
      this.mainWindow.show();
      // mainWindow.maximize();
      this.store.set("windowSize", this.mainWindow.getBounds());
    });

    // 主窗口事件
    this.mainWindowEvents();

    // 设置窗口打开处理程序
    this.mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url);
      return { action: "deny" };
    });

    // 渲染路径
    // 在开发模式
    if (is.dev && process.env.ELECTRON_RENDERER_URL) {
      this.mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    }
    // 生产模式
    else {
      this.mainWindow.loadURL(`http://127.0.0.1:${import.meta.env.MAIN_VITE_MAIN_PORT ?? 7899}`);
    }
  }

  // 主应用程序事件
  mainAppEvents() {
    app.whenReady().then(async () => {
      // 创建主窗口
      this.createWindow();
      // 引入主 Ipc
      mainIpcMain(this.mainWindow);
      // 系统托盘
      createSystemTray(this.mainWindow);
      // 注册快捷键
      createGlobalShortcut(this.mainWindow);
    });

    // 开发环境下 F12 打开控制台
    app.on("browser-window-created", (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    // 在 macOS 上，当单击 Dock 图标且没有其他窗口时，通常会重新创建窗口
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) this.createWindow();
    });

    // 自定义协议
    app.on("open-url", (_, url) => {
      console.log("Received custom protocol URL:", url);
    });

    // 将要退出
    app.on("will-quit", () => {
      // 注销全部快捷键
      globalShortcut.unregisterAll();
    });

    // 当所有窗口都关闭时退出应用，macOS 除外
    app.on("window-all-closed", () => {
      if (!platform.isMacOS) {
        app.quit();
      }
    });
  }

  // 主窗口事件
  mainWindowEvents() {
    this.mainWindow.on("show", () => {
      this.mainWindow.webContents.send("lyricsScroll");
    });

    // this.mainWindow.on("hide", () => {
    //   console.info("窗口隐藏");
    // });

    this.mainWindow.on("focus", () => {
      this.mainWindow.webContents.send("lyricsScroll");
    });

    // this.mainWindow.on("blur", () => {
    //   console.info("窗口失去焦点");
    // });

    this.mainWindow.on("maximize", () => {
      this.mainWindow.webContents.send("windowState", true);
    });

    this.mainWindow.on("unmaximize", () => {
      this.mainWindow.webContents.send("windowState", false);
    });

    this.mainWindow.on("resized", () => {
      this.store.set("windowSize", this.mainWindow.getBounds());
    });

    this.mainWindow.on("moved", () => {
      this.store.set("windowSize", this.mainWindow.getBounds());
    });

    // 窗口关闭
    this.mainWindow.on("close", (event) => {
      if (platform.isLinux) {
        app.quit();
      } else {
        if (!app.isQuiting) {
          event.preventDefault();
          this.mainWindow.hide();
        }
        return false;
      }
    });
  }
}

new MainProcess();
