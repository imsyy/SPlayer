/**
 * @fileoverview 元数据行清理器
 *
 * 用于清理歌词中开头和结尾的元数据行，例如：
 *
 * (歌曲名) - (歌手名)
 * 词：...
 * 曲：...
 * 编曲：...
 * 和声编唱：...
 * 人声编辑：...
 * 混音：...
 * 母带：...
 * 监制：...
 * 出品：...
 * 真正的歌词行 1
 * 真正的歌词行 2
 *
 * @see https://github.com/apoint123/Unilyric/blob/afd351c54eca7137cf8ee4ea5652d9ee55c20e32/lyrics_helper_rs/src/converter/processors/metadata_stripper.rs
 */

import type { LyricLine } from "@applemusic-like-lyrics/lyric";

const STRICT_MATCH_SEPARATORS = [
  ":",
  "：",
  ",",
  "，",
  ".",
  "。",
  "!",
  "！",
  "-",
  "_",
  "(",
  "（",
  "[",
  "【",
  "{",
  "『",
  "「",
];

/**
 * 扫描限制配置
 */
export interface ScanLimitConfig {
  /**
   * 扫描比例 (0.0 - 1.0)
   */
  ratio: number;
  /**
   * 最小扫描行数
   */
  minLines: number;
  /**
   * 最大扫描行数
   */
  maxLines: number;
}

/**
 * 歌词清理配置
 */
export interface StripOptions {
  /**
   * 要匹配的关键词列表
   */
  keywords: string[];
  /**
   * 要匹配的正则字符串列表
   */
  regexPatterns: string[];
  /**
   * 这里的正则表达式会被视为弱匹配
   */
  softMatchRegexes?: string[];
  /**
   * 歌曲元数据，用于检查第一行是否为 "歌曲 - 歌手" 格式
   */
  matchMetadata?: {
    title?: string;
    artists?: string[];
  };
}

const DEFAULT_HEADER_LIMIT: ScanLimitConfig = {
  ratio: 0.2,
  minLines: 20,
  maxLines: 70,
};

const DEFAULT_FOOTER_LIMIT: ScanLimitConfig = {
  ratio: 0.2,
  minLines: 20,
  maxLines: 50,
};

function calculateScanLimit(config: ScanLimitConfig, totalLines: number): number {
  const proportional = Math.ceil(totalLines * config.ratio);

  return Math.min(Math.min(Math.max(proportional, config.minLines), config.maxLines), totalLines);
}

function getLineText(line: LyricLine): string {
  if (!line || !line.words) return "";
  return line.words
    .map((w) => w.word)
    .join("")
    .trim();
}

/**
 * 清理文本以便检查
 *
 * 移除行首尾的括号，例如 (作曲: xxx) -> 作曲: xxx
 */
function cleanTextForCheck(text: string): string {
  let processed = text.trim();
  const brackets = [
    ["(", ")"],
    ["（", "）"],
    ["【", "】"],
    ["[", "]"],
    ["{", "}"],
    ["『", "』"],
    ["「", "」"],
  ];

  let changed = true;
  let loopCount = 0;

  while (changed && loopCount < 5) {
    changed = false;
    loopCount++;

    for (const [open, close] of brackets) {
      if (processed.startsWith(open)) {
        // 类似于这样的格式：(作曲：周杰伦)
        if (processed.endsWith(close)) {
          processed = processed.slice(open.length, processed.length - close.length).trim();
          changed = true;
          break;
        }

        // 类似于这样的格式：(Live) 作曲：周杰伦
        const closeIdx = processed.indexOf(close);
        if (closeIdx > -1) {
          const contentAfter = processed.slice(closeIdx + close.length).trim();

          if (contentAfter.length > 0) {
            processed = contentAfter;
            changed = true;
            break;
          }
        }
      }
    }
  }
  return processed;
}

// 强匹配行：匹配关键词加冒号，或者匹配正则表达式的行
// 弱匹配行：带有冒号，但不匹配关键词或正则表达式的行。如果夹在强匹配行之间，多半是元数据行但是没有对应的规则。但也有可能是演唱者标识，“男：...”这样的，为了避免误删，如果后面全是弱匹配行，就不删它们
// 真正的歌词行：既不匹配规则，又没有冒号的行，作为防火墙来阻止对之后行的移除。避免元数据在歌词中间，把中间的歌词也移除了

function isStrictMatch(text: string, keywords: string[], regexes: RegExp[]): boolean {
  const cleaned = cleanTextForCheck(text);

  // 转小写并移除空格进行匹配
  const normalizedText = cleaned.toLowerCase().replace(/\s+/g, "");

  for (const kw of keywords) {
    const normalizedKw = kw.toLowerCase().replace(/\s+/g, "");

    if (normalizedText.startsWith(normalizedKw)) {
      const remainder = normalizedText.slice(normalizedKw.length);

      // 如果剩余部分为空，说明完全匹配
      if (remainder.length === 0) {
        return true;
      }

      // 检查分隔符
      // 允许的分隔符包括：冒号、逗号、句号、感叹号、连字符、括号等
      // 注意：normalizedText 已经移除了空格
      if (STRICT_MATCH_SEPARATORS.includes(remainder.charAt(0))) {
        return true;
      }
    }
  }

  for (const reg of regexes) {
    if (reg.test(text)) {
      return true;
    }
  }

  return false;
}

