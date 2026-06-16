import { writeFlacMetadata } from "./FlacMetadataWriter";

interface WriteMetadataOptions {
  title?: string;
  artists?: string[];
  album?: string;
  lyric?: string;
  coverBuffer?: ArrayBuffer;
  albumArtist?: string;
}

/**
 * 在内存中为音频 Buffer 嵌入元数据（支持 MP3 和 FLAC）并返回对应的 Blob
 * @param songBuffer 原始音频二进制流
 * @param fileType 音频格式后缀名（如 "mp3", "flac"）
 * @param options 元数据配置（标题、歌手列表、专辑、歌词、封面及专辑歌手等）
 */
export async function injectAudioMetadata(
  songBuffer: ArrayBuffer,
  fileType: string,
  options: WriteMetadataOptions
): Promise<Blob> {
  const fileTypeLower = fileType.toLowerCase();

  if (fileTypeLower === "mp3") {
    const { ID3Writer } = await import("browser-id3-writer");
    const writer = new ID3Writer(songBuffer);

    if (options.title) {
      writer.setFrame("TIT2", options.title);
    }
    if (options.artists && options.artists.length > 0) {
      writer.setFrame("TPE1", options.artists);
    }
    if (options.album) {
      writer.setFrame("TALB", options.album);
    }
    if (options.albumArtist) {
      writer.setFrame("TPE2", options.albumArtist);
    }

    // 设置歌词
    if (options.lyric) {
      writer.setFrame("USLT", {
        description: "",
        lyrics: options.lyric,
        language: "eng",
      });
    }

    // 设置封面图片
    if (options.coverBuffer) {
      writer.setFrame("APIC", {
        type: 3,
        data: options.coverBuffer,
        description: "Cover",
        useUnicodeEncoding: true,
      });
    }

    writer.addTag();
    return writer.getBlob();
  } else if (fileTypeLower === "flac") {
    const modifiedBytes = writeFlacMetadata(songBuffer, {
      title: options.title,
      artists: options.artists,
      album: options.album,
      lyric: options.lyric,
      coverBuffer: options.coverBuffer,
      albumArtist: options.albumArtist,
    });
    // 使用 any 避开严格 TS DOM 环境下的 BlobPart 兼容性限制
    return new Blob([modifiedBytes as any], { type: "audio/flac" });
  }

  // 兜底格式直接返回原 Buffer 包装的 Blob
  return new Blob([songBuffer]);
}
