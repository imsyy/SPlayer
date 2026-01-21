import { qqMusicMatch } from "@/api/qqmusic";
import { songLyric, songLyricTTML } from "@/api/song";
import { keywords as defaultKeywords, regexes as defaultRegexes } from "@/assets/data/exclude";
import { useCacheManager } from "@/core/resource/CacheManager";
import { useMusicStore, useSettingStore, useStatusStore, useStreamingStore } from "@/stores";
import { type SongLyric } from "@/types/lyric";
import { SongType } from "@/types/main";
import { isElectron } from "@/utils/env";
import { isWordLevelFormat, parseSmartLrc } from "@/utils/lyricParser";
import { stripLyricMetadata } from "@/utils/lyricStripper";
import { getConverter } from "@/utils/opencc";
import { type LyricLine, parseLrc, parseTTML, parseYrc } from "@applemusic-like-lyrics/lyric";
import { cloneDeep, escapeRegExp, isEmpty } from "lodash-es";

class LyricManager {
  /**
   * 在线歌词请求序列
   * 每次发起新请求递增
   */
  private lyricReqSeq = 0;
  /**
   * 当前有效的请求序列
   * 用于校验返回是否属于当前歌曲的最新请求
   */
  private activeLyricReq = 0;

  constructor() {}

  /**
   * 重置当前歌曲的歌词数据
   * 包括清空歌词数据、重置歌词索引、关闭 TTML 歌词等
   */
  private resetSongLyric() {
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    // 重置歌词数据
    musicStore.setSongLyric({}, true);
    statusStore.usingTTMLLyric = false;
    // 重置歌词索引
    statusStore.lyricIndex = -1;
  }

