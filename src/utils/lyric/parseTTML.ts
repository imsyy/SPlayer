import type { LyricLine, LyricWord } from "@applemusic-like-lyrics/lyric";

/** 歌词行归属信息 */
export type TtmlBgOwnerAnchor = {
  pBeginMs: number | null;
  pEndMs: number | null;
  pKey: string;
};

/** TTML BG 提取结果 */
export type TtmlBgExtractResult = {
  line: LyricLine;
  owner: TtmlBgOwnerAnchor;
  order: number;
};

/**
 * 将 TTML 时间转换为毫秒
 * @param raw 原始时间字符串
 * @returns 毫秒
 */
const parseTtmlTimeToMs = (raw: string | null): number | null => {
  if (!raw) return null;
  const value = raw.trim();
  const msPartToMs = (ms: string) => parseInt(ms.padEnd(3, "0").slice(0, 3), 10);

  const m1 = value.match(/^(\d{2}):(\d{2})\.(\d{1,})$/);
  if (m1) {
    const mm = parseInt(m1[1], 10);
    const ss = parseInt(m1[2], 10);
    const ms = msPartToMs(m1[3]);
    return mm * 60_000 + ss * 1000 + ms;
  }

  const m2 = value.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{1,})$/);
  if (m2) {
    const hh = parseInt(m2[1], 10);
    const mm = parseInt(m2[2], 10);
    const ss = parseInt(m2[3], 10);
    const ms = msPartToMs(m2[4]);
    return hh * 3_600_000 + mm * 60_000 + ss * 1000 + ms;
  }

  return null;
};

/**
 * 获取元素的角色
 * @param el 元素
 * @returns 角色
 */
const getRole = (el: Element): string => {
  return (
    el.getAttribute("ttm:role") ||
    el.getAttribute("role") ||
    el.getAttributeNS("http://www.w3.org/ns/ttml#metadata", "role") ||
    ""
  ).trim();
};

/**
 * 获取元素的文本内容，跳过指定角色
 * @param node 节点
 * @param skipRoles 跳过的角色集合
 * @returns 文本内容
 */
const getTextContentSkippingRoles = (node: Node, skipRoles: Set<string>): string => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as Element;
  const role = getRole(el);
  if (skipRoles.has(role)) return "";
  let out = "";
  for (const child of el.childNodes) {
    out += getTextContentSkippingRoles(child, skipRoles);
  }
  return out;
};

/**
 * 创建歌词单词
 * @param word 单词
 * @param startTime 开始时间
 * @param endTime 结束时间
 * @returns 歌词单词
 */
const createWord = (word: string, startTime: number, endTime: number): LyricWord => ({
  word,
  startTime,
  endTime,
  romanWord: "",
});

/**
 * 获取元素的第一个文本内容，根据角色
 * @param root 根元素
 * @param role 角色
 * @returns 文本内容
 */
const getFirstInnerTextByRole = (root: Element, role: string): string => {
  const nodes = root.querySelectorAll(`span[ttm\\:role="${role}"],span[role="${role}"]`);
  if (!nodes.length) return "";
  return (nodes[0]?.textContent || "").trim();
};

/**
 * 获取元素的最近的父级 p 元素
 * @param el 元素
 * @returns 父级 p 元素
 */
const findClosestP = (el: Element): Element | null => {
  let cur: Element | null = el;
  while (cur) {
    if (cur.tagName.toLowerCase() === "p") return cur;
    cur = cur.parentElement;
  }
  return null;
};

/**
 * 提取 TTML BG 行，并解决归属问题
 * @param ttml TTML 文本
 * @returns TTML BG 提取结果
 */
