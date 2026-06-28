import { electronApp } from "@electron-toolkit/utils";
import { app, BrowserWindow, session } from "electron";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { rustSidecar } from "./services/RustSidecarService";
import initIpc from "./ipc";
import { shutdownMedia } from "./ipc/ipc-media";
import { processLog } from "./logger";
import { MpvService } from "./services/MpvService";
import { SocketService } from "./services/SocketService";
import { unregisterShortcuts } from "./shortcut";
import { initTray, MainTray } from "./tray";
import { isMac } from "./utils/config";
import { trySendCustomProtocol } from "./utils/protocol";
import { initSingleLock } from "./utils/single-lock";
import loadWindow from "./windows/load-window";
import mainWindow from "./windows/main-window";
import { setAppQuitting } from "./utils/lifecycle";
import { closeTaskbarLyricWindow } from "./windows/taskbar-lyric-window";

// 屏蔽报错
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

// 便携模式下设置用户数据路径
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  processLog.info(
    "🔍 Portable mode detected, setting userData path to:",
    join(process.env.PORTABLE_EXECUTABLE_DIR, "UserData"),
  );
  const userDataPath = join(process.env.PORTABLE_EXECUTABLE_DIR, "UserData");
  if (!existsSync(userDataPath)) mkdirSync(userDataPath, { recursive: true });
  app.setPath("userData", userDataPath);
}

// 主进程
class MainProcess {
  // 窗口
  mainWindow: BrowserWindow | null = null;
  loadWindow: BrowserWindow | null = null;
  // 托盘
  mainTray: MainTray | null = null;
  // 是否退出
  isQuit: boolean = false;
  // Rust sidecar 是否已启用
  useRustBackend: boolean = false;

  constructor() {
    processLog.info("🚀 Main process startup");

    // 在 Windows、Linux 和 MacOS 上禁用自带的媒体控件功能，因为我们已经通过原生插件实现媒体控件的集成了
    const platform = process.platform;
    const hasNativeMediaSupport = ["win32", "linux", "darwin"].includes(platform);

    if (hasNativeMediaSupport) {
      app.commandLine.appendSwitch(
        "disable-features",
        "HardwareMediaKeyHandling,MediaSessionService",
      );
    }

    if (platform === "win32") {
      app.commandLine.appendSwitch("disable-gpu-process-crash-limit");
    }

    app.commandLine.appendSwitch("disable-renderer-backgrounding");
    app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");

    initSingleLock();
    this.handleAppEvents();
    app.whenReady().then(async () => {
      processLog.info("🚀 Application Process Startup");

      session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const responseHeaders = { ...details.responseHeaders };
        const url = new URL(details.url);

        if (url.searchParams.get("win") === "desktop-lyric") {
          callback({ responseHeaders });
          return;
        }

        responseHeaders["Cross-Origin-Opener-Policy"] = ["same-origin"];
        responseHeaders["Cross-Origin-Embedder-Policy"] = ["require-corp"];
        responseHeaders["Cross-Origin-Resource-Policy"] = ["cross-origin"];

        callback({ responseHeaders });
      });

      electronApp.setAppUserModelId("com.imsyy.splayer");

      // 启动 Rust sidecar API 服务
      const rustOk = await rustSidecar.start();
      if (!rustOk) {
        processLog.error("❌ Rust sidecar 启动失败，应用不可用");
        app.quit();
        return;
      }

      this.useRustBackend = true;

      this.loadWindow = loadWindow.create();
      this.mainWindow = mainWindow.create();
      this.mainTray = initTray(this.mainWindow!);
      initIpc();
      SocketService.tryAutoStart();
    });
  }

  handleAppEvents() {
    app.on("window-all-closed", () => {
      if (!isMac) app.quit();
      this.mainWindow = null;
      this.loadWindow = null;
    });

    app.on("activate", () => {
      if (isMac) {
        mainWindow.showWindow();
        return;
      }

      const allWindows = BrowserWindow.getAllWindows();
      if (allWindows.length) {
        allWindows[0].focus();
      }
    });

    app.on("open-url", (_, url) => {
      processLog.log("🔗 Received custom protocol URL:", url);
      trySendCustomProtocol(url);
    });

    app.on("before-quit", (event) => {
      if (this.isQuit) return;
      event.preventDefault();
      this.isQuit = true;
      setAppQuitting();
      (async () => {
        unregisterShortcuts();
        shutdownMedia();
        closeTaskbarLyricWindow();

        // 停止 Rust sidecar
        rustSidecar.stop();

        const mpvService = MpvService.getInstance();
        try {
          await mpvService.stop();
          processLog.info("MPV 进程已停止");
        } catch (err) {
          processLog.error("停止 MPV 进程失败", err);
        } finally {
          mpvService.terminate();
          processLog.info("MPV 进程已终止");
        }
        processLog.info("全部服务已停止，退出应用...");
        app.exit(0);
      })();
    });
  }
}

export default new MainProcess();
