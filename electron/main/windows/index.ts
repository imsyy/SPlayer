import { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import { windowsLog } from "../logger";
import { appName } from "../utils/config";
import { join } from "path";
import icon from "../../../public/icons/favicon.png?asset";

export const createWindow = (
  options: BrowserWindowConstructorOptions = {},
): BrowserWindow | null => {
  try {
    const defaultOptions: BrowserWindowConstructorOptions = {
      title: appName,
      width: 1280,
      height: 720,
      frame: false, // 是否显示窗口边框
      center: true, // 窗口居中
      icon, // 窗口图标
      autoHideMenuBar: true, // 隐藏菜单栏
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
      },
    };
    // 合并参数
    if (options.webPreferences) {
      options.webPreferences = Object.assign(
        {},
        defaultOptions.webPreferences,
        options.webPreferences,
      );
    }
    options = Object.assign(defaultOptions, options);
    // 创建窗口
    const win = new BrowserWindow(options);
    return win;
  } catch (error) {
    windowsLog.error(error);
    return null;
  }
};
