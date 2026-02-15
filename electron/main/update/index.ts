import { type BrowserWindow } from "electron";
import { updateLog } from "../logger";
import electronUpdater from "electron-updater";
import { isDev } from "../utils/config";
import { useStore } from "../store";

// import
const { autoUpdater } = electronUpdater;

// 更新源
autoUpdater.setFeedURL({
  provider: "github",
  owner: "imsyy",
  repo: "SPlayer",
});

// 禁用自动下载
autoUpdater.autoDownload = false;

// 是否初始化
let isInit: boolean = false;

// 是否提示
let isShowTip: boolean = false;

// 事件监听
const initUpdaterListeners = (win: BrowserWindow) => {
  if (isInit) return;

  // 当有新版本可用时
  autoUpdater.on("update-available", (info) => {
    win.webContents.send("update-available", info);
    updateLog.info(`🚀 New version available: ${info.version}`);
  });

  // 更新下载进度
  autoUpdater.on("download-progress", (progress) => {
    win.webContents.send("download-progress", progress);
    updateLog.info(`🚀 Downloading: ${progress.percent}%`);
  });

  // 当下载完成时
  autoUpdater.on("update-downloaded", (info) => {
    win.webContents.send("update-downloaded", info);
    updateLog.info(`🚀 Update downloaded: ${info.version}`);
  });

  // 当没有新版本时
  autoUpdater.on("update-not-available", (info) => {
    if (isShowTip) win.webContents.send("update-not-available", info);
    updateLog.info(`✅ No new version available: ${info.version}`);
  });

  // 更新错误
  autoUpdater.on("error", (err) => {
    win.webContents.send("update-error", err);
    updateLog.error(`❌ Update error: ${err.message}`);
  });

  isInit = true;
};

// 强制开发环境调试
if (isDev) autoUpdater.forceDevUpdateConfig = true;

// 检查更新
export const checkUpdate = (win: BrowserWindow, showTip: boolean = false) => {
  // 初始化事件监听器
  initUpdaterListeners(win);
  // 更改提示
  isShowTip = showTip;

  // 获取更新通道
  const store = useStore();
  const updateChannel = store.get("updateChannel") || "stable";
  const allowPrerelease = updateChannel === "nightly";

  // 设置更新通道
  autoUpdater.channel = updateChannel === "nightly" ? "nightly" : "latest";
  // 设置是否允许 Pre-release
  autoUpdater.allowPrerelease = allowPrerelease;
  // 检查更新
  autoUpdater
    .checkForUpdates()
    .then((res) => {
      // 如果返回 null (例如在开发环境且未配置 dev-app-update.yml 时可能发生，或者被跳过)
      // 则手动发送 update-not-available 以结束前端 loading
      if (!res) {
        if (isShowTip) {
          win.webContents.send("update-not-available", {
            version: "0.0.0",
            files: [],
            path: "",
            sha512: "",
            releaseDate: "",
          });
        }
        updateLog.info("Update check skipped or no update info returned.");
      }
    })
    .catch((err) => {
      updateLog.error(`Check update error: ${err}`);
      win.webContents.send("update-error", err);
    });
};

// 开始下载
export const startDownloadUpdate = () => {
  autoUpdater.downloadUpdate();
};

// 安装已下载的更新
export const installUpdate = () => {
  autoUpdater.quitAndInstall();
};
