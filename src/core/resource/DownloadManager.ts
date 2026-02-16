import type { SongType, SongLevelType } from "@/types/main";
import { useDataStore, useSettingStore } from "@/stores";
import { isElectron } from "@/utils/env";
import { saveAs } from "file-saver";
import { cloneDeep } from "lodash-es";
import { songDownloadUrl, songLyric, songUrl, unlockSongUrl, songLyricTTML } from "@/api/song";
import { qqMusicMatch } from "@/api/qqmusic";
import { songLevelData } from "@/utils/meta";
import { getPlayerInfoObj } from "@/utils/format";
import { LyricProcessor, type LyricProcessorOptions, type LyricResult } from "./LyricProcessor";

interface DownloadConfig {
  fileName: string;
  fileType: string;
  path: string;
  downloadMeta: boolean;
  downloadCover: boolean;
  downloadLyric: boolean;
  saveMetaFile: boolean;
  songData: SongType;
  lyric: string;
  skipIfExist: boolean;
  threadCount: number;
  referer?: string;
  enableDownloadHttp2: boolean;
}

interface DownloadStrategy {
  readonly id: number;
  readonly name: string;
  readonly song: SongType;
  readonly downloadUrl: string;

  // 准备阶段：获取链接，获取歌词，处理元数据
  prepare(): Promise<void>;

  // 执行阶段：返回给 Electron 下载器需要的配置对象
  getDownloadConfig(): DownloadConfig;

  // 收尾阶段：处理 ASS 生成，歌词文件写入
  postProcess(downloadedFilePath: string): Promise<void>;
}

/**
 * 歌曲下载策略
 */
class SongDownloadStrategy implements DownloadStrategy {
  private settingStore = useSettingStore();
  private dataStore = useDataStore();

  // prepare 阶段准备的状态
  private _downloadUrl = "";
  private fileType = "mp3";
  private lyricResult: LyricResult | null = null;
  private basicLyric = "";
  private ttmlLyric = "";
  private yrcLyric = "";

  constructor(
    public readonly song: SongType,
    private quality: SongLevelType,
  ) {}

  get id() {
    return this.song.id;
  }
  get name() {
    return this.song.name;
  }
  get downloadUrl() {
    return this._downloadUrl;
  }

