import { existsSync, createWriteStream } from "fs";
import { unlink } from "fs/promises";
import { pipeline } from "stream/promises";
import { CacheService } from "./CacheService";
import { useStore } from "../store";
import { cacheLog } from "../logger";
import got from "got";

export class MusicCacheService {
  private static instance: MusicCacheService;
  private cacheService: CacheService;

  private constructor() {
    this.cacheService = CacheService.getInstance();
  }

  public static getInstance(): MusicCacheService {
    if (!MusicCacheService.instance) {
      MusicCacheService.instance = new MusicCacheService();
    }
    return MusicCacheService.instance;
  }

  /**
   * 获取音乐缓存路径
   * @param id 歌曲ID
   * @param quality 音质
   */
  private getCacheKey(id: number | string, quality: string): string {
    return `${id}_${quality}.sc`;
  }

  /**
   * 检查缓存是否存在
   * 如果 quality 为 undefined，则返回任意一个匹配 id 的缓存（如果存在）
   */
  public async hasCache(id: number | string, quality?: string): Promise<string | null> {
    // 精确查找
    if (quality) {
      const key = this.getCacheKey(id, quality);
      try {
        const filePath = this.cacheService.getFilePath("music", key);
        if (existsSync(filePath)) {
          return filePath;
        }
      } catch {
        return null;
      }
      return null;
    }

    // 模糊查找 (API请求失败时，只要有缓存就用)
    try {
      const items = await this.cacheService.list("music");
      // 查找以 id_ 开头的文件
      const prefix = `${id}_`;
      const match = items.find((item) => item.key.startsWith(prefix));
      if (match) {
        return this.cacheService.getFilePath("music", match.key);
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * 缓存音乐
   * @param id 歌曲ID
   * @param url 音乐下载地址
   * @param quality 音质标识
   * @returns 缓存后的本地文件路径
   */
  public async cacheMusic(id: number | string, url: string, quality: string): Promise<string> {
    const store = useStore();
    const limitSizeGB = store.get("cacheLimit") || 10;
    const limitSizeBytes = limitSizeGB * 1024 * 1024 * 1024;

    // 如果设置为 0，则不限制
    if (limitSizeGB > 0) {
      const currentSize = await this.cacheService.getSize();

      if (currentSize > limitSizeBytes) {
        // 腾出至少 100MB 空间
        await this.cacheService.cleanOldCache(
          "music",
          currentSize - limitSizeBytes + 100 * 1024 * 1024,
        );
      }
    }

    const key = this.getCacheKey(id, quality);
    const filePath = this.cacheService.getFilePath("music", key);

    // 确保目录存在
    await this.cacheService.init();

    // 下载并写入
    try {
      const downloadStream = got.stream(url);
      const fileStream = createWriteStream(filePath);

      await pipeline(downloadStream, fileStream);

      // 更新 CacheService 的大小记录
      await this.cacheService.notifyFileChange("music", key);

      return filePath;
    } catch (error) {
      // 下载失败，清理残余
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
      cacheLog.error("Music download failed:", error);
      throw error;
    }
  }
}
