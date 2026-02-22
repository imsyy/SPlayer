import type { LyricLine } from "@applemusic-like-lyrics/lyric";
import { cloneDeep } from "lodash-es";
import { parseLrc } from "./parseLrc";
import { extractLyricContent } from "./qrc-parser";

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
const TIME_TAG_REGEX = /\[(\d{2}):(\d{2})\.(\d{1,})\]/g;
const ENHANCED_TIME_TAG_REGEX = /<(\d{2}):(\d{2})\.(\d{1,})>/;
// 移除全局带状态的正则，改为在函数内使用 matchAll 或重新构建
const LINE_TIME_REGEX = /^\[(\d{2}):(\d{2})\.(\d{1,})\]/;

// QRC 解析相关正则 - 提前编译
const QRC_LINE_PATTERN = /^\[(\d+),(\d+)\](.*)$/;
const QRC_WORD_PATTERN = /(.*?)\((\d+),(\d+)\)/g;

const DEFAULT_WORD_DURATION = 1000;
const ALIGN_TOLERANCE_MS = 300;

/**
 * 解析时间戳为毫秒
 * 使用字符串补齐处理，避免浮点数计算误差
 */
const parseTimeToMs = (min: string, sec: string, ms: string): number => {
  const minutes = parseInt(min, 10);
  const seconds = parseInt(sec, 10);
  // 补齐到 3 位 (例如 "5" -> "500", "05" -> "050", "1234" -> "123")
  const msNormalized = ms.padEnd(3, "0").slice(0, 3);
  const milliseconds = parseInt(msNormalized, 10);
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
 * 优化：在解析过程中直接计算 endTime，避免二次遍历
 */
export const parseWordByWordLrc = (content: string): LyricLine[] => {
  const result: LyricLine[] = [];
  let prevLine: LyricLine | null = null;
  const WORD_BY_WORD_PATTERN = /\[(\d{2}):(\d{2})\.(\d{1,})\]([^[\\]]*)/g;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || META_TAG_REGEX.test(line)) continue;

    const words: LyricWord[] = [];
    let lineStartTime = Infinity;

    let prevWord: LyricWord | null = null;

    const matches = line.matchAll(WORD_BY_WORD_PATTERN);

    for (const match of matches) {
      const startTime = parseTimeToMs(match[1], match[2], match[3]);
      const wordText = match[4];

      if (!wordText && words.length === 0) continue;

      lineStartTime = Math.min(lineStartTime, startTime);

      // 设置上一个字的结束时间
      if (prevWord) {
        prevWord.endTime = startTime;
      }

      if (wordText) {
        const newWord = createWord(wordText, startTime);
        words.push(newWord);
        prevWord = newWord;
      }
    }

    // 处理行内最后一个字
    if (prevWord) {
      prevWord.endTime = prevWord.startTime + DEFAULT_WORD_DURATION;
    }

    if (words.length > 0) {
      const lineObj = createLine(words, lineStartTime === Infinity ? 0 : lineStartTime);
      // 设置行结束时间为最后一个字的结束时间
      lineObj.endTime = words[words.length - 1].endTime;

      // 修正上一行的结束时间 (Single Pass)
      if (prevLine) {
        const prevLastWord = prevLine.words[prevLine.words.length - 1];
        // 只有当当前行开始时间晚于上一行最后一个字的开始时间时，才进行截断
        if (lineObj.startTime > prevLastWord.startTime) {
          prevLastWord.endTime = Math.min(prevLastWord.endTime, lineObj.startTime);
          prevLine.endTime = prevLastWord.endTime;
        }
      }

      result.push(lineObj);
      prevLine = lineObj;
    }
  }

  return result;
};

/**
 * 解析增强型 LRC 格式 (ESLyric)
 */
