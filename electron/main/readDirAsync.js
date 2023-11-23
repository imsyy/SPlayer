import { parseFile } from "music-metadata";
import fs from "fs/promises";
import path from "path";

/**
 * 从指定文件夹中递归读取音乐文件，并将它们以数组形式返回
 * @param {string} directoryPath - 要读取的文件夹路径
 * @param {number} fileLimit - 返回的音乐文件数量限制
 * @returns {Array} - 包含音乐文件信息的数组
 */
export const readDirAsync = async (directoryPath, fileLimit = 5000) => {
  const result = [];
  // 递归读取文件夹中的项目
  const readItem = async (item) => {
    const itemPath = path.join(directoryPath, item);
    const stats = await fs.stat(itemPath);
    // 若为音频文件
    if (stats.isFile() && isAudioFile(itemPath)) {
      try {
        const { common, format } = await parseFile(itemPath);
        // 音乐文件信息
        const fileInfo = {
          id: generateId(itemPath),
          name: common.title,
          path: itemPath,
          size: (stats.size / (1024 * 1024)).toFixed(2),
          time: stats.mtime?.getTime(),
          artists: common.artists?.[0],
          album: common.album,
          alia: common.comment?.[0],
          duration: formatDuration(format.duration),
        };
        result.push(fileInfo);
      } catch (error) {
        console.error("解析音乐文件元数据时出错：", error);
      }
    }
    // 若为文件夹
    if (stats.isDirectory()) {
      // 读取子文件夹中的项目
      const subItems = await fs.readdir(itemPath);
      for (const subItem of subItems) {
        await readItem(path.join(item, subItem));
      }
    }
  };
  // 从根目录开始读取
  await readItem("");
  // 返回不超过上限的音乐文件列表
  return result.slice(0, fileLimit);
};

/**
 * 递归地读取文件夹内容，包括文件和子文件夹的信息
 * @param {string} directoryPath - 要读取的文件夹路径
 * @param {number} depth - 递归深度（默认为 -1，无限递归）
 * @param {number} fileLimit - 文件总数
 * @returns {Promise<Array>} 包含文件和子文件夹信息的树形数组
 */
export const readDirTreeAsync = async (directoryPath, depth = -1, fileLimit = 5000) => {
  const result = [];

  const readItem = async (item) => {
    const itemPath = path.join(directoryPath, item);
    const stats = await fs.stat(itemPath);

    const fileInfo = {
      id: generateId(item),
      name: item,
      path: itemPath,
      type: stats.isFile() ? "song" : "dir",
      size: (stats.size / (1024 * 1024)).toFixed(2), // 文件大小
      modified: stats.mtime, // 修改日期
    };

    if (stats.isFile() && isAudioFile(itemPath)) {
      try {
        const { common, format } = await parseFile(itemPath);
        fileInfo.metadata = {
          name: common.title,
          artists: common.artists,
          album: common.album,
          date: common.date,
          alia: common.comment?.[0],
          year: common.year,
          duration: formatDuration(format.duration),
        };
      } catch (error) {
        console.error("解析音乐文件元数据时出错：", error);
      }
    }

    if (stats.isDirectory() && (depth === -1 || depth > 0)) {
      // 如果是文件夹且未达到递归深度限制，且文件数量未达到上限，则递归读取文件夹内容
      if (fileInfo.type === "dir" && result.length < fileLimit) {
        fileInfo.children = await readDirAsync(
          itemPath,
          depth === -1 ? -1 : depth - 1,
          fileLimit - result.length,
        );
      }
    }

    result.push(fileInfo);
  };

  const items = await fs.readdir(directoryPath);
  await Promise.all(items.map(readItem));

  return result.slice(0, fileLimit); // 返回不超过上限的文件列表
};

/**
 * 歌曲时长时间戳转换
 * @param {number} mss 毫秒数
 * @returns {string} 格式为 "mm:ss" 的字符串
 */
const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const formattedSeconds = remainingSeconds < 10 ? `0${remainingSeconds}` : `${remainingSeconds}`;
  return `${formattedMinutes}:${formattedSeconds}`;
};

/**
 * 判断文件是否为音频文件
 * @param {string} filePath - 文件路径
 * @returns {boolean} - 是否为音频文件
 */
const isAudioFile = (filePath) => {
  const audioExtensions = [".flac", ".mp3"];
  const extension = path.extname(filePath).toLowerCase();
  return audioExtensions.includes(extension);
};

/**
 * 从文件名生成数字 ID
 * @param {string} fileName - 文件名
 * @returns {number} - 生成的数字ID
 */
const generateId = (fileName) => {
  // 将文件名转换为哈希值
  let hash = 0;
  for (let i = 0; i < fileName.length; i++) {
    hash = (hash << 5) - hash + fileName.charCodeAt(i);
  }
  // 将哈希值转换为正整数
  const numericId = Math.abs(hash % 10000000000);
  return numericId;
};
