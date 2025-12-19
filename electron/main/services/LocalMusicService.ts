import { join, basename } from "path";
import { readFile, mkdir } from "fs/promises";
import { CacheService } from "./CacheService";
import { existsSync } from "fs";
import { createHash } from "crypto";
import { useStore } from "../store";
import { type IAudioMetadata, parseFile } from "music-metadata";
import FastGlob, { type Entry } from "fast-glob";
import pLimit from "p-limit";
import sharp from "sharp";

/** 当前本地音乐库 DB 版本，用于控制缓存结构升级 */
const CURRENT_DB_VERSION = 2;

/** 音乐数据接口 */
export interface MusicTrack {
  /** 文件id */
  id: string;
  /** 文件路径 */
  path: string;
  /** 文件标题 */
  title: string;
  /** 文件艺术家 */
  artist: string;
  /** 文件专辑 */
  album: string;
  /** 文件时长 */
  duration: number;
  /** 文件封面 */
  cover?: string;
  /** 文件修改时间 */
  mtime: number;
  /** 文件大小 */
  size: number;
  /** 文件码率（bps） */
  bitrate?: number;
}

/** 音乐库数据库接口 */
interface MusicLibraryDB {
  /** 版本号 */
  version: number;
  /** 文件列表 */
  tracks: Record<string, MusicTrack>;
}

/** 本地音乐服务 */
export class LocalMusicService {
  /** 数据库 */
  private db: MusicLibraryDB = { version: CURRENT_DB_VERSION, tracks: {} };
  /** 限制并发解析数为 10，防止内存溢出 */
  private limit = pLimit(10);
  /** 运行锁：防止并发扫描 */
  private isRefreshing = false;
  /** 初始化 Promise：确保只初始化一次 */
  private initPromise: Promise<void> | null = null;
  /** 记录最后一次使用的 DB 路径 */
  private lastDbPath: string = "";

  constructor() {}

  /** 获取动态路径 */
  private get paths() {
    const store = useStore();
    const localCachePath = join(store.get("cachePath"), "local-data");
    return {
      dbPath: join(localCachePath, "library.json"),
      coverDir: join(localCachePath, "covers"),
      cacheDir: localCachePath,
    };
  }

