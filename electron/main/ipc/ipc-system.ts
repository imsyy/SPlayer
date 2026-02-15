import { app, ipcMain, net, powerSaveBlocker, session } from "electron";
import { ipcLog } from "../logger";
import { getFonts } from "font-list";
import { useStore } from "../store";
import mainWindow from "../windows/main-window";

/**
 * 初始化系统 IPC 通信
 * @returns void
 */
const initSystemIpc = (): void => {
  const store = useStore();

  /** 阻止系统息屏 ID */
  let preventId: number | null = null;

  // 是否阻止系统息屏
  ipcMain.on("prevent-sleep", (_event, val: boolean) => {
    if (val) {
      preventId = powerSaveBlocker.start("prevent-display-sleep");
      ipcLog.info("⏾ System sleep prevention started");
    } else {
      if (preventId !== null) {
        powerSaveBlocker.stop(preventId);
        ipcLog.info("✅ System sleep prevention stopped");
      }
    }
  });

  // 退出应用
  ipcMain.on("quit-app", () => {
    app.quit();
  });

  // 重启应用
  ipcMain.on("restart-app", () => {
    ipcLog.info("🔄 Restarting application...");
    app.relaunch();
    app.exit(0);
  });

  // 获取系统全部字体
  ipcMain.handle("get-all-fonts", async () => {
    try {
      const fonts = await getFonts();
      return fonts;
    } catch (error) {
      ipcLog.error(`❌ Failed to get all system fonts: ${error}`);
      return [];
    }
  });

  // 取消代理
  ipcMain.on("remove-proxy", () => {
    const mainWin = mainWindow.getWin();
    store.set("proxy", "");
    if (mainWin) {
      mainWin?.webContents.session.setProxy({ proxyRules: "" });
    }
    ipcLog.info("✅ Remove proxy successfully");
  });

  // 配置网络代理
  ipcMain.on("set-proxy", (_, config) => {
    const mainWin = mainWindow.getWin();
    if (!mainWin) return;
    const proxyRules = `${config.protocol}://${config.server}:${config.port}`;
    store.set("proxy", proxyRules);
    mainWin?.webContents.session.setProxy({ proxyRules });
    ipcLog.info("✅ Set proxy successfully:", proxyRules);
  });

  // 代理测试
  ipcMain.handle("test-proxy", async (_, config) => {
    const proxyRules = `${config.protocol}://${config.server}:${config.port}`;
    try {
      // 设置代理
      const ses = session.defaultSession;
      await ses.setProxy({ proxyRules });
      // 测试请求
      const request = net.request({ url: "https://www.baidu.com" });
      return new Promise((resolve) => {
        request.on("response", (response) => {
          if (response.statusCode === 200) {
            ipcLog.info("✅ Proxy test successful");
            resolve(true);
          } else {
            ipcLog.error(`❌ Proxy test failed with status code: ${response.statusCode}`);
            resolve(false);
          }
        });
        request.on("error", (error) => {
          ipcLog.error("❌ Error testing proxy:", error);
          resolve(false);
        });
        request.end();
      });
    } catch (error) {
      ipcLog.error("❌ Error testing proxy:", error);
      return false;
    }
  });

  // 重置全部设置
  ipcMain.on("reset-setting", () => {
    store.reset();
    ipcLog.info("✅ Reset setting successfully");
  });
};

export default initSystemIpc;
