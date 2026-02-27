import { qqMusicMatch } from "@/api/qqmusic";
import { songLyric, songLyricTTML } from "@/api/song";
import { keywords as defaultKeywords, regexes as defaultRegexes } from "@/assets/data/exclude";
import { useCacheManager } from "@/core/resource/CacheManager";
import { useMusicStore, useSettingStore, useStatusStore, useStreamingStore } from "@/stores";
import type { LyricPriority, SongLyric } from "@/types/lyric";
import type { SongType } from "@/types/main";
import { isElectron } from "@/utils/env";
import { applyBracketReplacement } from "@/utils/lyric/lyricFormat";
import { applyProfanityUncensor } from "@/utils/lyric/lyricProfanity";
import {
  alignLyrics,
  isWordLevelFormat,
  parseQRCLyric,
  parseSmartLrc,
} from "@/utils/lyric/lyricParser";
import { stripLyricMetadata } from "@/utils/lyric/lyricStripper";
import { parseLrc } from "@/utils/lyric/parseLrc";
import { getConverter } from "@/utils/opencc";
import { type LyricLine, parseTTML, parseYrc } from "@applemusic-like-lyrics/lyric";
import { cloneDeep, isEmpty } from "lodash-es";

interface LyricFetchResult {
  data: SongLyric;
  meta: {
    usingTTMLLyric: boolean;
    usingQRCLyric: boolean;
  };
}

