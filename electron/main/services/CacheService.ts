import { join, resolve, dirname } from "path";
import { existsSync } from "fs";
import { readdir, readFile, rm, stat, writeFile, mkdir, utimes } from "fs/promises";
import { useStore } from "../store";
import { cacheLog } from "../logger";
import { CacheDB } from "../database/CacheDB";

/**
 * 缓存资源类型
 * - music: 音乐缓存 (文件)
 * - lyrics: 歌词缓存 (DB)
 * - local-data: 本地音乐数据缓存 (文件)
 * - list-data: 列表数据缓存（歌单/专辑/电台） (DB)
 */
export type CacheResourceType = "music" | "lyrics" | "local-data" | "list-data";

/**
 * 缓存列表项信息
 */
export interface CacheListItem {
  /** 缓存 key（文件名或相对路径） */
  key: string;
  /** 文件大小（字节） */
  size: number;
  /** 最后访问时间（毫秒时间戳） */
  atime: number;
  /** 最后修改时间（毫秒时间戳） */
  mtime: number;
}

export class CacheService {
  private static instance: CacheService;

  /** 数据库实例 */
  private db: CacheDB | null = null;

  /** 各类型缓存大小 (仅用于文件类型缓存) */
  private fileSizes: Record<string, number> = {
    music: 0,
    "local-data": 0,
  };

  /** 上次清理时间 */
  private lastCleanupTime: number = 0;
  /** 是否已初始化 */
  private isInitialized: boolean = false;

  private readonly CACHE_SUB_DIR: Record<CacheResourceType, string> = {
    music: "music",
    lyrics: "lyrics",
    "local-data": "local-data",
    "list-data": "list-data",
  };

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * 获取缓存根路径
   */
  private getCacheBasePath(): string {
    const store = useStore();
    const base = store.get("cachePath") as string | undefined;
    if (!base) {
      throw new Error("cachePath 未配置");
    }
    return base;
  }

  /**
   * 解析并校验缓存文件路径 (仅用于文件类型缓存)
   */
  private resolveSafePath(type: CacheResourceType, key: string) {
    const basePath = this.getCacheBasePath();
    const dir = join(basePath, this.CACHE_SUB_DIR[type]);
    const target = resolve(dir, key);
    if (!target.startsWith(resolve(dir))) {
      throw new Error("非法的缓存 key");
    }
    return { dir, target };
  }

