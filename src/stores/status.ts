import { defineStore } from "pinia";
import { QualityType, type SortType } from "@/types/main";
import type { PlayModeType, RGB, ColorScheme } from "@/types/main";

interface StatusState {
  /** 菜单折叠状态 */
  menuCollapsed: boolean;
  /** 搜索框状态 */
  searchFocus: boolean;
  /** 搜索框输入值 */
  searchInputValue: string;
  /** 播放控制条 */
  showPlayBar: boolean;
  /** 全屏播放器 */
  showFullPlayer: boolean;
  /** 播放器功能显示 */
  playerMetaShow: boolean;
  /** 播放列表状态 */
  playListShow: boolean;
  /** 播放状态 */
  playStatus: boolean;
  /** 播放加载状态 */
  playLoading: boolean;
  /** 播放速度 */
  playRate: number;
  /** 播放音量 */
  playVolume: number;
  /** 静音前音量 */
  playVolumeMute: number;
  /** 播放模式 */
  playSongMode: PlayModeType;
  /** 心动模式 */
  playHeartbeatMode: boolean;
  /** 封面主题 */
  songCoverTheme: {
    /** 封面主题颜色 */
    main?: RGB;
    /** 封面主题颜色（亮色） */
    light?: ColorScheme;
    /** 封面主题颜色（暗色） */
    dark?: ColorScheme;
  };
  /** 纯净歌词模式 */
  pureLyricMode: boolean;
  /** 是否使用 TTML 歌词 */
  usingTTMLLyric: boolean;
  /** 当前歌曲音质 */
  songQuality: QualityType | undefined;
  /** 当前播放索引 */
  playIndex: number;
  /** 歌词播放索引 */
  lyricIndex: number;
  /** 歌词加载状态 */
  lyricLoading: boolean;
  /** 当前播放时间 */
  currentTime: number;
  /** 歌曲总时长 */
  duration: number;
  /** 实时播放进度 */
  progress: number;
  /** 每首歌曲的进度偏移（按歌曲 id 记忆） */
  currentTimeOffsetMap: Record<number, number>;
  /** 是否为解锁歌曲 */
  playUblock: boolean;
  /** 主内容高度 */
  mainContentHeight: number;
  /** 列表排序 */
  listSort: SortType;
  /** 桌面歌词 */
  showDesktopLyric: boolean;
  /** 氛围灯可视化 */
  showVisualizer: boolean;
  /** 播放器评论 */
  showPlayerComment: boolean;
  /** 私人FM模式 */
  personalFmMode: boolean;
  /** 更新检查 */
  updateCheck: boolean;
  /** 均衡器是否开启 */
  eqEnabled: boolean;
  /** 均衡器 10 段增益（dB） */
  eqBands: number[];
  /** 均衡器当前预设 key */
  eqPreset: string;
  /** 自动关闭 */
  autoClose: {
    /** 自动关闭 */
    enable: boolean;
    /** 自动关闭时间（分钟） */
    time: number;
    /** 剩余时长（秒） */
    remainTime: number;
    /** 等待歌曲结束 */
    waitSongEnd: boolean;
  };
}

