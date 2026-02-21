import { useSettingStore } from "@/stores/setting";
import type { SongLyric } from "@/types/lyric";
import {
  TASKBAR_IPC_CHANNELS,
  type SyncStatePayload,
  type SyncTickPayload,
  type TaskbarConfig,
} from "@/types/shared";
import type { PlayModePayload, RepeatModeType, ShuffleModeType } from "@/types/shared/play-mode";
import { isElectron } from "@/utils/env";
import { getPlaySongData } from "@/utils/format";
import type { DiscordConfigPayload, MetadataParam, PlaybackStatus, RepeatMode } from "@emi";
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
  window.electron.ipcRenderer.send("desktop-lyric:update-data", {
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
  if (isElectron) {
    // 添加发送时间戳，用于桌面歌词端补偿 IPC 传输延迟
    const payload =
      typeof data === "object" && data !== null
        ? { ...data, sendTimestamp: performance.now() }
        : data;
    window.electron.ipcRenderer.send("play-lyric-change", payload);
  }
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
  if (isElectron) window.electron.ipcRenderer.send("desktop-lyric:toggle", show);
};

export const updateTaskbarConfig = (config: Partial<TaskbarConfig>) => {
  if (!isElectron) return;
  window.electron.ipcRenderer.send(TASKBAR_IPC_CHANNELS.UPDATE_CONFIG, config);
};

export const broadcastTaskbarState = (payload: SyncStatePayload) => {
  if (!isElectron) return;
  window.electron.ipcRenderer.send(TASKBAR_IPC_CHANNELS.SYNC_STATE, payload);
};

export const broadcastTaskbarTick = (payload: SyncTickPayload) => {
  if (!isElectron) return;
  window.electron.ipcRenderer.send(TASKBAR_IPC_CHANNELS.SYNC_TICK, payload);
};

export interface TaskbarMetadataPayload {
  title: string;
  artist: string;
  cover: string;
}

export const sendTaskbarMetadata = (payload: TaskbarMetadataPayload) => {
  broadcastTaskbarState({
    type: "track-change",
    data: {
      title: payload.title,
      artist: payload.artist,
      cover: payload.cover,
    },
  });
};

export const sendTaskbarLyrics = (lyrics: SongLyric) => {
  if (!isElectron) return;

  const yrcData = lyrics.yrcData ?? [];
  const lrcData = lyrics.lrcData ?? [];
  const hasYrc = yrcData.length > 0;

  const taskbarLyrics = hasYrc ? yrcData : lrcData;

  broadcastTaskbarState({
    type: "lyrics-loaded",
    data: {
      lines: toRaw(taskbarLyrics),
      type: hasYrc ? "word" : "line",
    },
  });
};

export interface TaskbarStatePayload {
  isPlaying: boolean;
}

export const sendTaskbarState = (payload: TaskbarStatePayload) => {
  broadcastTaskbarState({
    type: "playback-state",
    data: payload,
  });
};

export interface TaskbarProgressPayload {
  currentTime: number;
  duration: number;
  offset: number;
}

export const sendTaskbarProgressData = (payload: TaskbarProgressPayload) => {
  broadcastTaskbarTick([payload.currentTime, payload.duration, payload.offset]);
};

export const sendTaskbarThemeColor = (color: { light: string; dark: string } | null) => {
  if (!isElectron) return;

  broadcastTaskbarState({
    type: "theme-color",
    data: color,
  });
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
// 媒体控件
//
///////////////////////////////////////////

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type EmiModule = typeof import("@emi"); // 用于 JSDoc

/**
 * @description 通过外部媒体集成模块更新媒体控件和 Discord RPC 的元数据
 * @note 仅在 Electron 上有效
 * @param payload - 参见 {@link MetadataParam}
 * @see {@link EmiModule.updateMetadata 外部媒体集成模块的 `updateMetadata` 方法}
 */
export const sendMediaMetadata = (payload: MetadataParam) => {
  if (isElectron) window.electron.ipcRenderer.send("media-update-metadata", payload);
};

/**
 * @description 通过外部媒体集成模块更新媒体控件和 Discord RPC 的播放状态
 * @note 仅在 Electron 上有效
 * @param status - 参见 {@link PlaybackStatus}
 * @see {@link EmiModule.updatePlayState 外部媒体集成模块的 `updatePlayState` 方法}
 */
export const sendMediaPlayState = (status: PlaybackStatus) => {
  if (isElectron) window.electron.ipcRenderer.send("media-update-play-state", { status });
};

/**
 * @description 通过外部媒体集成模块更新媒体控件的播放速率
 * @note 仅在 Electron 上有效
 * @param rate - 播放速率，1.0 表示正常速度
 * @see {@link EmiModule.updatePlaybackRate 外部媒体集成模块的 `updatePlaybackRate` 方法}
 */
export const sendMediaPlaybackRate = (rate: number) => {
  if (isElectron) window.electron.ipcRenderer.send("media-update-playback-rate", { rate });
};

/**
 * @description 通过外部媒体集成模块更新媒体控件和 Discord RPC 的播放状态
 * @note 仅在 Electron 上有效
 * @param currentTime - 当前的播放进度，单位是毫秒
 * @param totalTime - 总时长，单位是毫秒
 * @param seeked - 是否为 seek 操作触发的更新
 * @see {@link EmiModule.updateTimeline 外部媒体集成模块的 `updateTimeline` 方法}
 */
export const sendMediaTimeline = (currentTime: number, totalTime: number, seeked?: boolean) => {
  if (isElectron) {
    window.electron.ipcRenderer.send("media-update-timeline", { currentTime, totalTime, seeked });
  }
};

/**
 * @description 通过外部媒体集成模块更新媒体控件的播放模式。不会更新 Discord RPC 的播放状态
 * @note 仅在 Electron 上有效
 * @param isShuffling - 当前是否是随机播放模式
 * @param repeatMode - 当前的循环播放模式，参见 {@link RepeatMode}
 * @see {@link EmiModule.updatePlayMode 外部媒体集成模块的 `updatePlayMode` 方法}
 */
export const sendMediaPlayMode = (isShuffling: boolean, repeatMode: RepeatMode) => {
  if (isElectron)
    window.electron.ipcRenderer.send("media-update-play-mode", { isShuffling, repeatMode });
};

///////////////////////////////////////////
//
// Discord RPC
//
///////////////////////////////////////////

/**
 * @description 启用 Discord RPC
 * @note 仅在 Electron 上有效
 * @see {@link EmiModule.enableDiscordRpc 外部媒体集成模块的 `enableDiscordRpc` 方法}
 */
export const enableDiscordRpc = () => {
  if (isElectron) {
    window.electron.ipcRenderer.send("discord-enable");
    // 立即发送当前配置，确保外部媒体集成模块使用正确的设置
    const settingStore = useSettingStore();
    window.electron.ipcRenderer.send("discord-update-config", {
      showWhenPaused: settingStore.discordRpc.showWhenPaused,
      displayMode: settingStore.discordRpc.displayMode,
    });
  }
};

/**
 * @description 禁用 Discord RPC
 * @note 仅在 Electron 上有效
 * @see {@link EmiModule.disableDiscordRpc 外部媒体集成模块的 `disableDiscordRpc` 方法}
 */
export const disableDiscordRpc = () => {
  if (isElectron) window.electron.ipcRenderer.send("discord-disable");
};

/**
 * @description 更新 Discord RPC 配置
 * @note 仅在 Electron 上有效
 * @param config 配置信息，参见 {@link DiscordConfigPayload}
 * @see {@link EmiModule.updateDiscordConfig 外部媒体集成模块的 `updateDiscordConfig` 方法}
 */
export const updateDiscordConfig = (config: DiscordConfigPayload) => {
  if (isElectron) {
    const { showWhenPaused, displayMode } = config;
    window.electron.ipcRenderer.send("discord-update-config", {
      showWhenPaused,
      displayMode: displayMode,
    });
  }
};
