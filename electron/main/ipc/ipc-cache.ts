import { ipcMain } from "electron";
import { CacheService, type CacheResourceType, type CacheListItem } from "../services/CacheService";
import { MusicCacheService } from "../services/MusicCacheService";
import { processLog } from "../logger";

/**
 * 缓存 IPC 通用返回结果
 * @template T 返回数据类型
 */
type CacheIpcResult<T = any> = {
  /** 是否成功 */
  success: boolean;
  /** 返回数据 */
  data?: T;
  /** 错误信息（失败时） */
  message?: string;
};

/**
 * 通用错误捕获包装器，为 IPC 返回统一结果结构
 * @param action 实际执行的异步逻辑
 * @returns 包装后的结果对象
 */
const withErrorCatch = async <T>(action: () => Promise<T>): Promise<CacheIpcResult<T>> => {
  try {
    const data = await action();
    return { success: true, data };
  } catch (error: any) {
    processLog.error("❌ IPC cache error:", error);
    return { success: false, message: error?.message || String(error) };
  }
};

/**
 * 初始化缓存相关 IPC 事件
 */
const initCacheIpc = (): void => {
  const cacheService = CacheService.getInstance();
  const musicCacheService = MusicCacheService.getInstance();

  // 初始化缓存服务
  cacheService.init();

  // 列出指定类型下的缓存文件
  ipcMain.handle(
    "cache-list",
    (_event, type: CacheResourceType): Promise<CacheIpcResult<CacheListItem[]>> => {
      return withErrorCatch(async () => {
        return await cacheService.list(type);
      });
    },
  );

  // 读取指定缓存文件
  ipcMain.handle(
    "cache-get",
    (_event, type: CacheResourceType, key: string): Promise<CacheIpcResult<Buffer | null>> => {
      return withErrorCatch(async () => {
        return await cacheService.get(type, key);
      });
    },
  );

  // 写入/更新缓存文件
  ipcMain.handle(
    "cache-put",
    (
      _event,
      type: CacheResourceType,
      key: string,
      data: Buffer | Uint8Array | ArrayBuffer | string,
    ): Promise<CacheIpcResult<null>> => {
      return withErrorCatch(async () => {
        await cacheService.put(type, key, data);
        return null;
      });
    },
  );

  // 删除单个缓存文件
  ipcMain.handle(
    "cache-remove",
    (_event, type: CacheResourceType, key: string): Promise<CacheIpcResult<null>> => {
      return withErrorCatch(async () => {
        await cacheService.remove(type, key);
        return null;
      });
    },
  );

  // 清空指定类型的缓存目录
  ipcMain.handle(
    "cache-clear",
    (_event, type: CacheResourceType): Promise<CacheIpcResult<null>> => {
      return withErrorCatch(async () => {
        await cacheService.clear(type);
        return null;
      });
    },
  );

  // 清空所有缓存
  ipcMain.handle("cache-clear-all", (): Promise<CacheIpcResult<null>> => {
    return withErrorCatch(async () => {
      await cacheService.clearAll();
      return null;
    });
  });

  // 获取所有缓存类型的总大小
  ipcMain.handle("cache-size", (): Promise<CacheIpcResult<number>> => {
    return withErrorCatch(async () => {
      return await cacheService.getSize();
    });
  });

  // 检查是否存在音乐缓存
  ipcMain.handle("music-cache-check", async (_event, id: number | string, quality?: string) => {
    try {
      return await musicCacheService.hasCache(id, quality);
    } catch (error) {
      processLog.error("Check music cache failed:", error);
      return null;
    }
  });

  // 下载并缓存音乐
  ipcMain.handle(
    "music-cache-download",
    async (_event, id: number | string, url: string, quality?: string) => {
      try {
        const qualitySuffix = quality || "standard";
        const path = await musicCacheService.cacheMusic(id, url, qualitySuffix);
        return { success: true, path };
      } catch (error: any) {
        processLog.error("Download music cache failed:", error);
        return { success: false, message: error.message };
      }
    },
  );
};

export default initCacheIpc;
