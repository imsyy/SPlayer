import type { SongMetadata } from "@native/tools";
import type { Options as GlobOptions } from "fast-glob/out/settings";
import { parseFile } from "music-metadata";
import { access, open, readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { ipcLog } from "../logger";
import { getFileID, getFileMD5, metaDataLyricsArrayToLrc } from "../utils/helper";
import { loadNativeModule } from "../utils/native-loader";
import { CacheService } from "./CacheService";
import FastGlob from "fast-glob";
import pLimit from "p-limit";

const globOpt = (cwd?: string): GlobOptions => ({
  cwd,
  caseSensitiveMatch: false,
});

/** TTML 缓存数据 */
interface TtmlIdCache {
  ncmIds: number[];
  filePath: string;
  mtime: number;
}

/** TTML-ID 映射缓存（使用CacheService存储） */
class TtmlIdMappingCache {
  private cache: Map<string, TtmlIdCache> = new Map();
  private cacheKey = "ttml-id-mapping";
  private pendingSave = false;

  async load(): Promise<void> {
    try {
      const cacheService = CacheService.getInstance();
      await cacheService.init();
      const data = await cacheService.get("lyrics", this.cacheKey);
      if (data) {
        const parsed = JSON.parse(data.toString("utf-8")) as Record<string, TtmlIdCache>;
        this.cache = new Map(Object.entries(parsed));
        ipcLog.info(`[TtmlIdMappingCache] 加载了 ${this.cache.size} 条缓存`);
      }
    } catch (e) {
      ipcLog.error("[TtmlIdMappingCache] 加载缓存失败:", e);
    }
  }

  private async saveInternal(): Promise<void> {
    if (this.pendingSave) return;
    this.pendingSave = true;
    try {
      const cacheService = CacheService.getInstance();
      await cacheService.init();
      const data = JSON.stringify(Object.fromEntries(this.cache));
      await cacheService.put("lyrics", this.cacheKey, data);
    } catch (e) {
      ipcLog.error("[TtmlIdMappingCache] 保存缓存失败:", e);
    } finally {
      this.pendingSave = false;
    }
  }

  async save(): Promise<void> {
    await this.saveInternal();
  }

  getById(ncmId: number): TtmlIdCache | undefined {
    return this.cache.get(`id:${ncmId}`);
  }

  getByPath(filePath: string): TtmlIdCache | undefined {
    return this.cache.get(`path:${filePath}`);
  }

  async set(
    ncmIds: number[],
    filePath: string,
    mtime: number,
    options: { autoSave: boolean } = { autoSave: true },
  ): Promise<void> {
    const oldCache = this.cache.get(`path:${filePath}`);
    if (oldCache) {
      for (const oldId of oldCache.ncmIds) {
        this.cache.delete(`id:${oldId}`);
      }
    }
    this.cache.set(`path:${filePath}`, { ncmIds, filePath, mtime });
    for (const ncmId of ncmIds) {
      this.cache.set(`id:${ncmId}`, { ncmIds, filePath, mtime });
    }
    if (options.autoSave) {
      await this.saveInternal();
    }
  }

  getByIds(ncmIds: number[]): TtmlIdCache | undefined {
    for (const id of ncmIds) {
      const cached = this.cache.get(`id:${id}`);
      if (cached) return cached;
    }
    return undefined;
  }

  async delete(
    filePath: string,
    options: { autoSave: boolean } = { autoSave: true },
  ): Promise<void> {
    const cached = this.cache.get(`path:${filePath}`);
    if (cached) {
      for (const id of cached.ncmIds) {
        this.cache.delete(`id:${id}`);
      }
      this.cache.delete(`path:${filePath}`);
      if (options.autoSave) {
        await this.saveInternal();
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

let ttmlIdCache: TtmlIdMappingCache | null = null;
let loadPromise: Promise<void> | null = null;
let isScanning = false;

const getTtmlIdCache = async (): Promise<TtmlIdMappingCache> => {
  if (!ttmlIdCache) {
    ttmlIdCache = new TtmlIdMappingCache();
  }
  if (!loadPromise) {
    loadPromise = ttmlIdCache.load();
  }
  await loadPromise;
  return ttmlIdCache;
};

/** 从TTML提取所有NCM ID */
const extractNcmIdFromTTML = (ttmlContent: string): number[] => {
  try {
    const matches = ttmlContent.matchAll(
      /<amll:meta\s+key=["']ncmMusicId["']\s+value=["'](\d+)["']/g,
    );
    const ids: number[] = [];
    for (const match of matches) {
      if (match[1]) {
        const ncmId = parseInt(match[1], 10);
        if (!isNaN(ncmId) && ncmId > 0 && !ids.includes(ncmId)) {
          ids.push(ncmId);
        }
      }
    }
    return ids;
  } catch {
    return [];
  }
};

/** 读取本地歌词 */
async function readLocalLyricImpl(
  lyricDirs: string[],
  id: number,
): Promise<{ lrc: string; ttml: string }> {
  const result = { lrc: "", ttml: "" };
  const cache = await getTtmlIdCache();
  let isCacheDirty = false;

  const cached = cache.getByIds([id]);
  if (cached) {
    try {
      const fileStat = await stat(cached.filePath);
      if (fileStat.mtimeMs === cached.mtime) {
        result.ttml = await readFile(cached.filePath, "utf-8");
        ipcLog.info(`[readLocalLyric] 从缓存中找到 TTML: ${cached.filePath}`);
      } else {
        await cache.delete(cached.filePath, { autoSave: false });
        isCacheDirty = true;
      }
    } catch (e) {
      ipcLog.warn(`[readLocalLyric] 访问缓存的 TTML 文件失败，删除缓存: ${cached.filePath}`, e);
      await cache.delete(cached.filePath, { autoSave: false });
      isCacheDirty = true;
    }
  }

  if (!result.lrc) {
    const lrcPattern = `**/{,*.}${id}.lrc`;
    for (const dir of lyricDirs) {
      try {
        const lrcFiles = await FastGlob(lrcPattern, globOpt(dir));
        if (lrcFiles.length > 0) {
          const filePath = join(dir, lrcFiles[0]);
          await access(filePath);
          result.lrc = await readFile(filePath, "utf-8");
          break;
        }
      } catch (e) {
        ipcLog.warn(`[readLocalLyric] 查找 LRC 文件时路径异常，跳过: ${dir}`, e);
      }
    }
  }

  if (!result.ttml) {
    const ttmlPattern = `**/{,*.}${id}.ttml`;
    for (const dir of lyricDirs) {
      try {
        const ttmlFiles = await FastGlob(ttmlPattern, globOpt(dir));
        if (ttmlFiles.length > 0) {
          const filePath = join(dir, ttmlFiles[0]);
          await access(filePath);
          result.ttml = await readFile(filePath, "utf-8");
          const fileStat = await stat(filePath);
          await cache.set([id], filePath, fileStat.mtimeMs, { autoSave: false });
          isCacheDirty = true;
          break;
        }
      } catch (e) {
        ipcLog.warn(`[readLocalLyric] 查找 TTML 文件时路径异常，跳过: ${dir}`, e);
      }
    }
  }

  if (!result.ttml && lyricDirs.length > 0) {
    ipcLog.info(`[readLocalLyric] 未找到TTML，将在后台扫描目录建立缓存...`);
    scanTtmlIdMapping(lyricDirs)
      .then((count) => {
        ipcLog.info(`[readLocalLyric] 后台扫描完成，建立了 ${count} 条缓存`);
      })
      .catch((e) => {
        ipcLog.warn(`[readLocalLyric] 后台扫描失败:`, e);
      });
  }

  if (isCacheDirty) {
    await cache.save();
  }

  return result;
}

/** 后台扫描所有歌词目录，构建TTML-ID映射缓存 */
export async function scanTtmlIdMapping(
  lyricDirs: string[],
  onProgress?: (current: number, total: number) => void,
): Promise<number> {
  if (isScanning) {
    ipcLog.info("[scanTtmlIdMapping] 扫描正在进行中，跳过本次请求");
    return 0;
  }
  isScanning = true;

  try {
    const cache = await getTtmlIdCache();
    let scannedCount = 0;
    let hasChanges = false;

    // 并发限制，避免过多文件句柄打开
    const limit = pLimit(20);

    // 1. 并行获取所有目录下的文件列表
    const filePaths = (
      await Promise.all(
        lyricDirs.map(async (dir) => {
          try {
            const files = await FastGlob("**/*.ttml", globOpt(dir));
            return files.map((file) => join(dir, file));
          } catch (e) {
            ipcLog.warn(`[scanTtmlIdMapping] 扫描目录失败: ${dir}`, e);
            return [];
          }
        }),
      )
    ).flat();

    const totalFiles = filePaths.length;
    let processedCount = 0;

    // 2. 并发处理文件
    await Promise.all(
      filePaths.map((filePath) =>
        limit(async () => {
          try {
            const fileStat = await stat(filePath);
            const existingCache = cache.getByPath(filePath);

            // 检查缓存有效性 (mtimeMs 可能有微小差异，这里使用严格相等，若有问题可改用 Math.abs < 1)
            if (existingCache && fileStat.mtimeMs === existingCache.mtime) {
              return;
            }

            // 读取文件头部 (只读前 5KB)
            let ttmlHeader = "";
            let fileHandle;
            try {
              fileHandle = await open(filePath, "r");
              const buffer = Buffer.allocUnsafe(5000);
              const { bytesRead } = await fileHandle.read(buffer, 0, 5000, 0);
              ttmlHeader = buffer.toString("utf-8", 0, bytesRead);
            } catch {
              // 忽略读取错误
              return;
            } finally {
              await fileHandle?.close();
            }

            const extractedIds = extractNcmIdFromTTML(ttmlHeader);
            if (extractedIds.length > 0) {
              await cache.set(extractedIds, filePath, fileStat.mtimeMs, { autoSave: false });
              hasChanges = true;
              scannedCount++;
            }
          } catch (e) {
            ipcLog.warn(`[scanTtmlIdMapping] 处理文件失败: ${filePath}`, e);
          } finally {
            processedCount++;
            if (onProgress) {
              onProgress(processedCount, totalFiles);
            }
          }
        }),
      ),
    );

    if (hasChanges) {
      await cache.save();
    }

    return scannedCount;
  } finally {
    isScanning = false;
  }
}

type toolModule = typeof import("@native/tools");
const tools: toolModule = loadNativeModule("tools.node", "tools");

/** 修改音乐元数据的输入参数 */
export interface MusicMetadataInput {
  name?: string;
  artist?: string;
  album?: string;
  alia?: string;
  lyric?: string;
  cover?: string | null;
  albumArtist?: string;
  genre?: string;
  year?: number;
  trackNumber?: number;
  discNumber?: number;
}

/** 支持的音乐文件扩展名列表 */
const MUSIC_EXTENSIONS = [
  "mp3",
  "wav",
  "flac",
  "aac",
  "webm",
  "m4a",
  "ogg",
  "aiff",
  "aif",
  "aifc",
  "opus",
];

export class MusicMetadataService {
  /**
   * 扫描指定目录下的所有音乐文件并获取元数据
   * @param dirPath 目录路径
   * @returns 音乐文件元数据列表
   */
  async scanDirectory(dirPath: string) {
    try {
      // 校验路径有效性
      if (!dirPath || dirPath.trim() === "") {
        ipcLog.warn("⚠️ Empty directory path provided, skipping");
        return [];
      }
      // 规范化路径
      const filePath = resolve(dirPath).replace(/\\/g, "/");
      // 检查目录是否存在
      try {
        await access(filePath);
      } catch {
        ipcLog.warn(`⚠️ Directory not accessible: ${filePath}`);
        return [];
      }
      console.info(`📂 Fetching music files from: ${filePath}`);

      // 查找指定目录下的所有音乐文件
      const musicFiles = await FastGlob(`**/*.{${MUSIC_EXTENSIONS.join(",")}}`, globOpt(filePath));

      // 限制并发数
      const limit = pLimit(10);

      // 解析元信息（使用 allSettled 防止单个文件失败影响整体）
      const metadataPromises = musicFiles.map((file) =>
        limit(async () => {
          const fullPath = join(dirPath, file);
          try {
            // 处理元信息 (跳过封面解析以提升速度)
            const { common, format } = await parseFile(fullPath, { skipCovers: true });
            // 获取文件状态信息（大小和创建时间）
            const fileStat = await stat(fullPath);
            const ext = extname(fullPath);

            return {
              id: getFileID(fullPath),
              name: common.title || basename(fullPath, ext),
              artists: common.artists?.[0] || common.artist,
              album: common.album || "",
              alia: common.comment?.[0]?.text || "",
              duration: (format?.duration ?? 0) * 1000,
              size: (fileStat.size / (1024 * 1024)).toFixed(2),
              path: fullPath,
              quality: format.bitrate ?? 0,
              // 文件创建时间（用于排序）
              createTime: fileStat.birthtime.getTime(),
              replayGain: {
                trackGain: common.replaygain_track_gain?.ratio,
                trackPeak: common.replaygain_track_peak?.ratio,
                albumGain: common.replaygain_album_gain?.ratio,
                albumPeak: common.replaygain_album_peak?.ratio,
              },
            };
          } catch (err: any) {
            if (err.message && err.message.includes("FourCC contains invalid characters")) {
              ipcLog.warn(`⚠️ Skipped corrupted file (Invalid FourCC): ${fullPath}`);
            } else {
              ipcLog.warn(`⚠️ Failed to parse file: ${fullPath}`, err);
            }
            return null;
          }
        }),
      );
      const metadataResults = await Promise.all(metadataPromises);
      // 过滤掉解析失败的文件，并按创建时间降序排序（最新的在前）
      return metadataResults
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => b.createTime - a.createTime);
    } catch (error) {
      ipcLog.error("❌ Error fetching music metadata:", error);
      return [];
    }
  }

  /**
   * 获取指定音乐文件的歌词信息
   * @param musicPath 音乐文件路径
   * @returns 歌词信息对象，包括内置歌词和外部歌词
   */
  async getLyric(musicPath: string): Promise<{
    lyric: string;
    format: "lrc" | "ttml" | "yrc";
    external?: { lyric: string; format: "lrc" | "ttml" | "yrc" };
    embedded?: { lyric: string; format: "lrc" };
  }> {
    try {
      // 获取文件基本信息
      const absPath = resolve(musicPath);
      const dir = dirname(absPath);
      const ext = extname(absPath);
      const baseName = basename(absPath, ext);
      // 读取目录下所有文件
      let files: string[] = [];
      try {
        files = await readdir(dir);
      } catch (error) {
        ipcLog.error("❌ Failed to read directory:", dir);
        throw error;
      }
      // 外部歌词
      let external: { lyric: string; format: "lrc" | "ttml" | "yrc" } | undefined;
      // 内置歌词
      let embedded: { lyric: string; format: "lrc" } | undefined;
      // 查找外部歌词文件
      for (const format of ["ttml", "yrc", "lrc"] as const) {
        // 构造期望目标文件名
        const targetNameLower = `${baseName}.${format}`.toLowerCase();
        // 在文件列表中查找是否存在匹配项（忽略大小写）
        const matchedFileName = files.find((file) => file.toLowerCase() === targetNameLower);
        if (matchedFileName) {
          try {
            const lyricPath = join(dir, matchedFileName);
            const lyric = await readFile(lyricPath, "utf-8");
            // 若不为空
            if (lyric && lyric.trim() !== "") {
              ipcLog.info(`✅ Local lyric found (${format}): ${lyricPath}`);
              external = { lyric, format };
              break; // 找到最高优先级的外部歌词后停止
            }
          } catch {
            // 读取失败则尝试下一种格式
          }
        }
      }
      // 读取内置元数据 (ID3 Tags)
      try {
        const { common } = await parseFile(absPath);
        const syncedLyric = common?.lyrics?.[0]?.syncText;
        if (syncedLyric && syncedLyric.length > 0) {
          embedded = {
            lyric: metaDataLyricsArrayToLrc(syncedLyric),
            format: "lrc",
          };
        } else if (common?.lyrics?.[0]?.text) {
          embedded = {
            lyric: common?.lyrics?.[0]?.text,
            format: "lrc",
          };
        }
      } catch (e) {
        ipcLog.warn(`⚠️ Failed to parse metadata for lyrics: ${absPath}`, e);
      }
      // 返回结果
      const main = external || embedded || { lyric: "", format: "lrc" as const };
      return {
        ...main,
        external,
        embedded,
      };
    } catch (error) {
      ipcLog.error("❌ Error fetching music lyric:", error);
      throw error;
    }
  }

  /**
   * 读取本地目录中的歌词（通过ID查找）
   * @param lyricDirs 歌词目录列表
   * @param id 歌曲ID
   * @returns 歌词内容
   */
  async readLocalLyric(lyricDirs: string[], id: number): Promise<{ lrc: string; ttml: string }> {
    return readLocalLyricImpl(lyricDirs, id);
  }

  /**
   * 获取音乐文件的所有元数据
   * @param path 文件路径
   */
  async getMetadata(path: string) {
    try {
      const filePath = resolve(path).replace(/\\/g, "/");
      const { common, format } = await parseFile(filePath);
      return {
        // 文件名称
        fileName: basename(filePath),
        // 文件大小
        fileSize: (await stat(filePath)).size / (1024 * 1024),
        // 元信息
        common,
        // 歌词
        lyric:
          metaDataLyricsArrayToLrc(common?.lyrics?.[0]?.syncText || []) ||
          common?.lyrics?.[0]?.text ||
          "",
        // 音质信息
        format,
        // md5
        md5: await getFileMD5(filePath),
        replayGain: {
          trackGain: common.replaygain_track_gain?.ratio,
          trackPeak: common.replaygain_track_peak?.ratio,
          albumGain: common.replaygain_album_gain?.ratio,
          albumPeak: common.replaygain_album_peak?.ratio,
        },
      };
    } catch (error) {
      ipcLog.error("❌ Error fetching music metadata:", error);
      throw error;
    }
  }

  /**
   * 修改音乐元数据
   * @param path 文件路径
   * @param metadata 元数据对象
   */
  async setMetadata(path: string, metadata: MusicMetadataInput) {
    try {
      const {
        name,
        artist,
        album,
        alia,
        lyric,
        cover,
        albumArtist,
        genre,
        year,
        trackNumber,
        discNumber,
      } = metadata;
      // 规范化路径
      const songPath = resolve(path);
      const coverPath = cover ? resolve(cover) : undefined;

      const meta: SongMetadata = {
        title: name || "未知曲目",
        artist: artist || "未知艺术家",
        album: album || "未知专辑",
        lyric: lyric || "",
        description: alia || "",
        albumArtist: albumArtist,
        genre: genre,
        year: year,
        trackNumber: trackNumber,
        discNumber: discNumber,
      };

      if (!tools) {
        throw new Error("Native tools not loaded");
      }

      await tools.writeMusicMetadata(songPath, meta, coverPath);
      return true;
    } catch (error) {
      ipcLog.error("❌ Error setting music metadata:", error);
      throw error;
    }
  }

  /**
   * 获取音乐封面
   * @param path 文件路径
   */
  async getCover(path: string): Promise<{ data: Buffer; format: string } | null> {
    try {
      const { common } = await parseFile(path);
      // 获取封面数据
      const picture = common.picture?.[0];
      if (picture) {
        return { data: Buffer.from(picture.data), format: picture.format };
      } else {
        const coverFilePath = path.replace(/\.[^.]+$/, ".jpg");
        try {
          await access(coverFilePath);
          const coverData = await readFile(coverFilePath);
          return { data: coverData, format: "image/jpeg" };
        } catch {
          return null;
        }
      }
    } catch (error) {
      console.error("❌ Error fetching music cover:", error);
      throw error;
    }
  }
}
