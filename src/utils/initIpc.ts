import { isElectron } from "./helper";
import { openUpdateApp } from "./modal";
import { useMusicStore, useDataStore } from "@/stores";
import player from "./player";
import { toLikeSong } from "./auth";

// 全局 IPC 事件
const initIpc = () => {
  try {
    if (!isElectron) return;
    // 播放
    window.electron.ipcRenderer.on("play", () => player.play());
    // 暂停
    window.electron.ipcRenderer.on("pause", () => player.pause());
    // 播放或暂停
    window.electron.ipcRenderer.on("playOrPause", () => player.playOrPause());
    // 上一曲
    window.electron.ipcRenderer.on("playPrev", () => player.nextOrPrev("prev"));
    // 下一曲
    window.electron.ipcRenderer.on("playNext", () => player.nextOrPrev("next"));
    // 音量加
    window.electron.ipcRenderer.on("volumeUp", () => player.setVolume("up"));
    // 音量减
    window.electron.ipcRenderer.on("volumeDown", () => player.setVolume("down"));
    // 播放模式切换
    window.electron.ipcRenderer.on("changeMode", (_, mode) => player.togglePlayMode(mode));
    // 喜欢歌曲
    window.electron.ipcRenderer.on("toogleLikeSong", async () => {
      const dataStore = useDataStore();
      const musicStore = useMusicStore();
      await toLikeSong(musicStore.playSong, !dataStore.isLikeSong(musicStore.playSong.id));
    });
    // 桌面歌词开关
    window.electron.ipcRenderer.on("toogleDesktopLyric", () => player.toggleDesktopLyric());
    window.electron.ipcRenderer.on("closeDesktopLyric", () => player.toggleDesktopLyric());
    // 无更新
    window.electron.ipcRenderer.on("update-not-available", () => {
      window.$message.success("当前已是最新版本");
    });
    // 有更新
    window.electron.ipcRenderer.on("update-available", (_, info) => openUpdateApp(info));
    // 更新错误
    window.electron.ipcRenderer.on("update-error", (_, error) => {
      console.error("Error updating:", error);
      window.$message.error("更新过程出现错误");
    });
  } catch (error) {
    console.log(error);
  }
};

export default initIpc;
