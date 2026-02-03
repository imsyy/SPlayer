import type { LyricLine } from "@applemusic-like-lyrics/lyric";
import { parseLrc } from "../parseLrc";

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

/**
 * 歌词内容对齐
 * @param lyrics 歌词数据
 * @param otherLyrics 其他歌词数据
 * @param key 对齐类型
 * @returns 对齐后的歌词数据
 */
export const alignLyrics = (
  lyrics: LyricLine[],
  otherLyrics: LyricLine[],
  key: "translatedLyric" | "romanLyric",
): LyricLine[] => {
  const lyricsData = lyrics;
  if (lyricsData.length && otherLyrics.length) {
    lyricsData.forEach((v: LyricLine) => {
      otherLyrics.forEach((x: LyricLine) => {
        if (v.startTime === x.startTime || Math.abs(v.startTime - x.startTime) < 300) {
          v[key] = x.words.map((word) => word.word).join("");
        }
      });
    });
  }
  return lyricsData;
};

/**
 * 解析 QQ 音乐 QRC 格式歌词
 * @param qrcContent QRC 原始内容
 * @param trans 翻译歌词
 * @param roma 罗马音歌词（QRC 格式）
 * @returns LyricLine 数组
 */
export const parseQRCLyric = (qrcContent: string, trans?: string, roma?: string): LyricLine[] => {
  // 行匹配: [开始时间,持续时间]内容
  const linePattern = /^\[(\d+),(\d+)\](.*)$/;
  // 逐字匹配: 文字(开始时间,持续时间)
  const wordPattern = /([^(]*)\((\d+),(\d+)\)/g;

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
    // 从 XML 中提取歌词内容
    const contentMatch = /<Lyric_1[^>]*LyricContent="([^"]*)"[^>]*\/>/.exec(rawContent);
    const content = contentMatch ? contentMatch[1] : rawContent;

    const result: Array<{
      startTime: number;
      endTime: number;
      words: Array<{ word: string; startTime: number; endTime: number }>;
    }> = [];

    for (const rawLine of content.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;

      // 跳过元数据标签 [ti:xxx] [ar:xxx] 等
      if (/^\\[[a-z]+:/i.test(line)) continue;

      const lineMatch = linePattern.exec(line);
      if (!lineMatch) continue;

      const lineStart = parseInt(lineMatch[1], 10);
      const lineDuration = parseInt(lineMatch[2], 10);
      const lineContent = lineMatch[3];

      // 解析逐字
      const words: Array<{ word: string; startTime: number; endTime: number }> = [];
      let wordMatch: RegExpExecArray | null;
      const wordRegex = new RegExp(wordPattern.source, "g");

      while ((wordMatch = wordRegex.exec(lineContent)) !== null) {
        const wordText = wordMatch[1];
        const wordStart = parseInt(wordMatch[2], 10);
        const wordDuration = parseInt(wordMatch[3], 10);

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

  const escapeXml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  let ttml = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:amll="http://www.example.com/ns/amll">
  <head>
    <metadata>
      <ttm:title>Lyrics</ttm:title>
    </metadata>
  </head>
  <body>
    <div>
`;

  for (const line of lines) {
    const lineStart = formatTime(line.startTime);
    const lineEnd = formatTime(line.endTime);

    ttml += `      <p begin="${lineStart}" end="${lineEnd}">\n`;

    // 添加逐字歌词
    for (const word of line.words) {
      const wordStart = formatTime(word.startTime);
      const wordEnd = formatTime(word.endTime);
      ttml += `        <span begin="${wordStart}" end="${wordEnd}">${escapeXml(word.word)}</span>\n`;
    }

    // 添加翻译
    if (line.translatedLyric) {
      ttml += `        <span ttm:role="x-translation">${escapeXml(line.translatedLyric)}</span>\n`;
    }

    // 添加音译
    if (line.romanLyric) {
      ttml += `        <span ttm:role="x-roman">${escapeXml(line.romanLyric)}</span>\n`;
    }

    ttml += `      </p>\n`;
  }

  ttml += `    </div>
  </body>
</tt>`;

  return ttml;
};
