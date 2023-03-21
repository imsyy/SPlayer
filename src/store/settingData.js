import { defineStore } from "pinia";
import { NIcon } from "naive-ui";
import { WbSunnyFilled, DarkModeFilled } from "@vicons/material";

const useSettingDataStore = defineStore("settingData", {
  state: () => {
    return {
      // 全局主题
      theme: "light",
      // 轮播图显示
      bannerShow: true,
      // 列表点击方式
      listClickMode: "dblclick",
      // 播放器样式
      playerStyle: "cover",
      // 底栏歌词显示
      bottomLyricShow: true,
      // 是否显示歌词翻译
      showTransl: true,
      // 歌曲音质
      songLevel: "exhigh",
      // 歌词位置
      lyricsPosition: "left",
      // 歌词滚动位置
      lyricsBlock: "center",
      // 歌词大小
      lyricsFontSize: 2.4,
      // 音乐频谱
      musicFrequency: false,
    };
  },
  getters: {
    // 获取明暗模式
    getSiteTheme(state) {
      return state.theme;
    },
    // 获取是否开启翻译
    getShowTransl(state) {
      return state.showTransl;
    },
  },
  actions: {
    // 切换明暗模式
    setSiteTheme(value) {
      const isLightMode = value === "light";
      const message = isLightMode ? "已切换至浅色模式" : "已切换至深色模式";
      const icon = isLightMode ? WbSunnyFilled : DarkModeFilled;
      this.theme = value;
      $message.info(message, {
        icon: () => h(NIcon, null, { default: () => h(icon) }),
      });
    },
    // 更改翻译开启选项
    setShowTransl(value) {
      this.showTransl = value;
    },
  },
  // 开启数据持久化
  persist: [
    {
      storage: localStorage,
    },
  ],
});

export default useSettingDataStore;
