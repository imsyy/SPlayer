import { getConverter } from "@/utils/opencc";
import {
  lyricLinesToTTML,
  parseQRCLyric,
  parseSmartLrc,
  alignLyrics,
} from "@/utils/lyric/lyricParser";
import { generateASS } from "@/utils/assGenerator";
import { parseTTML, parseYrc, type LyricLine } from "@applemusic-like-lyrics/lyric";

// 定义歌词处理需要的配置接口，避免直接依赖 Store
export interface LyricProcessorOptions {
  downloadLyricToTraditional?: boolean;
  downloadLyricTranslation?: boolean;
  downloadLyricRomaji?: boolean;
  downloadLyricEncoding?: string;
}

export interface LyricResult {
  lrc?: { lyric: string };
  tlyric?: { lyric: string };
  romalrc?: { lyric: string };
  yrc?: { lyric: string };
  ttml?: { lyric: string };
  qrc?: string; // 添加 qrc 支持
}

// 纯函数式的歌词处理工具
export const LyricProcessor = {
  /**
   * 处理基础歌词 (LRC)
   */
  async processBasic(
    lyricResult: LyricResult | null,
    options: LyricProcessorOptions = {},
  ): Promise<string> {
    if (!lyricResult) return "";
    const lrc = lyricResult.lrc?.lyric || "";

    // 检查是否需要合并翻译或罗马音
    const tlyric = options.downloadLyricTranslation ? lyricResult?.tlyric?.lyric : null;
    const romalrc = options.downloadLyricRomaji ? lyricResult?.romalrc?.lyric : null;

    if (tlyric || romalrc) {
      try {
        const parsedLrc = parseSmartLrc(lrc);
        if (parsedLrc?.lines?.length) {
          let lines = parsedLrc.lines;

          if (tlyric) {
            const transParsed = parseSmartLrc(tlyric);
            if (transParsed?.lines?.length) {
              lines = alignLyrics(lines, transParsed.lines, "translatedLyric");
            }
          }

          if (romalrc) {
            const romaParsed = parseSmartLrc(romalrc);
            if (romaParsed?.lines?.length) {
              lines = alignLyrics(lines, romaParsed.lines, "romanLyric");
            }
          }

          // 将合并后的 LyricLine[] 转换回 LRC 字符串
          return this.convertLyricLinesToLrc(lines, options.downloadLyricToTraditional);
        }
      } catch (e) {
        console.error("[LyricProcessor] Failed to merge lyrics, falling back to basic lrc", e);
      }
    }

    return await this.convertToTraditionalIfNeeded(lrc, options.downloadLyricToTraditional);
  },

  /**
   * 将 LyricLine 数组转换为 LRC 格式字符串
   * 支持包含翻译和罗马音（双行显示）
   */
  async convertLyricLinesToLrc(
    lines: LyricLine[],
    toTraditional: boolean = false,
  ): Promise<string> {
    const formatTime = (ms: number): string => {
      const totalSeconds = ms / 1000;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      // 保留3位小数，格式 [mm:ss.xxx]
      return `[${minutes.toString().padStart(2, "0")}:${seconds.toFixed(3).padStart(6, "0")}]`;
    };

    let result = "";
    for (const line of lines) {
      const timeTag = formatTime(line.startTime);
      let text = line.words.map((w) => w.word).join("");

      // 繁简转换
      text = await this.convertToTraditionalIfNeeded(text, toTraditional);

      result += `${timeTag}${text}\n`;

      if (line.translatedLyric) {
        const trans = await this.convertToTraditionalIfNeeded(line.translatedLyric, toTraditional);
        result += `${timeTag}${trans}\n`;
      }

      if (line.romanLyric) {
        result += `${timeTag}${line.romanLyric}\n`;
      }
    }
    return result.trim();
  },

  /**
   * 解析逐字歌词 (TTML/YRC)
   * 纯逻辑：只负责解析和生成内容，不负责获取数据
   */
  parseVerbatim(
    ttmlLyric: string,
    yrcLyric: string,
    qmResult?: { qrc: string; trans: string; roma: string },
  ): { ttml: string; yrc: string } {
    let finalTtml = ttmlLyric;
    let finalYrc = yrcLyric;

    if (!finalTtml && !finalYrc && qmResult?.qrc) {
      try {
        const parsedLines = parseQRCLyric(qmResult.qrc, qmResult.trans, qmResult.roma);
        if (parsedLines.length > 0) {
          finalTtml = lyricLinesToTTML(parsedLines);
        } else {
          finalYrc = qmResult.qrc;
        }
      } catch (e) {
        console.error("[LyricProcessor] Parse QRC failed", e);
      }
    }
    return { ttml: finalTtml, yrc: finalYrc };
  },

  /**
   * 繁简转换工具函数
   */
  async convertToTraditionalIfNeeded(content: string, enable: boolean = false): Promise<string> {
    if (!content) return "";
    if (enable) {
      try {
        const converter = await getConverter("s2t");
        return converter(content);
      } catch (e) {
        console.error("繁简转换失败", e);
      }
    }
    return content;
  },

  /**
   * 生成逐字歌词文件内容
   */
  async generateVerbatimContent(
    ttml: string,
    yrc: string,
    lyricResult: LyricResult | null,
    options: LyricProcessorOptions = {},
  ): Promise<{ content: string; ext: string; encoding: string } | null> {
    let content = ttml || yrc;
    let merged = false;
    let lines: LyricLine[] = [];

    if (content) {
      if (yrc && !ttml) {
        // 优先使用 TTML，若无则解析 YRC
        if (yrc.trim().startsWith("<") || yrc.includes("<QrcInfos>")) {
          lines = parseQRCLyric(yrc);
        } else {
          lines = parseYrc(yrc) || [];
        }
      }

      if (lines.length > 0) {
        const tlyric = options.downloadLyricTranslation ? lyricResult?.tlyric?.lyric : null;
        const romalrc = options.downloadLyricRomaji ? lyricResult?.romalrc?.lyric : null;

        if (tlyric) {
          const transParsed = parseSmartLrc(tlyric);
          if (transParsed?.lines?.length) {
            lines = alignLyrics(lines, transParsed.lines, "translatedLyric");
            merged = true;
          }
        }
        if (romalrc) {
          const romaParsed = parseSmartLrc(romalrc);
          if (romaParsed?.lines?.length) {
            lines = alignLyrics(lines, romaParsed.lines, "romanLyric");
            merged = true;
          }
        }

        if ((merged || yrc) && lines.length > 0) {
          content = lyricLinesToTTML(lines);
        }
      }

      content = await this.convertToTraditionalIfNeeded(
        content,
        options.downloadLyricToTraditional,
      );
      const ext = ttml || lines.length > 0 ? "ttml" : "yrc";
      const encoding = options.downloadLyricEncoding || "utf-8";

      if (ext === "ttml" && encoding !== "utf-8") {
        content = content.replace('encoding="utf-8"', `encoding="${encoding}"`);
        content = content.replace('encoding="UTF-8"', `encoding="${encoding}"`);
      }

      return { content, ext, encoding };
    }
    return null;
  },

  /**
   * 生成 ASS 字幕文件内容
   */
  async generateAssContent(
    ttml: string,
    yrc: string,
    lyricResult: LyricResult | null,
    title: string,
    artist: string,
    options: LyricProcessorOptions = {},
  ): Promise<{ content: string; encoding: string } | null> {
    let lines: LyricLine[] = [];

    if (ttml) {
      const parsed = parseTTML(ttml);
      if (parsed?.lines) lines = parsed.lines;
    } else if (yrc) {
      if (yrc.trim().startsWith("<")) lines = parseQRCLyric(yrc);
      else lines = parseYrc(yrc) || [];
    } else if (lyricResult?.lrc?.lyric) {
      const parsed = parseSmartLrc(lyricResult.lrc.lyric);
      if (parsed?.lines) lines = parsed.lines;
    }

    if (lines.length > 0) {
      const tlyric = options.downloadLyricTranslation ? lyricResult?.tlyric?.lyric : null;
      if (tlyric) {
        const transParsed = parseSmartLrc(tlyric);
        if (transParsed?.lines?.length)
          lines = alignLyrics(lines, transParsed.lines, "translatedLyric");
      }

      const romalrc = options.downloadLyricRomaji ? lyricResult?.romalrc?.lyric : null;
      if (romalrc) {
        const romaParsed = parseSmartLrc(romalrc);
        if (romaParsed?.lines?.length) {
          lines = alignLyrics(lines, romaParsed.lines, "romanLyric");
        }
      }

      const assContent = generateASS(lines, { title, artist });
      const encoding = options.downloadLyricEncoding || "utf-8";

      return { content: assContent, encoding };
    }
    return null;
  },
};
