// 站点状态
import { defineStore } from "pinia";

const useSiteStatusStore = defineStore("siteStatus", {
  state: () => {
    return {
      // 菜单折叠状态
      asideMenuCollapsed: false,
      // 搜索框状态
      searchInputFocus: false,
      // 是否展示播放控制条
      showPlayBar: true,
      // 播放状态
      playState: false,
      playLoading: false,
      playUseOtherSource: false,
      // 播放列表状态
      playListShow: false,
      // 全屏播放器状态
      showFullPlayer: false,
      // 播放器功能显示
      playerControlShow: false,
      controlTimeOut: null,
      // 实时播放进度
      playSeek: 0,
      // 是否下一首
      hasNextSong: false,
    };
  },
  getters: {},
  actions: {},
  // 数据持久化
  persist: [
    {
      key: "siteStatus",
      storage: localStorage,
      paths: ["asideMenuCollapsed"],
    },
  ],
});

export default useSiteStatusStore;
