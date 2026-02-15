import { inflateRawSync, inflateSync, unzipSync } from "zlib";
import { qrcDecrypt } from "./tripledes";

/**
 * QRC 解密密钥 - 24字节
 * 来源: LDDC 项目
 */
const QRC_KEY = new Uint8Array(Buffer.from("!@#)(*$%123ZXC!@!@#)(NHL", "utf8"));

/**
 * 解密 QRC 歌词（云端版本）
 * 使用 LDDC 的 Triple DES 实现 + Zlib 解压
 *
 * @param encryptedQrc - 十六进制编码的加密歌词字符串
 * @returns 解密后的歌词文本
 */
export function decryptQrc(encryptedQrc: string): string {
  if (!encryptedQrc || encryptedQrc.trim() === "") {
    throw new Error("没有可解密的数据");
  }

  // 1. Hex 转 Uint8Array
  const encryptedBuffer = Buffer.from(encryptedQrc, "hex");
  const encryptedData = new Uint8Array(encryptedBuffer);

  // 2. Triple DES 解密
  const decrypted = qrcDecrypt(encryptedData, QRC_KEY);
  const decryptedBuffer = Buffer.from(decrypted);

  // 3. Zlib 解压 - 尝试多种格式
  let decompressed: Buffer;

  // 尝试 1: zlib inflate (带 zlib header)
  try {
    decompressed = inflateSync(decryptedBuffer);
    return decompressed.toString("utf8");
  } catch {
    // zlib inflate 失败，尝试其他格式
  }

  // 尝试 2: raw inflate (无 header)
  try {
    decompressed = inflateRawSync(decryptedBuffer);
    return decompressed.toString("utf8");
  } catch {
    // raw inflate 失败，尝试其他格式
  }

  // 尝试 3: gzip unzip
  try {
    decompressed = unzipSync(decryptedBuffer);
    return decompressed.toString("utf8");
  } catch {
    // gzip unzip 失败，尝试其他格式
  }

  // 尝试 4: 可能数据本身就不是压缩的
  const str = decryptedBuffer.toString("utf8");
  if (str.includes("[") || str.includes("<")) {
    return str;
  }

  throw new Error("无法解压数据");
}
