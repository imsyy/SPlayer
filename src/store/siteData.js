import { defineStore } from "pinia";

const useSiteDataStore = defineStore("siteData", {
  state: () => {
    return {
      // 站点标题
      siteTitle: import.meta.env.VITE_SITE_TITLE,
      // 封面主题色
      songPicColor: "rgb(128,128,128)",
      // 搜索框激活状态
      searchInputActive: false,
    };
  },
  getters: {},
  actions: {},
  // 开启数据持久化
  persist: [
    {
      storage: localStorage,
      paths: [""],
    },
  ],
});

export default useSiteDataStore;
