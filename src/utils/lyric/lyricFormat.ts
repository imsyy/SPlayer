import { useSettingStore } from "@/stores";
import { SongLyric } from "@/types/lyric";
import { LyricLine } from "@applemusic-like-lyrics/lyric";
import { cloneDeep } from "lodash-es";

/**
 * 获取替换配置
 * 根据设置决定替换字符（起始/结束符）以及是否为闭合模式
 */
const getReplacementConfig = () => {
  const settingStore = useSettingStore();
  const preset = settingStore.bracketReplacementPreset || "dash";
  const custom = settingStore.customBracketReplacement || "-";

  let startStr = " - ";
  const endStr = " ";
  const isEnclosure = false;

  // 预设模式
  if (preset === "angleBrackets") {
    return { startStr: "〔", endStr: "〕", isEnclosure: true };
  } else if (preset === "cornerBrackets") {
    return { startStr: "「", endStr: "」", isEnclosure: true };
  } else if (preset === "custom") {
    const trimmed = custom.trim();
    // 启发式判断：如果是两个不同字符且不包含减号，视为成对符号 (如 "()")
    const isPair = trimmed.length === 2 && trimmed[0] !== trimmed[1] && !trimmed.includes("-");
    if (isPair) {
      return { startStr: trimmed[0], endStr: trimmed[1], isEnclosure: true };
    } else {
      // 否则视为分隔符 (如 "-")，加上空格规范化
      startStr = " " + trimmed + " ";
      startStr = startStr.replace(/\s+/g, " ");
      return { startStr, endStr: " ", isEnclosure: false };
    }
  }

  // 默认 dash 模式
  return { startStr, endStr, isEnclosure };
};

/**
 * 应用括号替换
 * @param lyricData 歌词数据
 * @returns 替换后的歌词数据
 */
export const applyBracketReplacement = (lyricData: SongLyric): SongLyric => {
  const settingStore = useSettingStore();
  if (!settingStore.replaceLyricBrackets) return lyricData;

  const newLyricData = cloneDeep(lyricData);
  const { startStr, endStr, isEnclosure } = getReplacementConfig();

  // 正则：匹配全行括号 (如 "(Music)")
  const fullBracketRegex = /^\s*[(（][^()（）]*[)）]\s*$/;
  // 正则：匹配左括号
  const leftBracketRegex = /[(（]/g;
  // 正则：匹配右括号
  const rightBracketRegex = /[)）]/g;

  /**
   * 处理普通字符串 (用于翻译和罗马音)
   */
  const processString = (str: string): string => {
    if (!str) return str;

    // 如果是全行括号且非闭合模式 (如分隔符模式)，则直接去除括号
    if (!isEnclosure && fullBracketRegex.test(str)) {
      return str
        .replace(/^\s*[(（]/, "")
        .replace(/[)）]\s*$/, "")
        .trim();
    }

    let res = str.replace(leftBracketRegex, startStr);
    if (isEnclosure) {
      res = res.replace(rightBracketRegex, endStr);
    } else {
      // 分隔符模式：右括号如果是结尾则移除，否则替换为结束符(空格)
      res = res.replace(/[)）](?=\s*$)/g, "").replace(rightBracketRegex, endStr);
      // 清理重复分隔符 (如 " -  - " -> " - ")
      if (startStr.includes("-")) {
        res = res.replace(/(?:\s*-\s*){2,}/g, " - ");
      }
    }
    return res;
  };

  /**
   * 处理单个歌词行单词
   */
  const processWords = (line: LyricLine) => {
    const fullText = line.words.map((w) => w.word).join("");
    // 判断是否整行都被括号包裹
    const isFullBracket = fullBracketRegex.test(fullText);

    // 整行是括号内容，且处于分隔符模式 (非闭合) -> 直接移除首尾括号，不加分隔符
    if (isFullBracket && !isEnclosure) {
      let removedStart = false;
      let removedEnd = false;

      // 移除第一个左括号
      for (const word of line.words) {
        if (!removedStart && leftBracketRegex.test(word.word)) {
          word.word = word.word.replace(leftBracketRegex, "");
          removedStart = true;
        }
      }
      // 移除最后一个右括号
      for (let i = line.words.length - 1; i >= 0; i--) {
        const word = line.words[i];
        if (!removedEnd && rightBracketRegex.test(word.word)) {
          // 替换最后一个匹配的右括号
          const lastIndex = Math.max(word.word.lastIndexOf(")"), word.word.lastIndexOf("）"));
          if (lastIndex !== -1) {
            word.word = word.word.substring(0, lastIndex) + word.word.substring(lastIndex + 1);
            removedEnd = true;
          }
        }
      }
      return;
    }

    // 普通替换逻辑
    line.words.forEach((word, index) => {
      // 替换左括号
      word.word = word.word.replace(leftBracketRegex, startStr);

      if (isEnclosure) {
        // 闭合模式：直接替换右括号
        word.word = word.word.replace(rightBracketRegex, endStr);
      } else {
        // 分隔符模式：
        word.word = word.word.replace(rightBracketRegex, (_, offset, str) => {
          // 如果右括号在单词末尾，且是整句的最后一个单词 -> 移除 (视为句尾闭合)
          const isAtWordEnd = offset === str.length - 1;
          const isAtLineEnd = index === line.words.length - 1;

          if (isAtWordEnd) {
            return isAtLineEnd ? "" : endStr;
          }
          return endStr;
        });
      }
    });

    // 清理逻辑 (仅针对带减号的分隔符模式)
    if (!isEnclosure && startStr.includes("-")) {
      line.words.forEach((word, index) => {
        // 单词内重复: " -  - " -> " - "
        word.word = word.word.replace(/(?:\s*-\s*){2,}/g, " - ");

        // 单词间重复: 前一个词以 "- " 结尾，当前词以 " -" 开头 -> 移除前一个的尾部
        if (index > 0) {
          const prev = line.words[index - 1];
          if (/-\s*$/.test(prev.word) && /^\s*-/.test(word.word)) {
            prev.word = prev.word.replace(/-\s*$/, "");
            // 确保当前词开头有完整分隔符
            if (!/^\s*-\s+/.test(word.word)) {
              word.word = " - " + word.word.replace(/^\s*-\s*/, "");
            }
          }
        }
      });
    }
  };

  /**
   * 处理单行歌词对象
   */
  const processLine = (line: LyricLine) => {
    processWords(line);
    if (line.translatedLyric) line.translatedLyric = processString(line.translatedLyric);
    if (line.romanLyric) line.romanLyric = processString(line.romanLyric);
  };

  newLyricData.lrcData?.forEach(processLine);
  newLyricData.yrcData?.forEach(processLine);

  return newLyricData;
};
