import {
  app,
  ipcMain,
  BrowserWindow,
  powerSaveBlocker,
  screen,
  shell,
  dialog,
  net,
  session,
} from "electron";
import { File, Picture, Id3v2Settings } from "node-taglib-sharp";
import { parseFile } from "music-metadata";
import { getFonts } from "font-list";
import { MainTray } from "./tray";
import { Thumbar } from "./thumbar";
import { StoreType } from "./store";
import { isDev, getFileID, getFileMD5 } from "./utils";
import { isShortcutRegistered, registerShortcut, unregisterShortcuts } from "./shortcut";
import { join, basename, resolve } from "path";
import { download } from "electron-dl";
import { checkUpdate, startDownloadUpdate } from "./update";
import fs from "fs/promises";
import log from "../main/logger";
import Store from "electron-store";
import fg from "fast-glob";

// 注册 ipcMain
const initIpcMain = (
  win: BrowserWindow | null,
  lyricWin: BrowserWindow | null,
  loadingWin: BrowserWindow | null,
  tray: MainTray | null,
  thumbar: Thumbar | null,
  store: Store<StoreType>,
) => {
  initWinIpcMain(win, loadingWin, lyricWin, store);
  initLyricIpcMain(lyricWin, win, store);
  initTrayIpcMain(tray, win, lyricWin);
  initThumbarIpcMain(thumbar);
  initStoreIpcMain(store);
  initOtherIpcMain(win);
};

