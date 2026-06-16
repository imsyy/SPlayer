/**
 * 辅助写入 32 位大端无符号整数 (Big-Endian)
 */
function writeUInt32BE(target: Uint8Array, offset: number, value: number) {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

/**
 * 辅助写入 32 位小端无符号整数 (Little-Endian)
 */
function writeUInt32LE(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

/**
 * 辅助写入 24 位大端无符号整数 (Big-Endian)
 */
function writeUInt24BE(target: Uint8Array, offset: number, value: number) {
  target[offset] = (value >>> 16) & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = value & 0xff;
}

/**
 * 自动分析图片前几个字节以返回对应的 MIME 类型
 */
function getMimeType(bytes: Uint8Array): string {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return "image/jpeg";
  }
  if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  return "image/jpeg"; // 默认 jpeg
}

interface FlacMetadata {
  title?: string;
  artists?: string[];
  album?: string;
  lyric?: string;
  coverBuffer?: ArrayBuffer;
  albumArtist?: string;
}


/**
 * 在内存中为 FLAC 二进制 Buffer 注入元数据
 * @param songBuffer 原始音频二进制流
 * @param metadata 标题、歌手、专辑、歌词及封面图等元数据
 */
export function writeFlacMetadata(songBuffer: ArrayBuffer, metadata: FlacMetadata): Uint8Array {
  const bytes = new Uint8Array(songBuffer);
  if (
    bytes.length < 4 ||
    bytes[0] !== 102 ||
    bytes[1] !== 76 ||
    bytes[2] !== 97 ||
    bytes[3] !== 67
  ) {
    // "fLaC"
    throw new Error("不是合法的 FLAC 文件");
  }

  // 1. 解析原有的元数据块
  let offset = 4;
  let isLast = false;
  const preservedBlocks: { type: number; data: Uint8Array }[] = [];

  while (!isLast) {
    if (offset + 4 > bytes.length) break;
    const headerByte = bytes[offset++];
    isLast = (headerByte & 0x80) !== 0;
    const blockType = headerByte & 0x7f;
    const blockLength = (bytes[offset] << 16) | (bytes[offset + 1] << 8) | bytes[offset + 2];
    offset += 3;

    if (offset + blockLength > bytes.length) break;
    const blockData = bytes.slice(offset, offset + blockLength);
    offset += blockLength;

    // 过滤掉原有的 VORBIS_COMMENT(4)、PICTURE(6) 和 PADDING(1) 块
    if (blockType !== 4 && blockType !== 6 && blockType !== 1) {
      preservedBlocks.push({ type: blockType, data: blockData });
    }
  }

  const audioFrames = bytes.slice(offset);

  // 2. 构建新的 VORBIS_COMMENT 块
  const encoder = new TextEncoder();
  const vendorString = "reference libFLAC 1.3.0";
  const vendorBytes = encoder.encode(vendorString);

  // 整理要写入的 Comments
  const comments: string[] = [];
  if (metadata.title) comments.push(`TITLE=${metadata.title}`);
  if (metadata.artists && metadata.artists.length > 0) {
    for (const artist of metadata.artists) {
      comments.push(`ARTIST=${artist}`);
    }
  }
  if (metadata.album) comments.push(`ALBUM=${metadata.album}`);
  if (metadata.albumArtist) comments.push(`ALBUMARTIST=${metadata.albumArtist}`);
  if (metadata.lyric) comments.push(`LYRICS=${metadata.lyric}`);

  // 计算 VORBIS_COMMENT 内容的大小并写入
  const commentBytesList = comments.map((c) => encoder.encode(c));
  const vorbisContentSize =
    4 + vendorBytes.length + 4 + commentBytesList.reduce((acc, c) => acc + 4 + c.length, 0);
  const vorbisBlockData = new Uint8Array(vorbisContentSize);

  let vOffset = 0;
  writeUInt32LE(vorbisBlockData, vOffset, vendorBytes.length);
  vOffset += 4;
  vorbisBlockData.set(vendorBytes, vOffset);
  vOffset += vendorBytes.length;

  writeUInt32LE(vorbisBlockData, vOffset, comments.length);
  vOffset += 4;

  for (const cBytes of commentBytesList) {
    writeUInt32LE(vorbisBlockData, vOffset, cBytes.length);
    vOffset += 4;
    vorbisBlockData.set(cBytes, vOffset);
    vOffset += cBytes.length;
  }

  // 3. 构建新的 PICTURE 块
  let pictureBlockData: Uint8Array | null = null;
  if (metadata.coverBuffer && metadata.coverBuffer.byteLength > 0) {
    const coverBytes = new Uint8Array(metadata.coverBuffer);
    const mimeString = getMimeType(coverBytes);
    const mimeBytes = encoder.encode(mimeString);
    const descString = "Cover";
    const descBytes = encoder.encode(descString);

    const pictureContentSize =
      4 +
      4 +
      mimeBytes.length +
      4 +
      descBytes.length +
      4 +
      4 +
      4 +
      4 +
      4 +
      coverBytes.length;
    pictureBlockData = new Uint8Array(pictureContentSize);

    let pOffset = 0;
    // Picture type: 3 (Front Cover)
    writeUInt32BE(pictureBlockData, pOffset, 3);
    pOffset += 4;
    // Mime length
    writeUInt32BE(pictureBlockData, pOffset, mimeBytes.length);
    pOffset += 4;
    // Mime string
    pictureBlockData.set(mimeBytes, pOffset);
    pOffset += mimeBytes.length;
    // Description length
    writeUInt32BE(pictureBlockData, pOffset, descBytes.length);
    pOffset += 4;
    // Description string
    pictureBlockData.set(descBytes, pOffset);
    pOffset += descBytes.length;
    // Width, Height (直接填0)
    writeUInt32BE(pictureBlockData, pOffset, 0);
    pOffset += 4;
    writeUInt32BE(pictureBlockData, pOffset, 0);
    pOffset += 4;
    // Color depth (色深，通常为24)
    writeUInt32BE(pictureBlockData, pOffset, 24);
    pOffset += 4;
    // Colors
    writeUInt32BE(pictureBlockData, pOffset, 0);
    pOffset += 4;
    // Data length
    writeUInt32BE(pictureBlockData, pOffset, coverBytes.length);
    pOffset += 4;
    // Data
    pictureBlockData.set(coverBytes, pOffset);
  }

  // 4. 构建 PADDING 块 (预留 4096 字节)
  const paddingBlockData = new Uint8Array(4096);

  // 5. 组合最终的所有元数据块
  const finalBlocks: { type: number; data: Uint8Array }[] = [];
  // 保留的原有块
  finalBlocks.push(...preservedBlocks);
  // 新的 VORBIS_COMMENT
  finalBlocks.push({ type: 4, data: vorbisBlockData });
  // 新的 PICTURE
  if (pictureBlockData) {
    finalBlocks.push({ type: 6, data: pictureBlockData });
  }
  // 填充 Padding 块
  finalBlocks.push({ type: 1, data: paddingBlockData });

  // 6. 重新打包，输出整体二进制数据
  let totalMetadataSize = 4 + finalBlocks.length * 4;
  for (const block of finalBlocks) {
    totalMetadataSize += block.data.length;
  }
  const totalSize = totalMetadataSize + audioFrames.length;
  const result = new Uint8Array(totalSize);

  // 写入 "fLaC" 标志
  result[0] = 102; // 'f'
  result[1] = 76; // 'L'
  result[2] = 97; // 'a'
  result[3] = 67; // 'C'

  let writeOffset = 4;
  for (let i = 0; i < finalBlocks.length; i++) {
    const block = finalBlocks[i];
    const isLastBlock = i === finalBlocks.length - 1;

    // Header 字节 1: 1位 isLast + 7位 blockType
    let typeByte = block.type & 0x7f;
    if (isLastBlock) {
      typeByte |= 0x80;
    }
    result[writeOffset++] = typeByte;

    // Header 字节 2-4: 24位长度
    writeUInt24BE(result, writeOffset, block.data.length);
    writeOffset += 3;

    // 块数据
    result.set(block.data, writeOffset);
    writeOffset += block.data.length;
  }

  // 写入音频帧
  result.set(audioFrames, writeOffset);

  return result;
}
