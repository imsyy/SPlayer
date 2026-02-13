import { type LyricLine } from "@applemusic-like-lyrics/lyric";

/**
 * 歌词数据类型
 */
export interface SongLyric {
  lrcData: LyricLine[];
  yrcData: LyricLine[];
}

/**
 * 歌词优先级
 */
export type LyricPriority = "auto" | "qm" | "ttml" | "official";