// win
const initWinIpcMain = (
  win: BrowserWindow | null,
  loadingWin: BrowserWindow | null,
  lyricWin: BrowserWindow | null,
  store: Store<StoreType>,
) => {
  let preventId: number | null = null;

  // 当前窗口状态
  ipcMain.on("win-state", (ev) => {
    ev.returnValue = win?.isMaximized();
  });

  // 加载完成
  ipcMain.on("win-loaded", () => {
    if (loadingWin && !loadingWin.isDestroyed()) loadingWin.close();
    win?.show();
    win?.focus();
  });

  // 最小化
  ipcMain.on("win-min", (ev) => {
    ev.preventDefault();
    win?.minimize();
  });
  // 最大化
  ipcMain.on("win-max", () => {
    win?.maximize();
  });
  // 还原
  ipcMain.on("win-restore", () => {
    win?.restore();
  });
  // 关闭
  ipcMain.on("win-close", (ev) => {
    ev.preventDefault();
    win?.close();
    app.quit();
  });
  // 隐藏
  ipcMain.on("win-hide", () => {
    win?.hide();
  });
  // 显示
  ipcMain.on("win-show", () => {
    win?.show();
  });
  // 重启
  ipcMain.on("win-reload", () => {
    app.quit();
    app.relaunch();
  });

  // 显示进度
  ipcMain.on("set-bar", (_, val: number | "none" | "indeterminate" | "error" | "paused") => {
    switch (val) {
      case "none":
        win?.setProgressBar(-1);
        break;
      case "indeterminate":
        win?.setProgressBar(2, { mode: "indeterminate" });
        break;
      case "error":
        win?.setProgressBar(1, { mode: "error" });
        break;
      case "paused":
        win?.setProgressBar(1, { mode: "paused" });
        break;
      default:
        if (typeof val === "number") {
          win?.setProgressBar(val / 100);
        } else {
          win?.setProgressBar(-1);
        }
        break;
    }
  });

  // 开启控制台
  ipcMain.on("open-dev-tools", () => {
    win?.webContents.openDevTools({
      title: "SPlayer DevTools",
      mode: isDev ? "right" : "detach",
    });
  });

  // 获取系统全部字体
  ipcMain.handle("get-all-fonts", async () => {
    try {
      const fonts = await getFonts();
      return fonts;
    } catch (error) {
      log.error(`❌ Failed to get all system fonts: ${error}`);
      return [];
    }
  });

  // 切换桌面歌词
  ipcMain.on("change-desktop-lyric", (_, val: boolean) => {
    val ? lyricWin?.show() : lyricWin?.hide();
    if (val) lyricWin?.setAlwaysOnTop(true, "screen-saver");
  });

  // 是否阻止系统息屏
  ipcMain.on("prevent-sleep", (_, val: boolean) => {
    if (val) {
      preventId = powerSaveBlocker.start("prevent-display-sleep");
      log.info("⏾ System sleep prevention started");
    } else {
      if (preventId !== null) {
        powerSaveBlocker.stop(preventId);
        log.info("✅ System sleep prevention stopped");
      }
    }
  });

  // 默认文件夹
  ipcMain.handle(
    "get-default-dir",
    (_, type: "documents" | "downloads" | "pictures" | "music" | "videos"): string => {
      return app.getPath(type);
    },
  );

  // 遍历音乐文件
  ipcMain.handle("get-music-files", async (_, dirPath: string) => {
    try {
      // 查找指定目录下的所有音乐文件
      const musicFiles = await fg("**/*.{mp3,wav,flac}", { cwd: dirPath });
      // 解析元信息
      const metadataPromises = musicFiles.map(async (file) => {
        const filePath = join(dirPath, file);
        // 处理元信息
        const { common, format } = await parseFile(filePath);
        // 获取文件大小
        const { size } = await fs.stat(filePath);
        // 判断音质等级
        let quality: string;
        if ((format.sampleRate || 0) >= 96000 || (format.bitsPerSample || 0) > 16) {
          quality = "Hi-Res";
        } else if ((format.sampleRate || 0) >= 44100) {
          quality = "HQ";
        } else {
          quality = "SQ";
        }
        return {
          id: getFileID(filePath),
          name: common.title || basename(filePath),
          artists: common.artists?.[0] || common.artist,
          album: common.album || "",
          alia: common.comment?.[0],
          duration: (format?.duration ?? 0) * 1000,
          size: (size / (1024 * 1024)).toFixed(2),
          path: filePath,
          quality,
        };
      });
      const metadataArray = await Promise.all(metadataPromises);
      return metadataArray;
    } catch (error) {
      log.error("❌ Error fetching music metadata:", error);
      throw error;
    }
  });

  // 获取音乐元信息
  ipcMain.handle("get-music-metadata", async (_, path: string) => {
    try {
      const { common, format } = await parseFile(path);
      return {
        // 文件名称
        fileName: basename(path),
        // 文件大小
        fileSize: (await fs.stat(path)).size / (1024 * 1024),
        // 元信息
        common,
        // 音质信息
        format,
        // md5
        md5: await getFileMD5(path),
      };
    } catch (error) {
      log.error("❌ Error fetching music metadata:", error);
      throw error;
    }
  });

  // 获取音乐歌词
  ipcMain.handle("get-music-lyric", async (_, path: string): Promise<string> => {
    try {
      const { common, native } = await parseFile(path);
      const lyric = common?.lyrics;
      if (lyric && lyric.length > 0) return String(lyric[0]);
      else {
        // 尝试读取 UNSYNCEDLYRICS
        const nativeTags = native["ID3v2.3"] || native["ID3v2.4"];
        const usltTag = nativeTags?.find((tag) => tag.id === "USLT");
        if (usltTag) return String(usltTag.value.text);
        // 如果歌词数据不存在，尝试读取同名的 lrc 文件
        else {
          const lrcFilePath = path.replace(/\.[^.]+$/, ".lrc");
          try {
            await fs.access(lrcFilePath);
            const lrcData = await fs.readFile(lrcFilePath, "utf-8");
            return lrcData || "";
          } catch {
            return "";
          }
        }
      }
    } catch (error) {
      log.error("❌ Error fetching music lyric:", error);
      throw error;
    }
  });

  // 获取音乐封面
  ipcMain.handle(
    "get-music-cover",
    async (_, path: string): Promise<{ data: Buffer; format: string } | null> => {
      try {
        const { common } = await parseFile(path);
        // 获取封面数据
        const picture = common.picture?.[0];
        if (picture) {
          return { data: Buffer.from(picture.data), format: picture.format };
        } else {
          const coverFilePath = path.replace(/\.[^.]+$/, ".jpg");
          try {
            await fs.access(coverFilePath);
            const coverData = await fs.readFile(coverFilePath);
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

  // 删除文件
  ipcMain.handle("delete-file", async (_, path: string) => {
    try {
      // 规范化路径
      const resolvedPath = resolve(path);
      // 检查文件是否存在
      try {
        await fs.access(resolvedPath);
      } catch {
        throw new Error("❌ File not found");
      }
      // 删除文件
      await fs.unlink(resolvedPath);
      return true;
    } catch (error) {
      log.error("❌ File delete error", error);
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
        await fs.access(resolvedPath);
      } catch {
        throw new Error("❌ Folder not found");
      }
      // 打开文件夹
      shell.showItemInFolder(resolvedPath);
    } catch (error) {
      log.error("❌ Folder open error", error);
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
      log.error("❌ Image choose error", error);
      return null;
    }
  });

  // 路径选择窗口
  ipcMain.handle("choose-path", async () => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        title: "选择文件夹",
        defaultPath: app.getPath("downloads"),
        properties: ["openDirectory", "createDirectory"],
        buttonLabel: "选择文件夹",
      });
      if (!filePaths || filePaths.length === 0) return null;
      return filePaths[0];
    } catch (error) {
      log.error("❌ Path choose error", error);
      return null;
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
      log.error("❌ Error setting music metadata:", error);
      throw error;
    }
  });

  // 下载文件
  ipcMain.handle(
    "download-file",
    async (
      _,
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
      } = {
        fileName: "未知文件名",
        fileType: "mp3",
        path: app.getPath("downloads"),
      },
    ): Promise<boolean> => {
      try {
        if (!win) return false;
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
        } = options;
        // 规范化路径
        const downloadPath = resolve(path);
        // 检查文件夹是否存在
        try {
          await fs.access(downloadPath);
        } catch {
          throw new Error("❌ Folder not found");
        }
        // 下载文件
        const songDownload = await download(win, url, {
          directory: downloadPath,
          filename: `${fileName}.${fileType}`,
        });
        if (!downloadMeta || !songData?.cover) return true;
        // 下载封面
        const coverUrl = songData?.coverSize?.l || songData.cover;
        const coverDownload = await download(win, coverUrl, {
          directory: downloadPath,
          filename: `${fileName}.jpg`,
        });
        // 读取歌曲文件
        const songFile = File.createFromPath(songDownload.getSavePath());
        // 生成图片信息
        const songCover = Picture.fromPath(coverDownload.getSavePath());
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
          await fs.writeFile(lrcPath, lyric, "utf-8");
        }
        // 是否删除封面
        if (!saveMetaFile || !downloadCover) await fs.unlink(coverDownload.getSavePath());
        return true;
      } catch (error) {
        log.error("❌ Error downloading file:", error);
        return false;
      }
    },
  );

  // 取消代理
  ipcMain.on("remove-proxy", () => {
    store.set("proxy", "");
    win?.webContents.session.setProxy({ proxyRules: "" });
    log.info("✅ Remove proxy successfully");
  });

  // 配置网络代理
  ipcMain.on("set-proxy", (_, config) => {
    const proxyRules = `${config.protocol}://${config.server}:${config.port}`;
    store.set("proxy", proxyRules);
    win?.webContents.session.setProxy({ proxyRules });
    log.info("✅ Set proxy successfully:", proxyRules);
  });

  // 代理测试
  ipcMain.handle("test-proxy", async (_, config) => {
    const proxyRules = `${config.protocol}://${config.server}:${config.port}`;
    try {
      // 设置代理
      const ses = session.defaultSession;
      await ses.setProxy({ proxyRules });
      // 测试请求
      const request = net.request({ url: "https://www.baidu.com" });
      return new Promise((resolve) => {
        request.on("response", (response) => {
          if (response.statusCode === 200) {
            log.info("✅ Proxy test successful");
            resolve(true);
          } else {
            log.error(`❌ Proxy test failed with status code: ${response.statusCode}`);
            resolve(false);
          }
        });
        request.on("error", (error) => {
          log.error("❌ Error testing proxy:", error);
          resolve(false);
        });
        request.end();
      });
    } catch (error) {
      log.error("❌ Error testing proxy:", error);
      return false;
    }
  });

  // 重置全部设置
  ipcMain.on("reset-setting", () => {
    store.reset();
    log.info("✅ Reset setting successfully");
  });

  // 检查更新
  ipcMain.on("check-update", (_, showTip) => checkUpdate(win!, showTip));

  // 开始下载更新
  ipcMain.on("start-download-update", () => startDownloadUpdate());
};

