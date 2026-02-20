import { app, dialog, ipcMain, shell } from "electron";
import { access, mkdir, unlink, writeFile, stat } from "node:fs/promises";
import { isAbsolute, join, normalize, relative, resolve } from "node:path";
import { Worker } from "node:worker_threads";
import { ipcLog } from "../logger";
import { LocalMusicService } from "../services/LocalMusicService";
import { DownloadService } from "../services/DownloadService";
import { MusicMetadataService } from "../services/MusicMetadataService";
import { useStore } from "../store";
import { chunkArray } from "../utils/helper";
import { processMusicList } from "../utils/format";

/** 本地音乐服务 */
const localMusicService = new LocalMusicService();
/** 下载服务 */
const downloadService = new DownloadService();
/** 音乐元数据服务 */
const musicMetadataService = new MusicMetadataService();

const analysisInFlight = new Map<string, Promise<unknown | null>>();

const normalizeAnalysisKey = (filePath: string) => {
  const p = normalize(resolve(filePath));
  return process.platform === "win32" ? p.toLowerCase() : p;
};

const resolveToolsNativeModulePath = () => {
  if (app.isPackaged) {
    return join(process.resourcesPath, "native", "tools.node");
  }
  return join(process.cwd(), "native", "tools", "tools.node");
};

const runToolsJobInWorker = async (payload: Record<string, unknown>) => {
  const worker = new Worker(new URL("./workers/audio-analysis.worker.js", import.meta.url), {});

  try {
    const jobType = typeof payload.type === "string" ? payload.type : "unknown";
    const nativeModulePath = resolveToolsNativeModulePath();
    await access(nativeModulePath).catch(() => {
      ipcLog.warn(`[AudioAnalysis] tools.node 不存在: ${nativeModulePath}`);
      throw new Error("TOOLS_NATIVE_MODULE_MISSING");
    });
    if (
      jobType === "analyzeHead" ||
      jobType === "suggestTransition" ||
      jobType === "suggestLongMix"
    ) {
      ipcLog.info(`[AudioAnalysis] Worker 启动: ${jobType}`);
    }
    const result = await new Promise<unknown | null>((resolvePromise) => {
      const cleanup = () => {
        worker.removeAllListeners("message");
        worker.removeAllListeners("error");
        worker.removeAllListeners("exit");
        worker.terminate().catch(() => {});
      };

      worker.once(
        "message",
        (resp: { ok: true; result?: unknown } | { ok: false; error?: string }) => {
          cleanup();
          if (resp && resp.ok) {
            resolvePromise(resp.result ?? null);
            return;
          }
          if (resp && !resp.ok && resp.error) {
            ipcLog.warn(`[AudioAnalysis] Worker 分析失败: ${resp.error}`);
          }
          resolvePromise(null);
        },
      );

      worker.once("error", (err) => {
        cleanup();
        const message = err instanceof Error ? err.message : String(err);
        ipcLog.warn(`[AudioAnalysis] Worker 线程错误: ${message}`);
        resolvePromise(null);
      });

      worker.once("exit", (code) => {
        cleanup();
        if (code !== 0) {
          ipcLog.warn(`[AudioAnalysis] Worker 异常退出: code=${code}`);
        }
        resolvePromise(null);
      });

      worker.postMessage({ ...payload, nativeModulePath });
    });

    if (
      jobType === "analyzeHead" ||
      jobType === "suggestTransition" ||
      jobType === "suggestLongMix"
    ) {
      ipcLog.info(`[AudioAnalysis] Worker 完成: ${jobType} (${result ? "ok" : "null"})`);
    }
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    ipcLog.warn(`[AudioAnalysis] 启动分析失败: ${message}`);
    worker.terminate().catch(() => {});
    return null;
  }
};

const runAnalysisInWorker = async (filePath: string, maxTime: number) => {
  return await runToolsJobInWorker({ type: "analyze", filePath, maxTime });
};

const runHeadAnalysisInWorker = async (filePath: string, maxTime: number) => {
  return await runToolsJobInWorker({ type: "analyzeHead", filePath, maxTime });
};

const runSuggestTransitionInWorker = async (currentPath: string, nextPath: string) => {
  return await runToolsJobInWorker({ type: "suggestTransition", currentPath, nextPath });
};

const runSuggestLongMixInWorker = async (currentPath: string, nextPath: string) => {
  return await runToolsJobInWorker({ type: "suggestLongMix", currentPath, nextPath });
};

/** 获取封面目录路径 */
const getCoverDir = (): string => {
  const store = useStore();
  const localCachePath = join(store.get("cachePath"), "local-data");
  return join(localCachePath, "covers");
};

