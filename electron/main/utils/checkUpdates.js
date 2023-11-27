const { autoUpdater } = require("electron-updater");

const checkForUpdates = () => {
  autoUpdater.checkForUpdates();
};

export const configureAutoUpdater = () => {
  checkForUpdates();

  // 监听检查更新的事件
  autoUpdater.on("checking-for-update", () => {
    console.log("Checking for update...");
  });

  autoUpdater.on("update-available", (info) => {
    console.log("Update available:", info);
  });

  autoUpdater.on("update-not-available", () => {
    console.log("Update not available.");
  });

  autoUpdater.on("update-downloaded", () => {
    console.log("Update downloaded. Ready to install.");

    // 在需要的时候，触发安装更新
    autoUpdater.quitAndInstall();
  });
};
