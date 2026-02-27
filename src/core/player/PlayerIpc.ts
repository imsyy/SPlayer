import { useSettingStore } from "@/stores/setting";
import type { SongLyric } from "@/types/lyric";
import {
  TASKBAR_IPC_CHANNELS,
  type SyncStatePayload,
  type SyncTickPayload,
  type TaskbarConfig,
} from "@/types/shared";
import type { PlayModePayload, RepeatModeType, ShuffleModeType } from "@/types/shared/play-mode";
import { isElectron, isMac } from "@/utils/env";
import { getPlaySongData } from "@/utils/format";
import type { DiscordConfigPayload, MetadataParam, PlaybackStatus, RepeatMode } from "@emi";
import { throttle } from "lodash-es";

/**
 * 封装安全的 IPC 发送方法
 * 仅在 Electron 环境下执行，避免在 Web 浏览器环境报错
 * @param channel IPC 频道名称
 * @param args 传递给主进程的参数
 */
const sendIpc = (channel: string, ...args: any[]) => {
  if (isElectron) {
    window.electron.ipcRenderer.send(channel, ...args);
  }
};

/**
 * 发送播放状态
 * @param isPlaying 是否播放
 */
export const sendPlayStatus = (isPlaying: boolean) => sendIpc("play-status-change", isPlaying);

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
  sendIpc("play-song-change", { title, name, artist, album, duration });
  sendIpc("desktop-lyric:update-data", {
    playName: name,
    artistName: artist,
  });
};

/**
 * 发送状态栏进度
 * @param progress 进度
 */
export const sendTaskbarProgress: (progress: number | "none") => void = throttle(
  (progress: number | "none") => sendIpc("set-bar-progress", progress),
  1000,
);

/**
 * 发送状态栏模式
 * @param mode 模式
 */
export const sendTaskbarMode = (mode: "normal" | "paused" | "error" | "indeterminate") =>
  sendIpc("set-bar-mode", mode);

/**
 * 发送 Socket 实时进度
 */
export const sendSocketProgress: (currentTime: number, duration: number) => void = throttle(
  (currentTime: number, duration: number) => sendIpc("set-progress", { currentTime, duration }),
  500,
);

/**
 * 发送歌词
 * @param data 歌词数据
 */
export const sendLyric: (data: unknown) => void = throttle((data: unknown) => {
  if (!isElectron) return;
  // 添加发送时间戳，用于桌面歌词端补偿 IPC 传输延迟
  const payload =
    typeof data === "object" && data !== null
      ? { ...data, sendTimestamp: performance.now() }
      : data;
  sendIpc("play-lyric-change", payload);
}, 500);

/**
 * 发送喜欢状态
 * @param isLiked 是否喜欢
 */
export const sendLikeStatus = (isLiked: boolean) => sendIpc("like-status-change", isLiked);

/**
 * 发送桌面歌词开关
 * @param show 是否显示
 */
export const toggleDesktopLyric = (show: boolean) => sendIpc("desktop-lyric:toggle", show);

/**
 * 更新任务栏歌词的配置信息（如是否开启）
 * @param config 任务栏配置的增量更新负载
 */
export const updateTaskbarConfig = (config: Partial<TaskbarConfig>) =>
  sendIpc(TASKBAR_IPC_CHANNELS.UPDATE_CONFIG, config);

/**
 * 向歌词任务栏等外部窗口广播通用的播放状态事件
 * 类型包括曲目切换、歌词加载完成、播放/暂停状态变更等
 * @param payload 包含具体事件类型和数据的同步负载
 */
export const broadcastTaskbarState = (payload: SyncStatePayload) =>
  sendIpc(TASKBAR_IPC_CHANNELS.SYNC_STATE, payload);

/**
 * 向外部窗口高频广播音频进度 Tick 时间戳
 * @param payload 包含当前时间、总时长和歌词时间偏移量的元组
 */
export const broadcastTaskbarTick = (payload: SyncTickPayload) =>
  sendIpc(TASKBAR_IPC_CHANNELS.SYNC_TICK, payload);

export interface TaskbarMetadataPayload {
  title: string;
  artist: string;
  cover: string;
}

/**
 * 发布当前歌曲的基本元数据信息到任务栏扩展工具
 * 将自动组装为 `track-change` 事件进行同步分发
 * @param payload 含有标题、歌手和封面 URL 的歌曲基础数据
 */
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

/**
 * 将获取或解析完成的歌词数组内容全量推送到任务栏工具
 * 如果存在逐字歌词 (yrcData) 则优先使用逐字渲染，否则降级到普通行歌词 (lrcData)
 * @param lyrics 原始歌词对象模型（含 yrcData 和 lrcData 等）
 */
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

/**
 * 通知任务栏工具当前的主播放状态（暂停 或 播放中）
 * 用于同步托盘上的全局操作按钮 UI 状态
 * @param payload 状态信息包装
 */
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

/**
 * 发送高频的逐帧进度时间到任务栏（使用底层数组封装 Payload 以提升 IPC 效率）
 * 给任务栏实现平滑歌词滚动和进度条绘制使用
 * @param payload 包括当前秒、总长以及人工设置的偏移量
 */