export const parseEnhancedLrc = (content: string): LyricLine[] => {
  const result: LyricLine[] = [];
  let prevLine: LyricLine | null = null;
  const ENHANCED_WORD_PATTERN = /<(\d{2}):(\d{2})\.(\d{1,})>([^<]*)/g;

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
      let prevWord: LyricWord | null = null;

      const matches = contentAfterTime.matchAll(ENHANCED_WORD_PATTERN);

      for (const match of matches) {
        const startTime = parseTimeToMs(match[1], match[2], match[3]);
        const wordText = match[4];

        if (prevWord) {
          prevWord.endTime = startTime;
        }

        if (wordText) {
          const newWord = createWord(wordText, startTime);
          words.push(newWord);
          prevWord = newWord;
        }
      }

      if (prevWord) {
        prevWord.endTime = prevWord.startTime + DEFAULT_WORD_DURATION; // 默认兜底
      }
    } else {
      // 无增强型标记，作为整行处理
      const text = contentAfterTime.trim();
      if (text) {
        words.push(createWord(text, lineStartTime, lineStartTime + DEFAULT_WORD_DURATION)); // 默认持续1s
      }
    }

    if (words.length > 0) {
      const lineObj = createLine(words, lineStartTime);
      lineObj.endTime = words[words.length - 1].endTime;

      // 修正上一行的结束时间 (Single Pass)
      if (prevLine) {
        const prevLastWord = prevLine.words[prevLine.words.length - 1];
        if (lineObj.startTime > prevLastWord.startTime) {
          prevLastWord.endTime = Math.min(prevLastWord.endTime, lineObj.startTime);
          prevLine.endTime = prevLastWord.endTime;
        }
      }

      result.push(lineObj);
      prevLine = lineObj;
    }
  }

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

/**
 * 歌词内容对齐
 * 使用双指针算法实现 O(N) 复杂度
 * @param lyrics 歌词数据 (Readonly)
 * @param otherLyrics 其他歌词数据
 * @param key 对齐类型
 * @returns 对齐后的歌词数据 (新副本)
 */
export const alignLyrics = (
  lyrics: Readonly<LyricLine[]>,
  otherLyrics: Readonly<LyricLine[]>,
  key: "translatedLyric" | "romanLyric",
): LyricLine[] => {
  if (!lyrics.length || !otherLyrics.length) return cloneDeep(lyrics) as LyricLine[];

  const result = cloneDeep(lyrics) as LyricLine[];

  let i = 0;
  let j = 0;

  while (i < result.length && j < otherLyrics.length) {
    const line = result[i];
    const other = otherLyrics[j];
    const diff = line.startTime - other.startTime;

    if (Math.abs(diff) <= ALIGN_TOLERANCE_MS) {
      // 匹配成功
      line[key] = other.words.map((word) => word.word).join("");
      i++;
      j++;
    } else if (diff < 0) {
      // 当前歌词时间较早，移动当前指针
      i++;
    } else {
      // 目标歌词时间较早，移动目标指针
      j++;
    }
  }
  return result;
};

/**
 * 解析 QRC 内容为行数据
 */
const parseQRCContent = (
  rawContent: string,
): Array<{
  startTime: number;
  endTime: number;
  words: Array<{ word: string; startTime: number; endTime: number }>;
}> => {
  // 使用策略模式提取 LyricContent (自动适配 Browser/Node 环境)
  const content = extractLyricContent(rawContent) || rawContent;

  const result: Array<{
    startTime: number;
    endTime: number;
    words: Array<{ word: string; startTime: number; endTime: number }>;
  }> = [];

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    // 跳过元数据标签 [ti:xxx] [ar:xxx] 等
    if (META_TAG_REGEX.test(line)) continue;

    const lineMatch = QRC_LINE_PATTERN.exec(line);
    if (!lineMatch) continue;

    const lineStart = parseInt(lineMatch[1], 10);
    const lineDuration = parseInt(lineMatch[2], 10);
    const lineContent = lineMatch[3];

    // 解析逐字
    const words: Array<{ word: string; startTime: number; endTime: number }> = [];

    const matches = lineContent.matchAll(QRC_WORD_PATTERN);

    for (const match of matches) {
      const wordText = match[1];
      const wordStart = parseInt(match[2], 10);
      const wordDuration = parseInt(match[3], 10);

      if (wordText) {
        words.push({
          word: wordText,
          startTime: wordStart,
          endTime: wordStart + wordDuration,
        });
      }
    }

    if (words.length > 0) {
      result.push({
        startTime: lineStart,
        endTime: lineStart + lineDuration,
        words,
      });
    }
  }
  return result;
};

/**
 * 解析 QQ 音乐 QRC 格式歌词
 * @param qrcContent QRC 原始内容
 * @param trans 翻译歌词
 * @param roma 罗马音歌词（QRC 格式）
 * @returns LyricLine 数组
 */