function looksLikeMetadata(text: string, softRegexes: RegExp[]): boolean {
  const cleaned = cleanTextForCheck(text);
  if (
    cleaned.includes(":") ||
    cleaned.includes("：") ||
    // 第一行的 歌曲名 - 歌手名 这样的格式
    cleaned.includes("-")
  ) {
    return true;
  }

  for (const reg of softRegexes) {
    if (reg.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * 扫描头部，寻找正文开始的位置
 */
function findHeaderCutoff(
  lines: readonly LyricLine[],
  startIndex: number,
  keywords: string[],
  regexes: RegExp[],
  softRegexes: RegExp[],
  limit: number,
): number {
  let lastValidMetadataIndex = startIndex - 1;

  console.groupCollapsed(`[LyricStripper] ⬇️ 开始头部扫描 (Start: ${startIndex}, Limit: ${limit})`);

  for (let i = startIndex; i < limit; i++) {
    if (i >= lines.length) break;

    const text = getLineText(lines[i]);

    if (!text) {
      continue;
    }

    const strict = isStrictMatch(text, keywords, regexes);
    const weak = looksLikeMetadata(text, softRegexes);

    let status = "❌ NONE";
    if (strict) status = "✅ STRICT";
    else if (weak) status = "⚠️ WEAK";

    console.log(`Line [${i}]: "${text}" | Result: ${status}`);

    if (!strict && !weak) {
      break;
    }

    if (strict) {
      lastValidMetadataIndex = i;
    }
  }
  console.groupEnd();

  return lastValidMetadataIndex + 1;
}

/**
 * 扫描尾部，寻找正文结束的位置
 */
function findFooterCutoff(
  lines: readonly LyricLine[],
  startIndex: number,
  keywords: string[],
  regexes: RegExp[],
  softRegexes: RegExp[],
  limit: number,
): number {
  if (startIndex >= lines.length) return startIndex;

  const scanEnd = Math.max(startIndex, lines.length - limit);
  let firstValidFooterIndex = lines.length;

  console.groupCollapsed(`[LyricStripper] ⬆️ 开始尾部扫描 (Limit: ${limit})`);

  for (let i = lines.length - 1; i >= scanEnd; i--) {
    const text = getLineText(lines[i]);

    if (!text) {
      continue;
    }

    const strict = isStrictMatch(text, keywords, regexes);
    const weak = looksLikeMetadata(text, softRegexes);

    let status = "❌ NONE";
    if (strict) status = "✅ STRICT";
    else if (weak) status = "⚠️ WEAK";

    console.log(`Line [${i}]: "${text}" | Result: ${status}`);

    if (!strict && !weak) {
      break;
    }

    if (strict) {
      firstValidFooterIndex = i;
    }
  }
  console.groupEnd();

  return firstValidFooterIndex;
}

/**
 * 剥离歌词中的元数据行
 * @param lines 原始歌词行数组
 * @param options 包含关键词和正则的配置
 * @returns 清理后的新歌词行数组
 */
export function stripLyricMetadata(
  lines: readonly LyricLine[],
  options: StripOptions,
): LyricLine[] {
  if (!lines || lines.length === 0) return [];

  let scanStartIndex = 0;

  if (options.matchMetadata) {
    const { title, artists } = options.matchMetadata;
    const firstLineText = getLineText(lines[0]);

    if (title && artists && artists.length > 0 && firstLineText) {
      const lowerText = firstLineText.toLowerCase();
      const lowerTitle = title.toLowerCase();

      if (lowerText.includes(lowerTitle)) {
        const hasAnyArtist = artists.some((artist) => lowerText.includes(artist.toLowerCase()));

        if (hasAnyArtist) {
          console.log(
            `[LyricStripper] 在第一行匹配到歌曲元数据: "${firstLineText}" (Title: ${title}, Artists: ${artists.join(", ")})`,
          );
          scanStartIndex = 1;
        }
      }
    }
  }

  if (
    scanStartIndex === 0 &&
    (!options.keywords || options.keywords.length === 0) &&
    (!options.regexPatterns || options.regexPatterns.length === 0) &&
    (!options.softMatchRegexes || options.softMatchRegexes.length === 0)
  ) {
    return [...lines];
  }

  const regexes: RegExp[] = [];
  if (options.regexPatterns) {
    options.regexPatterns.forEach((p) => {
      try {
        if (p.trim()) {
          regexes.push(new RegExp(p, "i")); // 忽略大小写
        }
      } catch (e) {
        console.warn(`[LyricStripper] 无效的正则表达式: ${p}`, e);
      }
    });
  }

  const softRegexes: RegExp[] = [];
  if (options.softMatchRegexes) {
    options.softMatchRegexes.forEach((p) => {
      try {
        if (p.trim()) softRegexes.push(new RegExp(p, "i"));
      } catch (e) {
        console.warn(`[LyricStripper] 无效的正则表达式: ${p}`, e);
      }
    });
  }

  const keywords = options.keywords || [];
  const totalLines = lines.length;

  const headerConfig = DEFAULT_HEADER_LIMIT;
  const headerLimit = calculateScanLimit(headerConfig, totalLines);

  const startIdx = findHeaderCutoff(
    lines,
    scanStartIndex,
    keywords,
    regexes,
    softRegexes,
    headerLimit,
  );

  const footerConfig = DEFAULT_FOOTER_LIMIT;
  const footerLimit = calculateScanLimit(footerConfig, totalLines);

  const endIdx = findFooterCutoff(lines, startIdx, keywords, regexes, softRegexes, footerLimit);

  if (startIdx === 0 && endIdx === lines.length) {
    return [...lines];
  }

  const newLength = endIdx - startIdx;
  console.log(`[LyricStripper] 清理完成，总行数从 ${totalLines} 变为 ${newLength}`);

  return lines.slice(startIdx, endIdx);
}
