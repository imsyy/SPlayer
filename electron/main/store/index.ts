import { app, screen } from "electron";
import Store from "electron-store";
import { join } from "path";
import defaultLyricConfig from "../../../src/assets/data/lyricConfig";
import type { LyricConfig } from "../../../src/types/desktop-lyric";
import { storeLog } from "../logger";
import { defaultAMLLDbServer } from "../utils/config";

storeLog.info("🌱 Store init");

export interface StoreType {
  /** 窗口 */
  window: {
    /** 窗口宽度 */
    width: number;
    /** 窗口高度 */
    height: number;
    /** 窗口位置 x */
    x?: number;
    /** 窗口位置 y */
    y?: number;
    /** 是否最大化 */
    maximized?: boolean;
    /** 是否启用无边框窗口 */
    useBorderless?: boolean;
    /** 缩放系数 (0.5 - 2.0) */
    zoomFactor?: number;
  };
  /** 歌词 */
  lyric: {
    /** 窗口位置 x */
    x?: number;
    /** 窗口位置 y */
    y?: number;
    /** 窗口宽度 */
    width?: number;
    /** 窗口高度 */
    height?: number;
    /** 配置 */
    config?: LyricConfig;
  };
  /** 任务栏歌词 */
  taskbar: {
    /** 是否启用 */
    enabled: boolean;
    /** 最大宽度 */
    maxWidth?: number;
    /** 显示封面 */
    showCover?: boolean;
    /** 位置 */
    position?: "automatic" | "left" | "right";
    /** 暂停时显示 */
    showWhenPaused?: boolean;
    /** 自动收缩 */
    autoShrink?: boolean;
    /** 边距 */
    margin?: number;
    /** 最小宽度 (百分比) */
    minWidth?: number;
  };
  /** 代理 */
  proxy: string;
  /** amll-db-server */
  amllDbServer: string;
  /** 缓存地址 */
  cachePath: string;
  /** 缓存大小限制 (GB) */
  cacheLimit: number;
  /** websocket */
  websocket: {
    /** 是否启用 */
    enabled: boolean;
    /** 端口 */
    port: number;
  };
  /** 下载线程数 */
  downloadThreadCount?: number;
  /** 启用HTTP2下载 */
  enableDownloadHttp2?: boolean;
  /** macOS 专属设置 */
  macos: {
    /** 状态栏歌词 */
    statusBarLyric: {
      /** 是否启用 */
      enabled: boolean;
    };
  };
  /** 更新通道 */
  updateChannel?: "stable" | "nightly";
}

/**
 * 使用 Store
 * @returns Store<StoreType>
 */
export const useStore = () => {
  // 获取主屏幕
  const screenData = screen.getPrimaryDisplay();
  return new Store<StoreType>({
    defaults: {
      window: {
        width: 1280,
        height: 800,
        useBorderless: true,
      },
      lyric: {
        x: screenData.workAreaSize.width / 2 - 400,
        y: screenData.workAreaSize.height - 90,
        width: 800,
        height: 136,
        config: defaultLyricConfig,
      },
      taskbar: {
        enabled: false,
        maxWidth: 30,
        showCover: true,
        position: "automatic",
        showWhenPaused: true,
        autoShrink: false,
        margin: 10,
        minWidth: 10,
      },
      macos: {
        statusBarLyric: {
          enabled: false,
        },
      },
      proxy: "",
      amllDbServer: defaultAMLLDbServer,
      cachePath: join(app.getPath("userData"), "DataCache"),
      cacheLimit: 10, // 默认 10GB
      // websocket
      websocket: {
        enabled: false,
        port: 25885,
      },
      downloadThreadCount: 8,
      enableDownloadHttp2: true,
      updateChannel: "stable",
    },
  });
};
