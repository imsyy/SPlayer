import { dialog, shell } from "electron";
import { is } from "@electron-toolkit/utils";
import pkg from "electron-updater";

const { autoUpdater } = pkg;

// 更新弹窗
const hasNewVersion = (info) => {
  dialog
    .showMessageBox({
      title: "发现新版本 v" + info.version,
      message: "发现新版本 v" + info.version,
      detail: "是否前往 GitHub 下载新版本安装包？",
      buttons: ["前往", "取消"],
      type: "question",
      noLink: true,
    })
    .then((result) => {
      if (result.response === 0) {
        shell.openExternal("https://github.com/imsyy/SPlayer/releases");
      }
    });
};

export const configureAutoUpdater = () => {
  if (is.dev) return false;
  autoUpdater.checkForUpdatesAndNotify();
  // 若有更新
  autoUpdater.on("update-available", (info) => {
    hasNewVersion(info);
  });
};
