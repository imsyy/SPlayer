import { useSettingStore } from "@/stores/setting";
import {
  type DiscordMetadataParam,
  type MprisMetadataParam,
  type MprisPlayStateParam,
} from "@/types/global";
import { PlayModePayload, RepeatModeType, ShuffleModeType } from "@/types/shared";
import { PlaybackStatus, RepeatMode } from "@/types/smtc";
import { isElectron } from "@/utils/env";
import { getPlaySongData } from "@/utils/format";
import { type MetadataParam } from "@native";
import { throttle } from "lodash-es";

/**
 * 发送播放状态
 * @param isPlaying 是否播放
 */
export const sendPlayStatus = (isPlaying: boolean) => {
  if (isElectron) window.electron.ipcRenderer.send("play-status-change", isPlaying);
};

/**
 * 发送歌曲信息
 * @param title 歌曲标题
 * @param name 歌曲名称
 * @param artist 歌手
 * @param album 专辑
 */
export const sendSongChange = (title: string, name: string, artist: string, album: string) => {
  if (!isElectron) return;
  // 获取歌曲时长
  const duration = getPlaySongData()?.duration ?? 0;
  window.electron.ipcRenderer.send("play-song-change", { title, name, artist, album, duration });
  window.electron.ipcRenderer.send("update-desktop-lyric-data", {
    playName: name,
    artistName: artist,
  });
};

/**
 * 发送状态栏进度
 * @param progress 进度
 */
export const sendTaskbarProgress: (progress: number | "none") => void = throttle(
  (progress: number | "none") => {
    if (isElectron) {
      window.electron.ipcRenderer.send("set-bar-progress", progress);
    }
  },
  1000,
);

/**
 * 发送状态栏模式
 * @param mode 模式
 */
export const sendTaskbarMode = (mode: "normal" | "paused" | "error" | "indeterminate") => {
  if (isElectron) {
    window.electron.ipcRenderer.send("set-bar-mode", mode);
  }
};

/**
 * 发送 Socket 实时进度
 */
export const sendSocketProgress: (currentTime: number, duration: number) => void = throttle(
  (currentTime: number, duration: number) => {
    if (isElectron) {
      window.electron.ipcRenderer.send("set-progress", { currentTime, duration });
    }
  },
  500,
);

/**
 * 发送歌词
 * @param data 歌词数据
 */
export const sendLyric: (data: unknown) => void = throttle((data: unknown) => {
  if (isElectron) window.electron.ipcRenderer.send("play-lyric-change", data);
}, 500);

/**
 * 发送喜欢状态
 * @param isLiked 是否喜欢
 */
export const sendLikeStatus = (isLiked: boolean) => {
  if (isElectron) window.electron.ipcRenderer.send("like-status-change", isLiked);
};

/**
 * 发送桌面歌词开关
 * @param show 是否显示
 */
export const toggleDesktopLyric = (show: boolean) => {
  if (isElectron) window.electron.ipcRenderer.send("toggle-desktop-lyric", show);
};

/**
 * 发送播放模式给托盘
 * @param repeatMode 循环模式 ('off' | 'list' | 'one')
 * @param shuffleMode 随机/心动模式 ('off' | 'on' | 'heartbeat')
 */
export const sendPlayMode = (repeatMode: RepeatModeType, shuffleMode: ShuffleModeType) => {
  if (isElectron) {
    const payload: PlayModePayload = { repeatMode, shuffleMode };
    window.electron.ipcRenderer.send("play-mode-change", payload);
  }
};

///////////////////////////////////////////
//
// 原生插件相关部分
//
///////////////////////////////////////////

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type NativeModule = typeof import("@native"); // 用于 JSDoc

/**
 * @description 通过原生插件更新 SMTC 元数据
 * @param payload - 参见 {@link MetadataParam}
 * @see {@link NativeModule.updateMetadata 原生模块的 `updateMetadata` 方法}
 */
export const sendSmtcMetadata = (payload: MetadataParam) => {
  if (isElectron) window.electron.ipcRenderer.send("smtc-update-metadata", payload);
};

/**
 * @description 更新 Discord 元数据
 * @param payload - 参见 {@link DiscordMetadataParam}
 */
export const sendDiscordMetadata = (payload: DiscordMetadataParam) => {
  if (isElectron) window.electron.ipcRenderer.send("discord-update-metadata", payload);
};

/**
 * @description 通过原生插件更新 SMTC 播放状态
 * @param status - 参见 {@link PlaybackStatus}
 * @see {@link NativeModule.updatePlayState 原生模块的 `updatePlayState` 方法}
 */
export const sendSmtcPlayState = (status: PlaybackStatus) => {
  if (isElectron) window.electron.ipcRenderer.send("smtc-update-play-state", { status });
};

/**
 * @description 更新 Discord 播放状态
 * @param status - 参见 {@link PlaybackStatus}
 */
export const sendDiscordPlayState = (status: PlaybackStatus) => {
  if (isElectron) {
    window.electron.ipcRenderer.send("discord-update-play-state", {
      status: status === PlaybackStatus.Playing ? "Playing" : "Paused",
    });
  }
};