  /** 初始化 */
  private async ensureInitialized(): Promise<void> {
    const { dbPath, coverDir } = this.paths;

    // 如果路径变了，强制重新初始化
    if (this.lastDbPath && this.lastDbPath !== dbPath) {
      this.initPromise = null;
      this.db = { version: CURRENT_DB_VERSION, tracks: {} };
    }
    this.lastDbPath = dbPath;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      if (!existsSync(coverDir)) {
        await mkdir(coverDir, { recursive: true });
      }
      await this.loadDB();
    })();

    return this.initPromise;
  }

  /** 加载数据库 */
  private async loadDB() {
    const { dbPath } = this.paths;
    try {
      if (existsSync(dbPath)) {
        const data = await readFile(dbPath, "utf-8");
        const parsed = JSON.parse(data) as MusicLibraryDB;
        // 如果历史 DB 没有版本号或版本过旧，则重建
        if (!parsed.version || parsed.version < CURRENT_DB_VERSION) {
          this.db = { version: CURRENT_DB_VERSION, tracks: {} };
        } else {
          this.db = parsed;
        }
      } else {
        this.db = { version: CURRENT_DB_VERSION, tracks: {} };
      }
    } catch (e) {
      console.error("Failed to load DB, resetting:", e);
      this.db = { version: CURRENT_DB_VERSION, tracks: {} };
    }
  }

  /** 保存数据库 */
  private async saveDB() {
    const cacheService = CacheService.getInstance();
    // 确保版本号始终为当前版本
    this.db.version = CURRENT_DB_VERSION;
    await cacheService.put("local-data", "library.json", JSON.stringify(this.db));
  }

  /** 获取文件id */
  private getFileId(filePath: string): string {
    return createHash("md5").update(filePath).digest("hex");
  }

  /** 提取封面 */
  private async extractCover(
    metadata: IAudioMetadata,
    fileId: string,
  ): Promise<string | undefined> {
    const { coverDir } = this.paths;
    const picture = metadata.common.picture?.[0];
    if (!picture) return undefined;
    const fileName = `${fileId}.webp`;
    const savePath = join(coverDir, fileName);
    // 已存在
    if (existsSync(savePath)) return fileName;
    // 压缩封面处理
    const cacheService = CacheService.getInstance();
    const buffer = await sharp(picture.data)
      .resize(256, 256, { fit: "cover", position: "centre" })
      .webp({ quality: 80 })
      .toBuffer();
    await cacheService.put("local-data", `covers/${fileName}`, buffer);
    return fileName;
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
    const { dbPath, coverDir, cacheDir } = this.paths;

    // 运行锁：如果正在刷新，抛出特定错误
    if (this.isRefreshing) {
      console.warn("LocalMusicService: refreshLibrary is already running, skipping...");
      throw new Error("SCAN_IN_PROGRESS");
    }

    if (!dirPaths || dirPaths.length === 0) {
      // 如果没有目录，清空数据库并保存
      if (Object.keys(this.db.tracks).length > 0) {
        this.db.tracks = {};
        await this.saveDB();
      }
      return [];
    }
    // 确保初始化完成
    await this.ensureInitialized();
    // 检查数据库文件是否被人为删除，如果是，则重置内存数据
    if (!existsSync(dbPath)) {
      this.db = { version: CURRENT_DB_VERSION, tracks: {} };
    }
    // 检查封面目录是否被人为删除，如果是，则重建
    if (!existsSync(coverDir)) {
      await mkdir(coverDir, { recursive: true });
    }
    this.isRefreshing = true;
    // 音乐文件扩展名
    const musicExtensions = ["mp3", "wav", "flac", "aac", "webm", "m4a", "ogg", "aiff", "aif"];
    // 构造 Glob 模式数组
    const patterns = dirPaths.map((dir) =>
      join(dir, `**/*.{${musicExtensions.join(",")}}`).replace(/\\/g, "/"),
    );
    // 扫描磁盘
    const entries: Entry[] = await FastGlob(patterns, {
      stats: true,
      absolute: true,
      onlyFiles: true,
      ignore: [`${cacheDir.replace(/\\/g, "/")}/**`],
    });
    /** 总文件数 */
    const totalFiles = entries.length;
    /** 已处理文件数 */
    let processedCount = 0;
    /** 是否脏数据 */
    let isDirty = false;
    // 用于记录本次扫描到的文件路径，用于后续清理"不存在的文件"
    const scannedPaths = new Set<string>();
    // 批量发送缓冲区
    const BATCH_SIZE = 50; // 每批发送50首
    const tracksBuffer: MusicTrack[] = [];

    // 批量发送函数
    const flushBatch = () => {
      if (tracksBuffer.length > 0) {
        onTracksBatch?.([...tracksBuffer]);
        tracksBuffer.length = 0;
      }
    };

    // 分批处理扫描任务，避免内存溢出
    const PROCESS_BATCH_SIZE = 200; // 每批处理200个文件
    for (let i = 0; i < entries.length; i += PROCESS_BATCH_SIZE) {
      const chunk = entries.slice(i, i + PROCESS_BATCH_SIZE);
      const tasks = chunk.map((entry) => {
        return this.limit(async () => {
          const filePath = entry.path;
          const stats = entry.stats;
          if (!stats) return;
          /** 修改时间 */
          const mtime = stats.mtimeMs;
          /** 文件大小 */
          const size = stats.size;
          // 小于 1MB 的文件不处理
          if (size < 1024 * 1024) return;
          scannedPaths.add(filePath);
          /** 缓存 */
          const cached = this.db.tracks[filePath];
          // 判断是否可以使用缓存
          let useCache = false;
          if (cached && cached.mtime === mtime && cached.size === size) {
            useCache = true;
            // 额外检查：如果记录中有封面，验证封面文件是否真实存在
            if (cached.cover && !existsSync(join(coverDir, cached.cover))) {
              useCache = false;
            }
          }
          // 只有当缓存存在 && 修改时间没变 && 文件大小没变 && 封面存在 -> 才跳过
          if (useCache) {
            processedCount++;
            // 添加到批量缓冲区
            tracksBuffer.push(cached!);
            // 达到批量大小，发送一批
            if (tracksBuffer.length >= BATCH_SIZE) {
              flushBatch();
            }
            // 节流发送进度
            if (processedCount % 10 === 0 || processedCount === totalFiles) {
              onProgress?.(processedCount, totalFiles);
            }
            return;
          }
          // 解析元数据
          try {
            const id = this.getFileId(filePath);
            const metadata = await parseFile(filePath);
            // 过滤规则
            // 时长 < 30s
            if (metadata.format.duration && metadata.format.duration < 30) return;
            // 时长 > 2h (7200s)
            if (metadata.format.duration && metadata.format.duration > 7200) return;
            // 提取封面
            const coverPath = await this.extractCover(metadata, id);
            // 构建音乐数据
            const track: MusicTrack = {
              id,
              path: filePath,
              title: metadata.common.title || basename(filePath),
              artist: metadata.common.artist || "Unknown Artist",
              album: metadata.common.album || "Unknown Album",
              duration: (metadata.format.duration || 0) * 1000,
              mtime,
              size,
              cover: coverPath,
              bitrate: metadata.format.bitrate ?? 0,
            };
            // 添加到数据库
            this.db.tracks[filePath] = track;
            isDirty = true;
            // 添加到批量缓冲区
            tracksBuffer.push(track);
            // 达到批量大小，发送一批
            if (tracksBuffer.length >= BATCH_SIZE) {
              flushBatch();
            }
          } catch (err) {
            console.warn(`Parse error [${filePath}]:`, err);
          } finally {
            processedCount++;
            // 节流发送进度
            if (processedCount % 10 === 0 || processedCount === totalFiles) {
              onProgress?.(processedCount, totalFiles);
            }
          }
        });
      });
      // 等待当前批次完成，释放闭包引用，避免内存积压
      await Promise.all(tasks);
    }
    // 发送最后一批数据
    flushBatch();
    // 清理脏数据 (处理文件删除 或 移除文件夹的情况)
    // 遍历数据库中现有的所有路径
    const dbPaths = Object.keys(this.db.tracks);
    for (const dbPath of dbPaths) {
      if (!scannedPaths.has(dbPath)) {
        delete this.db.tracks[dbPath];
        isDirty = true;
      }
    }
    // 持久化
    // 如果有脏数据，或者数据库文件不存在（即使isDirty为false），都进行保存
    if (isDirty || !existsSync(dbPath)) await this.saveDB();
    // 释放运行锁
    this.isRefreshing = false;
    // 返回所有数据
    return Object.values(this.db.tracks);
  }
}