export const extractTtmlBgWithOwner = (ttml: string): TtmlBgExtractResult[] => {
  if (!ttml.trim()) return [];
  const doc = new DOMParser().parseFromString(ttml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) return [];

  const bgSpans = Array.from(doc.querySelectorAll('span[ttm\\:role="x-bg"],span[role="x-bg"]'));
  if (!bgSpans.length) return [];

  const skipRoles = new Set(["x-translation", "x-roman"]);
  const result: TtmlBgExtractResult[] = [];

  for (let order = 0; order < bgSpans.length; order++) {
    const bgSpan = bgSpans[order];
    const translatedLyric = getFirstInnerTextByRole(bgSpan, "x-translation");
    const romanLyric = getFirstInnerTextByRole(bgSpan, "x-roman");

    const p = findClosestP(bgSpan);
    const pBeginMs = p ? parseTtmlTimeToMs(p.getAttribute("begin")) : null;
    const pEndMs = p ? parseTtmlTimeToMs(p.getAttribute("end")) : null;
    const pKey = p?.getAttribute("itunes:key")?.trim() || "";

    const spanEls = Array.from(bgSpan.querySelectorAll("span"));
    const words: LyricWord[] = [];
    for (const el of spanEls) {
      const role = getRole(el);
      if (skipRoles.has(role)) continue;
      const startTime = parseTtmlTimeToMs(el.getAttribute("begin"));
      if (startTime === null) continue;
      const endTimeRaw = parseTtmlTimeToMs(el.getAttribute("end"));
      const endTime = endTimeRaw !== null && endTimeRaw >= startTime ? endTimeRaw : startTime;
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      words.push(createWord(text, startTime, endTime));
    }

    let startTime = parseTtmlTimeToMs(bgSpan.getAttribute("begin"));
    let endTime = parseTtmlTimeToMs(bgSpan.getAttribute("end"));
    if (startTime === null && words.length) startTime = words[0].startTime;
    if (endTime === null && words.length) endTime = words[words.length - 1].endTime;
    if (startTime === null) continue;
    if (endTime === null || endTime < startTime) endTime = startTime;

    let finalWords = words;
    if (!finalWords.length) {
      const text = getTextContentSkippingRoles(bgSpan, skipRoles).replace(/\s+/g, " ").trim();
      if (!text) continue;
      finalWords = [createWord(text, startTime, startTime)];
    }

    const line: LyricLine = {
      words: finalWords,
      startTime,
      endTime,
      translatedLyric,
      romanLyric,
      isBG: true,
      isDuet: false,
    };
    result.push({
      line,
      owner: { pBeginMs, pEndMs, pKey },
      order,
    });
  }

  return result;
};

/**
 * 清洗 TTML 中不需要的翻译
 * @param ttmlContent 原始 TTML 内容
 * @returns 清洗后的 TTML 内容
 */
// TODO: 当支持 i18n 之后，需要对其中的部分函数进行修改，使其优选逻辑能够根据用户界面语言变化
export const cleanTTMLTranslations = (ttmlContent: string): string => {
  /**
   * 统计 TTML 中的语言
   * @param ttml_text TTML 文本
   * @returns 语言列表
   */
  const langCounter = (ttml_text: string) => {
    // 使用正则匹配所有 xml:lang="xx-XX" 格式的字符串
    const langRegex = /(?<=<(span|translation)[^<>]+)xml:lang="([^"]+)"/g;
    const matches = ttml_text.matchAll(langRegex);
    // 提取匹配结果并去重
    const langSet = new Set<string>();
    for (const match of matches) {
      if (match[2]) langSet.add(match[2]);
    }
    return Array.from(langSet);
  };

  /**
   * 过滤语言
   * @param langs 语言列表
   * @returns 主语言
   */
  const langFilter = (langs: string[]): string | null => {
    if (langs.length <= 1) return null;

    /**
     * 匹配语言
     * @param target 目标语言
     * @returns 匹配到的语言
     */
    const langMatcher = (target: string) => {
      return langs.find((lang) => {
        try {
          return new Intl.Locale(lang).maximize().script === target;
        } catch {
          return false;
        }
      });
    };
    const hans_matched = langMatcher("Hans");
    if (hans_matched) return hans_matched;
    const hant_matched = langMatcher("Hant");
    if (hant_matched) return hant_matched;
    const major = langs.find((key) => key.startsWith("zh"));
    if (major) return major;
    return langs[0];
  };

  /**
   * 清洗 TTML 文本
   * @param ttml_text TTML 文本
   * @param major_lang 主语言
   * @returns 清洗后的 TTML 文本
   */
  const ttmlCleaner = (ttml_text: string, major_lang: string | null): string => {
    // 如果没有指定主语言，直接返回原文本（或者根据需求返回空）
    if (major_lang === null) return ttml_text;
    /**
     * 替换逻辑回调函数
     * @param match 完整匹配到的标签字符串 (例如 <code><span ...>...<\/span></code>)
     * @param lang 正则中第一个捕获组匹配到的语言代码 (例如 "ja-JP")
     */
    const replacer = (match: string, lang: string) => (lang === major_lang ? match : "");
    const translationRegex = /<translation[^>]+xml:lang="([^"]+)"[^>]*>[\s\S]*?<\/translation>/g;
    const spanRegex = /<span[^>]+xml:lang="([^" ]+)"[^>]*>[\s\S]*?<\/span>/g;
    return ttml_text.replace(translationRegex, replacer).replace(spanRegex, replacer);
  };
  // 统计语言
  const context_lang = langCounter(ttmlContent);
  const major = langFilter(context_lang);
  const cleaned_ttml = ttmlCleaner(ttmlContent, major);
  return cleaned_ttml.replace(/\n\s*/g, "");
};

