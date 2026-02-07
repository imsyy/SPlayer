import { usePlayerController } from "@/core/player/PlayerController";
import * as playerIpc from "@/core/player/PlayerIpc";
import { useDataStore, useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import type { SettingType } from "@/types/main";
import { handleProtocolUrl } from "@/utils/protocol";
import { cloneDeep } from "lodash-es";
import { toRaw, watch } from "vue";
import { toLikeSong } from "./auth";
import { isElectron } from "./env";
import { getPlayerInfoObj } from "./format";
import { openSetting, openUpdateApp } from "./modal";
import themeColor from "@/assets/data/themeColor.json";
import { getThemeFromColor } from "@/utils/color";
import { rgbToHex } from "@imsyy/color-utils";

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
    const settingStore = useSettingStore();
    const statusStore = useStatusStore();

    // 计算并发送任务栏主题色
    const sendTaskbarTheme = () => {
      let colorPayload: { dark: string; light: string } | null = null;
      if (settingStore.themeGlobalColor && settingStore.taskbarLyricUseThemeColor) {
        let colorData;
        if (settingStore.themeFollowCover && statusStore.songCoverTheme) {
          colorData = statusStore.songCoverTheme;
        } else {
          const color =
            settingStore.themeColorType === "custom"
              ? settingStore.themeCustomColor
              : themeColor[settingStore.themeColorType as keyof typeof themeColor]?.color ||
                "#fe7971";
          colorData = getThemeFromColor(color, settingStore.themeVariant);
        }
        // 分别获取亮暗模式的主色
        const darkPrimary = colorData.dark.primary;
        const lightPrimary = colorData.light.primary;
        colorPayload = {
          dark: rgbToHex(darkPrimary.r, darkPrimary.g, darkPrimary.b),
          light: rgbToHex(lightPrimary.r, lightPrimary.g, lightPrimary.b),
        };
      }
      playerIpc.sendTaskbarThemeColor(colorPayload);
    };

    // 监听主题变化
    watch(
      [
        () => settingStore.themeGlobalColor,
        () => settingStore.themeFollowCover,
        () => settingStore.themeColorType,
        () => settingStore.themeCustomColor,
        () => settingStore.themeVariant,
        () => settingStore.taskbarLyricUseThemeColor,
        () => statusStore.songCoverTheme,
      ],
      () => {
        sendTaskbarTheme();
      },
      { deep: true },
    );

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
    window.electron.ipcRenderer.on("changeRepeat", (_, mode) => player.toggleRepeat(mode));
    window.electron.ipcRenderer.on("toggleShuffle", (_, mode) => player.toggleShuffle(mode));
    // 喜欢歌曲
    window.electron.ipcRenderer.on("toggle-like-song", async () => {
      const dataStore = useDataStore();
      const musicStore = useMusicStore();
      await toLikeSong(musicStore.playSong, !dataStore.isLikeSong(musicStore.playSong.id));
    });
    // 开启设置
    window.electron.ipcRenderer.on("openSetting", (_, type: SettingType, scrollTo?: string) =>
      openSetting(type, scrollTo),
    );
    // 桌面歌词开关
    window.electron.ipcRenderer.on("toggle-desktop-lyric", () => player.toggleDesktopLyric());
    // 显式关闭桌面歌词
    window.electron.ipcRenderer.on("close-desktop-lyric", () => player.setDesktopLyricShow(false));
    // 任务栏歌词开关
    window.electron.ipcRenderer.on("toggle-taskbar-lyric", () => player.toggleTaskbarLyric());
    // 给任务栏歌词初始数据
    window.electron.ipcRenderer.on("taskbar:request-data", () => {
      const musicStore = useMusicStore();
      const statusStore = useStatusStore();
      const settingStore = useSettingStore();
      const { name, artist } = getPlayerInfoObj() || {};
      const cover = musicStore.playSong?.cover || "";
      const dynamicCover = musicStore.dynamicCover || "";

      playerIpc.sendTaskbarMetadata({
        title: name || "",
        artist: artist || "",
        cover,
        dynamicCover,
      });
      playerIpc.sendTaskbarState({
        isPlaying: statusStore.playStatus,
      });

      // 发送歌词数据
      playerIpc.sendTaskbarLyrics(musicStore.songLyric);

      // 发送设置
      window.electron.ipcRenderer.send(
        "taskbar:set-show-cover",
        settingStore.taskbarLyricShowCover,
      );
      window.electron.ipcRenderer.send("taskbar:set-max-width", settingStore.taskbarLyricMaxWidth);
      window.electron.ipcRenderer.send("taskbar:set-position", settingStore.taskbarLyricPosition);
      window.electron.ipcRenderer.send(
        "taskbar:set-show-when-paused",
        settingStore.taskbarLyricShowWhenPaused,
      );
      window.electron.ipcRenderer.send(
        "taskbar:set-auto-shrink",
        settingStore.taskbarLyricAutoShrink,
      );
      window.electron.ipcRenderer.send("taskbar:broadcast-settings", {
        animationMode: settingStore.taskbarLyricAnimationMode,
        singleLineMode: settingStore.taskbarLyricSingleLineMode,
        lyricFont: settingStore.LyricFont,
        globalFont: settingStore.globalFont,
        fontWeight: settingStore.taskbarLyricFontWeight,
        showTran: settingStore.showTran,
        showRoma: settingStore.showRoma,
      });

      playerIpc.sendTaskbarProgressData({
        currentTime: statusStore.currentTime * 1000,
        duration: statusStore.duration * 1000,
        offset: statusStore.getSongOffset(musicStore.playSong?.id),
      });

      // 发送初始主题色
      sendTaskbarTheme();
    });

    // 请求歌词数据
    window.electron.ipcRenderer.on("request-desktop-lyric-data", () => {
      const musicStore = useMusicStore();
      const statusStore = useStatusStore();
      if (player) {
        const { name, artist } = getPlayerInfoObj() || {};
        window.electron.ipcRenderer.send(
          "update-desktop-lyric-data",
          cloneDeep({
            playStatus: statusStore.playStatus,
            playName: name,
            artistName: artist,
            currentTime: statusStore.currentTime,
            songId: musicStore.playSong?.id,
            songOffset: statusStore.getSongOffset(musicStore.playSong?.id),
            lrcData: musicStore.songLyric.lrcData ?? [],
            yrcData: musicStore.songLyric.yrcData ?? [],
            lyricIndex: statusStore.lyricIndex,
            lyricLoading: statusStore.lyricLoading,
          }),
        );
      }
    });
    // 无更新
    window.electron.ipcRenderer.on("update-not-available", () => {
      closeUpdateStatus();
      window.$message.success("当前已是最新版本");
    });
    // 有更新
    window.electron.ipcRenderer.on("update-available", (_, info) => {
      closeUpdateStatus();
      openUpdateApp(info);
    });
    // 更新错误
    window.electron.ipcRenderer.on("update-error", (_, error) => {
      console.error("Error updating:", error);
      closeUpdateStatus();
      window.$message.error("更新过程出现错误");
    });
    // 协议数据
    window.electron.ipcRenderer.on("protocol-url", (_, url) => {
      console.log("📡 Received protocol url:", url);
      handleProtocolUrl(url);
    });
    // 请求播放信息
    window.electron.ipcRenderer.on("request-track-info", () => {
      const musicStore = useMusicStore();
      const statusStore = useStatusStore();
      const { name, artist, album } = getPlayerInfoObj() || {};
      // 获取原始对象
      const playSong = toRaw(musicStore.playSong);
      const songLyric = statusStore.lyricLoading
        ? { lrcData: [], yrcData: [] }
        : toRaw(musicStore.songLyric);
      window.electron.ipcRenderer.send(
        "return-track-info",
        cloneDeep({
          playStatus: statusStore.playStatus,
          playName: name,
          artistName: artist,
          albumName: album,
          currentTime: statusStore.currentTime,
          // 音量及播放速率
          volume: statusStore.playVolume,
          playRate: statusStore.playRate,
          ...playSong,
          // 歌词及加载状态
          lyricLoading: statusStore.lyricLoading,
          lyricIndex: statusStore.lyricIndex,
          ...songLyric,
        }),
      );
    });
  } catch (error) {
    console.log(error);
  }
};

export default initIpc;
