import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { LocalMusicDB, type MusicTrack } from "../database/LocalMusicDB";
import { processLog } from "../logger";
import { useStore } from "../store";
import { loadNativeModule } from "../utils/native-loader";

type toolModule = typeof import("@native/tools");
const tools: toolModule = loadNativeModule("tools.node", "tools");

/** 本地音乐服务 */
export class LocalMusicService {
  /** 数据库实例 */
  private db: LocalMusicDB | null = null;
  /** 运行锁：防止并发扫描 */
  private isRefreshing = false;
  /** 初始化 Promise：确保只初始化一次 */
  private initPromise: Promise<void> | null = null;
  /** 记录最后一次使用的 DB 路径 */
  private lastDbPath: string = "";

  /** 获取动态路径 */
  get paths() {
    const store = useStore();
    const localCachePath = join(store.get("cachePath"), "local-data");
    return {
      dbPath: join(localCachePath, "library.db"),
      jsonPath: join(localCachePath, "library.json"),
      coverDir: join(localCachePath, "covers"),
      cacheDir: localCachePath,
    };
  }

  /** 初始化 */
  private async ensureInitialized(): Promise<void> {
    const { dbPath, jsonPath, coverDir } = this.paths;
    // 如果路径变了，强制重新初始化
    if (this.lastDbPath && this.lastDbPath !== dbPath) {
      this.initPromise = null;
      if (this.db) {
        this.db.close();
        this.db = null;
      }
    }
    this.lastDbPath = dbPath;
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      if (!existsSync(coverDir)) {
        await mkdir(coverDir, { recursive: true });
      }
      if (!this.db) {
        this.db = new LocalMusicDB(dbPath);
        this.db.init();
      }
      await this.db.migrateFromJsonIfNeeded(jsonPath);
    })();
    return this.initPromise;
  }

  /**
   * 内部扫描方法
   * @param dirPaths 文件夹路径数组
   * @param ignoreDelete 是否忽略删除操作（默认为 false）
   * @param onProgress 进度回调
   * @param onTracksBatch 批量track回调
   */
  private async _scan(
    dirPaths: string[],
    ignoreDelete: boolean = false,
    onProgress?: (current: number, total: number) => void,
    onTracksBatch?: (tracks: MusicTrack[]) => void,
  ) {
    const { dbPath, coverDir } = this.paths;
    // 运行锁
    if (this.isRefreshing) {
      throw new Error("SCAN_IN_PROGRESS");
    }
    // 确保初始化完成
    await this.ensureInitialized();
    if (!this.db) throw new Error("DB not initialized");
    if (!dirPaths || dirPaths.length === 0) {
      if (!ignoreDelete) {
        this.db.clearTracks();
      }
      return;
    }
    this.isRefreshing = true;
    try {
      console.time("RustScanStream");
      await new Promise<void>((resolve, reject) => {
        tools
          .scanMusicLibrary(dbPath, dirPaths, coverDir, (err, event) => {
            if (err) {
              processLog.error("[LocalMusicService] 原生模块扫描时出错:", err);
              return;
            }
            if (!event) return;
            // 处理事件
            try {
              switch (event.event) {
                // 进度更新
                case "progress":
                  if (event.progress) {
                    onProgress?.(event.progress.current, event.progress.total);
                  }
                  break;
                // 批量数据
                case "batch":
                  if (event.tracks && event.tracks.length > 0) {
                    this.db?.addTracks(event.tracks);
                    onTracksBatch?.(event.tracks);
                  }
                  break;
                // 扫描结束
                case "end":
                  if (!ignoreDelete && event.deletedPaths && event.deletedPaths.length > 0) {
                    this.db?.deleteTracks(event.deletedPaths);
                  }
                  resolve();
                  break;
              }
            } catch (e) {
              processLog.error("[LocalMusicService] 扫描时出错:", e);
            }
          })
          .catch((err) => {
            reject(err);
          });
      });
      console.timeEnd("RustScanStream");
    } catch (err) {
      processLog.error("[LocalMusicService]: 扫描失败", err);
      throw err;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * 刷新所有库文件夹
   * @param dirPaths 文件夹路径数组
   * @param onProgress 进度回调
   * @param onTracksBatch 批量track回调
   */
  async refreshLibrary(
    dirPaths: string[],
    onProgress?: (current: number, total: number) => void,
    onTracksBatch?: (tracks: MusicTrack[]) => void,
  ) {
    await this._scan(dirPaths, false, onProgress, onTracksBatch);
    return this.db?.getAllTracks() || [];
  }

  /**
   * 扫描指定目录
   * @param dirPath 目录路径
   */
  async scanDirectory(dirPath: string): Promise<MusicTrack[]> {
    await this._scan([dirPath], true);
    return this.db?.getTracksInPath(dirPath) || [];
  }

  /** 获取所有歌曲 */
  async getAllTracks(): Promise<MusicTrack[]> {
    await this.ensureInitialized();
    if (!this.db) return [];
    return this.db.getAllTracks();
  }

  /** 获取音频分析结果 */
  async getAnalysis(path: string) {
    await this.ensureInitialized();
    return this.db?.getAnalysis(path);
  }

  /** 保存音频分析结果 */
  async saveAnalysis(path: string, data: string, mtime: number, size: number) {
    await this.ensureInitialized();
    this.db?.saveAnalysis(path, data, mtime, size);
  }
}