  async prepare(): Promise<void> {
    // 解析下载链接
    const { url, type } = await this.resolveUrl();
    this._downloadUrl = url;
    this.fileType = type;

    // 获取歌词
    if (this.shouldDownloadLyrics()) {
      this.lyricResult = (await songLyric(this.song.id)) as LyricResult;

      const options: LyricProcessorOptions = {
        downloadLyricToTraditional: this.settingStore.downloadLyricToTraditional,
        downloadLyricTranslation: this.settingStore.downloadLyricTranslation,
        downloadLyricRomaji: this.settingStore.downloadLyricRomaji,
        downloadLyricEncoding: this.settingStore.downloadLyricEncoding,
      };

      // 处理基础歌词
      this.basicLyric = await LyricProcessor.processBasic(this.lyricResult, options);

      // 处理逐字歌词 (后续使用)
      const { downloadMakeYrc, downloadSaveAsAss } = this.settingStore;
      if (downloadMakeYrc || downloadSaveAsAss) {
        let ttmlLyric = "";
        const yrcLyric = this.lyricResult?.yrc?.lyric || "";
        let qmResultData;

        try {
          const ttmlRes = await songLyricTTML(this.song.id);
          if (typeof ttmlRes === "string") ttmlLyric = ttmlRes;
        } catch (e) {
          console.error("Failed to fetch TTML", e);
        }

        if (!ttmlLyric && !yrcLyric) {
          try {
            const artistsStr = Array.isArray(this.song.artists)
              ? this.song.artists.map((a) => a.name).join("/")
              : String(this.song.artists || "");
            const keyword = `${this.song.name}-${artistsStr}`;
            const qmResult = await qqMusicMatch(keyword);
            if (qmResult?.code === 200 && qmResult?.qrc) {
              qmResultData = qmResult;
            }
          } catch (e) {
            console.error("QM Fallback failed", e);
          }
        }

        const verbatim = LyricProcessor.parseVerbatim(ttmlLyric, yrcLyric, qmResultData);
        this.ttmlLyric = verbatim.ttml;
        this.yrcLyric = verbatim.yrc;
      }
    }
  }
  /**
   * 获取下载配置
   * @returns 下载配置
   */
  getDownloadConfig(): DownloadConfig {
    const fileName = this.getFileName();
    const targetPath = this.getDownloadPath();
    const { downloadMeta, downloadCover, saveMetaFile, downloadThreadCount, enableDownloadHttp2 } =
      this.settingStore;

    return {
      fileName,
      fileType: this.fileType,
      path: targetPath,
      downloadMeta: downloadMeta,
      downloadCover: downloadCover && downloadMeta,
      downloadLyric: this.shouldDownloadLyrics(),
      saveMetaFile: downloadMeta && saveMetaFile,
      songData: cloneDeep(this.song),
      lyric: this.basicLyric,
      skipIfExist: true,
      threadCount: downloadThreadCount,
      enableDownloadHttp2: enableDownloadHttp2,
    };
  }
  /**
   * 后置处理
   * @param downloadedFilePath 下载文件路径
   */
  async postProcess(downloadedFilePath: string): Promise<void> {
    console.log(`Post-processing file: ${downloadedFilePath}`);
    // 使用存储的文件名和路径
    const fileName = this.getFileName();
    const targetPath = this.getDownloadPath();
    const { downloadMakeYrc, downloadSaveAsAss } = this.settingStore;

    const options: LyricProcessorOptions = {
      downloadLyricToTraditional: this.settingStore.downloadLyricToTraditional,
      downloadLyricTranslation: this.settingStore.downloadLyricTranslation,
      downloadLyricRomaji: this.settingStore.downloadLyricRomaji,
      downloadLyricEncoding: this.settingStore.downloadLyricEncoding,
    };

    if (downloadMakeYrc) {
      const result = await LyricProcessor.generateVerbatimContent(
        this.ttmlLyric,
        this.yrcLyric,
        this.lyricResult,
        options,
      );
      if (result && window.electron?.ipcRenderer) {
        await window.electron.ipcRenderer.invoke("save-file", {
          targetPath,
          fileName,
          ext: result.ext,
          content: result.content,
          encoding: result.encoding,
        });
      }
    }

    if (downloadSaveAsAss) {
      const artist = Array.isArray(this.song.artists)
        ? this.song.artists[0]?.name
        : String(this.song.artists || "");
      const result = await LyricProcessor.generateAssContent(
        this.ttmlLyric,
        this.yrcLyric,
        this.lyricResult,
        this.song.name,
        artist,
        options,
      );

      if (result && window.electron?.ipcRenderer) {
        await window.electron.ipcRenderer.invoke("save-file", {
          targetPath,
          fileName,
          ext: "ass",
          content: result.content,
          encoding: result.encoding,
        });
      }
    }
  }

