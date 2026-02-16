import { app, dialog, ipcMain, shell } from "electron";
import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
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
};

export default initFileIpc;