export const useStatusStore = defineStore("status", {
  state: (): StatusState => ({
    menuCollapsed: false,
    searchFocus: false,
    searchInputValue: "",
    showPlayBar: true,
    playStatus: false,
    playLoading: true,
    playUblock: false,
    playListShow: false,
    showFullPlayer: false,
    playerMetaShow: true,
    currentTime: 0,
    duration: 0,
    progress: 0,
    currentTimeOffsetMap: {},
    songCoverTheme: {},
    pureLyricMode: false,
    usingTTMLLyric: false,
    songQuality: undefined,
    playIndex: -1,
    lyricIndex: -1,
    lyricLoading: false,
    playRate: 1,
    playVolume: 0.7,
    playVolumeMute: 0,
    playSongMode: "repeat",
    playHeartbeatMode: false,
    personalFmMode: false,
    mainContentHeight: 0,
    listSort: "default",
    showDesktopLyric: false,
    showVisualizer: false,
    showPlayerComment: false,
    updateCheck: false,
    eqEnabled: false,
    eqBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    eqPreset: "acoustic",
    autoClose: {
      enable: false,
      time: 30,
      remainTime: 0,
      waitSongEnd: true,
    },
  }),
  getters: {
    // 播放音量图标
    playVolumeIcon(state) {
      const volume = state.playVolume;
      return volume === 0
        ? "VolumeOff"
        : volume < 0.4
          ? "VolumeMute"
          : volume < 0.7
            ? "VolumeDown"
            : "VolumeUp";
    },
    // 播放模式图标
    playModeIcon(state) {
      const mode = state.playSongMode;
      return state.playHeartbeatMode
        ? "HeartBit"
        : mode === "repeat"
          ? "Repeat"
          : mode === "repeat-once"
            ? "RepeatSong"
            : "Shuffle";
    },
    // 音量百分比
    playVolumePercent(state) {
      return Math.round(state.playVolume * 100);
    },
    // 播放器主色
    mainColor(state) {
      const mainColor = state.songCoverTheme?.main;
      if (!mainColor) return "239, 239, 239";
      return `${mainColor.r}, ${mainColor.g}, ${mainColor.b}`;
    },
  },
  actions: {
    /**
     * 获取指定歌曲的偏移
     * 单位：毫秒
     */
    getSongOffset(songId?: number): number {
      if (!songId) return 0;
      const offsetTime = this.currentTimeOffsetMap?.[songId] ?? 0;
      return Math.floor(offsetTime * 1000);
    },
    /**
     * 设置指定歌曲的偏移
     * @param songId 歌曲 id
     * @param offset 偏移量（单位：毫秒）
     */
    setSongOffset(songId?: number, offset: number = 0) {
      if (!songId) return;
      if (!this.currentTimeOffsetMap) this.currentTimeOffsetMap = {};
      // 将毫秒转换为秒存储（保留2位小数）
      const offsetSeconds = offset / 1000;
      const fixed = Number(offsetSeconds.toFixed(2));
      if (fixed === 0) {
        // 为 0 时移除记录，避免占用空间
        delete this.currentTimeOffsetMap[songId];
      } else {
        this.currentTimeOffsetMap[songId] = fixed;
      }
    },
    /**
     * 调整指定歌曲的偏移（增量）
     * @param songId 歌曲 id
     * @param delta 偏移增量（单位：毫秒，默认 500ms）
     */
    incSongOffset(songId?: number, delta: number = 500) {
      if (!songId) return;
      const current = this.getSongOffset(songId);
      const next = current + delta;
      if (next === 0) {
        delete this.currentTimeOffsetMap[songId];
      } else {
        this.setSongOffset(songId, next);
      }
    },
    /** 重置指定歌曲的偏移为 0 */
    resetSongOffset(songId?: number) {
      if (!songId) return;
      // 直接删除该歌曲记录
      if (this.currentTimeOffsetMap && songId in this.currentTimeOffsetMap) {
        delete this.currentTimeOffsetMap[songId];
      }
    },
    /**
     * 设置 EQ 开关
     * @param enabled 是否开启
     */
    setEqEnabled(enabled: boolean) {
      this.eqEnabled = enabled;
    },
    /**
     * 设置 EQ 10 段增益（dB）
     * @param bands 长度 10 的 dB 数组
     */
    setEqBands(bands: number[]) {
      if (Array.isArray(bands) && bands.length === 10) {
        this.eqBands = [...bands];
      }
    },
    /**
     * 设置 EQ 预设名
     */
    setEqPreset(preset: string) {
      this.eqPreset = preset;
    },
    /**
     * 重置播放状态
     */
    resetPlayStatus() {
      this.$patch({
        currentTime: 0,
        duration: 0,
        progress: 0,
        lyricIndex: -1,
        playStatus: false,
        playLoading: false,
        playListShow: false,
        showFullPlayer: false,
        playHeartbeatMode: false,
        personalFmMode: false,
        playIndex: -1,
      });
    },
  },
  // 持久化
  persist: {
    key: "status-store",
    storage: localStorage,
    pick: [
      "menuCollapsed",
      "currentTime",
      "duration",
      "progress",
      "currentTimeOffsetMap",
      "pureLyricMode",
      "playIndex",
      "playRate",
      "playVolume",
      "playVolumeMute",
      "playSongType",
      "playSongMode",
      "songCoverTheme",
      "listSort",
      "showDesktopLyric",
      "showVisualizer",
      "playHeartbeatMode",
      "personalFmMode",
      "autoClose",
      "eqEnabled",
      "eqBands",
      "eqPreset",
    ],
  },
});
