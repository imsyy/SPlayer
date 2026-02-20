import type {
  AudioSourceType,
  ColorScheme,
  QualityType,
  RGB,
  SongLevelDataType,
  SortField,
  SortOrder,
  UpdateInfoType,
} from "@/types/main";
import type { RepeatModeType, ShuffleModeType } from "@/types/shared/play-mode";
import { isDevBuild } from "@/utils/env";
import { defineStore } from "pinia";

interface StatusState {
  /** 菜单折叠状态 */
  menuCollapsed: boolean;
  /** 搜索框状态 */
  searchFocus: boolean;
  /** 搜索框输入值 */
  searchInputValue: string;
  /** 背景图 URL (Blob URL) */
  backgroundImageUrl: string | null;
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
  /**
   * 循环模式
   *
   * off: 关闭 | list: 列表循环 | one: 单曲循环
   */
  repeatMode: RepeatModeType;
  /**
   * 随机模式
   *
   * off: 关闭 | on: 随机播放 | heartbeat: 心动模式
   */
  shuffleMode: ShuffleModeType;
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
  /** 当前是否正使用 TTML 歌词 */
  usingTTMLLyric: boolean;
  /** 当前是否正使用 QRC 歌词（来自QQ音乐） */
  usingQRCLyric: boolean;
  /** 当前歌曲音质 */
  songQuality: QualityType | undefined;
  /** 当前歌曲音源 */
  audioSource: AudioSourceType | undefined;
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
  /** 主内容高度 */
  mainContentHeight: number;
  /** 列表排序字段 */
  listSortField: SortField;
  /** 列表排序顺序 */
  listSortOrder: SortOrder;
  /** 桌面歌词 */
  showDesktopLyric: boolean;
  /** 任务栏歌词 */
  showTaskbarLyric: boolean;
  /** 播放器评论 */
  showPlayerComment: boolean;
  /** 私人FM模式 */
  personalFmMode: boolean;
  /** 更新检查 */
  updateCheck: boolean;
  /** 有可用更新 */
  updateAvailable: boolean;
  /** 更新信息 */
  updateInfo: UpdateInfoType | null;
  /** 更新已下载完成 */
  updateDownloaded: boolean;
  /** 更新下载中 */
  updateDownloading: boolean;
  /** 更新下载进度 */
  updateDownloadProgress: number;
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
    /** 目标结束时间戳（毫秒） */
    endTime: number;
    /** 等待歌曲结束 */
    waitSongEnd: boolean;
  };
  /** 开发者模式（假） */
  developerMode: boolean;
  /**
   * 主题背景模式
   * color: 颜色模式 | image: 图片模式
   */
  themeBackgroundMode: "color" | "image" | "video";
  /** 背景图配置 */
  backgroundConfig: {
    /** 背景放大倍数 (1-2) */
    scale: number;
    /** 遮罩透明度 (30-95) */
    maskOpacity: number;
    /** 模糊度 (0-20) */
    blur: number;
    /** 提取的主色 (hex) */
    themeColor: string | null;
    /** 是否使用自定义颜色 */
    useCustomColor: boolean;
    /** 用户自定义颜色 (hex) */
    customColor: string;
    /** 是否为纯色模式 */
    isSolid: boolean;
  };
  /** 可用音质列表 */
  availableQualities: SongLevelDataType[];
  /** AB 循环 */
  abLoop: {
    enable: boolean;
    pointA: number | null;
    pointB: number | null;
  };
  /** 侧边栏歌单显示模式 */
  playlistMode: "online" | "local";
  automixFxSeq: number;
  automixEndedSeq: number;
}

