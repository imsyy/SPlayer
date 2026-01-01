import { usePlayerController } from "@/core/player/PlayerController";
import { useDataStore, useMusicStore, useStatusStore } from "@/stores";
import { SettingType } from "@/types/main";
import { handleProtocolUrl } from "@/utils/protocol";
import { toRaw } from "vue";
import { toLikeSong } from "./auth";
import { isElectron } from "./env";
import { getPlayerInfoObj } from "./format";
import { openSetting, openUpdateApp } from "./modal";
import { useIPCManager } from "./ipcManager";

// 关闭更新状态
const closeUpdateStatus = () => {
  const statusStore = useStatusStore();
  statusStore.updateCheck = false;
};

// 全局 IPC 事件
const initIpc = () => {
  try {
    if (!isElectron) return;
    const player = usePlayerController();
    const ipcManager = useIPCManager();

    // 使用 IPC 管理器注册所有监听器
    // 播放控制
    ipcManager.on("play", () => player.play(), false);
    ipcManager.on("pause", () => player.pause(), false);
    ipcManager.on("playOrPause", () => player.playOrPause(), false);
    ipcManager.on("playPrev", () => player.nextOrPrev("prev"), false);
    ipcManager.on("playNext", () => player.nextOrPrev("next"), false);

    // 音量控制
    ipcManager.on("volumeUp", () => player.setVolume("up"), false);
    ipcManager.on("volumeDown", () => player.setVolume("down"), false);

    // 播放模式
    ipcManager.on("changeRepeat", (_, mode) => player.toggleRepeat(mode), false);
    ipcManager.on("toggleShuffle", (_, mode) => player.toggleShuffle(mode), false);

    // 喜欢歌曲
    ipcManager.on("toggle-like-song", async () => {
      const dataStore = useDataStore();
      const musicStore = useMusicStore();
      await toLikeSong(musicStore.playSong, !dataStore.isLikeSong(musicStore.playSong.id));
    }, false);

    // 设置
    ipcManager.on("openSetting", (_, type: SettingType, scrollTo?: string) => openSetting(type, scrollTo), false);

    // 桌面歌词
    ipcManager.on("toggle-desktop-lyric", () => player.toggleDesktopLyric(), false);
    ipcManager.on("close-desktop-lyric", () => player.setDesktopLyricShow(false), false);

    // 请求歌词数据
    ipcManager.on("request-desktop-lyric-data", () => {
      const musicStore = useMusicStore();
      const statusStore = useStatusStore();
      if (player) {
        const { name, artist } = getPlayerInfoObj() || {};
        // 使用 toRaw 替代 cloneDeep，减少深拷贝开销
        window.electron.ipcRenderer.send(
          "update-desktop-lyric-data",
          toRaw({
            playStatus: statusStore.playStatus,
            playName: name,
            artistName: artist,
            currentTime: statusStore.currentTime,
            songId: musicStore.playSong?.id,
            songOffset: statusStore.getSongOffset(musicStore.playSong?.id),
            lrcData: musicStore.songLyric.lrcData ?? [],
            yrcData: musicStore.songLyric.yrcData ?? [],
            lyricIndex: statusStore.lyricIndex,
          }),
        );
      }
    }, false);

    // 更新相关
    ipcManager.on("update-not-available", () => {
      closeUpdateStatus();
      window.$message.success("当前已是最新版本");
    }, false);

    ipcManager.on("update-available", (_, info) => {
      closeUpdateStatus();
      openUpdateApp(info);
    }, false);

    ipcManager.on("update-error", (_, error) => {
      console.error("Error updating:", error);
      closeUpdateStatus();
      window.$message.error("更新过程出现错误");
    }, false);

    // 协议数据
    ipcManager.on("protocol-url", (_, url) => {
      console.log("📡 Received protocol url:", url);
      handleProtocolUrl(url);
    }, false);

    // 开发环境下打印监听器统计
    if (import.meta.env.DEV) {
      console.log("[initIpc] ✅ IPC 监听器注册完成:", ipcManager.getStats());
    }
  } catch (error) {
    console.error("[initIpc] ❌ 初始化失败:", error);
  }
};

export default initIpc;