export const sendTaskbarProgressData = (payload: TaskbarProgressPayload) => {
  broadcastTaskbarTick([payload.currentTime, payload.duration, payload.offset]);
};

/**
 * 同步主应用主题（明亮模式 / 暗色模式 的主基准色值）
 * 到任务栏歌词应用，使其视觉和谐
 * @param color 提取到的发光色对象（含 light 与 dark 两个方向）
 */
export const sendTaskbarThemeColor = (color: { light: string; dark: string } | null) => {
  if (!isElectron) return;

  broadcastTaskbarState({
    type: "theme-color",
    data: color,
  });
};

/**
 * 发送高频进度数据给 macOS 的原生态 StatusBar (状态栏歌词)
 * @param payload 包括当前秒、总长以及时间偏移
 */
export const sendMacStatusBarProgress = (payload: TaskbarProgressPayload) => {
  if (isMac) sendIpc("mac-statusbar:update-progress", payload);
};

/**
 * 发送播放模式给托盘
 * @param repeatMode 循环模式 ('off' | 'list' | 'one')
 * @param shuffleMode 随机/心动模式 ('off' | 'on' | 'heartbeat')
 */
export const sendPlayMode = (repeatMode: RepeatModeType, shuffleMode: ShuffleModeType) => {
  if (isElectron) {
    const payload: PlayModePayload = { repeatMode, shuffleMode };
    sendIpc("play-mode-change", payload);
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
export const sendMediaMetadata = (payload: MetadataParam) =>
  sendIpc("media-update-metadata", payload);

/**
 * @description 通过外部媒体集成模块更新媒体控件和 Discord RPC 的播放状态
 * @note 仅在 Electron 上有效
 * @param status - 参见 {@link PlaybackStatus}
 * @see {@link EmiModule.updatePlayState 外部媒体集成模块的 `updatePlayState` 方法}
 */
export const sendMediaPlayState = (status: PlaybackStatus) =>
  sendIpc("media-update-play-state", { status });

/**
 * @description 通过外部媒体集成模块更新媒体控件的播放速率
 * @note 仅在 Electron 上有效
 * @param rate - 播放速率，1.0 表示正常速度
 * @see {@link EmiModule.updatePlaybackRate 外部媒体集成模块的 `updatePlaybackRate` 方法}
 */
export const sendMediaPlaybackRate = (rate: number) =>
  sendIpc("media-update-playback-rate", { rate });

/**
 * @description 通过外部媒体集成模块更新媒体控件的音量
 * @note 仅在 Electron 上有效
 * @param volume - 音量，范围是 0.0（静音）到 1.0（最大音量）
 * @see {@link EmiModule.updateVolume 外部媒体集成模块的 `updateVolume` 方法}
 */
export const sendMediaVolume = (volume: number) => sendIpc("media-update-volume", { volume });

/**
 * @description 通过外部媒体集成模块更新媒体控件和 Discord RPC 的播放状态
 * @note 仅在 Electron 上有效
 * @param currentTime - 当前的播放进度，单位是毫秒
 * @param totalTime - 总时长，单位是毫秒
 * @param seeked - 是否为 seek 操作触发的更新
 * @see {@link EmiModule.updateTimeline 外部媒体集成模块的 `updateTimeline` 方法}
 */
export const sendMediaTimeline = (currentTime: number, totalTime: number, seeked?: boolean) =>
  sendIpc("media-update-timeline", { currentTime, totalTime, seeked });

/**
 * @description 通过外部媒体集成模块更新媒体控件的播放模式。不会更新 Discord RPC 的播放状态
 * @note 仅在 Electron 上有效
 * @param isShuffling - 当前是否是随机播放模式
 * @param repeatMode - 当前的循环播放模式，参见 {@link RepeatMode}
 * @see {@link EmiModule.updatePlayMode 外部媒体集成模块的 `updatePlayMode` 方法}
 */
export const sendMediaPlayMode = (isShuffling: boolean, repeatMode: RepeatMode) =>
  sendIpc("media-update-play-mode", { isShuffling, repeatMode });

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
  if (!isElectron) return;
  sendIpc("discord-enable");
  // 立即发送当前配置，确保外部媒体集成模块使用正确的设置
  const settingStore = useSettingStore();
  sendIpc("discord-update-config", {
    showWhenPaused: settingStore.discordRpc.showWhenPaused,
    displayMode: settingStore.discordRpc.displayMode,
  });
};

/**
 * @description 禁用 Discord RPC
 * @note 仅在 Electron 上有效
 * @see {@link EmiModule.disableDiscordRpc 外部媒体集成模块的 `disableDiscordRpc` 方法}
 */
export const disableDiscordRpc = () => sendIpc("discord-disable");

/**
 * @description 更新 Discord RPC 配置
 * @note 仅在 Electron 上有效
 * @param config 配置信息，参见 {@link DiscordConfigPayload}
 * @see {@link EmiModule.updateDiscordConfig 外部媒体集成模块的 `updateDiscordConfig` 方法}
 */
export const updateDiscordConfig = (config: DiscordConfigPayload) => {
  const { showWhenPaused, displayMode } = config;
  sendIpc("discord-update-config", {
    showWhenPaused,
    displayMode: displayMode,
  });
};