  /**
   * 递归计算目录大小
   */
  private async calculateDirSize(dirPath: string): Promise<number> {
    let totalSize = 0;
    try {
      if (!existsSync(dirPath)) return 0;
      const entries = await readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        if (entry.isDirectory()) {
          totalSize += await this.calculateDirSize(fullPath);
        } else if (entry.isFile()) {
          const info = await stat(fullPath);
          totalSize += info.size;
        }
      }
    } catch (error) {
      cacheLog.warn(`⚠️ 无法访问目录: ${dirPath}`, error);
    }
    return totalSize;
  }

  /**
   * 转换数据为 Buffer
   */
  private toBuffer(data: any): Buffer {
    if (Buffer.isBuffer(data)) return data;
    if (data instanceof Uint8Array) return Buffer.from(data);
    if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data));
    if (typeof data === "string") return Buffer.from(data, "utf-8");
    if (data?.type === "Buffer" && Array.isArray(data?.data)) {
      return Buffer.from(data.data);
    }
    throw new Error("不支持的缓存写入数据类型");
  }

  /**
   * 初始化服务，计算初始大小，并初始化 DB
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const basePath = this.getCacheBasePath();

      // 确保目录存在
      if (!existsSync(basePath)) await mkdir(basePath, { recursive: true });

      // 初始化 DB
      const dbPath = join(basePath, "cache.db");
      this.db = new CacheDB(dbPath);

      // 初始化文件缓存 (music, local-data)
      for (const type of ["music", "local-data"] as CacheResourceType[]) {
        const dir = join(basePath, this.CACHE_SUB_DIR[type]);
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        } else {
          // 清理可能残留的临时文件 (.tmp)
          try {
            const files = await readdir(dir);
            for (const file of files) {
              if (file.endsWith(".tmp")) {
                await rm(join(dir, file), { force: true });
              }
            }
          } catch (e) {
            cacheLog.warn(`⚠️ 无法清理目录中的临时文件: ${dir}`, e);
          }
        }
        // 计算初始大小
        this.fileSizes[type] = await this.calculateDirSize(dir);
      }

      // 清理旧的文件缓存目录
      for (const type of ["list-data", "lyrics"] as CacheResourceType[]) {
        const dir = join(basePath, this.CACHE_SUB_DIR[type]);
        if (existsSync(dir)) {
          await rm(dir, { recursive: true, force: true });
        }
      }

      this.isInitialized = true;
      cacheLog.info("CacheService initialized.");

      // 启动时触发一次清理检查
      this.checkAndCleanCache().catch((e) => cacheLog.warn("Startup cache cleanup failed:", e));
    } catch (error) {
      cacheLog.error("CacheService init failed:", error);
    }
  }

  /**
   * 获取总缓存大小
   */
  public async getSize(): Promise<number> {
    await this.init();
    const fileTotal = Object.values(this.fileSizes).reduce((a, b) => a + b, 0);

    // 计算 DB 文件实际占用大小 (包括 wal 和 shm)
    let dbTotal = 0;
    const basePath = this.getCacheBasePath();
    const dbPath = join(basePath, "cache.db");

    try {
      if (existsSync(dbPath)) dbTotal += (await stat(dbPath)).size;
      if (existsSync(dbPath + "-wal")) dbTotal += (await stat(dbPath + "-wal")).size;
      if (existsSync(dbPath + "-shm")) dbTotal += (await stat(dbPath + "-shm")).size;
    } catch {
      // ignore
    }

    return fileTotal + dbTotal;
  }

  /**
   * 获取缓存文件路径 (仅用于文件类型缓存)
   * @param type 缓存类型
   * @param key 缓存 key
   * @returns 缓存文件路径
   */
  public getFilePath(type: CacheResourceType, key: string): string {
    if (type === "lyrics" || type === "list-data") {
      throw new Error(`Type ${type} is stored in DB, no file path available.`);
    }
    const { target } = this.resolveSafePath(type, key);
    return target;
  }

  /**
   * 通知文件变动（用于外部直接写入文件后更新大小记录）
   */
  public async notifyFileChange(type: CacheResourceType, key: string): Promise<void> {
    await this.init();
    if (type === "lyrics" || type === "list-data") return;

    // 确保 key 合法性
    this.resolveSafePath(type, key);
    const basePath = this.getCacheBasePath();
    const dir = join(basePath, this.CACHE_SUB_DIR[type]);
    this.fileSizes[type] = await this.calculateDirSize(dir);
  }

  /**
   * 写入缓存
   */
  public async put(
    type: CacheResourceType,
    key: string,
    data: Buffer | Uint8Array | ArrayBuffer | string,
  ): Promise<void> {
    await this.init();
    const buffer = this.toBuffer(data);

    // 检查并清理超限缓存
    await this.checkAndCleanCache();

    if (type === "lyrics" || type === "list-data") {
      this.db?.put(key, type, buffer);
    } else {
      // 存入文件
      const { target } = this.resolveSafePath(type, key);

      // 检查旧文件大小
      let oldSize = 0;
      try {
        if (existsSync(target)) {
          const info = await stat(target);
          oldSize = info.size;
        }
      } catch {
        // ignore
      }

      // 确保父目录存在
      const parentDir = dirname(target);
      if (!existsSync(parentDir)) {
        await mkdir(parentDir, { recursive: true });
      }

      await writeFile(target, buffer);

      // 更新大小记录
      this.fileSizes[type] = this.fileSizes[type] - oldSize + buffer.length;
    }
  }

  /**
   * 检查并清理超限缓存
   * 优先清理 music 类型的缓存
   */
  public async checkAndCleanCache(): Promise<void> {
    const store = useStore();
    const limitSizeGB = store.get("cacheLimit") ?? 10;

    // 如果设置为 0，则不限制
    if (limitSizeGB <= 0) return;

    // 节流：每 10 分钟最多执行一次清理检查
    if (Date.now() - this.lastCleanupTime < 10 * 60 * 1000) return;

    const limitSizeBytes = limitSizeGB * 1024 * 1024 * 1024;
    const currentSize = await this.getSize();

    if (currentSize <= limitSizeBytes) return;

    // 需要腾出的空间（至少 100MB）
    const targetFreeSize = currentSize - limitSizeBytes + 100 * 1024 * 1024;
    let freedSize = 0;

    // 清理顺序：优先清理 music，然后是其他类型
    const cleanOrder: CacheResourceType[] = ["music", "lyrics", "list-data", "local-data"];

    for (const cacheType of cleanOrder) {
      if (freedSize >= targetFreeSize) break;

      const items = await this.list(cacheType);
      // 按 atime 升序排序 (最久未访问的在前)
      items.sort((a, b) => a.atime - b.atime);

      for (const item of items) {
        if (freedSize >= targetFreeSize) break;
        try {
          await this.remove(cacheType, item.key);
          freedSize += item.size;
          cacheLog.info(`Cleaned cache: ${cacheType}/${item.key}, size: ${item.size}`);
        } catch (e) {
          cacheLog.warn(`Failed to remove cache: ${item.key}`, e);
        }
      }
    }

    cacheLog.info(`Cache cleanup completed. Freed: ${freedSize} bytes`);
    this.lastCleanupTime = Date.now();
  }

  /**
   * 读取缓存
   */
  public async get(type: CacheResourceType, key: string): Promise<Buffer | null> {
    await this.init();

    if (type === "lyrics" || type === "list-data") {
      const entry = this.db?.get(key);
      if (!entry || entry.type !== type) return null;

      return entry.data;
    } else {
      const { target } = this.resolveSafePath(type, key);
      if (!existsSync(target)) return null;

      // 手动更新 atime (最后访问时间)，实现 LRU 逻辑
      try {
        const now = new Date();
        await utimes(target, now, now);
      } catch {
        // 忽略 utimes 失败
      }

      return await readFile(target);
    }
  }

  /**
   * 删除缓存
   */
  public async remove(type: CacheResourceType, key: string): Promise<void> {
    await this.init();

    if (type === "lyrics" || type === "list-data") {
      this.db?.remove(key);
    } else {
      const { target } = this.resolveSafePath(type, key);

      if (existsSync(target)) {
        const info = await stat(target);
        await rm(target, { force: true });
        this.fileSizes[type] = Math.max(0, this.fileSizes[type] - info.size);
      }
    }
  }

  /**
   * 清空某一类缓存
   */
  public async clear(type: CacheResourceType): Promise<void> {
    await this.init();

    if (type === "lyrics" || type === "list-data") {
      this.db?.clear(type);
    } else {
      const basePath = this.getCacheBasePath();
      const dir = join(basePath, this.CACHE_SUB_DIR[type]);

      await rm(dir, { recursive: true, force: true });
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });

      this.fileSizes[type] = 0;
    }
  }

  /**
   * 清空所有缓存
   * 软清空：保留 DB 文件，仅清空数据和媒体文件
   */
  public async clearAll(): Promise<void> {
    await this.init();

    // 清空 DB 数据并回收空间
    try {
      this.db?.clearAll();
    } catch (e) {
      cacheLog.error("Failed to clear database:", e);
    }

    // 删除文件缓存目录内容
    const fileTypes: CacheResourceType[] = ["music", "local-data"];
    for (const type of fileTypes) {
      const basePath = this.getCacheBasePath();
      const dir = join(basePath, this.CACHE_SUB_DIR[type]);

      try {
        if (existsSync(dir)) {
          // 删除目录并重建
          await rm(dir, { recursive: true, force: true });
          await mkdir(dir, { recursive: true });
        }
      } catch (e) {
        cacheLog.error(`Failed to clear directory ${type}:`, e);
      }
      this.fileSizes[type] = 0;
    }
  }

  /**
   * 列出缓存文件
   */
  public async list(type: CacheResourceType): Promise<CacheListItem[]> {
    await this.init();

    if (type === "lyrics" || type === "list-data") {
      const entries = this.db?.list(type) || [];
      return entries.map((e) => ({
        key: e.key,
        size: e.size,
        atime: e.atime,
        mtime: e.mtime,
      }));
    } else {
      const basePath = this.getCacheBasePath();
      const dir = join(basePath, this.CACHE_SUB_DIR[type]);

      if (!existsSync(dir)) return [];

      const files = await readdir(dir, { withFileTypes: true });
      const items: CacheListItem[] = [];

      for (const file of files) {
        if (!file.isFile()) continue;
        const filePath = join(dir, file.name);
        const info = await stat(filePath);
        items.push({
          key: file.name,
          size: info.size,
          atime: info.atimeMs,
          mtime: info.mtimeMs,
        });
      }

      return items;
    }
  }
}
