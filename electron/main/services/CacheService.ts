import { join, resolve, dirname } from "path";
import { existsSync } from "fs";
import { readdir, readFile, rm, stat, writeFile, mkdir } from "fs/promises";
import { useStore } from "../store";
import { cacheLog } from "../logger";

/**
 * 缓存资源类型
 * - music: 音乐缓存
 * - lyrics: 歌词缓存
 * - local-data: 本地音乐数据缓存
 * - playlist-data: 歌单数据缓存
 */
export type CacheResourceType = "music" | "lyrics" | "local-data" | "playlist-data";

/**
 * 缓存列表项信息
 */
export interface CacheListItem {
  /** 缓存 key（文件名或相对路径） */
  key: string;
  /** 文件大小（字节） */
  size: number;
  /** 最后修改时间（毫秒时间戳） */
  mtime: number;
}

export class CacheService {
  private static instance: CacheService;

  /** 各类型缓存大小 */
  private sizes: Record<CacheResourceType, number> = {
    music: 0,
    lyrics: 0,
    "local-data": 0,
    "playlist-data": 0,
  };

  private isInitialized: boolean = false;

  private readonly CACHE_SUB_DIR: Record<CacheResourceType, string> = {
    music: "music",
    lyrics: "lyrics",
    "local-data": "local-data",
    "playlist-data": "playlist-data",
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
   * 解析并校验缓存文件路径
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
   * 初始化服务，计算初始大小
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const basePath = this.getCacheBasePath();

      // 确保目录存在
      if (!existsSync(basePath)) await mkdir(basePath, { recursive: true });

      for (const type of Object.keys(this.CACHE_SUB_DIR) as CacheResourceType[]) {
        const dir = join(basePath, this.CACHE_SUB_DIR[type]);
        if (!existsSync(dir)) await mkdir(dir, { recursive: true });
        // 计算初始大小
        this.sizes[type] = await this.calculateDirSize(dir);
      }

      this.isInitialized = true;
      cacheLog.info("CacheService initialized. Sizes:", this.sizes);
    } catch (error) {
      cacheLog.error("CacheService init failed:", error);
    }
  }

  /**
   * 获取总缓存大小
   */
  public async getSize(): Promise<number> {
    await this.init();
    return Object.values(this.sizes).reduce((a, b) => a + b, 0);
  }

  /**
   * 获取缓存文件路径
   * @param type 缓存类型
   * @param key 缓存 key
   * @returns 缓存文件路径
   */
  public getFilePath(type: CacheResourceType, key: string): string {
    const { target } = this.resolveSafePath(type, key);
    return target;
  }

  /**
   * 通知文件变动（用于外部直接写入文件后更新大小记录）
   */
  public async notifyFileChange(type: CacheResourceType, key: string): Promise<void> {
    await this.init();
    // 确保 key 合法性
    this.resolveSafePath(type, key);
    const basePath = this.getCacheBasePath();
    const dir = join(basePath, this.CACHE_SUB_DIR[type]);
    this.sizes[type] = await this.calculateDirSize(dir);
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

    const { target } = this.resolveSafePath(type, key);
    const buffer = this.toBuffer(data);
    const newSize = buffer.length;

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
    this.sizes[type] = this.sizes[type] - oldSize + newSize;
  }

  /**
   * 读取缓存
   */
  public async get(type: CacheResourceType, key: string): Promise<Buffer | null> {
    await this.init();
    const { target } = this.resolveSafePath(type, key);
    if (!existsSync(target)) return null;
    return await readFile(target);
  }

  /**
   * 删除缓存
   */
  public async remove(type: CacheResourceType, key: string): Promise<void> {
    await this.init();
    const { target } = this.resolveSafePath(type, key);

    if (existsSync(target)) {
      const info = await stat(target);
      await rm(target, { force: true });
      this.sizes[type] = Math.max(0, this.sizes[type] - info.size);
    }
  }

  /**
   * 清空某一类缓存
   */
  public async clear(type: CacheResourceType): Promise<void> {
    await this.init();
    const basePath = this.getCacheBasePath();
    const dir = join(basePath, this.CACHE_SUB_DIR[type]);

    await rm(dir, { recursive: true, force: true });
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });

    this.sizes[type] = 0;
  }

  /**
   * 列出缓存文件
   */
  public async list(type: CacheResourceType): Promise<CacheListItem[]> {
    await this.init();
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
        mtime: info.mtimeMs,
      });
    }

    return items;
  }

  /**
   * 清理旧缓存（LRU：删除最早修改的文件）
   * @param type 缓存类型
   * @param targetFreeSize 需要腾出的空间大小
   */
  public async cleanOldCache(type: CacheResourceType, targetFreeSize: number): Promise<void> {
    await this.init();
    let freedSize = 0;
    const items = await this.list(type);

    // 按 mtime 升序排序 (旧的在前)
    items.sort((a, b) => a.mtime - b.mtime);

    for (const item of items) {
      if (freedSize >= targetFreeSize) break;
      try {
        await this.remove(type, item.key);
        freedSize += item.size;
        cacheLog.info(`Cleaned old cache: ${type}/${item.key}, size: ${item.size}`);
      } catch (e) {
        cacheLog.warn(`Failed to remove cache file: ${item.key}`, e);
      }
    }

    // 重新计算该类型的准确大小，确保数据一致
    await this.notifyFileChange(type, "");
  }
}
