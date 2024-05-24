import { playOrPause, setVolume } from "@/utils/Player";
import { siteStatus } from "@/stores";

/**
 * 全局快捷键监听
 * @param {KeyboardEvent} e - 键盘事件对象
 * @param {import('vue-router').Router} router - router
 * @returns {boolean} - 如果事件对象不存在，则返回false
 */
const globalShortcut = (e, router) => {
  if (!e) return false;
  e.preventDefault();
  e.stopPropagation();

  // 播放或暂停
  if (e.code === "Space") {
    if (e.target.tagName === "INPUT") return false;
    if (router.currentRoute.value.name === "videos-player") return false;
    playOrPause();
  }

  // 调整音量
  if (e.code === "ArrowUp" || e.code === "ArrowDown") {
    const status = siteStatus();
    const volume = status.playVolume;
    const delta = e.code === "ArrowUp" ? 0.1 : -0.1;
    const newVolume = Math.min(1, Math.max(0, volume + delta));
    setVolume(newVolume);
    status.playVolume = newVolume;
  }
};

export default globalShortcut;
