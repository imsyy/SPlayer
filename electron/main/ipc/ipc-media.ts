import {
  DiscordConfigPayload,
  MetadataParam,
  PlaybackStatus,
  PlayModePayload,
  SystemMediaEvent,
  TimelinePayload,
} from "@emi";
import { app, ipcMain } from "electron";
import { join } from "path";
import { processLog } from "../logger";
import { loadNativeModule } from "../utils/native-loader";
import mainWindow from "../windows/main-window";

type EmiModule = typeof import("@emi");

/**
 * 外部媒体集成模块
 */
let emi: EmiModule | null = null;

/**
 * 派发事件到主窗口渲染进程
 */
const emitMediaEvent = (event: SystemMediaEvent) => {
  const mainWin = mainWindow.getWin();
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send("media-event", event);
  }
};

/** 初始化 EMI */
const initNativeMedia = () => {
  emi = loadNativeModule("external-media-integration.node", "external-media-integration");
  if (!emi) {
    processLog.warn("[Media] 找不到 EMI 模块，媒体集成功能将不可用");
    return;
  }

  try {
    const logDir = join(app.getPath("userData"), "logs", "external-media-integration");
    emi.initialize(logDir);
    processLog.info("[Media] EMI 已初始化");

    emi.registerEventHandler((event) => {
      emitMediaEvent(event);
    });

    emi.enableSystemMedia();
  } catch (e) {
    processLog.error("[Media] 初始化时失败", e);
  }
};

/** 初始化媒体 IPC */
const initMediaIpc = () => {
  // 初始化原生模块
  initNativeMedia();

  // 元数据更新
  ipcMain.on("media-update-metadata", (_, payload: MetadataParam) => {
    if (!emi) return;
    try {
      emi.updateMetadata(payload);
    } catch (e) {
      processLog.error("[Media] 更新元数据失败", e);
    }
  });

  // 播放状态更新
  ipcMain.on("media-update-play-state", (_, payload: { status: PlaybackStatus }) => {
    if (!emi) return;
    try {
      emi.updatePlayState(payload);
    } catch (e) {
      processLog.error("[Media] 更新播放状态失败", e);
    }
  });

  // 播放速率更新
  ipcMain.on("media-update-playback-rate", (_, payload: { rate: number }) => {
    if (!emi) return;
    try {
      emi.updatePlaybackRate(payload.rate);
    } catch (e) {
      processLog.error("[Media] 更新播放速率失败", e);
    }
  });

  // 进度更新
  ipcMain.on("media-update-timeline", (_, payload: TimelinePayload) => {
    if (!emi) return;
    try {
      emi.updateTimeline(payload);
    } catch (e) {
      processLog.error("[Media] 更新进度失败", e);
    }
  });

  // 播放模式更新
  ipcMain.on("media-update-play-mode", (_, payload: PlayModePayload) => {
    if (!emi) return;
    try {
      emi.updatePlayMode(payload);
    } catch (e) {
      processLog.error("[Media] 更新播放模式失败", e);
    }
  });

  // Discord 启用
  ipcMain.on("discord-enable", () => {
    if (emi) {
      try {
        emi.enableDiscordRpc();
      } catch (e) {
        processLog.error("[Discord RPC] 启用失败", e);
      }
    }
  });

  // Discord 禁用
  ipcMain.on("discord-disable", () => {
    if (emi) {
      try {
        emi.disableDiscordRpc();
      } catch (e) {
        processLog.error("[Discord RPC] 禁用失败", e);
      }
    }
  });

  // Discord 更新配置
  ipcMain.on("discord-update-config", (_, payload: DiscordConfigPayload) => {
    if (emi) {
      try {
        emi.updateDiscordConfig(payload);
      } catch (e) {
        processLog.error("[Discord RPC] 更新配置失败", e);
      }
    }
  });

  processLog.info("[Media] 媒体 IPC 已初始化");
};

/**
 * 关闭媒体 IPC
 */
export const shutdownMedia = () => {
  if (emi) {
    try {
      emi.shutdown();
    } catch (e) {
      processLog.error("[Media] 关闭时出错", e);
    }
  }

  processLog.info("[Media] 媒体 IPC 已关闭");
};

export default initMediaIpc;
