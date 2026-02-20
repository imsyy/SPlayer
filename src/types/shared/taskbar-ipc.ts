import type { LyricLine } from "@applemusic-like-lyrics/lyric";

export type Milliseconds = number;

export interface TaskbarConfig {
  maxWidth: number;
  position: "automatic" | "left" | "right";
  autoShrink: boolean;
  margin: number;
  minWidth: number;

  enabled: boolean;
  showWhenPaused: boolean;

  showCover: boolean;
  themeMode: "light" | "dark" | "auto";
  fontFamily: string;
  globalFont: string;
  fontWeight: number;
  animationMode: "slide-blur" | "left-sm";
  singleLineMode: boolean;
  showTranslation: boolean;
  showRomaji: boolean;
}

export interface TrackData {
  title: string;
  artist: string;
  cover: string;
}

export interface PlaybackState {
  isPlaying: boolean;
}

export interface LyricData {
  lines: LyricLine[];
  type: "line" | "word";
}

export interface ThemeColorData {
  light: string;
  dark: string;
}

/**
 * 格式: [currentTime, duration, offset]
 */
export type SyncTickPayload = [Milliseconds, Milliseconds, Milliseconds];

export type SyncStatePayload =
  | {
      type: "full-hydration";
      data: {
        track: TrackData;
        playback: PlaybackState & { tick: SyncTickPayload };
        lyrics: LyricData;
        config: TaskbarConfig;
        lyricLoading: boolean;
        themeColor: ThemeColorData | null;
      };
    }
  | {
      type: "track-change";
      data: TrackData;
    }
  | {
      type: "playback-state";
      data: PlaybackState;
    }
  | {
      type: "lyrics-loaded";
      data: LyricData;
    }
  | {
      type: "config-update";
      data: Partial<TaskbarConfig>;
    }
  | {
      type: "theme-color";
      data: ThemeColorData | null;
    }
  | {
      type: "system-theme";
      data: { isDark: boolean };
    };

/**
 * 适用于任务栏歌词的 IPC 通道相关常量
 */
export const TASKBAR_IPC_CHANNELS = {
  /**
   * 渲染进程 -> 主进程 (设置)
   */
  UPDATE_CONFIG: "taskbar:update-config",
  /**
   * 主进程 -> 渲染进程 (状态)
   */
  SYNC_STATE: "taskbar:sync-state",
  /**
   * 主进程 -> 渲染进程 (进度)
   */
  SYNC_TICK: "taskbar:sync-tick",
  /**
   * 渲染进程 -> 主进程 (初始化握手)
   */
  REQUEST_DATA: "taskbar:request-data",
} as const;
