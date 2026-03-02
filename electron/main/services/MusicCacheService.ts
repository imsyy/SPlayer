import { existsSync, createReadStream } from "fs";
import { rename, stat, unlink } from "fs/promises";
import { createHash } from "crypto";
import { cacheLog } from "../logger";
import { useStore } from "../store";
import { loadNativeModule } from "../utils/native-loader";
import { CacheService } from "./CacheService";

type toolModule = typeof import("@native/tools");
const tools: toolModule = loadNativeModule("tools.node", "tools");

export class MusicCacheService {
  private static instance: MusicCacheService;
  private cacheService: CacheService;
  private downloadingTasks: Map<string, Promise<string>> = new Map();

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
   * 计算文件 MD5
   */
  private async calculateMD5(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash("md5");
      const stream = createReadStream(filePath);
      stream.on("error", (err) => reject(err));
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("end", () => resolve(hash.digest("hex")));
    });
  }

  /**
   * 检查缓存是否存在
   * 如果 quality 为 undefined，则返回任意一个匹配 id 的缓存（如果存在）
   * 如果提供了 expectedMD5，则会校验文件 MD5，不一致则删除缓存并返回 null
   */
  public async hasCache(
    id: number | string,
    quality?: string,
    expectedMD5?: string,
  ): Promise<string | null> {
    let filePath: string | null = null;

    // 1. 精确查找：如果指定了音质，直接检查对应文件是否存在
    if (quality) {
      const key = this.getCacheKey(id, quality);
      try {
        const p = this.cacheService.getFilePath("music", key);
        if (existsSync(p)) {
          filePath = p;
        }
      } catch {
        // ignore
      }
    } else {
      // 2. 模糊查找：如果未指定音质，查找该 ID 下的任意缓存文件
      try {
        const items = await this.cacheService.list("music");
        // 查找以 id_ 开头且以 .sc 结尾的文件
        const prefix = `${id}_`;
        const match = items.find((item) => item.key.startsWith(prefix) && item.key.endsWith(".sc"));
        if (match) {
          filePath = this.cacheService.getFilePath("music", match.key);
        }
      } catch {
        // ignore
      }
    }

    // 如果找到文件且需要校验 MD5
     if (filePath && expectedMD5) {
       try {
         const fileMD5 = await this.calculateMD5(filePath);
         if (fileMD5.toLowerCase() !== expectedMD5.toLowerCase()) {
            cacheLog.info(
              `[MusicCache] 缓存 MD5 不匹配，删除旧缓存。ID: ${id}, 期望: ${expectedMD5}, 实际: ${fileMD5}`,
            );
            await unlink(filePath).catch(() => {});
            return null;
          }
       } catch (error) {
         cacheLog.error(`[MusicCache] Failed to calculate MD5 for ${filePath}:`, error);
         return null;
       }
     }

    return filePath;
  }

  /**
   * 缓存音乐
   * @param id 歌曲ID
   * @param url 音乐下载地址
   * @param quality 音质标识
   * @returns 缓存后的本地文件路径
   */
  public async cacheMusic(id: number | string, url: string, quality: string): Promise<string> {
    const key = this.getCacheKey(id, quality);
    // 检查是否已有相同的下载任务在进行中
    if (this.downloadingTasks.has(key)) {
      cacheLog.info(`[MusicCache] Reusing existing download task for: ${key}`);
      return this.downloadingTasks.get(key)!;
    }
    const downloadPromise = (async () => {
      const filePath = this.cacheService.getFilePath("music", key);
      const tempPath = `${filePath}.tmp`;

      // 确保目录存在
      await this.cacheService.init();

      // 检查并清理超限缓存
      await this.cacheService.checkAndCleanCache();

      // 下载并写入
      try {
        if (!tools) {
          throw new Error("Native tools not loaded");
        }

        // 使用 Rust 下载器

        const store = useStore();
        const enableHttp2 = store.get("enableDownloadHttp2", true) as boolean;

        const task = new tools.DownloadTask();
        await task.download(
          url,
          tempPath,
          null, // No metadata for cache
          4, // Thread count
          null, // Referer
          () => {}, // No progress callback needed for cache currently
          enableHttp2,
        );

        // 检查临时文件是否存在
        if (!existsSync(tempPath)) throw new Error("下载失败：临时文件未创建");

        // 检查文件大小，避免空文件
        const stats = await stat(tempPath);
        if (stats.size === 0) {
          await unlink(tempPath).catch(() => {});
          throw new Error("下载的文件为空");
        }

        // 下载成功后，将临时文件重命名为正式缓存文件
        await rename(tempPath, filePath);

        // 更新 CacheService 的大小记录
        await this.cacheService.notifyFileChange("music", key);

        return filePath;
      } catch (error) {
        // 下载失败，清理残余的临时文件
        if (existsSync(tempPath)) {
          await unlink(tempPath).catch(() => {});
        }
        cacheLog.error("Music download failed:", error);
        throw error;
      }
    })();

    // 记录此任务
    this.downloadingTasks.set(key, downloadPromise);

    // 任务完成后（无论成功失败）从 Map 中移除
    downloadPromise.finally(() => {
      this.downloadingTasks.delete(key);
    });

    return downloadPromise;
  }
}
