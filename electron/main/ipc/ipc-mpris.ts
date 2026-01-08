import { ipcMain, BrowserWindow } from "electron";
import { IpcChannelMap } from "../../../src/types/global";
import { processLog } from "../logger";
import { loadNativeModule } from "../utils/native-loader";

let mprisInstance: any = null;

export default function initMprisIpc() {
  // 仅在 Linux 上加载 MPRIS 原生模块
  if (process.platform !== "linux") {
    processLog.info("[MPRIS] 非 Linux 系统，跳过 MPRIS 初始化");
    return;
  }

  const nativeMpris = loadNativeModule("mpris-for-splayer.node", "mpris-for-splayer");

  if (!nativeMpris) {
    processLog.warn("[MPRIS] 找不到原生插件，MPRIS 功能将不可用");
  } else {
    try {
      // 创建 MPRIS 实例
      mprisInstance = new (nativeMpris as any).SPlayerMpris();
      
      // 注册事件处理器
      mprisInstance.registerEventHandler((event: any) => {
        if (!event || !event.eventType) {
          processLog.warn("[MPRIS] 收到无效的事件:", event);
          return;
        }
        //processLog.info(`[MPRIS] 收到系统事件: ${event.eventType}`, event.value);
        const wins = BrowserWindow.getAllWindows();
        if (wins.length > 0) {
          wins.forEach((win) => {
            if (!win.isDestroyed()) {
              win.webContents.send("mpris-event", event);
            }
          });
        }
      });
      
      processLog.info("[MPRIS] MPRIS 原生插件已初始化");
    } catch (e) {
      processLog.error("[MPRIS] 初始化时失败", e);
    }
  }

  // 元数据更新
  ipcMain.on("mpris-update-metadata", (_, payload: IpcChannelMap["mpris-update-metadata"]) => {
    if (mprisInstance) {
      try {
        mprisInstance.setMetadata({
          title: payload.title,
          artist: payload.artist,
          album: payload.album,
          length: payload.length,
          url: payload.url,
        });
      } catch (e) {
        processLog.error("[MPRIS] updateMetadata 失败", e);
      }
    }
  });

  // 播放状态更新
  ipcMain.on("mpris-update-play-state", (_, payload: IpcChannelMap["mpris-update-play-state"]) => {
    if (mprisInstance) {
      try {
        mprisInstance.setPlaybackStatus(payload.status);
      } catch (e) {
        processLog.error("[MPRIS] updatePlayState 失败", e);
      }
    }
  });

  // 进度更新
  ipcMain.on("mpris-update-timeline", (_, payload: IpcChannelMap["mpris-update-timeline"]) => {
    if (mprisInstance) {
      try {
        // 转换为微秒
        const position = payload.position * 1000;
        const length = payload.length * 1000;
        mprisInstance.setProgress(position, length);
      } catch (e) {
        processLog.error("[MPRIS] updateTimeline 失败", e);
      }
    }
  });

  // 循环模式更新
  ipcMain.on("mpris-update-loop-status", (_, payload: IpcChannelMap["mpris-update-loop-status"]) => {
    if (mprisInstance) {
      try {
        mprisInstance.setLoopStatus(payload.status);
      } catch (e) {
        processLog.error("[MPRIS] updateLoopStatus 失败", e);
      }
    }
  });

  // 随机播放更新
  ipcMain.on("mpris-update-shuffle", (_, payload: IpcChannelMap["mpris-update-shuffle"]) => {
    if (mprisInstance) {
      try {
        mprisInstance.setShuffle(payload.shuffle);
      } catch (e) {
        processLog.error("[MPRIS] updateShuffle 失败", e);
      }
    }
  });

  // 音量更新
  ipcMain.on("mpris-update-volume", (_, payload: IpcChannelMap["mpris-update-volume"]) => {
    if (mprisInstance) {
      try {
        mprisInstance.setVolume(payload.volume);
      } catch (e) {
        processLog.error("[MPRIS] updateVolume 失败", e);
      }
    }
  });
}

export function shutdownMpris() {
  if (mprisInstance) {
    try {
      // MPRIS 实例会在析构时自动清理
      mprisInstance = null;
      processLog.info("[MPRIS] MPRIS 已关闭");
    } catch (e) {
      processLog.error("[MPRIS] 关闭时出错", e);
    }
  }
}