  private async resolveUrl(): Promise<{ url: string; type: string }> {
    const usePlayback = this.settingStore.usePlaybackForDownload;
    const levelName = songLevelData[this.quality].level;

    // 尝试使用播放链接
    if (usePlayback) {
      try {
        const result = await songUrl(this.song.id, levelName as Parameters<typeof songUrl>[1]);
        if (result.code === 200 && result?.data?.[0]?.url) {
          return {
            url: result.data[0].url,
            type: (result.data[0].type || result.data[0].encodeType || "mp3").toLowerCase(),
          };
        }
      } catch (e) {
        console.error("Error fetching playback url for download:", e);
      }
    }

    // 尝试使用解锁链接
    const isVipUser = this.dataStore.userData?.vipType > 0;
    const isRestricted = this.song.free === 1 || this.song.free === 4 || this.song.free === 8;
    const canUseUnlock = !isRestricted || isVipUser;

    if (this.settingStore.useUnlockForDownload && canUseUnlock) {
      try {
        const servers = this.settingStore.songUnlockServer
          .filter((s) => s.enabled)
          .map((s) => s.key);
        const artist =
          (Array.isArray(this.song.artists)
            ? this.song.artists.map((a) => a.name).join("/")
            : this.song.artists) || "";
        const keyWord = `${this.song.name}-${artist}`;

        if (servers.length > 0) {
          const results = await Promise.allSettled(
            servers.map((server) =>
              unlockSongUrl(this.song.id, keyWord, server).then((result) => ({
                server,
                result,
                success: result.code === 200 && !!result.url,
              })),
            ),
          );

          for (const r of results) {
            if (r.status === "fulfilled" && r.value.success) {
              const unlockUrl = r.value?.result?.url;
              if (unlockUrl) {
                const extensionMatch = unlockUrl.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
                return {
                  url: unlockUrl,
                  type: extensionMatch ? extensionMatch[1].toLowerCase() : "mp3",
                };
              }
            }
          }
        }
      } catch (e) {
        console.error("Error fetching unlock url for download:", e);
      }
    }

    // 标准下载流程
    const result = await songDownloadUrl(this.song.id, this.quality);
    if (result.code !== 200 || !result?.data?.url) {
      throw new Error(result.message || "获取下载链接失败");
    }
    return {
      url: result.data.url,
      type: result.data.type?.toLowerCase() || "mp3",
    };
  }
  /**
   * 获取文件名
   * @returns 文件名
   */
  private getFileName(): string {
    const infoObj = getPlayerInfoObj(this.song) || {
      name: this.song.name || "未知歌曲",
      artist: "未知歌手",
    };
    const baseTitle = infoObj.name || "未知歌曲";
    const rawArtist = infoObj.artist || "未知歌手";
    const safeArtist = rawArtist.replace(/[/:*?"<>|]/g, "&");
    const { fileNameFormat } = this.settingStore;

    let displayName = baseTitle;
    if (fileNameFormat === "artist-title") displayName = `${safeArtist} - ${baseTitle}`;
    else if (fileNameFormat === "title-artist") displayName = `${baseTitle} - ${safeArtist}`;

    return displayName.replace(/[/:*?"<>|]/g, "&");
  }
  /**
   * 获取下载路径
   * @returns 下载路径
   */
  private getDownloadPath(): string {
    const finalPath = this.settingStore.downloadPath;
    const infoObj = getPlayerInfoObj(this.song) || { artist: "未知歌手", album: "未知专辑" };
    const safeArtist = (infoObj.artist || "未知歌手").replace(/[/:*?"<>|]/g, "&");
    const safeAlbum = (infoObj.album || "未知专辑").replace(/[/:*?"<>|]/g, "&");
    const { folderStrategy } = this.settingStore;

    if (folderStrategy === "artist") return `${finalPath}/${safeArtist}`;
    else if (folderStrategy === "artist-album") return `${finalPath}/${safeArtist}/${safeAlbum}`;
    return finalPath;
  }

  private shouldDownloadLyrics(): boolean {
    return this.settingStore.downloadLyric && this.settingStore.downloadMeta;
  }
}

// 下载管理器核心类

class DownloadManager {
  private queue: DownloadStrategy[] = [];
  private activeDownloads: Set<number> = new Set();
  private maxConcurrent: number = 1;
  private initialized: boolean = false;

  constructor() {
    this.setupIpcListeners();
  }

  public init() {
    if (this.initialized) return;
    this.initialized = true;
    if (!isElectron) return;

    const dataStore = useDataStore();

    // 清理卡住的任务状态
    dataStore.downloadingSongs.forEach((item) => {
      if (item.status === "downloading") {
        dataStore.updateDownloadStatus(item.song.id, "waiting");
        dataStore.updateDownloadProgress(item.song.id, 0, "0MB", "0MB");
      }
    });

    // 重新加入等待中的任务
    dataStore.downloadingSongs.forEach((item) => {
      if (item.status === "waiting") {
        const isQueued = this.queue.some((s) => s.id === item.song.id);
        const isActive = this.activeDownloads.has(item.song.id);
        if (!isQueued && !isActive) {
          // 常规歌曲下载
          this.queue.push(new SongDownloadStrategy(item.song as SongType, item.quality));
        }
      }
    });

    this.processQueue();
  }
  /**
   * 设置 IPC 监听器
   */
  private setupIpcListeners() {
    if (typeof window === "undefined" || !window.electron?.ipcRenderer) return;
    window.electron.ipcRenderer.on("download-progress", (_event, progress) => {
      const { id, percent, transferredBytes, totalBytes } = progress;
      if (!id) return;
      const dataStore = useDataStore();
      const transferred = transferredBytes
        ? (transferredBytes / 1024 / 1024).toFixed(2) + "MB"
        : "0MB";
      const total = totalBytes ? (totalBytes / 1024 / 1024).toFixed(2) + "MB" : "0MB";
      dataStore.updateDownloadProgress(id, Number((percent * 100).toFixed(1)), transferred, total);
    });
  }
  /**
   * 获取已下载的歌曲
   * @returns 已下载的歌曲列表
   */
  public async getDownloadedSongs(): Promise<Record<string, unknown>[]> {
    const settingStore = useSettingStore();
    if (!isElectron) return [];
    const downloadPath = settingStore.downloadPath;
    if (!downloadPath) return [];
    try {
      return await window.electron.ipcRenderer.invoke("get-downloaded-songs", downloadPath);
    } catch (error) {
      console.error("Failed to get downloaded songs:", error);
      return [];
    }
  }
  /**
   * 添加下载任务
   * @param song 歌曲信息
   * @param quality 歌曲质量
   */
  public async addDownload(song: SongType, quality: SongLevelType) {
    this.init();
    const dataStore = useDataStore();
    if (this.checkExisting(song.id)) return;
    dataStore.addDownloadingSong(song, quality);
    const strategy = new SongDownloadStrategy(song, quality);
    this.queue.push(strategy);
    this.processQueue();
  }
  /**
   * 移除下载任务
   * @param id 歌曲ID
   */
  public removeDownload(id: number) {
    const dataStore = useDataStore();
    // 如果正在下载，尝试取消（目前仅移除任务）
    if (this.activeDownloads.has(id)) {
      // TODO: 实现取消正在进行的下载任务
      // 暂时先从活动集合中移除，以释放下载槽位
      this.activeDownloads.delete(id);
    }
    // 从队列中移除
    this.queue = this.queue.filter((task) => task.id !== id);
    // 从 store 移除
    dataStore.removeDownloadingSong(id);
    // 尝试处理下一个任务
    this.processQueue();
  }
  /**
   * 重新下载任务
   * @param id 歌曲ID
   */
  public retryDownload(id: number) {
    const dataStore = useDataStore();
    const task = dataStore.downloadingSongs.find((s) => s.song.id === id);
    if (task) {
      dataStore.updateDownloadStatus(id, "waiting");
      // 重新加入队列
      this.queue.push(new SongDownloadStrategy(task.song as SongType, task.quality));
      this.processQueue();
    }
  }
  /**
   * 重新下载所有失败的任务
   */
  public retryAllDownloads() {
    this.init();
    const dataStore = useDataStore();
    const failedSongs = dataStore.downloadingSongs
      .filter((item) => item.status === "failed")
      .map((item) => item.song.id);
    failedSongs.forEach((id) => this.retryDownload(id));
  }
  /**
   * 检查是否存在相同的下载任务
   * @param id 歌曲ID
   * @returns 是否存在相同的下载任务
   */
  private checkExisting(id: number): boolean {
    const dataStore = useDataStore();
    const existing = dataStore.downloadingSongs.find((item) => item.song.id === id);

    if (existing) {
      if (existing.status === "failed") {
        this.retryDownload(id);
        return true;
      }
      const isQueued = this.queue.some((s) => s.id === id);
      const isActive = this.activeDownloads.has(id);
      if (
        isQueued ||
        isActive ||
        existing.status === "waiting" ||
        existing.status === "downloading"
      ) {
        return true;
      }
    }
    return false;
  }
  /**
   * 处理下载队列
   */
  private processQueue() {
    while (this.activeDownloads.size < this.maxConcurrent && this.queue.length > 0) {
      const strategy = this.queue.shift();
      if (strategy) this.startTask(strategy);
    }
  }
  /**
   * 开始下载任务
   * @param strategy 下载策略
   */
  private async startTask(strategy: DownloadStrategy) {
    this.activeDownloads.add(strategy.id);
    const dataStore = useDataStore();
    dataStore.updateDownloadStatus(strategy.id, "downloading");

    try {
      await strategy.prepare();
      const config = strategy.getDownloadConfig();

      if (isElectron) {
        if (!strategy.downloadUrl) throw new Error("Download URL missing");

        const downloadResult = await window.electron.ipcRenderer.invoke(
          "download-file",
          strategy.downloadUrl,
          config,
        );

        if (downloadResult.status === "success" || downloadResult.status === "skipped") {
          await strategy.postProcess(downloadResult.path || config.path); // IPC 返回结果通常包含路径
          dataStore.removeDownloadingSong(strategy.id);
          window.$message.success(`${strategy.name} 下载完成`);
        } else {
          if (downloadResult.status === "cancelled") {
            // 已取消，无需处理
          } else {
            throw new Error(downloadResult.message || "下载失败");
          }
        }
      } else {
        // 浏览器端兜底处理
        if (!strategy.downloadUrl) throw new Error("Download URL missing");
        saveAs(strategy.downloadUrl, config.fileName + "." + config.fileType);
        dataStore.removeDownloadingSong(strategy.id);
      }
    } catch (error: any) {
      console.error(`Error processing task ${strategy.name} (ID: ${strategy.id}):`, error);
      if (error?.message) console.error("Error message:", error.message);

      dataStore.markDownloadFailed(strategy.id);
      window.$message.error(error.message || "下载出错");
    } finally {
      this.activeDownloads.delete(strategy.id);
      this.processQueue();
    }
  }
}

export const downloadManager = new DownloadManager();
export const useDownloadManager = () => downloadManager;
export default downloadManager;
