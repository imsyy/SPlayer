import { useStatusStore, useMusicStore, useSettingStore } from "@/stores";
import { songLyric, songLyricTTML } from "@/api/song";
import { type SongLyric } from "@/types/lyric";
import { type LyricLine, parseLrc, parseTTML, parseYrc } from "@applemusic-like-lyrics/lyric";
import { isElectron } from "@/utils/env";
import { isEmpty } from "lodash-es";
import { useCacheManager } from "@/core/resource/CacheManager";

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
  private async getRawLyricCache(id: number, type: "lrc" | "ttml"): Promise<string | null> {
    const settingStore = useSettingStore();
    if (!isElectron || !settingStore.cacheEnabled) return null;
    try {
      const cacheManager = useCacheManager();
      const result = await cacheManager.get("lyrics", `${id}.${type === "ttml" ? "ttml" : "json"}`);
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
  private async saveRawLyricCache(id: number, type: "lrc" | "ttml", data: string) {
    const settingStore = useSettingStore();
    if (!isElectron || !settingStore.cacheEnabled) return;
    try {
      const cacheManager = useCacheManager();
      await cacheManager.set("lyrics", `${id}.${type === "ttml" ? "ttml" : "json"}`, data);
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
          if (v.startTime === x.startTime || Math.abs(v.startTime - x.startTime) < 0.6) {
            v[key] = x.words.map((word) => word.word).join("");
          }
        });
      });
    }
    return lyricsData;
  }

  /**
   * 对齐本地歌词
   * @param lyrics 本地歌词数据
   * @param otherLyrics 其他歌词数据
   * @returns 对齐后的本地歌词数据
   */
  private alignLocalLyrics(lyricData: SongLyric): SongLyric {
    // 同一时间的两/三行分别作为主句、翻译、音译
    const toTime = (line: LyricLine) => Number(line?.startTime ?? line?.words?.[0]?.startTime ?? 0);
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
      const tran = group[1] ? toText(group[1]) : "";
      const roma = group[2] ? toText(group[2]) : "";
      if (!base.translatedLyric) base.translatedLyric = tran;
      if (!base.romanLyric) base.romanLyric = roma;
      return base;
    });
    return { lrcData: aligned, yrcData: lyricData.yrcData };
  }

  /**
   * 处理在线歌词
   * @param id 歌曲 ID
   * @returns 歌词数据
   */
  private async handleOnlineLyric(id: number): Promise<SongLyric> {
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    // 请求序列
    const req = this.activeLyricReq;
    // 最终结果
    const result: SongLyric = { lrcData: [], yrcData: [] };
    // 是否采用了 TTML
    let ttmlAdopted = false;
    // 过期判断
    const isStale = () => this.activeLyricReq !== req || musicStore.playSong?.id !== id;
    // 处理 TTML 歌词
    const adoptTTML = async () => {
      if (!settingStore.enableTTMLLyric) return;
      let ttmlContent: string | null = await this.getRawLyricCache(id, "ttml");
      if (!ttmlContent) {
        ttmlContent = await songLyricTTML(id);
        if (ttmlContent && typeof ttmlContent === "string") {
          this.saveRawLyricCache(id, "ttml", ttmlContent);
        }
      }
      if (isStale()) return;
      if (!ttmlContent || typeof ttmlContent !== "string") return;
      const parsed = parseTTML(ttmlContent);
      const lines = parsed?.lines || [];
      if (!lines.length) return;
      result.yrcData = lines;
      ttmlAdopted = true;
    };
    // 处理 LRC 歌词
    const adoptLRC = async () => {
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
      const lyricData = this.handleLyricExclude(result);
      this.setFinalLyric(lyricData, req);
    };
    // 设置 TTML
    await Promise.allSettled([adoptTTML(), adoptLRC()]);
    statusStore.usingTTMLLyric = ttmlAdopted;
    return result;
  }

  /**
   * 处理本地歌词
   * @param path 本地歌词路径
   * @returns 歌词数据
   */
  private async handleLocalLyric(path: string): Promise<SongLyric> {
    try {
      const statusStore = useStatusStore();
      const { lyric, format }: { lyric?: string; format?: "lrc" | "ttml" } =
        await window.electron.ipcRenderer.invoke("get-music-lyric", path);
      if (!lyric) return { lrcData: [], yrcData: [] };
      // TTML 直接返回
      if (format === "ttml") {
        const ttml = parseTTML(lyric);
        const lines = ttml?.lines || [];
        statusStore.usingTTMLLyric = true;
        return { lrcData: [], yrcData: lines };
      }
      // 解析本地歌词并对其
      const lrcLines = parseLrc(lyric);
      const aligned = this.alignLocalLyrics({ lrcData: lrcLines, yrcData: [] });
      statusStore.usingTTMLLyric = false;
      return aligned;
    } catch {
      return { lrcData: [], yrcData: [] };
    }
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
      let lrcLines: LyricLine[] = [];
      let ttmlLines: LyricLine[] = [];
      // 安全解析 LRC
      try {
        const lrcContent = typeof lrc === "string" ? lrc : "";
        if (lrcContent) {
          lrcLines = parseLrc(lrcContent);
          console.log("检测到本地歌词覆盖", lrcLines);
        }
      } catch (err) {
        console.error("parseLrc 本地解析失败:", err);
        lrcLines = [];
      }
      // 安全解析 TTML
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
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    const { enableExcludeLyrics, excludeKeywords, excludeRegexes } = settingStore;
    // 未开启排除
    if (!enableExcludeLyrics) return lyricData;
    // 处理正则表达式
    const regexes = (excludeRegexes || []).map((r: string) => new RegExp(r));
    /**
     * 判断歌词是否被排除
     * @param line 歌词行
     * @returns 是否被排除
     */
    const isExcluded = (line: LyricLine) => {
      const content = (line?.words || [])
        .map((w) => String(w.word || ""))
        .join("")
        .trim();
      if (!content) return true;
      return (
        (excludeKeywords || []).some((k: string) => content.includes(k)) ||
        regexes.some((re) => re.test(content))
      );
    };
    /**
     * 过滤排除的歌词行
     * @param lines 歌词行数组
     * @returns 过滤后的歌词行数组
     */
    const filterLines = (lines: LyricLine[]) => (lines || []).filter((l) => !isExcluded(l));
    return {
      lrcData: filterLines(lyricData.lrcData || []),
      yrcData:
        // 若当前为 TTML 且开启排除
        statusStore.usingTTMLLyric && settingStore.enableExcludeTTML
          ? filterLines(lyricData.yrcData || [])
          : lyricData.yrcData || [],
    };
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
      return;
    }
    // 设置歌词
    musicStore.setSongLyric(lyricData, true);
    // 结束加载状态
    statusStore.lyricLoading = false;
  }

  /**
   * 处理歌词
   * @param id 歌曲 ID
   * @param path 本地歌词路径（可选）
   */
  public async handleLyric(id: number, path?: string) {
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    // 标记当前歌词请求（避免旧请求覆盖新请求）
    const req = ++this.lyricReqSeq;
    this.activeLyricReq = req;
    try {
      // 歌词加载状态
      statusStore.lyricLoading = true;
      // 通知桌面歌词
      if (isElectron) {
        window.electron.ipcRenderer.send("update-desktop-lyric-data", {
          lyricLoading: true,
        });
      }
      // 检查歌词覆盖
      let lyricData = await this.checkLocalLyricOverride(id);
      // 开始获取歌词
      if (!isEmpty(lyricData.lrcData) || !isEmpty(lyricData.yrcData)) {
        // 进行本地歌词对齐
        lyricData = this.alignLocalLyrics(lyricData);
        // 排除本地歌词内容
        if (settingStore.enableExcludeLocalLyrics) {
          lyricData = this.handleLyricExclude(lyricData);
        }
      } else if (path) {
        lyricData = await this.handleLocalLyric(path);
        // 排除本地歌词内容
        if (settingStore.enableExcludeLocalLyrics) {
          lyricData = this.handleLyricExclude(lyricData);
        }
      } else {
        lyricData = await this.handleOnlineLyric(id);
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
