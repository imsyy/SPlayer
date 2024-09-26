import Store from "electron-store";
import log from "./logger";

log.info("🌱 Store init");

export interface StoreType {
  window: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
  lyric: {
    fontSize: number;
    mainColor: string;
    shadowColor: string;
    // 窗口位置
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  proxy: string;
}

// 初始化仓库
const store = new Store<StoreType>({
  defaults: {
    window: {
      width: 1280,
      height: 800,
    },
    lyric: {
      fontSize: 30,
      mainColor: "#fff",
      shadowColor: "rgba(0, 0, 0, 0.5)",
      x: 0,
      y: 0,
      width: 800,
      height: 180,
    },
    proxy: "",
  },
});

export default store;
