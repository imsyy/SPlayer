import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "path";
import { access, mkdir, readdir, readFile, stat, unlink, writeFile } from "fs/promises";
import { parseFile, parseStream as parseFileFromStream } from "music-metadata";
import { getFileID, getFileMD5, metaDataLyricsArrayToLrc } from "../utils/helper";
import { File, Picture, Id3v2Settings, TagTypes } from "node-taglib-sharp";
import { GoogleDriveService } from "../services/GoogleDriveService";
import { ipcLog, processLog } from "../logger";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Options as GlobOptions } from "fast-glob/out/settings";
import { LocalMusicService } from "../services/LocalMusicService";
import { useStore } from "../store";
import FastGlob from "fast-glob";
import pLimit from "p-limit";
import got from "got";

// 下载项 (存储 AbortController)
const downloadItems = new Map<number, AbortController>();

/**
 * 文件相关 IPC
 */
const initFileIpc = (): void => {
  /** 本地音乐服务 */
  const localMusicService = new LocalMusicService();

  /**
   * 获取全局搜索配置
   * @param cwd 当前工作目录
   */
  const globOpt = (cwd?: string): GlobOptions => ({
    cwd,
    caseSensitiveMatch: false,
  });

  // 检查文件是否存在
  ipcMain.handle("file-exists", async (_, path: string) => {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  });

  // 默认文件夹
  ipcMain.handle(
    "get-default-dir",
    (_event, type: "documents" | "downloads" | "pictures" | "music" | "videos"): string => {
      return app.getPath(type);
    },
  );

  // 本地音乐同步（批量流式传输）
  ipcMain.handle("local-music-sync", async (event, dirs: string[]) => {
    try {
      // 获取封面目录路径
      const store = useStore();
      const localCachePath = join(store.get("cachePath"), "local-data");
      const coverDir = join(localCachePath, "covers");
      
      // --- Google Drive 集成 ---
      try {
        const driveService = GoogleDriveService.getInstance();
        if (driveService.hasValidTokens()) {
          processLog.info("☁️ Fetching Google Drive audio files...");
          const driveFiles = await driveService.getAudioFiles();
          
          const driveTracks = driveFiles.map(file => ({
             id: file.id || "",
             path: `google-drive://${file.id}`,
             // 去除扩展名作为标题
             title: file.name?.replace(/\.[^/.]+$/, "") || "Unknown Title",
             artist: "Google Drive", 
             album: "Cloud Drive",
             // 暂无时长信息
             duration: 0,
             size: parseInt(file.size || "0"),
             mtime: file.modifiedTime ? new Date(file.modifiedTime).getTime() : Date.now(),
             cover: undefined,
             bitrate: 0
          }));
          
          // 发送 Drive 数据批次
          event.sender.send("music-sync-tracks-batch", driveTracks);
          processLog.info(`☁️ Sent ${driveTracks.length} Google Drive tracks`);
        }
      } catch (error: any) {
        processLog.error("❌ Failed to sync Google Drive files:", error);
        // 如果是权限不足 (Permission denied)，发送明确提示
        if (error.message && (error.message.includes("403") || error.message.includes("insufficient"))) {
           event.sender.send("music-sync-complete", { 
             success: false, 
             message: "Google Drive 权限不足，请在目录管理中重新连接以授权" 
           });
           return { success: false, message: "Google Drive Auth Error" };
        }
      }
      // ------------------------

      // 使用批量流式传输，减少 IPC 通信次数

      // 使用批量流式传输，减少 IPC 通信次数
      await localMusicService.refreshLibrary(
        dirs,
        // 发送进度
        (current, total) => {
          event.sender.send("music-sync-progress", { current, total });
        },
        // 发送批量数据
        (tracks) => {
          const tracksWithFullCover = tracks.map((track) => {
            let coverPath: string | undefined = undefined;
            if (track.cover) {
              const fullPath = join(coverDir, track.cover);
              // 路径兼容
              coverPath = `file://${fullPath.replace(/\\/g, "/")}`;
            }
            return {
              ...track,
              cover: coverPath,
            };
          });
          event.sender.send("music-sync-tracks-batch", tracksWithFullCover);
        },
      );
      // 发送完成信号
      event.sender.send("music-sync-complete", { success: true });
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      // 如果正在扫描中
      if (errorMessage === "SCAN_IN_PROGRESS") {
        return { success: false, message: "扫描正在进行中，请稍候" };
      }
      // 错误信号
      event.sender.send("music-sync-complete", { success: false, message: errorMessage });
      return { success: false, message: errorMessage };
    }
  });

  // 遍历音乐文件
  ipcMain.handle("get-music-files", async (_, dirPath: string) => {
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
      // 音乐文件扩展名
      const musicExtensions = [
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
      ];
      // 查找指定目录下的所有音乐文件
      const musicFiles = await FastGlob(`**/*.{${musicExtensions.join(",")}}`, globOpt(filePath));

      // 限制并发数
      const limit = pLimit(10);

      // 解析元信息（使用 allSettled 防止单个文件失败影响整体）
      const metadataPromises = musicFiles.map((file) =>
        limit(async () => {
          const fullPath = join(dirPath, file);
          try {
            // 处理元信息 (跳过封面解析以提升速度)
            const { common, format } = await parseFile(fullPath, { skipCovers: true });
            // 获取文件大小
            const { size } = await stat(fullPath);
            const ext = extname(fullPath);

            return {
              id: getFileID(fullPath),
              name: common.title || basename(fullPath, ext),
              artists: common.artists?.[0] || common.artist,
              album: common.album || "",
              alia: common.comment?.[0]?.text || "",
              duration: (format?.duration ?? 0) * 1000,
              size: (size / (1024 * 1024)).toFixed(2),
              path: fullPath,
              quality: format.bitrate ?? 0,
            };
          } catch (err) {
            ipcLog.warn(`⚠️ Failed to parse file: ${fullPath}`, err);
            return null;
          }
        }),
      );
      const metadataResults = await Promise.all(metadataPromises);
      // 过滤掉解析失败的文件
      return metadataResults.filter((item) => item !== null);
    } catch (error) {
      ipcLog.error("❌ Error fetching music metadata:", error);
      return [];
    }
  });

  // 获取音乐元信息
  ipcMain.handle("get-music-metadata", async (_, path: string) => {
    try {
      if (path.startsWith("google-drive://")) {
        const fileId = path.replace("google-drive://", "");
        try {
          const driveService = GoogleDriveService.getInstance();
          
          // 并行获取：文件流（用于解析 tag）和 API 元数据（用于获取准确大小）
          const [metadata, streamReuslt] = await Promise.all([
            driveService.getFileMetadata(fileId),
            driveService.getFileStream(fileId),
          ]);

          const { data } = streamReuslt;
          // 解析流
          const { common, format } = await parseFileFromStream(data);
          
          return {
            fileName: common.title || metadata.name || "Unknown Title",
            fileSize: metadata.size / (1024 * 1024), // 转换为 MB
            common,
            lyric:
              metaDataLyricsArrayToLrc(common?.lyrics?.[0]?.syncText || []) ||
              common?.lyrics?.[0]?.text ||
              "",
            format,
            md5: "",
          };
        } catch (e) {
          processLog.error(`⚠️ Failed to parse Google Drive metadata for ${fileId}:`, e);
          // Fallback
          return {
            fileName: "Google Drive File",
            fileSize: 0,
            common: { title: "Cloud Song", artist: "Google Drive" },
            lyric: "",
            format: {},
            md5: "",
          };
        }
      }
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
      };
    } catch (error) {
      ipcLog.error("❌ Error fetching music metadata:", error);
      throw error;
    }
  });

  // 修改音乐元信息
  ipcMain.handle("set-music-metadata", async (_, path: string, metadata: any) => {
    try {
      const { name, artist, album, alia, lyric, cover } = metadata;
      // 规范化路径
      const songPath = resolve(path);
      const coverPath = cover ? resolve(cover) : null;
      // 读取歌曲文件
      const songFile = File.createFromPath(songPath);
      // 读取封面文件
      const songCover = coverPath ? Picture.fromPath(coverPath) : null;
      // 保存元数据
      Id3v2Settings.forceDefaultVersion = true;
      Id3v2Settings.defaultVersion = 3;
      songFile.tag.title = name || "未知曲目";
      songFile.tag.performers = [artist || "未知艺术家"];
      songFile.tag.album = album || "未知专辑";
      songFile.tag.albumArtists = [artist || "未知艺术家"];
      songFile.tag.lyrics = lyric || "";
      songFile.tag.description = alia || "";
      songFile.tag.comment = alia || "";
      if (songCover) songFile.tag.pictures = [songCover];
      // 保存元信息
      songFile.save();
      songFile.dispose();
      return true;
    } catch (error) {
      ipcLog.error("❌ Error setting music metadata:", error);
      throw error;
    }
  });

  // 获取音乐歌词
  ipcMain.handle(
    "get-music-lyric",
    async (
      _,
      musicPath: string, // 参数名改为 musicPath 以示区分
    ): Promise<{
      lyric: string;
      format: "lrc" | "ttml";
    }> => {
      try {
        // Google Drive 逻辑
        if (musicPath.startsWith("google-drive://")) {
          const fileId = musicPath.replace("google-drive://", "");
          try {
            const driveService = GoogleDriveService.getInstance();
            const { data } = await driveService.getFileStream(fileId);
            const { common } = await parseFileFromStream(data);
            
            const syncedLyric = common?.lyrics?.[0]?.syncText;
            if (syncedLyric && syncedLyric.length > 0) {
              return {
                lyric: metaDataLyricsArrayToLrc(syncedLyric),
                format: "lrc",
              };
            } else if (common?.lyrics?.[0]?.text) {
              return {
                lyric: common?.lyrics?.[0]?.text,
                format: "lrc",
              };
            }
          } catch (e) {
            processLog.error(`⚠️ Failed to parse lyrics from Drive file ${fileId}:`, e);
          }
          return { lyric: "", format: "lrc" };
        }

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
        // 遍历优先级
        for (const format of ["lrc", "ttml"] as const) {
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
                return { lyric, format };
              }
            } catch {
              // 读取失败则尝试下一种格式
              continue;
            }
          }
        }
        // 如果本地文件没找到，尝试读取内置元数据 (ID3 Tags)
        const { common } = await parseFile(absPath);
        const syncedLyric = common?.lyrics?.[0]?.syncText;
        if (syncedLyric && syncedLyric.length > 0) {
          return {
            lyric: metaDataLyricsArrayToLrc(syncedLyric),
            format: "lrc",
          };
        } else if (common?.lyrics?.[0]?.text) {
          return {
            lyric: common?.lyrics?.[0]?.text,
            format: "lrc",
          };
        }
        // 都没有找到
        return { lyric: "", format: "lrc" };
      } catch (error) {
        ipcLog.error("❌ Error fetching music lyric:", error);
        throw error;
      }
    },
  );

  // 获取音乐封面
  ipcMain.handle(
    "get-music-cover",
    async (_, path: string): Promise<{ data: Buffer; format: string } | null> => {
      try {
        if (path.startsWith("google-drive://")) {
          const fileId = path.replace("google-drive://", "");
          try {
            const driveService = GoogleDriveService.getInstance();
            const { data } = await driveService.getFileStream(fileId);
            const { common } = await parseFileFromStream(data);
            const picture = common.picture?.[0];
            if (picture) {
              return { data: Buffer.from(picture.data), format: picture.format };
            }
          } catch (e) {
            processLog.error(`⚠️ Failed to parse cover from Drive file ${fileId}:`, e);
          }
          return null;
        }
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
    },
  );

  // 读取本地歌词
  ipcMain.handle(
    "read-local-lyric",
    async (_, lyricDirs: string[], id: number): Promise<{ lrc: string; ttml: string }> => {
      const result = { lrc: "", ttml: "" };

      try {
        // 定义需要查找的模式
        // 此处的 `{,*.}` 表示这里可以取 `` (empty) 也可以取 `*.`
        // 将歌词文件命名为 `歌曲ID.后缀名` 或者 `任意前缀.歌曲ID.后缀名` 均可
        const patterns = {
          ttml: `**/{,*.}${id}.ttml`,
          lrc: `**/{,*.}${id}.lrc`,
        };

        // 遍历每一个目录
        for (const dir of lyricDirs) {
          try {
            // 查找 ttml
            if (!result.ttml) {
              const ttmlFiles = await FastGlob(patterns.ttml, globOpt(dir));
              if (ttmlFiles.length > 0) {
                const filePath = join(dir, ttmlFiles[0]);
                await access(filePath);
                result.ttml = await readFile(filePath, "utf-8");
              }
            }

            // 查找 lrc
            if (!result.lrc) {
              const lrcFiles = await FastGlob(patterns.lrc, globOpt(dir));
              if (lrcFiles.length > 0) {
                const filePath = join(dir, lrcFiles[0]);
                await access(filePath);
                result.lrc = await readFile(filePath, "utf-8");
              }
            }

            // 如果两种文件都找到了就提前结束搜索
            if (result.ttml && result.lrc) break;
          } catch {
            // 某个路径异常，跳过
          }
        }
      } catch {
        /* 忽略错误 */
      }

      return result;
    },
  );

  // 删除文件
  ipcMain.handle("delete-file", async (_, path: string) => {
    try {
      // 规范化路径
      const resolvedPath = resolve(path);
      // 检查文件是否存在
      try {
        await access(resolvedPath);
      } catch {
        throw new Error("❌ File not found");
      }
      // 删除文件
      await unlink(resolvedPath);
      return true;
    } catch (error) {
      ipcLog.error("❌ File delete error", error);
      return false;
    }
  });

  // 打开文件夹
  ipcMain.on("open-folder", async (_, path: string) => {
    try {
      // 规范化路径
      const resolvedPath = resolve(path);
      // 检查文件夹是否存在
      try {
        await access(resolvedPath);
      } catch {
        throw new Error("❌ Folder not found");
      }
      // 打开文件夹
      shell.showItemInFolder(resolvedPath);
    } catch (error) {
      ipcLog.error("❌ Folder open error", error);
      throw error;
    }
  });

  // 图片选择窗口
  ipcMain.handle("choose-image", async () => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png"] }],
      });
      if (!filePaths || filePaths.length === 0) return null;
      return filePaths[0];
    } catch (error) {
      ipcLog.error("❌ Image choose error", error);
      return null;
    }
  });

  // 路径选择窗口
  ipcMain.handle("choose-path", async (_, title: string, multiSelect: boolean = false) => {
    try {
      const properties: ("openDirectory" | "createDirectory" | "multiSelections")[] = [
        "openDirectory",
        "createDirectory",
      ];
      if (multiSelect) {
        properties.push("multiSelections");
      }
      const { filePaths } = await dialog.showOpenDialog({
        title: title ?? "选择文件夹",
        defaultPath: app.getPath("downloads"),
        properties,
        buttonLabel: "选择文件夹",
      });
      if (!filePaths || filePaths.length === 0) return null;
      // 多选时返回数组，单选时返回第一个路径
      return multiSelect ? filePaths : filePaths[0];
    } catch (error) {
      ipcLog.error("❌ Path choose error", error);
      return null;
    }
  });

  // 下载文件
  ipcMain.handle(
    "download-file",
    async (
      event,
      url: string,
      options: {
        fileName: string;
        fileType: string;
        path: string;
        downloadMeta?: boolean;
        downloadCover?: boolean;
        downloadLyric?: boolean;
        saveMetaFile?: boolean;
        lyric?: string;
        songData?: any;
        skipIfExist?: boolean;
      } = {
        fileName: "未知文件名",
        fileType: "mp3",
        path: app.getPath("downloads"),
      },
    ): Promise<{ status: "success" | "skipped" | "error" | "cancelled"; message?: string }> => {
      try {
        // 获取窗口
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return { status: "error", message: "Window not found" };
        // 获取配置
        const {
          fileName,
          fileType,
          path,
          lyric,
          downloadMeta,
          downloadCover,
          downloadLyric,
          saveMetaFile,
          songData,
          skipIfExist,
        } = options;
        // 规范化路径
        const downloadPath = resolve(path);
        // 检查文件夹是否存在，不存在则自动递归创建
        try {
          await access(downloadPath);
        } catch {
          await mkdir(downloadPath, { recursive: true });
        }

        // 检查文件是否存在
        if (skipIfExist) {
          const filePath = join(downloadPath, `${fileName}.${fileType}`);
          try {
            await access(filePath);
            return { status: "skipped", message: "文件已存在" };
          } catch {
            // 文件不存在，继续下载
          }
        }

        // 尝试删除可能存在的临时文件
        const tempPath = join(downloadPath, `${fileName}.${fileType}.tmp`);
        try {
          await unlink(tempPath);
        } catch {
          // 忽略错误
        }

        // 下载文件
        const abortController = new AbortController();
        if (songData?.id) {
          downloadItems.set(songData.id, abortController);
        }

        const finalFilePath = join(downloadPath, `${fileName}.${fileType}`);
        const fileStream = createWriteStream(finalFilePath);

        try {
          const downloadStream = got.stream(url, {
            signal: abortController.signal,
            retry: { limit: 0 }, // 禁止自动重试，防止进度条跳变
          });

          let lastProgressTime = 0;
          let lastPercent = 0;

          downloadStream.on("downloadProgress", (progress) => {
            const now = Date.now();
            // 限制发送频率：每秒或进度变化超过 5%
            if (now - lastProgressTime > 1000 || progress.percent - lastPercent >= 0.05) {
              win.webContents.send("download-progress", {
                id: songData?.id,
                percent: progress.percent,
                transferredBytes: progress.transferred,
                totalBytes: progress.total,
              });
              lastProgressTime = now;
              lastPercent = progress.percent;
            }
          });

          await pipeline(downloadStream, fileStream);

          // 发送 100% 进度
          win.webContents.send("download-progress", {
            id: songData?.id,
            percent: 1,
            transferredBytes: 0,
            totalBytes: 0,
          });
        } catch (error: any) {
          // 删除未完成的文件
          try {
            await unlink(finalFilePath);
          } catch {
            // 忽略错误
          }

          if (error.name === "AbortError" || error.code === "ABORT_ERR") {
            return { status: "cancelled", message: "下载已取消" };
          }
          throw error;
        } finally {
          if (songData?.id) {
            downloadItems.delete(songData.id);
          }
        }

        if (!downloadMeta || !songData?.cover) return { status: "success" };

        // 验证文件是否存在
        try {
          await access(finalFilePath);
        } catch {
          // 等待一小段时间再次检查（解决某些情况下文件系统延迟）
          await new Promise((resolve) => setTimeout(resolve, 500));
          try {
            await access(finalFilePath);
          } catch {
            throw new Error(`File not found at ${finalFilePath}`);
          }
        }

        // 下载封面
        const coverUrl = songData?.coverSize?.l || songData.cover;
        let coverPath = "";
        try {
          const coverBuffer = await got(coverUrl).buffer();
          coverPath = join(downloadPath, `${fileName}.jpg`);
          await writeFile(coverPath, coverBuffer);
        } catch (e) {
          console.error("Cover download failed", e);
        }

        // 读取歌曲文件
        let songFile = File.createFromPath(finalFilePath);
        // 清除原有标签，防止脏数据（如模拟播放下载时的乱码歌词）
        songFile.removeTags(TagTypes.AllTags);
        songFile.save();
        songFile.dispose();

        // 重新读取文件以写入新标签
        songFile = File.createFromPath(finalFilePath);
        // 生成图片信息
        let songCover: Picture | null = null;
        if (coverPath) {
          try {
            songCover = Picture.fromPath(coverPath);
          } catch {
            // 忽略错误
          }
        }

        // 保存修改后的元数据
        Id3v2Settings.forceDefaultVersion = true;
        Id3v2Settings.defaultVersion = 3;

        songFile.tag.title = songData?.name || "未知曲目";
        songFile.tag.album = songData?.album?.name || "未知专辑";
        songFile.tag.performers = songData?.artists?.map((ar: any) => ar.name) || ["未知艺术家"];
        songFile.tag.albumArtists = songData?.artists?.map((ar: any) => ar.name) || ["未知艺术家"];
        if (lyric && downloadLyric) songFile.tag.lyrics = lyric;
        if (songCover && downloadCover) songFile.tag.pictures = [songCover];
        // 保存元信息
        songFile.save();
        songFile.dispose();
        // 创建同名歌词文件
        if (lyric && saveMetaFile && downloadLyric) {
          const lrcPath = join(downloadPath, `${fileName}.lrc`);
          await writeFile(lrcPath, lyric, "utf-8");
        }
        // 是否删除封面
        if (coverPath && (!saveMetaFile || !downloadCover)) {
          try {
            await unlink(coverPath);
          } catch {
            // 忽略错误
          }
        }
        return { status: "success" };
      } catch (error) {
        ipcLog.error("❌ Error downloading file:", error);
        return {
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  );

  // 取消下载
  ipcMain.handle("cancel-download", async (_, songId: number) => {
    const controller = downloadItems.get(songId);
    if (controller) {
      controller.abort();
      downloadItems.delete(songId);
      return true;
    }
    return false;
  });

  // 检查是否是相同的路径（规范化后比较）
  ipcMain.handle("check-if-same-path", (_, localFilesPath: string[], selectedDir: string) => {
    const resolvedSelectedDir = resolve(selectedDir);
    const allPaths = localFilesPath.map((p) => resolve(p));
    return allPaths.some((existingPath) => existingPath === resolvedSelectedDir);
  });

  // 检查是否是子文件夹
  ipcMain.handle("check-if-subfolder", (_, localFilesPath: string[], selectedDir: string) => {
    const resolvedSelectedDir = resolve(selectedDir);
    const allPaths = localFilesPath.map((p) => resolve(p));
    return allPaths.some((existingPath) => {
      const relativePath = relative(existingPath, resolvedSelectedDir);
      return relativePath && !relativePath.startsWith("..") && !isAbsolute(relativePath);
    });
  });
};

export default initFileIpc;