/**
 * 处理本地音乐同步（批量流式传输）
 * @param event IPC 调用事件
 * @param dirs 需要同步的目录路径数组
 */
const handleLocalMusicSync = async (
  event: Electron.IpcMainInvokeEvent,
  dirs: string[],
): Promise<{ success: boolean; message?: string }> => {
  try {
    const coverDir = getCoverDir();
    // 刷新本地音乐库
    const allTracks = await localMusicService.refreshLibrary(
      dirs,
      (current, total) => {
        event.sender.send("music-sync-progress", { current, total });
      },
      () => {},
    );
    // 处理音乐封面路径
    const finalTracks = processMusicList(allTracks, coverDir);
    // 分块发送
    const CHUNK_SIZE = 1000;
    for (const chunk of chunkArray(finalTracks, CHUNK_SIZE)) {
      event.sender.send("music-sync-tracks-batch", chunk);
      await new Promise((resolve) => setImmediate(resolve));
    }
    // 完成信号
    event.sender.send("music-sync-complete", {
      success: true,
    });
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
};

/**
 * 初始化文件相关 IPC
 */
const initFileIpc = (): void => {
  // 检查文件是否存在
  ipcMain.handle("file-exists", async (_, path: string) => {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  });

  // 保存文件
  ipcMain.handle(
    "save-file",
    async (
      _,
      args: {
        targetPath: string;
        fileName: string;
        ext: string;
        content: string;
        encoding?: BufferEncoding;
      },
    ) => {
      try {
        const { targetPath, fileName, ext, content, encoding } = args;
        const joinedPath = join(targetPath, `${fileName}.${ext}`);
        await mkdir(targetPath, { recursive: true });
        await writeFile(joinedPath, content, { encoding: encoding || "utf-8" });
        return { success: true };
      } catch (err) {
        ipcLog.error("Failed to save file:", err);
        throw err;
      }
    },
  );

  // 默认文件夹
  ipcMain.handle(
    "get-default-dir",
    (_event, type: "documents" | "downloads" | "pictures" | "music" | "videos"): string => {
      return app.getPath(type);
    },
  );

  // 本地音乐同步（批量流式传输）
  ipcMain.handle("local-music-sync", handleLocalMusicSync);

  // 获取已下载音乐
  ipcMain.handle("get-downloaded-songs", async (_event, dirPath: string) => {
    try {
      const coverDir = getCoverDir();
      // 扫描指定目录
      const tracks = await localMusicService.scanDirectory(dirPath);
      return processMusicList(tracks, coverDir);
    } catch (err) {
      console.error("Failed to get downloaded songs:", err);
      return [];
    }
  });

  // 获取音乐元信息
  ipcMain.handle("get-music-metadata", async (_, path: string) => {
    return musicMetadataService.getMetadata(path);
  });

  // 修改音乐元信息
  ipcMain.handle("set-music-metadata", async (_, path: string, metadata) => {
    return musicMetadataService.setMetadata(path, metadata);
  });

  // 获取音乐歌词
  ipcMain.handle("get-music-lyric", async (_, musicPath: string) => {
    return musicMetadataService.getLyric(musicPath);
  });

  // 获取音乐封面
  ipcMain.handle("get-music-cover", async (_, path: string) => {
    return musicMetadataService.getCover(path);
  });

  // 读取本地歌词
  ipcMain.handle("read-local-lyric", async (_, lyricDirs: string[], id: number) => {
    return musicMetadataService.readLocalLyric(lyricDirs, id);
  });

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
      await access(resolvedPath);
      // 打开文件夹
      shell.showItemInFolder(resolvedPath);
    } catch (error) {
      ipcLog.error("❌ Folder open error", error);
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
  ipcMain.handle("download-file", (event, url, options) =>
    downloadService.downloadFile(event, url, options),
  );

  // 取消下载
  ipcMain.handle("cancel-download", async (_, songId: number) => {
    return downloadService.cancelDownload(songId);
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

  // 音频分析
  ipcMain.handle(
    "analyze-audio",
    async (_, filePath: string, options?: { maxAnalyzeTimeSec?: number }) => {
      try {
        const fileStat = await stat(filePath).catch(() => null);
        if (!fileStat) return null;

        const maxTime = options?.maxAnalyzeTimeSec ?? 60;
        const CURRENT_VERSION = 11; // 与 Rust 保持一致
        const fileKey = normalizeAnalysisKey(filePath);

        // 1. Check Cache
        const candidateKeys = new Set<string>([fileKey, filePath]);
        if (process.platform === "win32") {
          candidateKeys.add(filePath.replaceAll("/", "\\").toLowerCase());
          candidateKeys.add(filePath.replaceAll("\\", "/").toLowerCase());
        }

        for (const key of candidateKeys) {
          const cached = await localMusicService.getAnalysis(key);
          if (!cached || cached.mtime !== fileStat.mtimeMs || cached.size !== fileStat.size)
            continue;
          try {
            const data = JSON.parse(cached.data);
            if (
              data &&
              data.version === CURRENT_VERSION &&
              data.analyze_window &&
              Math.abs(data.analyze_window - maxTime) < 1.0
            ) {
              if (key !== fileKey) {
                await localMusicService.saveAnalysis(
                  fileKey,
                  cached.data,
                  fileStat.mtimeMs,
                  fileStat.size,
                );
              }
              return data;
            }
          } catch (e) {
            void e;
          }
        }

        // 2. Analyze
        const requestKey = `${fileKey}|${maxTime}`;
        const inFlight = analysisInFlight.get(requestKey);
        if (inFlight) return await inFlight;

        const promise = (async () => {
          const result = await runAnalysisInWorker(filePath, maxTime);
          if (!result) return null;
          try {
            await localMusicService.saveAnalysis(
              fileKey,
              JSON.stringify(result),
              fileStat.mtimeMs,
              fileStat.size,
            );
          } catch (e) {
            void e;
          }
          return result;
        })().finally(() => {
          analysisInFlight.delete(requestKey);
        });

        analysisInFlight.set(requestKey, promise);
        return await promise;
      } catch (err) {
        console.error("Audio analysis failed:", err);
        return null;
      }
    },
  );

  ipcMain.handle(
    "analyze-audio-head",
    async (_, filePath: string, options?: { maxAnalyzeTimeSec?: number }) => {
      try {
        const fileStat = await stat(filePath).catch(() => null);
        if (!fileStat) return null;

        const maxTime = options?.maxAnalyzeTimeSec ?? 60;
        const CURRENT_VERSION = 11;
        const fileKey = normalizeAnalysisKey(filePath);
        const headKey = `${fileKey}|head|${maxTime}`;

        const cached = await localMusicService.getAnalysis(headKey);
        if (cached && cached.mtime === fileStat.mtimeMs && cached.size === fileStat.size) {
          try {
            const data = JSON.parse(cached.data);
            if (data && data.version === CURRENT_VERSION && data.analyze_window) {
              ipcLog.info(`[AudioAnalysis] Head 命中缓存: ${headKey}`);
              return data;
            }
          } catch (e) {
            void e;
          }
        }

        const requestKey = `${headKey}|request`;
        const inFlight = analysisInFlight.get(requestKey);
        if (inFlight) return await inFlight;

        const promise = (async () => {
          ipcLog.info(`[AudioAnalysis] Head 开始分析: ${headKey}`);
          const result = await runHeadAnalysisInWorker(filePath, maxTime);
          if (!result) return null;
          try {
            await localMusicService.saveAnalysis(
              headKey,
              JSON.stringify(result),
              fileStat.mtimeMs,
              fileStat.size,
            );
          } catch (e) {
            void e;
          }
          return result;
        })().finally(() => {
          analysisInFlight.delete(requestKey);
        });

        analysisInFlight.set(requestKey, promise);
        return await promise;
      } catch (err) {
        console.error("Audio head analysis failed:", err);
        return null;
      }
    },
  );

  ipcMain.handle("suggest-transition", async (_, currentPath: string, nextPath: string) => {
    try {
      const a = await stat(currentPath).catch(() => null);
      if (!a) return null;
      const b = await stat(nextPath).catch(() => null);
      if (!b) return null;
      ipcLog.info(`[AudioAnalysis] SuggestTransition: ${currentPath} -> ${nextPath}`);
      return await runSuggestTransitionInWorker(currentPath, nextPath);
    } catch (err) {
      console.error("Suggest transition failed:", err);
      return null;
    }
  });

  ipcMain.handle("suggest-long-mix", async (_, currentPath: string, nextPath: string) => {
    try {
      const a = await stat(currentPath).catch(() => null);
      if (!a) return null;
      const b = await stat(nextPath).catch(() => null);
      if (!b) return null;
      ipcLog.info(`[AudioAnalysis] SuggestLongMix: ${currentPath} -> ${nextPath}`);
      return await runSuggestLongMixInWorker(currentPath, nextPath);
    } catch (err) {
      console.error("Suggest long mix failed:", err);
      return null;
    }
  });
};

export default initFileIpc;
