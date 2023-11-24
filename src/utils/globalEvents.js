import { checkPlatform } from "@/utils/helper.js";
import { playOrPause, changePlayIndex } from "@/utils/player.js";

const globalEvents = () => {
  if (!checkPlatform.electron()) return false;
  // 播放或暂停
  electron.ipcRenderer.on("playOrPause", () => {
    playOrPause();
  });
  // 上一曲或下一曲
  electron.ipcRenderer.on("playNextOrPrev", (_, val) => {
    changePlayIndex(val);
  });
};

export default globalEvents;
