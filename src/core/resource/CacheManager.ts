import { isElectron } from "@/utils/env";

/**
 * 缓存资源类型
 * - music: 音乐缓存
 * - lyrics: 歌词缓存
 * - local-data: 本地音乐数据缓存
 * - list-data: 列表数据缓存（歌单/专辑/电台）
 */
export type CacheResourceType = "music" | "lyrics" | "local-data" | "list-data";

/**
 * 缓存文件列表项信息
 */
export type CacheListItem = {
  /** 缓存 key（文件名或相对路径） */
  key: string;
  /** 文件大小（字节） */
  size: number;
  /** 最后修改时间（毫秒时间戳） */
  mtime: number;
};

/**
 * 缓存操作统一返回结构
 * @template T data 字段的数据类型
 */
export type CacheResult<T = any> = {
  /** 是否成功 */
  success: boolean;
  /** 返回数据 */
  data?: T;
  /** 错误信息（失败时） */
  message?: string;
};

/**
 * 可写入缓存的数据类型
 */
type CacheWriteData = Uint8Array | ArrayBuffer | string;

/**
 * 渲染进程缓存管理器
 * 通过 IPC 调用主进程，实现缓存的增删改查
 */
class CacheManager {
  /**
   * 调用底层 IPC 通道
   * @param channel IPC 通道名称
   * @param args 传入参数
   * @returns 封装后的缓存结果
   */
  private invoke<T>(channel: string, ...args: any[]): Promise<CacheResult<T>> {
    if (!isElectron) {
      return Promise.resolve({
        success: false,
        message: "当前环境不支持缓存",
      });
    }
    return window.electron.ipcRenderer.invoke(channel, ...args);
  }

  /**
   * 获取指定类型缓存下的文件列表
   * @param type 缓存资源类型
   */
  list(type: CacheResourceType): Promise<CacheResult<CacheListItem[]>> {
    return this.invoke("cache-list", type);
  }

  /**
   * 读取指定缓存内容
   * @param type 缓存资源类型
   * @param key 缓存 key（文件名或相对路径）
   */
  get(type: CacheResourceType, key: string): Promise<CacheResult<Uint8Array>> {
    return this.invoke("cache-get", type, key);
  }

  /**
   * 写入或更新缓存内容
   * @param type 缓存资源类型
   * @param key 缓存 key（文件名或相对路径）
   * @param data 要写入的数据（自动转换为二进制）
   */
  set(type: CacheResourceType, key: string, data: CacheWriteData): Promise<CacheResult<null>> {
    const payload = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    return this.invoke("cache-put", type, key, payload);
  }

  /**
   * 删除单个缓存文件
   * @param type 缓存资源类型
   * @param key 缓存 key（文件名或相对路径）
   */
  remove(type: CacheResourceType, key: string): Promise<CacheResult<null>> {
    return this.invoke("cache-remove", type, key);
  }

  /**
   * 清空指定类型的缓存目录
   * @param type 缓存资源类型
   */
  clear(type: CacheResourceType): Promise<CacheResult<null>> {
    return this.invoke("cache-clear", type);
  }

  /**
   * 清空所有缓存
   */
  clearAll(): Promise<CacheResult<null>> {
    return this.invoke("cache-clear-all");
  }

  /**
   * 获取所有缓存类型的总大小（字节）
   */
  getSize(): Promise<CacheResult<number>> {
    return this.invoke("cache-size");
  }
}

let cacheManager: CacheManager | null = null;

/**
 * 获取全局单例的缓存管理器
 * @returns CacheManager 实例
 */
export const useCacheManager = (): CacheManager => {
  if (!cacheManager) cacheManager = new CacheManager();
  return cacheManager;
};