// lyric
const initLyricIpcMain = (
  lyricWin: BrowserWindow | null,
  mainWin: BrowserWindow | null,
  store: Store<StoreType>,
): void => {
  // 音乐名称更改
  ipcMain.on("play-song-change", (_, title) => {
    if (!title) return;
    lyricWin?.webContents.send("play-song-change", title);
  });

  // 音乐歌词更改
  ipcMain.on("play-lyric-change", (_, lyricData) => {
    if (!lyricData) return;
    lyricWin?.webContents.send("play-lyric-change", lyricData);
  });

  // 获取窗口位置
  ipcMain.handle("get-window-bounds", () => {
    return lyricWin?.getBounds();
  });

  // 获取屏幕尺寸
  ipcMain.handle("get-screen-size", () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    return { width, height };
  });

  // 移动窗口
  ipcMain.on("move-window", (_, x, y, width, height) => {
    lyricWin?.setBounds({ x, y, width, height });
    // 保存配置
    store.set("lyric", { ...store.get("lyric"), x, y, width, height });
    // 保持置顶
    lyricWin?.setAlwaysOnTop(true, "screen-saver");
  });

  // 更新高度
  ipcMain.on("update-window-height", (_, height) => {
    if (!lyricWin) return;
    const { width } = lyricWin.getBounds();
    // 更新窗口高度
    lyricWin.setBounds({ width, height });
  });

  // 获取配置
  ipcMain.handle("get-desktop-lyric-option", () => {
    return store.get("lyric");
  });

  // 保存配置
  ipcMain.on("set-desktop-lyric-option", (_, option, callback: boolean = false) => {
    store.set("lyric", option);
    // 触发窗口更新
    if (callback && lyricWin) {
      lyricWin.webContents.send("desktop-lyric-option-change", option);
    }
    mainWin?.webContents.send("desktop-lyric-option-change", option);
  });

  // 发送主程序事件
  ipcMain.on("send-main-event", (_, name, val) => {
    mainWin?.webContents.send(name, val);
  });

  // 关闭桌面歌词
  ipcMain.on("closeDesktopLyric", () => {
    lyricWin?.hide();
    mainWin?.webContents.send("closeDesktopLyric");
  });

  // 锁定/解锁桌面歌词
  ipcMain.on("toogleDesktopLyricLock", (_, isLock: boolean) => {
    if (!lyricWin) return;
    // 是否穿透
    if (isLock) {
      lyricWin.setIgnoreMouseEvents(true, { forward: true });
    } else {
      lyricWin.setIgnoreMouseEvents(false);
    }
  });
};

