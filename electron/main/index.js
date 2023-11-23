import { join } from "path";
import { app, protocol, shell, BrowserWindow, globalShortcut } from "electron";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { startNcmServer } from "@main/startNcmServer";
import { startMainServer } from "@main/startMainServer";
import createSystemInfo from "@main/createSystemInfo";
import createGlobalShortcut from "@main/createGlobalShortcut";
import mainIpcMain from "@main/mainIpcMain";

// 主窗口
let mainWindow;

// 屏蔽报错
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

// 单例锁
const gotTheLock = app.requestSingleInstanceLock();

// 注册自定义协议
protocol.registerSchemesAsPrivileged([
  { scheme: "imsyy-splayer", privileges: { standard: true, secure: true } },
]);

// 创建主窗口
const createWindow = () => {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1280, // 窗口宽度
    height: 720, // 窗口高度
    minHeight: 700, // 最小高度
    minWidth: 1200, // 最小宽度
    center: true, // 是否出现在屏幕居中的位置
    show: false, // 初始时不显示窗口
    frame: false, // 无边框
    titleBarStyle: "customButtonsOnHover", // Macos 隐藏菜单栏
    autoHideMenuBar: true, // 失去焦点后自动隐藏菜单栏
    // 图标配置
    icon: join(__dirname, "../../public/images/logo/favicon.png"),
    // 预加载
    webPreferences: {
      // devTools: is.dev, //是否开启 DevTools
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      webSecurity: false,
      hardwareAcceleration: true,
    },
  });

  // 窗口准备就绪时显示窗口
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  // 设置窗口打开处理程序
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // 渲染路径
  // 在开发模式
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  }
  // 生产模式
  else {
    mainWindow.loadURL(`http://127.0.0.1:${import.meta.env.MAIN_VITE_MAIN_PORT ?? 7899}`);
  }

  // 监听关闭
  mainWindow.on("close", (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
};

// 初始化完成
app.whenReady().then(async () => {
  // 尝试获取单例锁
  if (!gotTheLock) {
    // 如果获取不到单例锁，表示已经有一个实例在运行
    app.quit();
    console.error("已有一个程序正在运行");
    return false;
  }

  // 初始化完成并准备创建浏览器窗口
  // 为 Windows 设置应用程序用户模型 ID
  electronApp.setAppUserModelId("com.electron");

  // 在开发模式下默认通过 F12 打开或关闭 DevTools
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // 创建主窗口
  createWindow();

  // 创建系统信息
  createSystemInfo(mainWindow);

  // 在 macOS 上，当单击 Dock 图标且没有其他窗口时，通常会重新创建窗口
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // 自定义协议
  app.on("open-url", (_, url) => {
    // 在这里处理自定义协议的事件，比如打开相应的窗口或执行其他操作
    console.log("Received custom protocol URL:", url);
  });

  // 启动网易云 API
  await startNcmServer({
    port: import.meta.env.MAIN_VITE_SERVER_PORT,
    host: import.meta.env.MAIN_VITE_SERVER_HOST,
  });

  // 引入主 Ipc
  mainIpcMain(mainWindow);

  // 非开发环境启动代理
  if (!is.dev) await startMainServer();

  // 注册快捷键
  createGlobalShortcut(mainWindow);
});

// 将要退出
app.on("will-quit", () => {
  // 注销全部快捷键
  globalShortcut.unregisterAll();
});

// 当所有窗口都关闭时退出应用，macOS 除外
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
