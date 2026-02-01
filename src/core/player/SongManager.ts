import { personalFm, personalFmToTrash } from "@/api/rec";
import { songUrl, unlockSongUrl } from "@/api/song";
import {
  useDataStore,
  useMusicStore,
  useSettingStore,
  useStatusStore,
  useStreamingStore,
} from "@/stores";
import { QualityType, type SongType } from "@/types/main";
import { isLogin } from "@/utils/auth";
import { isElectron } from "@/utils/env";
import { formatSongsList } from "@/utils/format";
import { AI_AUDIO_LEVELS } from "@/utils/meta";
import { getAuthorizedQualityLevels } from "@/utils/auth";
import { handleSongQuality } from "@/utils/helper";
import { openUserLogin } from "@/utils/modal";

/**
 * 歌曲解锁服务器
 */
export enum SongUnlockServer {
  NETEASE = "netease",
  BODIAN = "bodian",
  KUWO = "kuwo",
  GEQUBAO = "gequbao",
}

/** 歌曲播放地址信息 */
export type AudioSource = {
  /** 歌曲id */
  id: number;
  /** 歌曲播放地址 */
  url?: string;
  /** 是否解锁 */
  isUnlocked?: boolean;
  /** 是否为试听 */
  isTrial?: boolean;
  /** 音质 */
  quality?: QualityType;
  /** 音源 */
  source?: string;
};

class SongManager {
  /** 预载下一首歌曲播放信息 */
  private nextPrefetch: AudioSource | undefined;