// tray
const initTrayIpcMain = (
  tray: MainTray | null,
  win: BrowserWindow | null,
  lyricWin: BrowserWindow | null,
): void => {
  // 音乐播放状态更改
  ipcMain.on("play-status-change", (_, playStatus: boolean) => {
    tray?.setPlayState(playStatus ? "play" : "pause");
    lyricWin?.webContents.send("play-status-change", playStatus);
  });

  // 音乐名称更改
  ipcMain.on("play-song-change", (_, title) => {
    if (!title) return;
    // 更改标题
    win?.setTitle(title);
    tray?.setTitle(title);
    tray?.setPlayName(title);
  });

  // 播放模式切换
  ipcMain.on("play-mode-change", (_, mode) => {
    tray?.setPlayMode(mode);
  });

  // 桌面歌词开关
  ipcMain.on("change-desktop-lyric", (_, val: boolean) => {
    tray?.setDesktopLyricShow(val);
  });

  // 锁定/解锁桌面歌词
  ipcMain.on("toogleDesktopLyricLock", (_, isLock: boolean) => {
    tray?.setDesktopLyricLock(isLock);
  });
};

// thumbar
const initThumbarIpcMain = (thumbar: Thumbar | null): void => {
  if (!thumbar) return;
};

// store
const initStoreIpcMain = (store: Store<StoreType>): void => {
  if (!store) return;
};

// other
const initOtherIpcMain = (mainWin: BrowserWindow | null): void => {
  // 快捷键是否被注册
  ipcMain.handle("is-shortcut-registered", (_, shortcut: string) => isShortcutRegistered(shortcut));

  // 注册快捷键
  ipcMain.handle("register-all-shortcut", (_, allShortcuts: any): string[] | false => {
    if (!mainWin || !allShortcuts) return false;
    // 卸载所有快捷键
    unregisterShortcuts();
    // 注册快捷键
    const failedShortcuts: string[] = [];
    for (const key in allShortcuts) {
      const shortcut = allShortcuts[key].globalShortcut;
      if (!shortcut) continue;
      // 快捷键回调
      const callback = () => mainWin.webContents.send(key);
      const isSuccess = registerShortcut(shortcut, callback);
      if (!isSuccess) failedShortcuts.push(shortcut);
    }
    return failedShortcuts;
  });

  // 卸载所有快捷键
  ipcMain.on("unregister-all-shortcut", () => unregisterShortcuts());
};

export default initIpcMain;
