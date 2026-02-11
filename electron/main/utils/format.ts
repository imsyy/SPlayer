import { type MusicTrack } from "../database/LocalMusicDB";
import { join } from "path";

/**
 * 获取艺术家名称
 * @param artists 艺术家数组
 * @returns 艺术家名称数组
 */
export const getArtistNames = (artists: any): string[] => {
  if (Array.isArray(artists)) {
    return artists
      .map((ar: any) => (typeof ar === "string" ? ar : ar?.name || ""))
      .filter((name) => name && name.trim().length > 0);
  }
  if (typeof artists === "string" && artists.trim().length > 0) {
    return [artists];
  }
  return [];
};

/**
 * 处理音乐列表
 * @param tracks 音乐列表
 * @param coverDir 封面目录
 * @returns 处理后的音乐列表
 */
export const processMusicList = (tracks: MusicTrack[], coverDir: string) => {
  return tracks.map((track) => {
    let cover: string | undefined;
    if (track.cover) {
      const fullPath = join(coverDir, track.cover);
      cover = `file://${fullPath.replace(/\\/g, "/")}`;
    }
    return {
      ...track,
      name: track.title,
      cover,
      // 码率映射到 quality 字段
      quality: track.bitrate ?? 0,
    };
  });
};