  /**
   * 预加载封面图片
   * @param song 歌曲信息
   */
  private prefetchCover(song: SongType): void {
    if (!song || song.path) return; // 本地歌曲跳过

    const coverUrls: string[] = [];

    // 收集需要预加载的封面 URL
    if (song.coverSize) {
      // 优先预加载大尺寸封面
      if (song.coverSize.xl) coverUrls.push(song.coverSize.xl);
      if (song.coverSize.l) coverUrls.push(song.coverSize.l);
    }
    if (song.cover && !coverUrls.includes(song.cover)) {
      coverUrls.push(song.cover);
    }
    // 预加载图片
    coverUrls.forEach((url) => {
      if (!url || !url.startsWith("http")) return;
      const img = new Image();
      // 清理
      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
      };
      img.onload = cleanup;
      img.onerror = cleanup;
      img.src = url;
    });
  }

  /**
   * 检查本地缓存
   * @param id 歌曲id
   * @param quality 音质
   */
  private checkLocalCache = async (id: number, quality?: QualityType): Promise<string | null> => {
    const settingStore = useSettingStore();
    if (isElectron && settingStore.cacheEnabled && settingStore.songCacheEnabled) {
      try {
        const cachePath = await window.electron.ipcRenderer.invoke(
          "music-cache-check",
          id,
          quality,
        );
        if (cachePath) {
          console.log(`🚀 [${id}] 由本地音乐缓存提供`);
          return `file://${cachePath}`;
        }
      } catch (e) {
        console.error(`❌ [${id}] 检查缓存失败:`, e);
      }
    }
    return null;
  };

  /**
   * 触发缓存下载
   * @param id 歌曲id
   * @param url 下载地址
   * @param quality 音质
   */
  private triggerCacheDownload = (id: number, url: string, quality?: QualityType | string) => {
    const settingStore = useSettingStore();
    if (isElectron && settingStore.cacheEnabled && settingStore.songCacheEnabled && url) {
      window.electron.ipcRenderer.invoke("music-cache-download", id, url, quality || "standard");
    }
  };

  /**
   * 获取在线播放链接
   * @param id 歌曲id
   * @returns 在线播放信息
   */
  public getOnlineUrl = async (id: number, isPc: boolean = false): Promise<AudioSource> => {
    const settingStore = useSettingStore();
    const dataStore = useDataStore();
    let level = isPc ? "exhigh" : settingStore.songLevel;

    // 权限检查：确保用户有权限播放请求的音质
    const vipType = dataStore.userLoginStatus ? dataStore.userData.vipType || 0 : 0;
    const allowedLevels = getAuthorizedQualityLevels(vipType, dataStore.userLoginStatus);

    if (allowedLevels) {
      const allowedStrings = allowedLevels as readonly string[];
      // 如果请求的音质不在允许列表中
      if (!allowedStrings.includes(level)) {
        // 降级策略: 使用允许列表中的最后一个（通常是最高质量）
        level = allowedStrings[allowedStrings.length - 1] as typeof settingStore.songLevel;
      }
    }

    // Fuck AI Mode: 如果开启，且请求的 level 是 AI 音质，降级为 hires
    if (settingStore.disableAiAudio && AI_AUDIO_LEVELS.includes(level)) {
      level = "hires";
    }

    const res = await songUrl(id, level);
    console.log(`🌐 ${id} music data:`, res);
    const songData = res.data?.[0];
    // 是否有播放地址
    if (!songData || !songData?.url) return { id, url: undefined };
    // 是否仅能试听
    const isTrial = songData?.freeTrialInfo !== null;
    // 返回歌曲地址
    // 客户端直接返回，网页端转 https, 并转换url以便解决音乐链接cors问题
    const normalizedUrl = isElectron
      ? songData.url
      : songData.url
          .replace(/^http:/, "https:")
          .replace(/m804\.music\.126\.net/g, "m801.music.126.net")
          .replace(/m704\.music\.126\.net/g, "m701.music.126.net");
    // 若为试听且未开启试听播放，则将 url 置为空，仅标记为试听
    const finalUrl = isTrial && !settingStore.playSongDemo ? null : normalizedUrl;
    // 获取音质
    const quality = handleSongQuality(songData, "online");
    // 检查本地缓存
    if (finalUrl && quality) {
      const cachedUrl = await this.checkLocalCache(id, quality);
      if (cachedUrl) {
        return { id, url: cachedUrl, isTrial, quality };
      }
    }
    // 缓存对应音质音乐
    if (finalUrl) {
      this.triggerCacheDownload(id, finalUrl, quality);
    }
    return { id, url: finalUrl, isTrial, quality };
  };

  /**
   * 获取所有可用解锁源
   */
  public getAvailableUnlockSources = async (song: SongType): Promise<AudioSource[]> => {
    const settingStore = useSettingStore();
    const songId = song.id;

    const artist = Array.isArray(song.artists) ? song.artists[0].name : song.artists;
    const keyWord = song.name + "-" + artist;
    if (!songId || !keyWord) {
      return [];
    }

    // 获取音源列表
    const servers = settingStore.songUnlockServer.filter((s) => s.enabled).map((s) => s.key);
    if (servers.length === 0) {
      return [];
    }

    // 并发执行
    const results = await Promise.allSettled(
      servers.map((server) =>
        unlockSongUrl(songId, keyWord, server).then((result) => ({
          server,
          result,
          success: result.code === 200 && !!result.url,
        })),
      ),
    );

    const sources: AudioSource[] = [];
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.success) {
        const unlockUrl = r.value?.result?.url;
        // 推断音质
        let quality = QualityType.HQ;
        if (unlockUrl && (unlockUrl.includes(".flac") || unlockUrl.includes(".wav"))) {
          quality = QualityType.SQ;
        }
        sources.push({
          id: songId,
          url: unlockUrl,
          isUnlocked: true,
          quality,
          source: r.value.server,
        });
      }
    }
    return sources;
  };

  /**
   * 获取解锁播放链接
   * @param songData 歌曲数据
   * @returns
   */
  public getUnlockSongUrl = async (song: SongType): Promise<AudioSource> => {
    const sources = await this.getAvailableUnlockSources(song);
    if (sources.length > 0) {
      const s = sources[0];
      // 解锁成功后，触发下载
      if (s.url) this.triggerCacheDownload(s.id, s.url);
      return s;
    }
    return { id: song.id, url: undefined };
  };

  /**
   * 预载下一首歌曲播放地址
   * @returns 预载数据
   */
  public getNextSongUrl = async (): Promise<AudioSource | undefined> => {
    try {
      const dataStore = useDataStore();
      const statusStore = useStatusStore();
      const settingStore = useSettingStore();

      // 无列表或私人FM模式直接跳过
      const playList = dataStore.playList;
      if (!playList?.length || statusStore.personalFmMode) {
        return;
      }

      // 计算下一首（循环到首）
      let nextIndex = statusStore.playIndex + 1;
      if (nextIndex >= playList.length) nextIndex = 0;
      const nextSong = playList[nextIndex];
      if (!nextSong) return;

      // 预加载封面图片
      this.prefetchCover(nextSong);

      // 本地歌曲跳过
      if (nextSong.path) return;

      // 流媒体歌曲
      if (nextSong.type === "streaming" && nextSong.streamUrl) {
        this.nextPrefetch = {
          id: nextSong.id,
          url: nextSong.streamUrl,
          isUnlocked: false,
          quality: QualityType.SQ,
        };
        return this.nextPrefetch;
      }

      // 在线歌曲：优先官方，其次解灰
      const songId = nextSong.type === "radio" ? nextSong.dj?.id : nextSong.id;
      if (!songId) return;

      // 是否可解锁
      const canUnlock = isElectron && nextSong.type !== "radio" && settingStore.useSongUnlock;
      // 先请求官方地址
      const { url: officialUrl, isTrial, quality } = await this.getOnlineUrl(songId, false);
      if (officialUrl && !isTrial) {
        // 官方可播放且非试听
        this.nextPrefetch = { id: songId, url: officialUrl, isUnlocked: false, quality };
        return this.nextPrefetch;
      } else if (canUnlock) {
        // 官方失败或为试听时尝试解锁
        const unlockUrl = await this.getUnlockSongUrl(nextSong);
        if (unlockUrl.url) {
          this.nextPrefetch = { id: songId, url: unlockUrl.url, isUnlocked: true };
          return this.nextPrefetch;
        } else if (officialUrl && settingStore.playSongDemo) {
          // 解锁失败，若官方为试听且允许试听，保留官方试听地址
          this.nextPrefetch = { id: songId, url: officialUrl };
          return this.nextPrefetch;
        } else {
          return;
        }
      } else {
        // 不可解锁，仅保留官方结果（可能为空）
        this.nextPrefetch = { id: songId, url: officialUrl };
        return this.nextPrefetch;
      }
    } catch (error) {
      console.error("❌ 预加载下一首歌曲地址失败", error);
      return;
    }
  };

  /**
   * 清除预加载缓存
   */
  public clearPrefetch() {
    this.nextPrefetch = undefined;
    console.log("🧹 已清除歌曲 URL 缓存");
  }

  /**
   * 获取指定音频源的链接
   * @param song 歌曲
   * @param source 目标音频源标识
   */
  public getAudioSourceFromSpecificServer = async (
    song: SongType,
    source: string,
  ): Promise<AudioSource> => {
    const songId = song.type === "radio" ? song.dj?.id : song.id;
    if (!songId) return { id: 0, url: undefined, quality: undefined, isUnlocked: false };

    try {
      // 1. 官方源 (netease)
      if (source === "netease") {
        const { url, isTrial, quality } = await this.getOnlineUrl(songId, !!song.pc);
        return {
          id: songId,
          url,
          isTrial,
          quality,
          source: "netease",
          isUnlocked: false,
        };
      }

      // 2. 解锁源 (其他)
      const settingStore = useSettingStore();
      const canUnlock = isElectron && song.type !== "radio" && settingStore.useSongUnlock;

      if (canUnlock) {
        // 构建关键词
        const artist = Array.isArray(song.artists) ? song.artists[0].name : song.artists;
        const keyWord = song.name + "-" + artist;

        // 请求特定解锁源
        const result = await unlockSongUrl(songId, keyWord, source as SongUnlockServer);

        if (result.code === 200 && result.url) {
          const unlockUrl = result.url;
          // 推断音质
          let quality = QualityType.HQ;
          if (unlockUrl && (unlockUrl.includes(".flac") || unlockUrl.includes(".wav"))) {
            quality = QualityType.SQ;
          }

          // 检查本地缓存
          const cachedUrl = await this.checkLocalCache(songId, quality);
          if (cachedUrl) {
            return {
              id: songId,
              url: cachedUrl,
              isUnlocked: true,
              quality,
              source: source,
            };
          }

          // 触发缓存下载
          this.triggerCacheDownload(songId, unlockUrl, quality);

          return {
            id: songId,
            url: unlockUrl,
            isUnlocked: true,
            quality,
            source: source,
          };
        }
      }

      return { id: songId, url: undefined, quality: undefined, isUnlocked: false, source };
    } catch (e) {
      console.error(`❌ 获取特定音频源失败 [${source}]:`, e);
      return { id: songId, url: undefined, quality: undefined, isUnlocked: false, source };
    }
  };

  /**
   * 获取音频源
   * 始终从此方法获取对应歌曲播放信息
   * @param song 歌曲
   * @returns 音频源
   */
  public getAudioSource = async (song: SongType): Promise<AudioSource> => {
    const settingStore = useSettingStore();
    const statusStore = useStatusStore();

    // 本地文件直接返回
    if (song.path && song.type !== "streaming") {
      // 检查本地文件是否存在
      const result = await window.electron.ipcRenderer.invoke("file-exists", song.path);
      if (!result) {
        this.nextPrefetch = undefined;
        console.error("❌ 本地文件不存在");
        return { id: song.id, url: undefined };
      }
      const encodedPath = song.path.replace(/#/g, "%23").replace(/\?/g, "%3F");
      return { id: song.id, url: `file://${encodedPath}` };
    }

    // Stream songs (Subsonic / Jellyfin)
    if (song.type === "streaming" && song.streamUrl) {
      const streamingStore = useStreamingStore();
      const finalUrl = streamingStore.getSongUrl(song);
      console.log(`🔄 [${song.id}] Stream URL:`, finalUrl);
      return {
        id: song.id,
        url: finalUrl,
        isUnlocked: false,
        quality: song.quality || QualityType.SQ,
      };
    }

    // 在线歌曲
    const songId = song.type === "radio" ? song.dj?.id : song.id;
    if (!songId) return { id: 0, url: undefined, quality: undefined, isUnlocked: false };

    // 获取偏好
    const dataStore = useDataStore();
    const pref = await dataStore.getAudioSourcePreference(songId);
    statusStore.preferredAudioSource = pref;

    // 检查缓存并返回 (如果偏好匹配)
    if (this.nextPrefetch && this.nextPrefetch.id === songId && settingStore.useNextPrefetch) {
      if (!pref || this.nextPrefetch.source === pref) {
        console.log(`🚀 [${songId}] 使用预加载缓存播放`);
        const cachedSource = this.nextPrefetch;
        this.nextPrefetch = undefined;
        return cachedSource;
      }
    }

    // 在线获取
    try {
      // 是否可解锁
      const canUnlock = isElectron && song.type !== "radio" && settingStore.useSongUnlock;

      // 并行获取官方和解锁源
      const officialPromise = this.getOnlineUrl(songId, !!song.pc);
      const unlockPromise = canUnlock ? this.getAvailableUnlockSources(song) : Promise.resolve([]);

      const [officialRes, unlockSources] = await Promise.all([officialPromise, unlockPromise]);

      // 构建候选列表
      const candidates: AudioSource[] = [];
      // 官方源
      if (
        officialRes.url &&
        (!officialRes.isTrial || (officialRes.isTrial && settingStore.playSongDemo))
      ) {
        candidates.push({ ...officialRes, source: "netease" });
      }
      // 解锁源
      // candidates.push(...unlockSources);
      // 解锁源去重添加
      for (const s of unlockSources) {
        if (!candidates.some((c) => c.source === s.source)) {
          candidates.push(s);
        }
      }

      // 更新可用源列表
      statusStore.availableAudioSources = candidates.map((s) => s.source || "unknown");

      // 选择源
      let selected: AudioSource | undefined;

      // 1. 尝试使用偏好源
      if (pref) {
        selected = candidates.find((s) => s.source === pref);
      }

      // 2. 如果没有偏好或偏好不可用，使用默认策略
      if (!selected) {
        // 优先官方
        selected = candidates.find((s) => s.source === "netease");
        // 其次解锁源
        if (!selected && candidates.length > 0) {
          selected = candidates[0];
        }
      }

      if (selected) {
        statusStore.audioSource = selected.source;
        // 如果是解锁源，触发缓存下载 (getOnlineUrl 已内部处理官方源缓存)
        if (selected.isUnlocked && selected.url) {
          // 检查本地缓存是否已存在
          const cachedUrl = await this.checkLocalCache(songId, selected.quality);
          if (cachedUrl) {
            console.log(`🚀 [${songId}] 使用本地缓存 (Source: ${selected.source})`);
            return { ...selected, url: cachedUrl };
          }
          // 未找到缓存，触发下载并使用远程 URL
          this.triggerCacheDownload(songId, selected.url, selected.quality);
        }
        return selected;
      }

      // 3. 最后的兜底：检查本地是否有缓存（不区分音质）
      const fallbackUrl = await this.checkLocalCache(songId);
      if (fallbackUrl) {
        console.log(`🚀 [${songId}] 网络请求失败，使用本地缓存兜底`, fallbackUrl);
        return { id: songId, url: fallbackUrl, isUnlocked: true };
      }
      // 无可用源
      return { id: songId, url: undefined, quality: undefined, isUnlocked: false };
    } catch (e) {
      console.error(`❌ [${songId}] 获取音频源异常:`, e);
      // 异常时的兜底：检查本地是否有缓存
      const fallbackUrl = await this.checkLocalCache(songId);
      if (fallbackUrl) {
        console.log(`🚀 [${songId}] 获取异常，使用本地缓存兜底`);
        return { id: songId, url: fallbackUrl, isUnlocked: true };
      }
      return {
        id: songId,
        url: undefined,
        quality: undefined,
        isUnlocked: false,
      };
    }
  };

  /**
   * 初始化/播放私人 FM
   * @param playNext 是否播放下一首
   * @returns 是否成功
   */
  public async initPersonalFM(playNext: boolean = false) {
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();

    try {
      const fetchFM = async () => {
        const res = await personalFm();
        musicStore.personalFM.list = formatSongsList(res.data);
        musicStore.personalFM.playIndex = 0;
      };

      // 若列表为空或已播放到最后，获取新列表
      if (musicStore.personalFM.list.length === 0) await fetchFM();
      // 如果需要播放下一首
      if (playNext) {
        statusStore.personalFmMode = true;
        // 如果当前列表还没播完
        if (musicStore.personalFM.playIndex < musicStore.personalFM.list.length - 1) {
          musicStore.personalFM.playIndex++;
        } else {
          // 列表播完了，获取新的
          await fetchFM();
        }
      }
    } catch (error) {
      console.error("❌ 私人 FM 初始化失败", error);
    }
  }

  /**
   * 私人 FM 垃圾桶
   */
  public async personalFMTrash(id: number) {
    if (!isLogin()) {
      openUserLogin(true);
      return;
    }
    const statusStore = useStatusStore();
    statusStore.personalFmMode = true;
    try {
      await personalFmToTrash(id);
      window.$message.success("已移至垃圾桶");
    } catch (error) {
      window.$message.error("移至垃圾桶失败，请重试");
      console.error("❌ 私人 FM 垃圾桶失败", error);
    }
  }

  /**
   * 刷新私人 FM
   */
  public async refreshPersonalFM() {
    const musicStore = useMusicStore();
    if (!isLogin()) {
      window.$message.error("请先登录");
      return;
    }
    try {
      const res = await personalFm();
      const newList = formatSongsList(res.data);
      if (!newList || newList.length === 0) {
        throw new Error("加载私人漫游列表失败");
      }
      musicStore.personalFM.list = newList;
      musicStore.personalFM.playIndex = 0;
      window.$message.success("刷新成功");
    } catch (error) {
      console.error("❌ 刷新私人 FM 失败", error);
      window.$message.error("刷新失败，请重试");
    }
  }
}

let instance: SongManager | null = null;

/**
 * 获取 SongManager 实例
 * @returns SongManager
 */
export const useSongManager = (): SongManager => {
  if (!instance) instance = new SongManager();
  return instance;
};
