import { checkPlatform } from "@/utils/helper";
import { playOrPause, changePlayIndex } from "@/utils/Player";
import { siteStatus } from "@/stores";

/**
 * 全局事件
 * @param {import('vue-router').Router} router - router
 */
const globalEvents = (router) => {
  if (!checkPlatform.electron()) return false;
  // 显示播放器
  electron.ipcRenderer.on("showPlayer", () => {
    const status = siteStatus();
    if (status.playMode === "dj") return false;
    status.showFullPlayer = true;
  });
  // 播放或暂停
  electron.ipcRenderer.on("playOrPause", () => {
    playOrPause();
  });
  // 上一曲或下一曲
  electron.ipcRenderer.on("playNextOrPrev", (_, val) => {
    changePlayIndex(val, true);
  });
  // 全局设置
  electron.ipcRenderer.on("open-setting", () => {
    if (router) router.push("/setting");
    const status = siteStatus();
    status.showFullPlayer = false;
  });
};

export default globalEvents;
