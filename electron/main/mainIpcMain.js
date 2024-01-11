import { ipcMain, dialog, app, clipboard, shell } from "electron";
import { File, Picture, Id3v2Settings } from "node-taglib-sharp";
import { readDirAsync } from "@main/utils/readDirAsync";
import { parseFile } from "music-metadata";
import { download } from "electron-dl";
import getNeteaseMusicUrl from "@main/utils/getNeteaseMusicUrl";
import axios from "axios";
import fs from "fs/promises";

/**
 * 监听主进程的 IPC 事件
 * @param {BrowserWindow} win - 要监听 IPC 事件的程序窗口
 */

const mainIpcMain = (win) => {
  // 窗口操作部分
  ipcMain.on("window-min", (ev) => {
    // 阻止最小化
    ev.preventDefault();
    // 最小化
    win.minimize();
  });
  ipcMain.on("window-maxOrRestore", (ev) => {
    const winSizeState = win.isMaximized();
    winSizeState ? win.restore() : win.maximize();
    ev.reply("windowState", win.isMaximized());
  });
  ipcMain.on("window-restore", () => {
    win.restore();
  });
  ipcMain.on("window-hide", () => {
    win.hide();
  });
  ipcMain.on("window-close", () => {
    win.close();
    app.isQuiting = true;
    app.quit();
  });
  ipcMain.on("window-relaunch", () => {
    app.isQuiting = true;
    app.relaunch();
    app.quit();
  });

  // 显示进度
  ipcMain.on("setProgressBar", (_, val) => {
    if (val === "close") {
      win.setProgressBar(-1);
      return false;
    }
    win.setProgressBar(val / 100);
  });

  // 解灰
  ipcMain.handle("getMusicNumUrl", async (_, data) => {
    // 解析传入数据
    const songData = JSON.parse(data);
    const songName = `${songData?.name}-${songData?.artists?.[0].name}`;
    console.log("开始解灰：", songName);
    const url = await getNeteaseMusicUrl(songName);
    console.log("解灰地址：", url);
    return url;
  });

  // bili 链接解析
  ipcMain.handle("getBiliUrlData", async (_, url) => {
    const data = await getBiliUrlBase64(url);
    return data;
  });

  // 默认音乐文件夹
  ipcMain.handle("getdefaultMusicPath", async () => {
    const path = app.getPath("music");
    return path;
  });

  // 选择文件夹
  ipcMain.handle("selectDir", async (_, isChooseDl = false) => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: isChooseDl ? "选择下载目录" : "选择添加目录",
        defaultPath: isChooseDl ? app.getPath("downloads") : app.getPath("music"),
        properties: ["openDirectory", "createDirectory"],
        buttonLabel: "选择文件夹",
      });
      if (!canceled) {
        const selectedDirectory = filePaths[0];
        return selectedDirectory;
      }
    } catch (err) {
      console.error("选择文件夹时发生错误：", err);
      throw err;
    }
  });

  // 读取文件夹内容
  ipcMain.handle("getDirContents", async (_, selectedDir) => {
    try {
      // 使用 readDirAsync 函数递归地读取文件夹内容
      const directoryContents = await readDirAsync(selectedDir);
      return directoryContents;
    } catch (err) {
      console.error("读取文件夹内容时发生错误：", err);
      throw err;
    }
  });

  // 读取音乐歌词
  ipcMain.handle("getMusicLyric", async (_, path) => {
    try {
      const data = await parseFile(path);
      const lyric = data.common.lyrics;
      if (lyric && lyric.length > 0) {
        return lyric[0];
      }
      // 如果歌词数据不存在，尝试读取同名的 lrc 文件
      else {
        const lrcFilePath = path.replace(/\.[^.]+$/, ".lrc");
        const lrcData = await fs.readFile(lrcFilePath, "utf-8");
        // 返回读取的 lrc 数据，如果没有则返回 null
        return lrcData || null;
      }
    } catch (error) {
      console.error("读取音乐歌词出错：", error);
      return null;
    }
  });

  // 读取音乐封面
  ipcMain.handle("getMusicCover", async (_, path) => {
    try {
      const data = await parseFile(path);
      const picture = data.common.picture;
      if (picture && picture.length > 0) {
        const coverData = picture[0].data;
        const coverFormat = picture[0].format;
        return { coverData, coverFormat };
      }
      // 如果封面数据不存在，尝试读取同名的封面图片文件
      else {
        const coverFilePath = path.replace(/\.[^.]+$/, ".jpg");
        const coverData = await fs.readFile(coverFilePath);
        // 返回读取的封面图片数据，如果没有则返回 null
        return coverData ? { coverData, coverFormat: "jpg" } : null;
      }
    } catch (error) {
      console.error("读取音乐封面出错：", error);
      return null;
    }
  });

  // 执行复制操作
  ipcMain.handle("copyData", async (_, data) => {
    try {
      clipboard.writeText(data);
      return true;
    } catch (error) {
      console.error("复制操作出错：", error);
      return false;
    }
  });

  // 本地磁盘文件删除
  ipcMain.handle("deleteFile", async (_, path) => {
    try {
      // 检查文件是否存在
      if (fs.access(path)) {
        // 尝试删除文件
        fs.unlink(path);
        console.log(`文件已删除：${path}`);
        return true;
      } else {
        console.log(`文件不存在：${path}`);
        return false;
      }
    } catch (err) {
      console.error(`文件删除操作出错：${path}`, err);
      return false;
    }
  });

  // 打开歌曲目录
  ipcMain.on("openSongLocal", (_, path) => {
    try {
      if (fs.access(path)) {
        shell.showItemInFolder(path);
      } else {
        console.log(`文件不存在：${path}`);
      }
    } catch (error) {
      console.error("打开歌曲目录时出错：", error);
    }
  });

  // 下载文件至指定目录
  ipcMain.handle("downloadFile", async (_, songData, options) => {
    try {
      const { url, data, lyric, name, type } = JSON.parse(songData);
      const { path, downloadMeta, downloadCover, downloadLyrics } = JSON.parse(options);
      if (fs.access(path)) {
        console.info("开始下载：", name, url);
        // 下载歌曲
        const songDownload = await download(win, url, {
          directory: path,
          filename: `${name}.${type}`,
        });
        // 若关闭，则不进行元信息写入
        if (!downloadMeta) return true;
        // 下载封面
        const coverDownload = await download(win, data.cover, {
          directory: path,
          filename: `${name}.jpg`,
        });
        // 读取歌曲文件
        const songFile = File.createFromPath(songDownload.getSavePath());
        // 生成图片信息
        const songCover = Picture.fromPath(coverDownload.getSavePath());
        // 保存修改后的元数据
        Id3v2Settings.forceDefaultVersion = true;
        Id3v2Settings.defaultVersion = 3;
        songFile.tag.title = data.name || "未知曲目";
        songFile.tag.album = data.album?.name || "未知专辑";
        songFile.tag.performers = data?.artists?.map((ar) => ar.name) || ["未知艺术家"];
        if (downloadLyrics) songFile.tag.lyrics = lyric;
        if (downloadCover) songFile.tag.pictures = [songCover];
        // 保存元信息
        songFile.save();
        songFile.dispose();
        // 删除封面
        await fs.unlink(coverDownload.getSavePath());
        return true;
      } else {
        console.log(`目录不存在：${path}`);
        return false;
      }
    } catch (error) {
      console.error("下载文件时出错：", error);
      return false;
    }
  });
};

/**
 * 从 Bilibili 视频中获取文件的 Base64 数据
 *
 * @param {string} url - 要获取的文件的 URL
 * @returns {Promise<string>} - 文件的 Base64 数据
 */
const getBiliUrlBase64 = async (url) => {
  try {
    const response = await axios.get(url, {
      headers: {
        Referer: "https://www.bilibili.com/",
        "User-Agent": "okhttp/3.4.1",
      },
      responseType: "arraybuffer",
      withCredentials: false,
    });
    // 将二进制数据转换为缓冲区
    const buffer = toBuffer(response.data);
    // 将缓冲区中的数据转换为 Base64 编码的字符串
    const encodedData = buffer.toString("base64");
    // 返回 Base64 编码的文件数据
    return encodedData;
  } catch (error) {
    console.error("获取文件数据时发生错误：" + error);
    return null;
  }
};

/**
 * 将数据转换为缓冲区（ Buffer ）
 *
 * @param {ArrayBuffer|Buffer|Uint8Array} data - 要转换的数据
 * @returns {Buffer} - 转换后的缓冲区
 */
const toBuffer = (data) => {
  if (data instanceof Buffer) {
    return data;
  } else {
    return Buffer.from(data);
  }
};

export default mainIpcMain;
