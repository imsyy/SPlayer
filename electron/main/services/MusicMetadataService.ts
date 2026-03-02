import type { SongMetadata } from "@native/tools";
import type { Options as GlobOptions } from "fast-glob/out/settings";
import { parseFile } from "music-metadata";
import { access, readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { ipcLog } from "../logger";
import { getFileID, getFileMD5, metaDataLyricsArrayToLrc } from "../utils/helper";
import { loadNativeModule } from "../utils/native-loader";
import FastGlob from "fast-glob";
import pLimit from "p-limit";
import { readLocalLyricImpl } from "./TtmlScannerService";

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

/**
 * 获取全局搜索配置
 * @param cwd 当前工作目录
 */
const globOpt = (cwd?: string): GlobOptions => ({
  cwd,
  caseSensitiveMatch: false,
});

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
   * 支持 ncmMusicId 元数据缓存匹配和文件名模式匹配
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
