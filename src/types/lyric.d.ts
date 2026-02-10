import { type LyricLine } from "@applemusic-like-lyrics/lyric";

/**
 * 歌词数据类型
 */
export interface SongLyric {
  lrcData: LyricLine[];
  yrcData: LyricLine[];
}

/**
 * macOS 状态栏歌词行数据
 */
export interface MacLyricLine {
  words: Array<{ word?: string; startTime: number; endTime: number }>;
  startTime: number;
  endTime: number;
}

/**
 * 歌词优先级
 */
export type LyricPriority = "auto" | "qm" | "ttml" | "official";
