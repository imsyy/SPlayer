import { createHash } from "crypto";
import { readFile } from "fs/promises";
import iconv from "iconv-lite";

/**
 * 检测字符串是否包含高位 Latin-1 字符（0x80-0xFF）
 * 这是 Shift_JIS 被错误解析为 ISO-8859-1 后的特征
 */
const hasHighLatin1Chars = (text: string): boolean => {
  if (!text) return false;
  let highAsciiCount = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x80 && code <= 0xff) {
      highAsciiCount++;
    }
  }
  return highAsciiCount > 0 && highAsciiCount / text.length > 0.2;
};

/**
 * 检测字符串是否包含日文乱码特征字符
 * 当 Shift_JIS 内容被错误解析时，会产生一些特定的罕见 CJK 字符
 * 例如：僆、僕、僫、儖、僒、僂、儞、僪、儔、儅 等
 */
const hasJapaneseMojibakeChars = (text: string): boolean => {
  if (!text) return false;
  // 这些字符范围在正常日文/中文文本中非常罕见
  // 但在 Shift_JIS 被错误解析时经常出现
  // 范围：U+50xx (僂僆僊僔僕僗僚僛僜僞僟僠僡僢僣僤僥僦僧僨僩僪僫僬僭僮僯僰僱僲僳僴僵僶僷僸價僺僻僼僽僾僿)
  // 范围：U+51xx (儀儁儂儃億儅儆儇儈儉儊儋儌儍儎儏儐儑儒儓儔儕儖儗儘儙儚儛儜儝儞償儠儡儢儣儤儥儦儧儨儩優儫儬儭儮儯)
  let suspiciousCount = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // 僂-僿 (U+5002 - U+503F) 和 儀-儯 (U+5100 - U+516F) 这些字符很少在正常文本中使用
    if ((code >= 0x5002 && code <= 0x503f) || (code >= 0x5100 && code <= 0x516f)) {
      suspiciousCount++;
    }
    // 乕乗乚乛乢乣乤乥乧乨乩乪乫乬乭乮乯 等也是乱码特征
    if (code >= 0x4e55 && code <= 0x4e6f) {
      suspiciousCount++;
    }
  }
  // 如果有超过 20% 的字符是这类可疑字符，很可能是乱码
  return suspiciousCount > 0 && suspiciousCount / text.length > 0.15;
};

/**
 * 检测解码后的文本是否合理（包含常见日文字符）
 */
const isValidDecodedJapanese = (text: string): boolean => {
  if (!text) return false;
  let validCount = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // 平假名 (U+3040 - U+309F)
    if (code >= 0x3040 && code <= 0x309f) validCount++;
    // 片假名 (U+30A0 - U+30FF)
    else if (code >= 0x30a0 && code <= 0x30ff) validCount++;
    // 常用汉字 (U+4E00 - U+9FFF) - 但需要是常见汉字
    else if (code >= 0x4e00 && code <= 0x9fff) validCount++;
    // ASCII (0x20 - 0x7E)
    else if (code >= 0x20 && code <= 0x7e) validCount++;
    // 全角字符
    else if (code >= 0xff00 && code <= 0xffef) validCount++;
  }
  return validCount / text.length > 0.8;
};

/**
 * 尝试将可能被错误解析的 Shift_JIS 文本修复为正确的 UTF-8
 * @param text 可能包含乱码的文本
 * @returns 修复后的文本
 */
export const tryDecodeShiftJIS = (text: string): string => {
  if (!text) return text;

  // 检测是否需要解码
  const needsDecode = hasHighLatin1Chars(text) || hasJapaneseMojibakeChars(text);
  if (!needsDecode) {
    return text;
  }

  // 解码策略列表
  const strategies: { from: BufferEncoding; to: string }[] = [
    { from: "latin1", to: "Shift_JIS" },
    { from: "utf8", to: "Shift_JIS" }, // 某些工具会错误地将 Shift_JIS 当作 UTF-8 解码
    { from: "latin1", to: "CP932" }, // Windows 日文扩展
  ];

  for (const { from, to } of strategies) {
    try {
      const buffer = Buffer.from(text, from);
      const decoded = iconv.decode(buffer, to);
      if (isValidDecodedJapanese(decoded) && !hasJapaneseMojibakeChars(decoded)) {
        return decoded;
      }
    } catch {
      // 解码失败，尝试下一种方案
    }
  }

  return text;
};

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