  /**
   * 获取缓存歌词（原始数据）
   * @param id 歌曲 ID
   * @param type 缓存类型
   * @returns 缓存数据
   */
  private async getRawLyricCache(id: number, type: "lrc" | "ttml" | "qrc"): Promise<string | null> {
    const settingStore = useSettingStore();
    if (!isElectron || !settingStore.cacheEnabled) return null;
    try {
      const cacheManager = useCacheManager();
      const ext = type === "ttml" ? "ttml" : type === "qrc" ? "qrc.json" : "json";
      const result = await cacheManager.get("lyrics", `${id}.${ext}`);
      if (result.success && result.data) {
        // Uint8Array to string
        const decoder = new TextDecoder();
        return decoder.decode(result.data);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 保存缓存歌词（原始数据）
   * @param id 歌曲 ID
   * @param type 缓存类型
   * @param data 数据
   */
  private async saveRawLyricCache(id: number, type: "lrc" | "ttml" | "qrc", data: string) {
    const settingStore = useSettingStore();
    if (!isElectron || !settingStore.cacheEnabled) return;
    try {
      const cacheManager = useCacheManager();
      const ext = type === "ttml" ? "ttml" : type === "qrc" ? "qrc.json" : "json";
      await cacheManager.set("lyrics", `${id}.${ext}`, data);
    } catch (error) {
      console.error("写入歌词缓存失败:", error);
    }
  }

  /**
   * 歌词内容对齐
   * @param lyrics 歌词数据
   * @param otherLyrics 其他歌词数据
   * @param key 对齐类型
   * @returns 对齐后的歌词数据
   */
  private alignLyrics(
    lyrics: LyricLine[],
    otherLyrics: LyricLine[],
    key: "translatedLyric" | "romanLyric",
  ): LyricLine[] {
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
  }

  /**
   * 对齐本地歌词
   * @param lyricData 本地歌词数据
   * @returns 对齐后的本地歌词数据
   */
  private alignLocalLyrics(lyricData: SongLyric): SongLyric {
    // 同一时间的两/三行分别作为主句、翻译、音译
    const toTime = (line: LyricLine) => Number(line?.startTime ?? line?.words?.[0]?.startTime ?? 0);
    // 获取结束时间
    const toEndTime = (line: LyricLine) =>
      Number(line?.endTime ?? line?.words?.[line?.words?.length - 1]?.endTime ?? 0);
    // 取内容
    const toText = (line: LyricLine) => String(line?.words?.[0]?.word || "").trim();
    const lrc = lyricData.lrcData || [];
    if (!lrc.length) return lyricData;
    // 按开始时间分组，时间差 < 0.6s 视为同组
    const sorted = [...lrc].sort((a, b) => toTime(a) - toTime(b));
    const groups: LyricLine[][] = [];
    for (const line of sorted) {
      const st = toTime(line);
      const last = groups[groups.length - 1]?.[0];
      if (last && Math.abs(st - toTime(last)) < 0.6) groups[groups.length - 1].push(line);
      else groups.push([line]);
    }
    // 组装：第 1 行主句；第 2 行翻译；第 3 行音译；不调整时长
    const aligned = groups.map((group) => {
      const base = { ...group[0] } as LyricLine;
      const tran = group[1];
      const roma = group[2];
      if (!base.translatedLyric && tran) {
        base.translatedLyric = toText(tran);
        base.endTime = Math.max(toEndTime(base), toEndTime(tran));
      }
      if (!base.romanLyric && roma) {
        base.romanLyric = toText(roma);
        base.endTime = Math.max(toEndTime(base), toEndTime(roma));
      }
      return base;
    });
    return { lrcData: aligned, yrcData: lyricData.yrcData };
  }

  /**
   * 从 QQ 音乐获取歌词（封装方法，供在线和本地歌曲使用）
   * @param song 歌曲对象，内部自动判断本地/在线并生成缓存 key
   * @returns 歌词数据，如果获取失败返回 null
   */
  private async fetchQQMusicLyric(song: SongType): Promise<SongLyric | null> {
    // 构建歌手字符串
    const artistsStr = Array.isArray(song.artists)
      ? song.artists.map((a) => a.name).join("/")
      : String(song.artists || "");
    // 判断本地/在线，生成缓存 key
    const isLocal = Boolean(song.path);
    const cacheKey = isLocal ? `local_${song.id}` : String(song.id);
    // 检查缓存
    let data: any = null;
    try {
      const cacheManager = useCacheManager();
      const result = await cacheManager.get("lyrics", `${cacheKey}.qrc.json`);
      if (result.success && result.data) {
        const decoder = new TextDecoder();
        const cachedStr = decoder.decode(result.data);
        data = JSON.parse(cachedStr);
      }
    } catch {
      data = null;
    }
    // 如果没有缓存，则请求 API
    if (!data) {
      const keyword = `${song.name}-${artistsStr}`;
      try {
        data = await qqMusicMatch(keyword);
      } catch (error) {
        console.warn("QQ 音乐歌词获取失败:", error);
        return null;
      }
    }
    if (!data || data.code !== 200) return null;
    // 验证时长匹配（相差超过 5 秒视为不匹配）
    if (data.song?.duration && song.duration > 0) {
      const durationDiff = Math.abs(data.song.duration - song.duration);
      if (durationDiff > 5000) {
        console.warn(
          `QQ 音乐歌词时长不匹配: ${data.song.duration}ms vs ${song.duration}ms (差异 ${durationDiff}ms)`,
        );
        return null;
      }
    }
    // 保存到缓存
    if (data.code === 200) {
      try {
        const cacheManager = useCacheManager();
        await cacheManager.set("lyrics", `${cacheKey}.qrc.json`, JSON.stringify(data));
      } catch (error) {
        console.error("写入 QQ 音乐歌词缓存失败:", error);
      }
    }
    // 解析歌词
    const result: SongLyric = { lrcData: [], yrcData: [] };
    // 解析 QRC 逐字歌词
    if (data.qrc) {
      const qrcLines = this.parseQRCLyric(data.qrc, data.trans, data.roma);
      if (qrcLines.length > 0) {
        result.yrcData = qrcLines;
      }
    }
    // 解析 LRC 歌词（如果没有 QRC）
    if (!result.yrcData.length && data.lrc) {
      let lrcLines = parseLrc(data.lrc) || [];
      // 处理翻译
      if (data.trans) {
        let transLines = parseLrc(data.trans);
        if (transLines?.length) {
          // 过滤包含 "//" 或 "作品的著作权" 的翻译行
          transLines = transLines.filter((line) => {
            const text = line.words.map((w) => w.word).join("");
            return !text.includes("//") && !text.includes("作品的著作权");
          });
          lrcLines = this.alignLyrics(lrcLines, transLines, "translatedLyric");
        }
      }
      // 处理罗马音
      if (data.roma) {
        const romaLines = parseLrc(data.roma);
        if (romaLines?.length) {
          lrcLines = this.alignLyrics(lrcLines, romaLines, "romanLyric");
        }
      }
      if (lrcLines.length > 0) {
        result.lrcData = lrcLines;
      }
    }
    // 如果没有任何歌词数据，返回 null
    if (!result.lrcData.length && !result.yrcData.length) {
      return null;
    }
    return result;
  }

  /**
   * 解析 QQ 音乐 QRC 格式歌词
   * @param qrcContent QRC 原始内容
   * @param trans 翻译歌词
   * @param roma 罗马音歌词（QRC 格式）
   * @returns LyricLine 数组
   */
  private parseQRCLyric(qrcContent: string, trans?: string, roma?: string): LyricLine[] {
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
        if (/^\[[a-z]+:/i.test(line)) continue;

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
    let result = qrcLines.map((qrcLine) => {
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
        result = this.alignLyrics(result, transLines, "translatedLyric");
      }
    }
    // 处理音译
    if (roma) {
      const qrcRomaLines = parseQRCContent(roma);
      if (qrcRomaLines?.length) {
        const romaLines = qrcRomaLines.map((line) => {
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
        result = this.alignLyrics(result, romaLines, "romanLyric");
      }
    }
    return result;
  }

  /**
   * 处理在线歌词
   * @param id 歌曲 ID
   * @returns 歌词数据
   */
  private async handleOnlineLyric(id: number | string): Promise<SongLyric> {
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    // 请求序列
    const req = this.activeLyricReq;
    // 最终结果
    const result: SongLyric = { lrcData: [], yrcData: [] };
    // 是否采用了 TTML
    let ttmlAdopted = false;
    // 是否采用了 QQ 音乐歌词
    let qqMusicAdopted = false;
    // 过期判断
    const isStale = () => this.activeLyricReq !== req || musicStore.playSong?.id !== id;

    // 处理 QQ 音乐歌词
    const adoptQQMusic = async () => {
      if (!settingStore.preferQQMusicLyric) return;
      const song = musicStore.playSong;
      if (!song) return;
      const qqLyric = await this.fetchQQMusicLyric(song);
      if (isStale()) return;
      if (!qqLyric) return;
      // 设置结果
      if (qqLyric.yrcData.length > 0) {
        result.yrcData = qqLyric.yrcData;
        qqMusicAdopted = true;
      }
      if (qqLyric.lrcData.length > 0) {
        result.lrcData = qqLyric.lrcData;
        if (!qqMusicAdopted) qqMusicAdopted = true;
      }
      // 先返回一次，避免 TTML 请求过慢
      if (qqMusicAdopted) {
        let lyricData = this.handleLyricExclude(result);
        lyricData = await this.applyChineseVariant(lyricData);
        this.setFinalLyric(lyricData, req);
      }
    };

    // 处理 TTML 歌词
    const adoptTTML = async () => {
      if (!settingStore.enableOnlineTTMLLyric) return;
      if (typeof id !== "number") return;
      let ttmlContent: string | null = await this.getRawLyricCache(id, "ttml");
      if (!ttmlContent) {
        ttmlContent = await songLyricTTML(id);
        if (ttmlContent && typeof ttmlContent === "string") {
          this.saveRawLyricCache(id, "ttml", ttmlContent);
        }
      }
      if (isStale()) return;
      if (!ttmlContent || typeof ttmlContent !== "string") return;
      const sorted = this.cleanTTMLTranslations(ttmlContent);
      const parsed = parseTTML(sorted);
      const lines = parsed?.lines || [];
      if (!lines.length) return;
      result.yrcData = lines;
      ttmlAdopted = true;
    };
    // 处理 LRC 歌词
    const adoptLRC = async () => {
      // 如果已经有 QQ 音乐歌词，跳过网易云
      if (qqMusicAdopted) return;
      if (typeof id !== "number") return;
      let data: any = null;
      const cached = await this.getRawLyricCache(id, "lrc");
      if (cached) {
        try {
          data = JSON.parse(cached);
        } catch {
          data = null;
        }
      }
      if (!data) {
        data = await songLyric(id);
        if (data && data.code === 200) {
          this.saveRawLyricCache(id, "lrc", JSON.stringify(data));
        }
      }
      if (isStale()) return;
      if (!data || data.code !== 200) return;
      let lrcLines: LyricLine[] = [];
      let yrcLines: LyricLine[] = [];
      // 普通歌词
      if (data?.lrc?.lyric) {
        lrcLines = parseLrc(data.lrc.lyric) || [];
        // 普通歌词翻译
        if (data?.tlyric?.lyric)
          lrcLines = this.alignLyrics(lrcLines, parseLrc(data.tlyric.lyric), "translatedLyric");
        // 普通歌词音译
        if (data?.romalrc?.lyric)
          lrcLines = this.alignLyrics(lrcLines, parseLrc(data.romalrc.lyric), "romanLyric");
      }
      // 逐字歌词
      if (data?.yrc?.lyric) {
        yrcLines = parseYrc(data.yrc.lyric) || [];
        // 逐字歌词翻译
        if (data?.ytlrc?.lyric)
          yrcLines = this.alignLyrics(yrcLines, parseLrc(data.ytlrc.lyric), "translatedLyric");
        // 逐字歌词音译
        if (data?.yromalrc?.lyric)
          yrcLines = this.alignLyrics(yrcLines, parseLrc(data.yromalrc.lyric), "romanLyric");
      }
      if (lrcLines.length) result.lrcData = lrcLines;
      // 如果没有 TTML，则采用 网易云 YRC
      if (!result.yrcData.length && yrcLines.length) {
        result.yrcData = yrcLines;
      }
      // 先返回一次，避免 TTML 请求过慢
      let lyricData = this.handleLyricExclude(result);
      lyricData = await this.applyChineseVariant(lyricData);
      this.setFinalLyric(lyricData, req);
    };
    // 优先获取 QQ 音乐歌词
    if (settingStore.preferQQMusicLyric) {
      await adoptQQMusic();
    }
    await Promise.allSettled([adoptTTML(), adoptLRC()]);
    // 优先使用 TTML
    statusStore.usingTTMLLyric = ttmlAdopted;
    return await this.applyChineseVariant(this.handleLyricExclude(result));
  }

  /**
   * 处理本地歌词
   * @param path 本地歌词路径
   * @returns 歌词数据
   */
  private async handleLocalLyric(path: string): Promise<SongLyric> {
    try {
      const musicStore = useMusicStore();
      const statusStore = useStatusStore();
      const settingStore = useSettingStore();
      const { lyric, format }: { lyric?: string; format?: "lrc" | "ttml" } =
        await window.electron.ipcRenderer.invoke("get-music-lyric", path);
      if (!lyric) return { lrcData: [], yrcData: [] };
      // TTML 直接返回
      if (format === "ttml") {
        const sorted = this.cleanTTMLTranslations(lyric);
        const ttml = parseTTML(sorted);
        const lines = ttml?.lines || [];
        statusStore.usingTTMLLyric = true;
        return await this.applyChineseVariant({ lrcData: [], yrcData: lines });
      }
      // 解析本地歌词（智能识别格式）
      const { format: lrcFormat, lines: parsedLines } = parseSmartLrc(lyric);
      // 如果是逐字格式，直接作为 yrcData
      if (isWordLevelFormat(lrcFormat)) {
        statusStore.usingTTMLLyric = false;
        return await this.applyChineseVariant({ lrcData: [], yrcData: parsedLines });
      }
      // 普通格式，继续原有逻辑
      let aligned = this.alignLocalLyrics({ lrcData: parsedLines, yrcData: [] });
      statusStore.usingTTMLLyric = false;
      // 如果开启了本地歌曲 QQ 音乐匹配，尝试获取逐字歌词
      if (settingStore.localLyricQQMusicMatch && musicStore.playSong) {
        const qqLyric = await this.fetchQQMusicLyric(musicStore.playSong);
        if (qqLyric && qqLyric.yrcData.length > 0) {
          // 使用 QQ 音乐的逐字歌词，但保留本地歌词作为 lrcData
          aligned = {
            lrcData: aligned.lrcData,
            yrcData: qqLyric.yrcData,
          };
        }
      }
      return await this.applyChineseVariant(aligned);
    } catch {
      return { lrcData: [], yrcData: [] };
    }
  }

  /**
   * 清洗 TTML 中不需要的翻译
   * @param ttmlContent 原始 TTML 内容
   * @returns 清洗后的 TTML 内容
   */
  // 当支持 i18n 之后，需要对其中的部分函数进行修改，使其优选逻辑能够根据用户界面语言变化
  private cleanTTMLTranslations(
    // 一般没有多种音译，故不对音译部分进行清洗，如果需要请另写处理函数
    ttmlContent: string,
  ): string {
    const lang_counter = (ttml_text: string) => {
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

    const lang_filter = (langs: string[]): string | null => {
      if (langs.length <= 1) return null;

      const lang_matcher = (target: string) => {
        return langs.find((lang) => {
          try {
            return new Intl.Locale(lang).maximize().script === target;
          } catch {
            return false;
          }
        });
      };

      const hans_matched = lang_matcher("Hans");
      if (hans_matched) return hans_matched;

      const hant_matched = lang_matcher("Hant");
      if (hant_matched) return hant_matched;

      const major = langs.find((key) => key.startsWith("zh"));
      if (major) return major;

      return langs[0];
    };

    const ttml_cleaner = (ttml_text: string, major_lang: string | null): string => {
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

    const context_lang = lang_counter(ttmlContent);
    const major = lang_filter(context_lang);
    const cleaned_ttml = ttml_cleaner(ttmlContent, major);

    return cleaned_ttml;
  }

  /**
   * 检测本地歌词覆盖
   * @param id 歌曲 ID
   * @returns 歌词数据
   */
  private async checkLocalLyricOverride(id: number): Promise<SongLyric> {
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    const { localLyricPath } = settingStore;
    if (!isElectron || !localLyricPath.length) return { lrcData: [], yrcData: [] };
    // 从本地遍历
    try {
      const lyricDirs = Array.isArray(localLyricPath) ? localLyricPath.map((p) => String(p)) : [];
      // 读取本地歌词
      const { lrc, ttml } = await window.electron.ipcRenderer.invoke(
        "read-local-lyric",
        lyricDirs,
        id,
      );
      statusStore.usingTTMLLyric = Boolean(ttml);
      // 安全解析 LRC
      let lrcLines: LyricLine[] = [];
      let lrcIsWordLevel = false;
      try {
        const lrcContent = typeof lrc === "string" ? lrc : "";
        if (lrcContent) {
          const { format: lrcFormat, lines } = parseSmartLrc(lrcContent);
          lrcIsWordLevel = isWordLevelFormat(lrcFormat);
          lrcLines = lines;
          console.log("检测到本地歌词覆盖", lrcFormat, lrcLines);
        }
      } catch (err) {
        console.error("parseLrc 本地解析失败:", err);
        lrcLines = [];
      }
      // 安全解析 TTML
      let ttmlLines: LyricLine[] = [];
      try {
        const ttmlContent = typeof ttml === "string" ? ttml : "";
        if (ttmlContent) {
          ttmlLines = parseTTML(ttmlContent).lines || [];
          console.log("检测到本地TTML歌词覆盖", ttmlLines);
        }
      } catch (err) {
        console.error("parseTTML 本地解析失败:", err);
        statusStore.usingTTMLLyric = false;
        ttmlLines = [];
      }
      if (lrcIsWordLevel && lrcLines.length > 0) {
        return { lrcData: [], yrcData: lrcLines };
      }
      return { lrcData: lrcLines, yrcData: ttmlLines };
    } catch (error) {
      console.error("读取本地歌词失败:", error);
      statusStore.usingTTMLLyric = false;
      return { lrcData: [], yrcData: [] };
    }
  }

  /**
   * 处理歌词排除
   * @param lyricData 歌词数据
   * @returns 处理后的歌词数据
   */
  private handleLyricExclude(lyricData: SongLyric): SongLyric {
    const settingStore = useSettingStore();
    const statusStore = useStatusStore();
    const musicStore = useMusicStore();

    const { enableExcludeLyrics, excludeUserKeywords, excludeUserRegexes } = settingStore;

    if (!enableExcludeLyrics) return lyricData;

    // 合并默认规则和用户自定义规则
    const mergedKeywords = [...new Set([...defaultKeywords, ...(excludeUserKeywords ?? [])])];
    const mergedRegexes = [...new Set([...defaultRegexes, ...(excludeUserRegexes ?? [])])];

    const { name, artists } = musicStore.playSong;
    const songMetadataRegexes: string[] = [];

    // 例如第一行就是 `歌手 - 歌曲名` 这样的格式，或者只有歌曲名
    if (name && name !== "未播放歌曲") {
      songMetadataRegexes.push(escapeRegExp(name));
    }

    if (artists) {
      if (typeof artists === "string") {
        if (artists !== "未知歌手") {
          songMetadataRegexes.push(escapeRegExp(artists));
        }
      } else if (Array.isArray(artists)) {
        artists.forEach((artist) => {
          if (artist.name) {
            songMetadataRegexes.push(escapeRegExp(artist.name));
          }
        });
      }
    }

    const options = {
      keywords: mergedKeywords,
      regexPatterns: mergedRegexes,
      softMatchRegexes: songMetadataRegexes,
    };

    const lrcData = stripLyricMetadata(lyricData.lrcData || [], options);

    let yrcData = lyricData.yrcData || [];

    if (!statusStore.usingTTMLLyric || settingStore.enableExcludeTTML) {
      yrcData = stripLyricMetadata(yrcData, options);
    }

    return {
      lrcData,
      yrcData,
    };
  }

  /**
   * 简繁转换歌词
   * @param lyricData 歌词数据
   * @returns 转换后的歌词数据
   */
  private async applyChineseVariant(lyricData: SongLyric): Promise<SongLyric> {
    const settingStore = useSettingStore();
    if (!settingStore.preferTraditionalChinese) {
      return lyricData;
    }

    try {
      const mode = settingStore.traditionalChineseVariant;
      const convert = await getConverter(mode);

      // 深拷贝以避免副作用
      const newLyricData = cloneDeep(lyricData);

      const convertLines = (lines: LyricLine[] | undefined) => {
        if (!lines) return;
        lines.forEach((line) => {
          line.words.forEach((word) => {
            if (word.word) word.word = convert(word.word);
          });
          if (line.translatedLyric) {
            line.translatedLyric = convert(line.translatedLyric);
          }
        });
      };

      // LRC
      convertLines(newLyricData.lrcData);

      // YRC / QRC / TTML
      convertLines(newLyricData.yrcData);

      return newLyricData;
    } catch (e) {
      console.error("简繁转换失败:", e);
      return lyricData;
    }
  }

  /**
   * 比较歌词数据是否相同
   * @param oldData 旧歌词数据
   * @param newData 新歌词数据
   * @returns 是否相同
   */
  private isLyricDataEqual(oldData: SongLyric, newData: SongLyric): boolean {
    // 比较数组长度
    if (
      oldData.lrcData?.length !== newData.lrcData?.length ||
      oldData.yrcData?.length !== newData.yrcData?.length
    ) {
      return false;
    }
    // 比较 lrcData 内容（比较每行的 startTime 和文本内容）
    const compareLines = (oldLines: LyricLine[], newLines: LyricLine[]): boolean => {
      if (oldLines.length !== newLines.length) return false;
      for (let i = 0; i < oldLines.length; i++) {
        const oldLine = oldLines[i];
        const newLine = newLines[i];
        const oldText = oldLine.words?.map((w) => w.word).join("") || "";
        const newText = newLine.words?.map((w) => w.word).join("") || "";
        if (oldLine.startTime !== newLine.startTime || oldText !== newText) {
          return false;
        }
        // ttml 特有属性
        if (newLine.isBG !== oldLine.isBG) return false;
      }
      return true;
    };
    return (
      compareLines(oldData.lrcData || [], newData.lrcData || []) &&
      compareLines(oldData.yrcData || [], newData.yrcData || [])
    );
  }

  /**
   * 设置最终歌词
   * @param lyricData 歌词数据
   * @param req 当前歌词请求
   */
  private setFinalLyric(lyricData: SongLyric, req: number) {
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    // 若非本次
    if (this.activeLyricReq !== req) return;
    // 如果只有逐字歌词
    if (lyricData.lrcData.length === 0 && lyricData.yrcData.length > 0) {
      // 构成普通歌词
      lyricData.lrcData = lyricData.yrcData.map((line) => ({
        ...line,
        words: [
          {
            word: line.words?.map((w) => w.word)?.join("") || "",
            startTime: line.startTime || 0,
            endTime: line.endTime || 0,
            romanWord: line.words?.map((w) => w.romanWord)?.join("") || "",
          },
        ],
      }));
    }
    // 比较新旧歌词数据，如果相同则跳过设置，避免重复重载
    if (this.isLyricDataEqual(musicStore.songLyric, lyricData)) {
      // 仅更新加载状态，不更新歌词数据
      statusStore.lyricLoading = false;
      // 单曲循环时，歌词数据未变，需通知桌面歌词取消加载状态
      if (isElectron) {
        window.electron.ipcRenderer.send("update-desktop-lyric-data", {
          lyricLoading: false,
        });
      }
      return;
    }
    // 设置歌词
    musicStore.setSongLyric(lyricData, true);
    // 结束加载状态
    statusStore.lyricLoading = false;
  }

  /**
   * 处理流媒体歌词
   * @param song 歌曲对象
   * @returns 歌词数据
   */
  private async handleStreamingLyric(song: SongType): Promise<SongLyric> {
    const result: SongLyric = { lrcData: [], yrcData: [] };
    if (song.type !== "streaming" || !song.originalId || !song.serverId) {
      return result;
    }
    try {
      const streamingStore = useStreamingStore();
      const lyricContent = await streamingStore.fetchLyrics(song);
      if (lyricContent) {
        const { format, lines } = parseSmartLrc(lyricContent);
        if (lines.length > 0) {
          if (isWordLevelFormat(format)) {
            result.yrcData = lines;
          } else {
            result.lrcData = lines;
            // 应用翻译对齐逻辑
            const aligned = this.alignLocalLyrics(result);
            result.lrcData = aligned.lrcData;
            result.yrcData = aligned.yrcData;
          }
        }
      }
    } catch (error) {
      console.error("❌ 获取流媒体歌词失败:", error);
    }
    return result;
  }

  /**
   * 处理歌词
   * @param song 歌曲对象
   */
  public async handleLyric(song: SongType) {
    const settingStore = useSettingStore();
    // 标记当前歌词请求（避免旧请求覆盖新请求）
    const req = ++this.lyricReqSeq;
    this.activeLyricReq = req;
    const isStreaming = song?.type === "streaming";
    try {
      let lyricData: SongLyric = { lrcData: [], yrcData: [] };

      // 流媒体歌曲
      if (isStreaming) {
        lyricData = await this.handleStreamingLyric(song);
        // 排除内容
        lyricData = this.handleLyricExclude(lyricData);
        lyricData = await this.applyChineseVariant(lyricData);
        this.setFinalLyric(lyricData, req);
        return;
      }
      // 检查歌词覆盖
      lyricData = await this.checkLocalLyricOverride(song.id);
      if (!isEmpty(lyricData.lrcData) || !isEmpty(lyricData.yrcData)) {
        // 进行本地歌词对齐
        lyricData = this.alignLocalLyrics(lyricData);
        // 排除本地歌词内容
        if (settingStore.enableExcludeLocalLyrics) {
          lyricData = this.handleLyricExclude(lyricData);
        }
        lyricData = await this.applyChineseVariant(lyricData);
      } else if (song.path) {
        lyricData = await this.handleLocalLyric(song.path);
        // 排除本地歌词内容
        if (settingStore.enableExcludeLocalLyrics) {
          lyricData = this.handleLyricExclude(lyricData);
        }
      } else {
        lyricData = await this.handleOnlineLyric(song.id);
        // 排除内容
        lyricData = this.handleLyricExclude(lyricData);
      }
      console.log("最终歌词数据", lyricData);
      this.setFinalLyric(lyricData, req);
    } catch (error) {
      console.error("❌ 处理歌词失败:", error);
      // 重置歌词
      this.resetSongLyric();
    }
  }
}

let instance: LyricManager | null = null;

/**
 * 获取 LyricManager 实例
 * @returns LyricManager
 */
export const useLyricManager = (): LyricManager => {
  if (!instance) instance = new LyricManager();
  return instance;
};
