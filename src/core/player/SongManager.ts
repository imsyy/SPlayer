import { personalFm, personalFmToTrash } from "@/api/rec";
import { songUrl, unlockSongUrl } from "@/api/song";
import { useDataStore, useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import type { QualityType, SongType } from "@/types/main";
import { isLogin } from "@/utils/auth";
import { isElectron } from "@/utils/env";
import { formatSongsList } from "@/utils/format";
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
};

class SongManager {
  /** 预载下一首歌曲播放信息 */
  private nextPrefetch: AudioSource | undefined;

  /**
   * 检查本地缓存
   * @param id 歌曲id
   * @param quality 音质
   */
  private checkLocalCache = async (id: number, quality?: QualityType): Promise<string | null> => {
    const settingStore = useSettingStore();
    if (isElectron && settingStore.cacheEnabled) {
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
    if (isElectron && settingStore.cacheEnabled && url) {
      window.electron.ipcRenderer.invoke("music-cache-download", id, url, quality || "standard");
    }
  };

  /**
   * 获取在线播放链接
   * @param id 歌曲id
   * @returns 在线播放信息
   */
  public getOnlineUrl = async (id: number): Promise<AudioSource> => {
    const settingStore = useSettingStore();
    const res = await songUrl(id, settingStore.songLevel);
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
   * 获取解锁播放链接
   * @param songData 歌曲数据
   * @returns
   */
  public getUnlockSongUrl = async (song: SongType): Promise<AudioSource> => {
    const settingStore = useSettingStore();
    const songId = song.id;
    // 优先检查本地缓存
    const cachedUrl = await this.checkLocalCache(songId);
    if (cachedUrl) {
      return { id: songId, url: cachedUrl };
    }
    const artist = Array.isArray(song.artists) ? song.artists[0].name : song.artists;
    const keyWord = song.name + "-" + artist;
    if (!songId || !keyWord) {
      return { id: songId, url: undefined };
    }

    // 获取音源列表
    const servers = settingStore.songUnlockServer.filter((s) => s.enabled).map((s) => s.key);
    if (servers.length === 0) {
      return { id: songId, url: undefined };
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

    // 按顺序找成功项
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.success) {
        const unlockUrl = r.value?.result?.url;
        // 解锁成功后，触发下载
        this.triggerCacheDownload(songId, unlockUrl);
        return {
          id: songId,
          url: unlockUrl,
          isUnlocked: true,
        };
      }
    }
    return { id: songId, url: undefined };
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

      // 本地歌曲跳过
      if (nextSong.path) return;

      // 在线歌曲：优先官方，其次解灰
      const songId = nextSong.type === "radio" ? nextSong.dj?.id : nextSong.id;
      if (!songId) return;

      // 是否可解锁
      const canUnlock = isElectron && nextSong.type !== "radio" && settingStore.useSongUnlock;
      // 先请求官方地址
      const { url: officialUrl, isTrial, quality } = await this.getOnlineUrl(songId);
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
   * 获取音频源
   * 始终从此方法获取对应歌曲播放信息
   * @param song 歌曲
   * @returns 音频源
   */
  public getAudioSource = async (song: SongType): Promise<AudioSource> => {
    const settingStore = useSettingStore();

    // 本地文件直接返回
    if (song.path) {
      // 检查本地文件是否存在
      const result = await window.electron.ipcRenderer.invoke("file-exists", song.path);
      if (!result) {
        this.nextPrefetch = undefined;
        console.error("❌ 本地文件不存在");
        return { id: song.id, url: undefined };
      }
      return { id: song.id, url: `file://${song.path}` };
    }

    // 在线歌曲
    const songId = song.type === "radio" ? song.dj?.id : song.id;
    if (!songId) return { id: 0, url: undefined, quality: undefined, isUnlocked: false };

    // 检查缓存并返回
    if (this.nextPrefetch && this.nextPrefetch.id === songId && settingStore.useNextPrefetch) {
      console.log(`🚀 [${songId}] 使用预加载缓存播放`);
      const cachedSource = this.nextPrefetch;
      this.nextPrefetch = undefined;
      return cachedSource;
    }

    // 在线获取
    try {
      // 是否可解锁
      const canUnlock = isElectron && song.type !== "radio" && settingStore.useSongUnlock;
      // 尝试获取官方链接
      const { url: officialUrl, isTrial, quality } = await this.getOnlineUrl(songId);
      // 如果官方链接有效且非试听（或者用户接受试听）
      if (officialUrl && (!isTrial || (isTrial && settingStore.playSongDemo))) {
        if (isTrial) window.$message.warning("当前歌曲仅可试听");
        return { id: songId, url: officialUrl, quality, isUnlocked: false };
      }
      // 尝试解锁
      if (canUnlock) {
        const unlockUrl = await this.getUnlockSongUrl(song);
        if (unlockUrl.url) {
          console.log(`🔓 [${songId}] 解锁成功`);
          return unlockUrl;
        }
      }
      // 最后的兜底：检查本地是否有缓存（不区分音质）
      const fallbackUrl = await this.checkLocalCache(songId);
      if (fallbackUrl) {
        console.log(`🚀 [${songId}] 网络请求失败，使用本地缓存兜底`);
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
