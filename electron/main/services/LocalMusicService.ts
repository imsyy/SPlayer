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

    if (this.initPromise) {
      return this.initPromise;
    }

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
   * 刷新所有库文件夹
   * @param dirPaths 文件夹路径数组
   * @param onProgress 进度回调
   * @param onTracksBatch 批量track回调（用于流式传输，每批发送多个tracks）
   */
  async refreshLibrary(
    dirPaths: string[],
    onProgress?: (current: number, total: number) => void,
    onTracksBatch?: (tracks: MusicTrack[]) => void,
  ) {
    const { dbPath, coverDir } = this.paths;

    // 运行锁：如果正在刷新，抛出特定错误
    if (this.isRefreshing) {
      throw new Error("SCAN_IN_PROGRESS");
    }

    // 确保初始化完成
    await this.ensureInitialized();
    if (!this.db) throw new Error("DB not initialized");

    if (!dirPaths || dirPaths.length === 0) {
      // 如果没有目录，清空数据库
      this.db.clearTracks();
      return [];
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

            try {
              switch (event.event) {
                case "progress":
                  if (event.progress) {
                    onProgress?.(event.progress.current, event.progress.total);
                  }
                  break;

                case "batch":
                  if (event.tracks && event.tracks.length > 0) {
                    this.db?.addTracks(event.tracks);
                    onTracksBatch?.(event.tracks);
                  }
                  break;

                case "end":
                  if (event.deletedPaths && event.deletedPaths.length > 0) {
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

      return this.db.getAllTracks();
    } catch (err) {
      processLog.error("[LocalMusicService]: 扫描失败", err);
      throw err;
    } finally {
      this.isRefreshing = false;
    }
  }

  /** 获取所有音乐 */
  async getAllTracks(): Promise<MusicTrack[]> {
    await this.ensureInitialized();
    if (!this.db) return [];
    return this.db.getAllTracks();
  }
}