/**
 * 获取歌词行的文本内容
 */
export const getLineText = (line: LyricLine | undefined) =>
  line?.words
    ?.map((w) => w.word)
    .join("")
    .trim() || "";

/**
 * 为歌词行注入 TTML BG 行
 * 解决 BG 行的归属问题，仅用于任务栏歌词显示
 * @param ttml TTML 文本
 * @param lines 歌词行
 * @returns 处理后的歌词行
 */
export const attachTtmlBgLines = (ttml: string, lines: LyricLine[]): LyricLine[] => {
  if (!lines.length) return lines;
  const extracted = extractTtmlBgWithOwner(ttml);
  const hasExtracted = extracted.length > 0;

  const mainEntries = lines.map((line, idx) => ({ line, idx })).filter(({ line }) => !line.isBG);

  const mains = mainEntries.map((e) => e.line);
  const TOLERANCE_MS = 50;

  const findOwnerMainIndex = (bgStart: number) => {
    if (!mains.length) return -1;
    if (bgStart < mains[0].startTime) return 0;
    for (let i = 0; i < mains.length; i++) {
      const cur = mains[i];
      const nextStart = mains[i + 1]?.startTime ?? Infinity;
      if (bgStart >= cur.startTime && bgStart < nextStart) return i;
    }
    return mains.length - 1;
  };

  const findOwnerByAnchor = (pBeginMs: number | null, pEndMs: number | null) => {
    if (!mains.length) return -1;
    if (pBeginMs !== null) {
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let i = 0; i < mains.length; i++) {
        const d = Math.abs(mains[i].startTime - pBeginMs);
        if (d <= TOLERANCE_MS && d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) return bestIdx;
    }
    if (pEndMs !== null) {
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let i = 0; i < mains.length; i++) {
        const d = Math.abs(mains[i].endTime - pEndMs);
        if (d <= TOLERANCE_MS && d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) return bestIdx;
    }
    return -1;
  };

  const extractedMap = new Map<string, typeof extracted>();
  for (const r of extracted) {
    const key = `${r.line.startTime}|${r.line.endTime}|${getLineText(r.line)}`;
    const arr = extractedMap.get(key) || [];
    arr.push(r);
    extractedMap.set(key, arr);
  }

  const existingBg = lines.filter((l) => !!l.isBG);
  const shouldInjectNew = !existingBg.length && hasExtracted;

  type AssignedBg = { line: LyricLine; order: number; startTime: number; endTime: number };
  const groups = new Map<number, AssignedBg[]>();
  const sortByOrderAndTime = (a: AssignedBg, b: AssignedBg) =>
    a.order - b.order || a.startTime - b.startTime || a.endTime - b.endTime;

  const pushAssigned = (owner: number, item: AssignedBg) => {
    const arr = groups.get(owner) || [];
    arr.push(item);
    groups.set(owner, arr);
  };

  for (let i = 0; i < existingBg.length; i++) {
    const bg = existingBg[i];
    const key = `${bg.startTime}|${bg.endTime}|${getLineText(bg)}`;
    const candidates = extractedMap.get(key) || [];
    const matched = candidates.length ? candidates.shift() : null;
    if (matched) extractedMap.set(key, candidates);
    const owner = matched ? findOwnerByAnchor(matched.owner.pBeginMs, matched.owner.pEndMs) : -1;
    const finalOwner = owner >= 0 ? owner : findOwnerMainIndex(bg.startTime);
    pushAssigned(finalOwner, {
      line: bg,
      order: matched?.order ?? i,
      startTime: bg.startTime,
      endTime: bg.endTime,
    });
  }

  if (shouldInjectNew) {
    for (const r of extracted) {
      const bg = r.line;
      const owner = findOwnerByAnchor(r.owner.pBeginMs, r.owner.pEndMs);
      const finalOwner = owner >= 0 ? owner : findOwnerMainIndex(bg.startTime);
      pushAssigned(finalOwner, {
        line: bg,
        order: r.order,
        startTime: bg.startTime,
        endTime: bg.endTime,
      });
    }
  }

  if (!groups.size) return existingBg.length ? [...mains, ...existingBg] : lines;

  const output: LyricLine[] = [];
  let mainCursor = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.isBG) continue;
    output.push(line);
    if (!line.isBG && mainEntries[mainCursor]?.idx === i) {
      const injected = groups.get(mainCursor) || [];
      injected.sort(sortByOrderAndTime);
      output.push(...injected.map((x) => x.line));
      mainCursor++;
    }
  }

  const tail = groups.get(-1) || [];
  if (tail.length) {
    tail.sort(sortByOrderAndTime);
    output.push(...tail.map((x) => x.line));
  }

  return output;
};
