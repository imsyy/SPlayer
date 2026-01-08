import { BrowserWindow, app, ipcMain } from "electron";
import { join } from "path";
import { IpcChannelMap } from "../../../src/types/global";
import { processLog } from "../logger";
import { loadNativeModule } from "../utils/native-loader";

type NativeSmtcModule = typeof import("@native");
type DiscordRpcModule = typeof import("@discord-rpc");

let nativeSmtc: NativeSmtcModule | null = null;
let discordRpcNative: DiscordRpcModule | null = null;

/**
 * 注册 IPC 处理函数
 * @param module 模块
 * @param moduleName 模块名称
 * @param channel 信道
 * @param handler 处理函数
 * @param errorContext 错误上下文
 */
const registerHandler = <M, K extends keyof IpcChannelMap>(
  module: M | null,
  moduleName: string,
  channel: K,
  handler: (module: M, payload: IpcChannelMap[K]) => void,
  errorContext: string,
) => {
  ipcMain.on(channel, (_, payload: IpcChannelMap[K]) => {
    if (module) {
      try {
        handler(module, payload);
      } catch (e) {
        processLog.error(`[${moduleName}] ${errorContext} 失败`, e);
      }
    }
  });
};

export default function initSmtcIpc() {
  // 加载 SMTC 原生模块（仅 Windows）
  if (process.platform === "win32") {
    nativeSmtc = loadNativeModule("smtc-for-splayer.node", "smtc-for-splayer");
  }

  if (!nativeSmtc) {
    if (process.platform === "win32") {
      processLog.warn("[SMTC] 找不到原生插件，SMTC 功能将不可用");
    }
  } else {
    try {
      const logDir = join(app.getPath("userData"), "logs", "smtc");
      nativeSmtc.initialize(logDir);
      processLog.info("[SMTC] SMTC 原生插件已初始化");

      nativeSmtc.registerEventHandler((event) => {
        const wins = BrowserWindow.getAllWindows();
        if (wins.length > 0) {
          wins.forEach((win) => {
            if (!win.isDestroyed()) {
              win.webContents.send("smtc-event", event);
            }
          });
        }
      });

      nativeSmtc.enableSmtc();
    } catch (e) {
      processLog.error("[SMTC] 初始化时失败", e);
    }
  }

  // 加载 Discord RPC 原生模块（跨平台）
  discordRpcNative = loadNativeModule("discord-rpc-for-splayer.node", "discord-rpc-for-splayer");

  if (!discordRpcNative) {
    processLog.warn("[Discord RPC] 找不到原生插件，Discord RPC 功能将不可用");
  } else {
    try {
      discordRpcNative.initialize();
      processLog.info("[Discord RPC] Discord RPC 原生插件已初始化");
    } catch (e) {
      processLog.error("[Discord RPC] 初始化失败", e);
    }
  }

  // 元数据 - Discord
  registerHandler(
    discordRpcNative,
    "Discord RPC",
    "discord-update-metadata",
    (mod, payload) => mod.updateMetadata(payload),
    "updateMetadata",
  );

  // 元数据 - Native SMTC
  registerHandler(
    nativeSmtc,
    "SMTC",
    "smtc-update-metadata",
    (mod, payload) => mod.updateMetadata(payload),
    "updateMetadata",
  );

  // 播放状态 - Discord
  registerHandler(
    discordRpcNative,
    "Discord RPC",
    "discord-update-play-state",
    (mod, payload) => mod.updatePlayState(payload),
    "updatePlayState",
  );

  // 播放状态 - Native SMTC
  registerHandler(
    nativeSmtc,
    "SMTC",
    "smtc-update-play-state",
    (mod, payload) => mod.updatePlayState(payload),
    "updatePlayState",
  );

  // 进度信息 - Discord
  registerHandler(
    discordRpcNative,
    "Discord RPC",
    "discord-update-timeline",
    (mod, payload) => mod.updateTimeline(payload),
    "updateTimeline",
  );

  // 进度信息 - Native SMTC
  registerHandler(
    nativeSmtc,
    "SMTC",
    "smtc-update-timeline",
    (mod, payload) => mod.updateTimeline(payload),
    "updateTimeline",
  );

  // 播放模式 - Native SMTC
  registerHandler(
    nativeSmtc,
    "SMTC",
    "smtc-update-play-mode",
    (mod, payload) => mod.updatePlayMode(payload),
    "updatePlayMode",
  );

  // Discord - 开启
  ipcMain.on("discord-enable", () => {
    if (discordRpcNative) {
      try {
        discordRpcNative.enable();
      } catch (e) {
        processLog.error("[Discord RPC] 启用失败", e);
      }
    }
  });

  // Discord - 关闭
  ipcMain.on("discord-disable", () => {
    if (discordRpcNative) {
      try {
        discordRpcNative.disable();
      } catch (e) {
        processLog.error("[Discord RPC] 禁用失败", e);
      }
    }
  });

  // Discord - 更新配置
  registerHandler(
    discordRpcNative,
    "Discord RPC",
    "discord-update-config",
    (mod, payload) => mod.updateConfig(payload),
    "updateConfig",
  );
}

export function shutdownSmtc() {
  if (discordRpcNative) {
    try {
      discordRpcNative.shutdown();
    } catch (e) {
      processLog.error("[Discord RPC] 关闭时出错", e);
    }
  }

  if (nativeSmtc) {
    try {
      nativeSmtc.shutdown();
    } catch (e) {
      processLog.error("[SMTC] 关闭时出错", e);
    }
  }
}