export const useStatusStore = defineStore("status", {
  state: (): StatusState => ({
    menuCollapsed: false,
    searchFocus: false,
    searchInputValue: "",
    backgroundImageUrl: null,
    showPlayBar: true,
    playStatus: false,
    playLoading: true,
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
    usingQRCLyric: false,
    songQuality: undefined,
    audioSource: undefined,
    playIndex: -1,
    lyricIndex: -1,
    lyricLoading: false,
    playRate: 1,
    playVolume: 0.7,
    playVolumeMute: 0,
    repeatMode: "off",
    shuffleMode: "off",
    personalFmMode: false,
    mainContentHeight: 0,
    listSortField: "default",
    listSortOrder: "default",
    showDesktopLyric: false,
    showTaskbarLyric: false,
    showPlayerComment: false,
    updateCheck: false,
    updateAvailable: false,
    updateInfo: null,
    updateDownloaded: false,
    updateDownloading: false,
    updateDownloadProgress: 0,
    eqEnabled: false,
    eqBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    eqPreset: "acoustic",
    autoClose: {
      enable: false,
      time: 30,
      remainTime: 0,
      endTime: 0,
      waitSongEnd: true,
    },
    developerMode: false,
    themeBackgroundMode: "color",
    /** 背景图配置 */
    backgroundConfig: {
      /** 背景放大倍数 (1-2) */
      scale: 1,
      /** 遮罩透明度 (30-95) */
      maskOpacity: 30,
      /** 模糊度 (0-20) */
      blur: 0,
      /** 提取的主色 (hex) */
      themeColor: null,
      /** 是否使用自定义颜色 */
      useCustomColor: false,
      /** 用户自定义颜色 (hex) */
      customColor: "#fe7971",
      /** 是否为纯色模式 */
      isSolid: false,
    },
    availableQualities: [],
    abLoop: {
      enable: false,
      pointA: null,
      pointB: null,
    },
    playlistMode: "online",
    automixFxSeq: 0,
    automixEndedSeq: 0,
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
    /** 播放模式图标 */
    shuffleIcon(state) {
      if (state.shuffleMode === "heartbeat") {
        return "HeartBit";
      }
      return "Shuffle";
    },
    /** 循环模式图标 */
    repeatIcon(state) {
      if (state.repeatMode === "one") {
        return "RepeatSong";
      }
      return "Repeat";
    },
    /** 音量百分比 */
    playVolumePercent(state) {
      return Math.round(state.playVolume * 100);
    },
    /** 播放器主色 */
    mainColor(state) {
      const mainColor = state.songCoverTheme?.main;
      if (!mainColor) return "239, 239, 239";
      return `${mainColor.r}, ${mainColor.g}, ${mainColor.b}`;
    },
    /** 是否为自定义背景模式 */
    isCustomBackground(state) {
      return state.themeBackgroundMode === "image" || state.themeBackgroundMode === "video";
    },
    /** 是否为开发者模式 */
    isDeveloperMode(state) {
      return state.developerMode || isDevBuild;
    },
    /** 是否解锁 */
    isUnlocked(state) {
      const audioSource = state.audioSource;
      return (
        !!audioSource &&
        audioSource !== "official" &&
        audioSource !== "local" &&
        audioSource !== "streaming"
      );
    },
  },
  actions: {
    triggerAutomixFx() {
      this.automixFxSeq += 1;
    },
    endAutomixFx() {
      this.automixEndedSeq += 1;
    },
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
     * 切换循环模式
     * 顺序: List -> One -> Off -> List
     */
    toggleRepeat() {
      if (this.repeatMode === "list") {
        this.repeatMode = "one";
      } else if (this.repeatMode === "one") {
        this.repeatMode = "off";
      } else {
        this.repeatMode = "list";
      }
    },
    /**
     * 切换随机模式
     * 顺序: Off -> On -> Off
     * @deprecated 心跳模式只能通过菜单开启，不再通过此方法切换
     */
    toggleShuffle() {
      if (this.shuffleMode === "off") {
        this.shuffleMode = "on";
      } else {
        this.shuffleMode = "off";
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
        personalFmMode: false,
        playIndex: -1,
        repeatMode: "off",
        shuffleMode: "off",
        listSortField: "default",
        listSortOrder: "default",
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
      "repeatMode",
      "shuffleMode",
      "songCoverTheme",
      "listSortField",
      "listSortOrder",
      "showDesktopLyric",
      "showTaskbarLyric",
      "personalFmMode",
      "autoClose",
      "eqEnabled",
      "eqBands",
      "eqPreset",
      "developerMode",
      "themeBackgroundMode",
      "backgroundConfig",
      "playlistMode",
    ],
  },
});
