import { checkPlatform } from "@/utils/helper";
import { playOrPause, changePlayIndex } from "@/utils/Player";

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
