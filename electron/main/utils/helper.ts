import { createHash } from "crypto";
import { readFile } from "fs/promises";

/**
 * 生成文件唯一ID
 * @param filePath 文件路径
 * @returns 唯一ID
 */
export const getFileID = (filePath: string): number => {
  // SHA-256
  const hash = createHash("sha256");
  hash.update(filePath);
  const digest = hash.digest("hex");
  // 将哈希值的前 16 位转换为十进制数字
  const uniqueId = parseInt(digest.substring(0, 16), 16);
  return Number(uniqueId.toString().padStart(16, "0"));
};

/**
 * 生成文件 MD5
 * @param path 文件路径
 * @returns MD5值
 */
export const getFileMD5 = async (path: string): Promise<string> => {
  const data = await readFile(path);
  const hash = createHash("md5");
  hash.update(data);
  return hash.digest("hex");
};

/**
 * 将 music-metadata 库中的歌词数组转换为LRC格式字符串
 * @param lyrics 歌词数组，每个元素包含时间戳（毫秒）和歌词文本
 * @returns LRC格式的字符串
 */
export const metaDataLyricsArrayToLrc = (
  lyrics: {
    text: string;
    timestamp?: number;
  }[],
): string => {
  return lyrics
    .map(({ timestamp, text }) => {
      if (!timestamp) return "";
      const totalSeconds = Math.floor(timestamp / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const centiseconds = Math.floor((timestamp % 1000) / 10);

      // 格式化为两位数字
      const mm = String(minutes).padStart(2, "0");
      const ss = String(seconds).padStart(2, "0");
      const cs = String(centiseconds).padStart(2, "0");

      return `[${mm}:${ss}.${cs}]${text}`;
    })
    .join("\n");
};

/**
 * 数组分块
 * @param array 数组
 * @param size 每块大小
 */
export function* chunkArray<T>(array: T[], size: number): Generator<T[], void, unknown> {
  for (let i = 0; i < array.length; i += size) {
    yield array.slice(i, i + size);
  }
}