/**
 * @description 通过原生插件更新 SMTC 进度信息
 * @param currentTime - 当前的播放进度，单位是毫秒
 * @param totalTime - 总时长，单位是毫秒
 * @see {@link NativeModule.updateTimeline 原生模块的 `updateTimeline` 方法}
 */
export const sendSmtcTimeline: (currentTime: number, totalTime: number) => void = throttle(
  (currentTime: number, totalTime: number) => {
    if (isElectron)
      window.electron.ipcRenderer.send("smtc-update-timeline", { currentTime, totalTime });
  },
  1000,
);

/**
 * @description 更新 Discord 进度信息
 * @param currentTime - 当前的播放进度，单位是毫秒
 * @param totalTime - 总时长，单位是毫秒
 */
export const sendDiscordTimeline: (currentTime: number, totalTime: number) => void = throttle(
  (currentTime: number, totalTime: number) => {
    if (isElectron)
      window.electron.ipcRenderer.send("discord-update-timeline", { currentTime, totalTime });
  },
  1000,
);

/**
 * @description 通过原生插件更新 SMTC 播放模式
 *
 * 注意: SPlayer 的随机和循环按钮和网易云是一样合在一起的，需要特殊的逻辑来分开
 * @param isShuffling - 当前是否是随机播放模式
 * @param repeatMode - 当前的循环播放模式，参见 {@link RepeatMode}
 * @see {@link NativeModule.updatePlayMode 原生模块的 `updatePlayMode` 方法}
 */
export const sendSmtcPlayMode = (isShuffling: boolean, repeatMode: RepeatMode) => {
  if (isElectron)
    window.electron.ipcRenderer.send("smtc-update-play-mode", { isShuffling, repeatMode });
};

/**
 * @description 启用 Discord RPC
 */
export const enableDiscordRpc = () => {
  if (isElectron) {
    window.electron.ipcRenderer.send("discord-enable");
    // 立即发送当前配置，确保 Rust 模块使用正确的设置
    const settingStore = useSettingStore();
    // 转换字符串 displayMode 为数字枚举
    const displayModeMap = { name: 0, state: 1, details: 2 } as const;
    window.electron.ipcRenderer.send("discord-update-config", {
      showWhenPaused: settingStore.discordRpc.showWhenPaused,
      displayMode: displayModeMap[settingStore.discordRpc.displayMode],
    });
  }
};

/**
 * @description 禁用 Discord RPC
 */
export const disableDiscordRpc = () => {
  if (isElectron) window.electron.ipcRenderer.send("discord-disable");
};

/**
 * @description 更新 Discord RPC 配置
 * @param payload 配置信息
 */
export const updateDiscordConfig = (payload: {
  showWhenPaused: boolean;
  displayMode: "name" | "state" | "details";
}) => {
  if (isElectron) {
    // 转换字符串 displayMode 为数字枚举
    const displayModeMap = { name: 0, state: 1, details: 2 } as const;
    window.electron.ipcRenderer.send("discord-update-config", {
      showWhenPaused: payload.showWhenPaused,
      displayMode: displayModeMap[payload.displayMode],
    });
  }
};

///////////////////////////////////////////
//
// MPRIS 原生插件相关部分 (Linux)
//
///////////////////////////////////////////

/**
 * @description 通过原生插件更新 MPRIS 元数据
 * @param payload - 参见 {@link MprisMetadataParam}
 */
export const sendMprisMetadata = (payload: MprisMetadataParam) => {
  if (isElectron) window.electron.ipcRenderer.send("mpris-update-metadata", payload);
};

/**
 * @description 通过原生插件更新 MPRIS 播放状态
 * @param status - 参见 {@link MprisPlayStateParam}
 */
export const sendMprisPlayState = (status: "Playing" | "Paused" | "Stopped") => {
  if (isElectron) window.electron.ipcRenderer.send("mpris-update-play-state", { status });
};

/**
 * @description 通过原生插件更新 MPRIS 进度信息
 * @param position - 当前的播放进度，单位是毫秒
 * @param length - 总时长，单位是毫秒
 */
export const sendMprisTimeline: (position: number, length: number) => void = throttle(
  (position: number, length: number) => {
    if (isElectron)
      window.electron.ipcRenderer.send("mpris-update-timeline", { position, length });
  },
  1000,
);

/**
 * @description 通过原生插件更新 MPRIS 循环状态
 * @param status - 循环状态 ('None' | 'Track' | 'Playlist')
 */
export const sendMprisLoopStatus = (status: "None" | "Track" | "Playlist") => {
  if (isElectron) window.electron.ipcRenderer.send("mpris-update-loop-status", { status });
};

/**
 * @description 通过原生插件更新 MPRIS 随机播放状态
 * @param shuffle - 是否随机播放
 */
export const sendMprisShuffle = (shuffle: boolean) => {
  if (isElectron) window.electron.ipcRenderer.send("mpris-update-shuffle", { shuffle });
};

/**
 * @description 通过原生插件更新 MPRIS 音量
 * @param volume - 音量 (0.0 - 1.0)
 */
export const sendMprisVolume = (volume: number) => {
  if (isElectron) window.electron.ipcRenderer.send("mpris-update-volume", { volume });
};