export const parseQRCLyric = (qrcContent: string, trans?: string, roma?: string): LyricLine[] => {
  // 解析主歌词
  const qrcLines = parseQRCContent(qrcContent);
  let result: LyricLine[] = qrcLines.map((qrcLine) => {
    return {
      words: qrcLine.words.map((word) => ({
        ...word,
        romanWord: "",
      })),
      startTime: qrcLine.startTime,
      endTime: qrcLine.endTime,
      translatedLyric: "",
      romanLyric: "",
      isBG: false,
      isDuet: false,
    };
  });

  // 处理翻译
  if (trans) {
    let transLines = parseLrc(trans);
    if (transLines?.length) {
      // 过滤包含 "//" 或 "作品的著作权" 的翻译行
      transLines = transLines.filter((line) => {
        const text = line.words.map((w) => w.word).join("");
        return !text.includes("//") && !text.includes("作品的著作权");
      });
      result = alignLyrics(result, transLines, "translatedLyric");
    }
  }

  // 处理音译
  if (roma) {
    const qrcRomaLines = parseQRCContent(roma);
    if (qrcRomaLines?.length) {
      const romaLines: LyricLine[] = qrcRomaLines.map((line) => {
        return {
          words: [
            {
              startTime: line.startTime,
              endTime: line.endTime,
              word: line.words.map((w) => w.word).join(""),
              romanWord: "",
            },
          ],
          startTime: line.startTime,
          endTime: line.endTime,
          translatedLyric: "",
          romanLyric: "",
          isBG: false,
          isDuet: false,
        };
      });
      result = alignLyrics(result, romaLines, "romanLyric");
    }
  }

  return result;
};

// XML Builder Helper Class
class XmlNode {
  name: string;
  attributes: Record<string, string>;
  children: (XmlNode | string)[];

  constructor(name: string, attributes: Record<string, string> = {}) {
    this.name = name;
    this.attributes = attributes;
    this.children = [];
  }

  addChild(child: XmlNode | string) {
    this.children.push(child);
    return this;
  }

  private escape(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  toString(indent = 0): string {
    const spaces = " ".repeat(indent);
    const attrs = Object.entries(this.attributes)
      .map(([key, val]) => `${key}="${this.escape(String(val))}"`)
      .join(" ");

    const attrStr = attrs ? " " + attrs : "";

    if (this.children.length === 0) {
      return `${spaces}<${this.name}${attrStr} />`;
    }

    const isAllText = this.children.every((c) => typeof c === "string");

    if (isAllText) {
      const textContent = this.children.map((c) => this.escape(c as string)).join("");
      return `${spaces}<${this.name}${attrStr}>${textContent}</${this.name}>`;
    }

    const childrenStr = this.children
      .map((c) => (typeof c === "string" ? this.escape(c) : c.toString(indent + 2)))
      .join("\n");

    return `${spaces}<${this.name}${attrStr}>\n${childrenStr}\n${spaces}</${this.name}>`;
  }
}

/**
 * 将 LyricLine 数组转换为 TTML 格式
 * @param lines LyricLine 数组
 * @returns TTML 格式字符串
 */
export const lyricLinesToTTML = (lines: LyricLine[]): string => {
  const formatTime = (ms: number): string => {
    const totalSeconds = ms / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toFixed(3).padStart(6, "0")}`;
  };

  const root = new XmlNode("tt", {
    xmlns: "http://www.w3.org/ns/ttml",
    "xmlns:ttm": "http://www.w3.org/ns/ttml#metadata",
    "xmlns:amll": "http://www.example.com/ns/amll",
  });

  const head = new XmlNode("head");
  const metadata = new XmlNode("metadata");
  metadata.addChild(new XmlNode("ttm:title").addChild("Lyrics"));
  head.addChild(metadata);
  root.addChild(head);

  const body = new XmlNode("body");
  const div = new XmlNode("div");

  for (const line of lines) {
    const lineStart = formatTime(line.startTime);
    const lineEnd = formatTime(line.endTime);

    const p = new XmlNode("p", { begin: lineStart, end: lineEnd });

    for (const word of line.words) {
      // 过滤无效的空词（内容为空且时长为0）
      if (!word.word || word.startTime === word.endTime) continue;

      const wordStart = formatTime(word.startTime);
      const wordEnd = formatTime(word.endTime);
      p.addChild(new XmlNode("span", { begin: wordStart, end: wordEnd }).addChild(word.word));
    }

    if (line.translatedLyric) {
      p.addChild(
        new XmlNode("span", { "ttm:role": "x-translation" }).addChild(line.translatedLyric),
      );
    }

    if (line.romanLyric) {
      p.addChild(new XmlNode("span", { "ttm:role": "x-roman" }).addChild(line.romanLyric));
    }

    div.addChild(p);
  }

  body.addChild(div);
  root.addChild(body);

  return `<?xml version="1.0" encoding="utf-8"?>\n` + root.toString();
};