/**
 * 歌词管理器
 * 负责歌词的获取、缓存、预加载等操作
 */
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

  /**
   * 预加载的歌词
   */
  private prefetchedLyric: { id: number | string; result: LyricFetchResult } | null = null;

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
    statusStore.usingQRCLyric = false;
    // 重置歌词索引
    statusStore.lyricIndex = -1;
    statusStore.lyricLoading = false;
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
          data,
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
      const qrcLines = parseQRCLyric(data.qrc, data.trans, data.roma);
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
          lrcLines = alignLyrics(lrcLines, transLines, "translatedLyric");
        }
      }
      // 处理罗马音
      if (data.roma) {
        const romaLines = parseLrc(data.roma);
        if (romaLines?.length) {
          lrcLines = alignLyrics(lrcLines, romaLines, "romanLyric");
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
   * 切换歌词源优先级
   * @param source 优先级标识
   */
  public switchLyricSource(source: LyricPriority) {
    const settingStore = useSettingStore();
    const musicStore = useMusicStore();
    settingStore.lyricPriority = source;
    if (musicStore.playSong) {
      this.handleLyric(musicStore.playSong);
    }
  }

  /**
   * 处理在线歌词
   * @param song 歌曲对象
   * @returns 歌词数据和元数据
   */
  private async fetchOnlineLyric(song: SongType): Promise<LyricFetchResult> {
    const settingStore = useSettingStore();
    const id = song.type === "radio" ? song.dj?.id : song.id;
    if (!id)
      return {
        data: { lrcData: [], yrcData: [] },
        meta: { usingTTMLLyric: false, usingQRCLyric: false },
      };

    // 最终结果
    const result: SongLyric = { lrcData: [], yrcData: [] };
    // 元数据
    const meta = {
      usingTTMLLyric: false,
      usingQRCLyric: false,
    };

    // 是否采用了 TTML
    let ttmlAdopted = false;
    // 是否采用了 QQ 音乐歌词
    let qqMusicAdopted = false;

    // 处理 QQ 音乐歌词
    const adoptQQMusic = async () => {
      // 检查开关 (如果显式选了 QM 优先, 则忽略开关限制? 不, UI上限制了)
      if (!settingStore.enableQQMusicLyric && settingStore.lyricPriority !== "qm") return;

      const qqLyric = await this.fetchQQMusicLyric(song);
      if (!qqLyric) return;

      // 设置结果
      if (qqLyric.yrcData.length > 0) {
        result.yrcData = qqLyric.yrcData;
        qqMusicAdopted = true;
        meta.usingQRCLyric = true;
      }
      if (qqLyric.lrcData.length > 0) {
        result.lrcData = qqLyric.lrcData;
        if (!qqMusicAdopted) qqMusicAdopted = true;
      }
    };

    // 处理 TTML 歌词
    const adoptTTML = async () => {
      if (!settingStore.enableOnlineTTMLLyric && settingStore.lyricPriority !== "ttml") return;
      if (typeof id !== "number") return;
      let ttmlContent: string | null = await this.getRawLyricCache(id, "ttml");
      if (!ttmlContent) {
        ttmlContent = await songLyricTTML(id);
        if (ttmlContent && typeof ttmlContent === "string") {
          this.saveRawLyricCache(id, "ttml", ttmlContent);
        }
      }
      if (!ttmlContent || typeof ttmlContent !== "string") return;
      const sorted = this.cleanTTMLTranslations(ttmlContent);
      const parsed = parseTTML(sorted);
      const lines = parsed?.lines || [];
      if (!lines.length) return;

      // 只有当没有 YRC 数据或优先级为 TTML 或 自动模式(TTML > QM) 时才覆盖
      if (
        !result.yrcData.length ||
        settingStore.lyricPriority === "ttml" ||
        settingStore.lyricPriority === "auto"
      ) {
        result.yrcData = lines;
        ttmlAdopted = true;
      }
    };

    // 处理 LRC 歌词
    const adoptLRC = async () => {
      // 如果已经采用了 QRC，则不需要再获取网易云歌词
      if (qqMusicAdopted && result.yrcData.length > 0) return;

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
      if (!data || data.code !== 200) return;
      let lrcLines: LyricLine[] = [];
      let yrcLines: LyricLine[] = [];
      // 普通歌词
      if (data?.lrc?.lyric) {
        lrcLines = parseLrc(data.lrc.lyric) || [];
        // 普通歌词翻译
        if (data?.tlyric?.lyric)
          lrcLines = alignLyrics(lrcLines, parseLrc(data.tlyric.lyric), "translatedLyric");
        // 普通歌词音译
        if (data?.romalrc?.lyric)
          lrcLines = alignLyrics(lrcLines, parseLrc(data.romalrc.lyric), "romanLyric");
      }
      // 逐字歌词
      if (data?.yrc?.lyric) {
        yrcLines = parseYrc(data.yrc.lyric) || [];
        // 逐字歌词翻译
        if (data?.ytlrc?.lyric)
          yrcLines = alignLyrics(yrcLines, parseLrc(data.ytlrc.lyric), "translatedLyric");
        // 逐字歌词音译
        if (data?.yromalrc?.lyric)
          yrcLines = alignLyrics(yrcLines, parseLrc(data.yromalrc.lyric), "romanLyric");
      }
      if (lrcLines.length) result.lrcData = lrcLines;
      // 如果没有 TTML 且没有 QM YRC，则采用 网易云 YRC
      if (!result.yrcData.length && yrcLines.length) {
        // 再次确认优先级，如果是 TTML 优先但 TTML 没结果，这里可以用 YRC
        result.yrcData = yrcLines;
      }
    };

    // 执行优先策略
    const priority = settingStore.lyricPriority;
    if (priority === "qm") {
      await adoptQQMusic();
      // 如果 QM 没结果，回退到 Default
      if (!qqMusicAdopted) {
        await Promise.all([adoptTTML(), adoptLRC()]);
      }
    } else if (priority === "official") {
      // 仅使用官方源
      await adoptLRC();
    } else if (priority === "ttml") {
      await adoptTTML();
      await adoptLRC();
      if (!ttmlAdopted && !result.lrcData.length) {
        await adoptQQMusic();
      }
    } else {
      if (settingStore.enableQQMusicLyric) {
        await adoptQQMusic();
      }
      await Promise.all([adoptTTML(), adoptLRC()]);
    }
    // 设置元数据状态
    meta.usingTTMLLyric = ttmlAdopted;
    // 如果采用了 TTML，则 QRC 标记失效
    if (ttmlAdopted) {
      meta.usingQRCLyric = false;
    }

    return {
      data: result,
      meta,
    };
  }

  /**
   * 处理本地歌词
   * @param song 歌曲对象
   * @returns 歌词数据和元数据
   */
  private async fetchLocalLyric(song: SongType): Promise<LyricFetchResult> {
    const defaultResult: LyricFetchResult = {
      data: { lrcData: [], yrcData: [] },
      meta: { usingTTMLLyric: false, usingQRCLyric: false },
    };
    if (!song.path) return defaultResult;

    try {
      const settingStore = useSettingStore();
      const { lyric, format }: { lyric?: string; format?: "lrc" | "ttml" | "yrc" } =
        await window.electron.ipcRenderer.invoke("get-music-lyric", song.path);
      if (!lyric) return defaultResult;
      // YRC 直接解析
      if (format === "yrc") {
        let lines: LyricLine[] = [];
        // 检测是否为 XML 格式 (QRC)
        if (lyric.trim().startsWith("<") || lyric.includes("<QrcInfos>")) {
          lines = parseQRCLyric(lyric);
        } else {
          lines = parseYrc(lyric) || [];
        }
        return {
          data: { lrcData: [], yrcData: lines },
          meta: { usingTTMLLyric: false, usingQRCLyric: false },
        };
      }
      // TTML 直接返回
      if (format === "ttml") {
        const sorted = this.cleanTTMLTranslations(lyric);
        const ttml = parseTTML(sorted);
        const lines = ttml?.lines || [];
        return {
          data: { lrcData: [], yrcData: lines },
          meta: { usingTTMLLyric: true, usingQRCLyric: false },
        };
      }
      // 解析本地歌词
      const { format: lrcFormat, lines: parsedLines } = parseSmartLrc(lyric);
      // 如果是逐字格式，直接作为 yrcData
      if (isWordLevelFormat(lrcFormat)) {
        return {
          data: { lrcData: [], yrcData: parsedLines },
          meta: { usingTTMLLyric: false, usingQRCLyric: false },
        };
      }
      // 普通格式
      let aligned = this.alignLocalLyrics({ lrcData: parsedLines, yrcData: [] });
      let usingQRCLyric = false;
      // 如果开启了本地歌曲 QQ 音乐匹配，尝试获取逐字歌词
      if (settingStore.localLyricQQMusicMatch && song) {
        const qqLyric = await this.fetchQQMusicLyric(song);
        if (qqLyric && qqLyric.yrcData.length > 0) {
          // 使用 QQ 音乐的逐字歌词，但保留本地歌词作为 lrcData
          aligned = {
            lrcData: aligned.lrcData,
            yrcData: qqLyric.yrcData,
          };
          usingQRCLyric = true;
        }
      }
      return {
        data: aligned,
        meta: { usingTTMLLyric: false, usingQRCLyric },
      };
    } catch {
      return defaultResult;
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

    return cleaned_ttml.replace(/\n\s*/g, "");
  }

  /**
   * 检测本地歌词覆盖
   * @param id 歌曲 ID
   * @returns 歌词数据和元数据
   */
  private async fetchLocalOverrideLyric(id: number): Promise<LyricFetchResult> {
    const settingStore = useSettingStore();
    const { localLyricPath } = settingStore;
    const defaultResult: LyricFetchResult = {
      data: { lrcData: [], yrcData: [] },
      meta: { usingTTMLLyric: false, usingQRCLyric: false }, // 覆盖默认没有 QRC
    };

    if (!isElectron || !localLyricPath.length) return defaultResult;

    // 从本地遍历
    try {
      const lyricDirs = Array.isArray(localLyricPath) ? localLyricPath.map((p) => String(p)) : [];
      // 读取本地歌词
      const { lrc, ttml } = await window.electron.ipcRenderer.invoke(
        "read-local-lyric",
        lyricDirs,
        id,
      );

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
          ttmlLines = parseTTML(this.cleanTTMLTranslations(ttmlContent)).lines || [];
          console.log("检测到本地TTML歌词覆盖", ttmlLines);
        }
      } catch (err) {
        console.error("parseTTML 本地解析失败:", err);
        ttmlLines = [];
      }

      if (lrcIsWordLevel && lrcLines.length > 0) {
        return {
          data: { lrcData: [], yrcData: lrcLines },
          meta: { usingTTMLLyric: false, usingQRCLyric: false },
        };
      }

      return {
        data: { lrcData: lrcLines, yrcData: ttmlLines },
        meta: { usingTTMLLyric: ttmlLines.length > 0, usingQRCLyric: false },
      };
    } catch (error) {
      console.error("读取本地歌词失败:", error);
      return defaultResult;
    }
  }

  /**
   * 处理歌词排除
   * @param lyricData 歌词数据
   * @param targetSong 目标歌曲
   * @param usingTTMLLyric 是否使用 TTML 歌词
   * @returns 处理后的歌词数据
   */
  private handleLyricExclude(
    lyricData: SongLyric,
    targetSong?: SongType,
    usingTTMLLyric?: boolean,
  ): SongLyric {
    const settingStore = useSettingStore();
    const musicStore = useMusicStore();

    const { enableExcludeLyrics, excludeLyricsUserKeywords, excludeLyricsUserRegexes } =
      settingStore;

    if (!enableExcludeLyrics) return lyricData;

    // 合并默认规则和用户自定义规则
    const mergedKeywords = [...new Set([...defaultKeywords, ...(excludeLyricsUserKeywords ?? [])])];
    const mergedRegexes = [...new Set([...defaultRegexes, ...(excludeLyricsUserRegexes ?? [])])];

    const song = targetSong || musicStore.playSong;
    const { name, artists } = song;

    const artistNames: string[] = [];
    if (artists) {
      if (typeof artists === "string") {
        if (artists !== "未知歌手") {
          artistNames.push(artists);
        }
      } else if (Array.isArray(artists)) {
        artists.forEach((artist) => {
          if (artist.name) {
            artistNames.push(artist.name);
          }
        });
      }
    }

    const options = {
      keywords: mergedKeywords,
      regexPatterns: mergedRegexes,
      matchMetadata: {
        title: name !== "未播放歌曲" ? name : undefined,
        artists: artistNames,
      },
    };

    const lrcData = stripLyricMetadata(lyricData.lrcData || [], options);
    let yrcData = lyricData.yrcData || [];

    // usingTTMLLyric 未传入时从 lyricData 推断（预加载场景）
    const isTTML = usingTTMLLyric ?? false;
    if (!isTTML || settingStore.enableExcludeLyricsTTML) {
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
   * 规范化歌词行时间
   * @param lines 歌词行
   */
  private normalizeLyricLines(lines: LyricLine[]) {
    lines.forEach((line) => {
      // 修复 startTime / endTime 为 0 或 invalid 的情况
      if ((!line.startTime || line.startTime <= 0) && line.words?.length) {
        line.startTime = line.words[0].startTime;
      }
      if ((!line.endTime || line.endTime <= 0) && line.words?.length) {
        line.endTime = line.words[line.words.length - 1].endTime;
      }
    });
  }

  /**
   * 设置最终歌词
   * @param lyricData 歌词数据
   * @param req 当前歌词请求
   */
  private setFinalLyric(lyricData: SongLyric, req: number) {
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    // 若非本次
    if (this.activeLyricReq !== req) return;
    // 应用括号替换
    lyricData = applyBracketReplacement(lyricData);
    lyricData = applyProfanityUncensor(lyricData, settingStore.uncensorMaskedProfanity);
    // 规范化时间
    this.normalizeLyricLines(lyricData.yrcData);
    this.normalizeLyricLines(lyricData.lrcData);
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
        window.electron.ipcRenderer.send("desktop-lyric:update-data", {
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
   * @returns 歌词数据和元数据
   */
  private async fetchStreamingLyric(song: SongType): Promise<LyricFetchResult> {
    const result: SongLyric = { lrcData: [], yrcData: [] };
    const defaultMeta = { usingTTMLLyric: false, usingQRCLyric: false };

    if (song.type !== "streaming" || !song.originalId || !song.serverId) {
      return { data: result, meta: defaultMeta };
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
    return { data: result, meta: defaultMeta };
  }

  /**
   * 处理歌词
   * @param song 歌曲对象
   */
  public async handleLyric(song: SongType) {
    const statusStore = useStatusStore();

    // 标记当前歌词请求
    const req = ++this.lyricReqSeq;
    this.activeLyricReq = req;

    // 清除不匹配的预加载
    if (this.prefetchedLyric && this.prefetchedLyric.id !== song.id) {
      this.prefetchedLyric = null;
    }

    // 检查预加载缓存
    if (this.prefetchedLyric && this.prefetchedLyric.id === song.id) {
      console.log(`🚀 [${song.id}] 使用预加载歌词`);
      const { data, meta } = this.prefetchedLyric.result;
      this.prefetchedLyric = null; // 消费后清除

      // 应用到 Store
      statusStore.usingTTMLLyric = meta.usingTTMLLyric;
      statusStore.usingQRCLyric = meta.usingQRCLyric;
      this.setFinalLyric(data, req);
      return;
    }

    try {
      const { data, meta } = await this.fetchLyric(song);

      // 再次确认请求是否仍然有效
      if (this.activeLyricReq !== req) return;

      statusStore.usingTTMLLyric = meta.usingTTMLLyric;
      statusStore.usingQRCLyric = meta.usingQRCLyric;
      this.setFinalLyric(data, req);
    } catch (error) {
      console.error("❌ 处理歌词失败:", error);
      this.resetSongLyric();
    }
  }

  /**
   * 获取歌词
   * @param song 歌曲对象
   * @returns 歌词结果和元数据
   */
  public async fetchLyric(song: SongType): Promise<LyricFetchResult> {
    const settingStore = useSettingStore();
    const isStreaming = song?.type === "streaming";
    let fetchResult: LyricFetchResult = {
      data: { lrcData: [], yrcData: [] },
      meta: { usingTTMLLyric: false, usingQRCLyric: false },
    };

    try {
      // 判断歌词来源
      const isLocal = Boolean(song.path) || false;
      if (isStreaming) {
        fetchResult = await this.fetchStreamingLyric(song);
      } else {
        // 检查本地覆盖
        const overrideResult = await this.fetchLocalOverrideLyric(song.id);
        if (!isEmpty(overrideResult.data.lrcData) || !isEmpty(overrideResult.data.yrcData)) {
          // 对齐
          overrideResult.data = this.alignLocalLyrics(overrideResult.data);
          fetchResult = overrideResult;
        } else if (song.path) {
          // 本地文件
          fetchResult = await this.fetchLocalLyric(song);
        } else {
          // 在线获取
          fetchResult = await this.fetchOnlineLyric(song);
        }
      }
      // 后处理：元数据排除
      if (isLocal ? settingStore.enableExcludeLyricsLocal : true) {
        fetchResult.data = this.handleLyricExclude(
          fetchResult.data,
          song,
          fetchResult.meta.usingTTMLLyric,
        );
      }
      // 后处理：简繁转换
      fetchResult.data = await this.applyChineseVariant(fetchResult.data);

      return fetchResult;
    } catch (error) {
      console.error("❌ 获取歌词失败:", error);
      return fetchResult;
    }
  }

  /**
   * 预加载下一首歌曲歌词
   * @param song 歌曲对象
   */
  public async prefetchLyric(song: SongType) {
    if (!song) return;
    try {
      console.log(`Lyrics prefetching started: [${song.id}] ${song.name}`);
      const result = await this.fetchLyric(song);
      // 存储预加载结果
      this.prefetchedLyric = {
        id: song.id,
        result,
      };
      console.log(`Lyrics prefetch completed: [${song.id}]`);
    } catch (e) {
      console.warn(`Lyrics prefetch failed: [${song.id}]`, e);
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
