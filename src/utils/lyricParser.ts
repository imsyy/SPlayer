import { type LyricLine, parseLrc } from "@applemusic-like-lyrics/lyric";

/**
 * LRC 格式类型
 */
export enum LrcFormat {
  /** 普通逐行 LRC */
  Line = "line",
  /** 逐字 LRC：[00:28.850]曲[00:32.455]：[00:36.060]钱 */
  WordByWord = "word-by-word",
  /** 增强型 LRC (ESLyric)：[01:37.305]<01:37.624>怕<01:37.943>你 */
  Enhanced = "enhanced",
}

/** LyricWord 类型 */
type LyricWord = { word: string; startTime: number; endTime: number; romanWord: string };

// 预编译正则表达式
const META_TAG_REGEX = /^\[[a-z]+:/i;
const TIME_TAG_REGEX = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
const ENHANCED_TIME_TAG_REGEX = /<(\d{2}):(\d{2})\.(\d{2,3})>/;
const WORD_BY_WORD_REGEX = /\[(\d{2}):(\d{2})\.(\d{2,3})\]([^[\]]*)/g;
const ENHANCED_WORD_REGEX = /<(\d{2}):(\d{2})\.(\d{2,3})>([^<]*)/g;
const LINE_TIME_REGEX = /^\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

/**
 * 解析时间戳为毫秒
 */
const parseTimeToMs = (min: string, sec: string, ms: string): number => {
  const minutes = parseInt(min, 10);
  const seconds = parseInt(sec, 10);
  const milliseconds = ms.length === 2 ? parseInt(ms, 10) * 10 : parseInt(ms, 10);
  return minutes * 60 * 1000 + seconds * 1000 + milliseconds;
};

/**
 * 创建 LyricWord 对象
 */
const createWord = (word: string, startTime: number, endTime: number = startTime): LyricWord => ({
  word,
  startTime,
  endTime,
  romanWord: "",
});

/**
 * 创建 LyricLine 对象
 */
const createLine = (words: LyricWord[], startTime: number, endTime: number = 0): LyricLine => ({
  words,
  startTime,
  endTime,
  translatedLyric: "",
  romanLyric: "",
  isBG: false,
  isDuet: false,
});

/**
 * 修正歌词行的结束时间
 * 每行最后一个字的结束时间 = 下一行的开始时间
 */
const fixLineEndTimes = (lines: LyricLine[]): void => {
  const len = lines.length;
  for (let i = 0; i < len; i++) {
    const line = lines[i];
    const lastWord = line.words[line.words.length - 1];
    const nextLineStart = lines[i + 1]?.startTime;
    // 如果有下一行，使用下一行的开始时间；否则使用最后一个字开始时间 + 1s
    lastWord.endTime = nextLineStart ?? lastWord.startTime + 1000;
    line.endTime = lastWord.endTime;
  }
};

/**
 * 检测 LRC 格式类型
 */
export const detectLrcFormat = (content: string): LrcFormat => {
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || META_TAG_REGEX.test(line)) continue;
    // 检查增强型LRC
    if (ENHANCED_TIME_TAG_REGEX.test(line)) {
      return LrcFormat.Enhanced;
    }
    // 检查逐字LRC
    const matches = line.match(TIME_TAG_REGEX);
    if (matches && matches.length > 1) {
      return LrcFormat.WordByWord;
    }
  }
  return LrcFormat.Line;
};

/**
 * 解析逐字 LRC 格式
 */
export const parseWordByWordLrc = (content: string): LyricLine[] => {
  const result: LyricLine[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || META_TAG_REGEX.test(line)) continue;

    const words: LyricWord[] = [];
    let lineStartTime = Infinity;
    let match: RegExpExecArray | null;

    // 重置正则状态
    WORD_BY_WORD_REGEX.lastIndex = 0;

    while ((match = WORD_BY_WORD_REGEX.exec(line)) !== null) {
      const startTime = parseTimeToMs(match[1], match[2], match[3]);
      const word = match[4];

      if (!word && words.length === 0) continue;

      lineStartTime = Math.min(lineStartTime, startTime);

      // 上一个字的结束时间 = 当前字的开始时间
      if (words.length > 0) {
        words[words.length - 1].endTime = startTime;
      }

      if (word) {
        words.push(createWord(word, startTime));
      }
    }

    if (words.length > 0) {
      result.push(createLine(words, lineStartTime === Infinity ? 0 : lineStartTime));
    }
  }

  fixLineEndTimes(result);
  return result;
};

/**
 * 解析增强型 LRC 格式 (ESLyric)
 */
export const parseEnhancedLrc = (content: string): LyricLine[] => {
  const result: LyricLine[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || META_TAG_REGEX.test(line)) continue;

    const lineTimeMatch = LINE_TIME_REGEX.exec(line);
    if (!lineTimeMatch) continue;

    const lineStartTime = parseTimeToMs(lineTimeMatch[1], lineTimeMatch[2], lineTimeMatch[3]);
    const contentAfterTime = line.slice(lineTimeMatch[0].length);

    const words: LyricWord[] = [];

    // 检查是否有增强型标记
    if (ENHANCED_TIME_TAG_REGEX.test(contentAfterTime)) {
      let match: RegExpExecArray | null;
      ENHANCED_WORD_REGEX.lastIndex = 0;

      while ((match = ENHANCED_WORD_REGEX.exec(contentAfterTime)) !== null) {
        const startTime = parseTimeToMs(match[1], match[2], match[3]);
        const word = match[4];

        if (words.length > 0) {
          words[words.length - 1].endTime = startTime;
        }

        if (word) {
          words.push(createWord(word, startTime));
        }
      }
    } else {
      // 无增强型标记，作为整行处理
      const text = contentAfterTime.trim();
      if (text) {
        words.push(createWord(text, lineStartTime));
      }
    }

    if (words.length > 0) {
      result.push(createLine(words, lineStartTime));
    }
  }

  fixLineEndTimes(result);
  return result;
};

/**
 * 智能解析 LRC 歌词
 */
export const parseSmartLrc = (content: string): { format: LrcFormat; lines: LyricLine[] } => {
  const format = detectLrcFormat(content);

  let lines: LyricLine[];
  switch (format) {
    case LrcFormat.WordByWord:
      lines = parseWordByWordLrc(content);
      break;
    case LrcFormat.Enhanced:
      lines = parseEnhancedLrc(content);
      break;
    default:
      lines = parseLrc(content) || [];
  }

  console.log(`[LyricParser] 检测到歌词格式: ${format}, 共 ${lines.length} 行`);
  return { format, lines };
};

/**
 * 判断解析结果是否为逐字格式
 */
export const isWordLevelFormat = (format: LrcFormat): boolean =>
  format === LrcFormat.WordByWord || format === LrcFormat.Enhanced;
