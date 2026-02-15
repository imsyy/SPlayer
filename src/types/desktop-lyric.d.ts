import { type LyricLine } from "@applemusic-like-lyrics/lyric";

/** 桌面歌词数据 */
export interface LyricData {
  /** 歌曲名称 */
  playName?: string;
  /** 歌手名称 */
  artistName?: string;
  /** 播放状态 */
  playStatus?: boolean;
  /** 当前播放进度 */
  currentTime?: number;
  /** 是否正在加载歌词 */
  lyricLoading?: boolean;
  /** 当前播放歌曲 id（用于偏移校准） */
  songId?: number;
  /** 当前歌曲的时间偏移（秒，正负均可） */
  songOffset?: number;
  /** 歌词数据 */
  lrcData?: LyricLine[];
  yrcData?: LyricLine[];
  /** 歌词播放索引 */
  lyricIndex?: number;
}

/** 桌面歌词配置 */
export interface LyricConfig {
  /** 是否锁定歌词 */
  isLock: boolean;
  /** 已播放颜色 */
  playedColor: string;
  /** 未播放颜色 */
  unplayedColor: string;
  /** 阴影颜色 */
  shadowColor: string;
  /** 字体 */
  fontFamily: string;
  /** 字体大小 */
  fontSize: number;
  /** 字体字重设置 */
  fontWeight: number;
  /** 是否双行 */
  isDoubleLine: boolean;
  /** 显示翻译 */
  showTran: boolean;
  /** 是否开启逐字歌词 */
  showYrc: boolean;
  /** 文本排版位置 */
  position: "left" | "center" | "right" | "both";
  /** 是否限制在屏幕边界内拖动 */
  limitBounds: boolean;
  /** 文本背景遮罩 */
  textBackgroundMask: boolean;
  /** 文本背景遮罩颜色 */
  backgroundMaskColor: string;
  /** 始终展示播放信息 */
  alwaysShowPlayInfo: boolean;
  /** 是否开启歌词切换动画 */
  animation: boolean;
}

/**
 * 渲染的歌词行
 */
export interface RenderLine {
  /** 当前整行歌词数据（用于逐字渲染） */
  line: LyricLine;
  /** 当前行在歌词数组中的索引 */
  index: number;
  /** 唯一键 */
  key: string;
  /** 是否高亮 */
  active: boolean;
}
