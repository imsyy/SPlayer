/**
 * Subsonic API 客户端
 * 适用于 Navidrome、OpenSubsonic 和其他兼容 Subsonic API 的服务器
 */

import { SongType, QualityType } from "@/types/main";
import type {
  StreamingServerConfig,
  SubsonicResponse,
  SubsonicArtist,
  SubsonicArtistIndex,
  SubsonicAlbum,
  SubsonicSong,
  SubsonicPlaylist,
  StreamingAlbumType,
  StreamingArtistType,
  StreamingPlaylistType,
} from "@/types/streaming";
import md5 from "md5";

/**
 * 生成随机盐值
 */
const generateSalt = (): string => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let salt = "";
  for (let i = 0; i < 12; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
};

/**
 * 生成 Subsonic API 认证参数
 */
const getAuthParams = (config: StreamingServerConfig): URLSearchParams => {
  const salt = generateSalt();
  const token = md5(config.password + salt);

  return new URLSearchParams({
    u: config.username,
    t: token,
    s: salt,
    v: "1.16.1",
    c: "SPlayer",
    f: "json",
  });
};

/**
 * 构建 API URL
 */
const buildUrl = (
  config: StreamingServerConfig,
  endpoint: string,
  params?: Record<string, string>,
): string => {
  const baseUrl = config.url.endsWith("/") ? config.url.slice(0, -1) : config.url;
  const authParams = getAuthParams(config);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      authParams.set(key, value);
    });
  }

  return `${baseUrl}/rest/${endpoint}?${authParams.toString()}`;
};

/**
 * 发送 API 请求
 */
const request = async <T>(
  config: StreamingServerConfig,
  endpoint: string,
  params?: Record<string, string>,
): Promise<T> => {
  const url = buildUrl(config, endpoint, params);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: SubsonicResponse<T> = await response.json();

  if (data["subsonic-response"].status === "failed") {
    const error = data["subsonic-response"].error;
    throw new Error(error?.message || "Subsonic API error");
  }

  return data["subsonic-response"] as T;
};

/**
 * 生成封面 URL
 */
export const getCoverArtUrl = (
  config: StreamingServerConfig,
  coverArtId?: string,
  size?: number,
): string => {
  if (!coverArtId) return "";
  const params: Record<string, string> = { id: coverArtId };
  if (size) params.size = size.toString();
  return buildUrl(config, "getCoverArt", params);
};

/**
 * 生成流媒体 URL
 */
export const getStreamUrl = (config: StreamingServerConfig, songId: string): string => {
  return buildUrl(config, "stream", { id: songId });
};

/**
 * 将字符串 ID 转换为数字 ID
 * 流媒体 ID 以 1002 开头
 */
const stringToNumericId = (id: string): number => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Number(`1002${Math.abs(hash)}`);
};

/**
 * 根据音频参数推断音质等级
 */
const inferQuality = (song: SubsonicSong): QualityType => {
  const { suffix, bitRate, samplingRate, bitDepth } = song;

  // Hi-Res: 采样率 >= 96kHz 且位深度 >= 24bit
  if (samplingRate && samplingRate >= 96000 && bitDepth && bitDepth >= 24) {
    return QualityType.HiRes;
  }

  // 无损格式：FLAC、APE、WAV、ALAC 等
  const losslessFormats = ["flac", "ape", "wav", "aiff", "alac", "dsd", "dsf", "dff"];
  if (suffix && losslessFormats.includes(suffix.toLowerCase())) {
    return QualityType.SQ;
  }

  // 16bit 及以上位深度视为无损
  if (bitDepth && bitDepth >= 16) {
    return QualityType.SQ;
  }

  // 根据比特率判断有损格式的音质
  if (bitRate) {
    if (bitRate >= 320) return QualityType.HQ;
    if (bitRate >= 192) return QualityType.MQ;
  }

  return QualityType.LQ;
};

/**
 * 获取歌词 (Legacy)
 */
export const getLyrics = async (
  config: StreamingServerConfig,
  artist?: string,
  title?: string,
): Promise<string> => {
  const params: Record<string, string> = {};
  if (artist) params.artist = artist;
  if (title) params.title = title;

  try {
    const result = await request<{
      lyricsList?: { lyrics: { content: string }[] };
      lyrics?: { content: string };
    }>(config, "getLyrics", params);

    if (result.lyrics?.content) return result.lyrics.content;
    if (result.lyricsList?.lyrics?.[0]?.content) return result.lyricsList.lyrics[0].content;
  } catch (e) {
    console.warn("getLyrics failed:", e);
  }

  return "";
};

/**
 * 根据 ID 获取歌词 (推荐)
 */
// 格式化时间戳 [mm:ss.xx]
const formatLrcTime = (ms: number) => {
  const m = Math.floor(ms / 60000)
    .toString()
    .padStart(2, "0");
  const s = Math.floor((ms % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  const cs = Math.floor((ms % 1000) / 10)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}.${cs}`;
};

/**
 * 根据 ID 获取歌词 (推荐)
 */
export const getLyricsBySongId = async (
  config: StreamingServerConfig,
  id: string,
): Promise<string> => {
  try {
    const result = await request<{
      lyricsList?: {
        lyrics?: { content: string }[];
        structuredLyrics?: { line: { start: number; value: string }[]; synced: boolean }[];
      };
    }>(config, "getLyricsBySongId", { id });
    // 处理结构化歌词
    if (result.lyricsList?.structuredLyrics?.[0]?.line) {
      const lines = result.lyricsList.structuredLyrics[0].line;
      return lines
        .map((l) => {
          const time = formatLrcTime(l.start);
          return `[${time}]${l.value}`;
        })
        .join("\n");
    }
    return result.lyricsList?.lyrics?.[0]?.content || "";
  } catch (e) {
    console.warn("getLyricsBySongId failed:", e);
    return "";
  }
};

/**
 * 转换 Subsonic 歌曲为统一格式
 */
export const convertSubsonicSong = (
  song: SubsonicSong,
  config: StreamingServerConfig,
): SongType => {
  return {
    id: stringToNumericId(song.id),
    originalId: song.id,
    name: song.title,
    artists: song.artist || "未知艺术家",
    album: song.album || "未知专辑",
    cover: getCoverArtUrl(config, song.coverArt),
    coverSize: song.coverArt
      ? {
          s: getCoverArtUrl(config, song.coverArt, 100),
          m: getCoverArtUrl(config, song.coverArt, 300),
          l: getCoverArtUrl(config, song.coverArt, 1024),
          xl: getCoverArtUrl(config, song.coverArt),
        }
      : undefined,
    duration: (song.duration || 0) * 1000, // 转换为毫秒
    size: song.size || 0,
    quality: inferQuality(song),
    free: 0,
    mv: null,
    type: "streaming",
    serverId: config.id,
    serverType: config.type,
    streamUrl: getStreamUrl(config, song.id),
    source: "streaming",
    path: "",
  };
};

/**
 * 转换 Subsonic 专辑为统一格式
 */
export const convertSubsonicAlbum = (
  album: SubsonicAlbum,
  config: StreamingServerConfig,
): StreamingAlbumType => {
  return {
    id: album.id,
    name: album.name,
    artist: album.artist,
    artistId: album.artistId,
    cover: getCoverArtUrl(config, album.coverArt),
    coverSize: album.coverArt
      ? {
          s: getCoverArtUrl(config, album.coverArt, 100),
          m: getCoverArtUrl(config, album.coverArt, 300),
          l: getCoverArtUrl(config, album.coverArt, 1024),
          xl: getCoverArtUrl(config, album.coverArt),
        }
      : undefined,
    songCount: album.songCount,
    duration: album.duration ? album.duration * 1000 : undefined,
    year: album.year,
    genre: album.genre,
    serverId: config.id,
    serverType: config.type,
  };
};

/**
 * 转换 Subsonic 艺术家为统一格式
 */
export const convertSubsonicArtist = (
  artist: SubsonicArtist,
  config: StreamingServerConfig,
): StreamingArtistType => {
  return {
    id: artist.id,
    name: artist.name,
    cover: getCoverArtUrl(config, artist.coverArt) || artist.artistImageUrl || "",
    coverSize: artist.coverArt
      ? {
          s: getCoverArtUrl(config, artist.coverArt, 100),
          m: getCoverArtUrl(config, artist.coverArt, 300),
          l: getCoverArtUrl(config, artist.coverArt, 1024),
          xl: getCoverArtUrl(config, artist.coverArt),
        }
      : undefined,
    albumCount: artist.albumCount,
    serverId: config.id,
    serverType: config.type,
  };
};

/**
 * 转换 Subsonic 歌单为统一格式
 */
export const convertSubsonicPlaylist = (
  playlist: SubsonicPlaylist,
  config: StreamingServerConfig,
): StreamingPlaylistType => {
  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.comment,
    cover: getCoverArtUrl(config, playlist.coverArt),
    coverSize: playlist.coverArt
      ? {
          s: getCoverArtUrl(config, playlist.coverArt, 100),
          m: getCoverArtUrl(config, playlist.coverArt, 300),
          l: getCoverArtUrl(config, playlist.coverArt, 1024),
          xl: getCoverArtUrl(config, playlist.coverArt),
        }
      : undefined,
    owner: playlist.owner,
    songCount: playlist.songCount,
    duration: playlist.duration ? playlist.duration * 1000 : undefined,
    public: playlist.public,
    serverId: config.id,
    serverType: config.type,
  };
};

// ============ API 方法 ============

/**
 * 测试服务器连接
 */
export const ping = async (
  config: StreamingServerConfig,
): Promise<{ version: string; serverVersion?: string }> => {
  const result = await request<{ version: string; serverVersion?: string }>(config, "ping");
  return {
    version: result.version,
    serverVersion: result.serverVersion,
  };
};

/**
 * 获取所有艺术家
 */
export const getArtists = async (config: StreamingServerConfig): Promise<StreamingArtistType[]> => {
  const result = await request<{ artists: { index: SubsonicArtistIndex[] } }>(config, "getArtists");

  const artists: StreamingArtistType[] = [];
  if (result.artists?.index) {
    for (const index of result.artists.index) {
      if (index.artist) {
        for (const artist of index.artist) {
          artists.push(convertSubsonicArtist(artist, config));
        }
      }
    }
  }

  return artists;
};

/**
 * 获取专辑列表
 */
export const getAlbumList = async (
  config: StreamingServerConfig,
  type:
    | "newest"
    | "random"
    | "alphabeticalByName"
    | "alphabeticalByArtist"
    | "frequent"
    | "recent" = "alphabeticalByName",
  size: number = 500,
  offset: number = 0,
): Promise<StreamingAlbumType[]> => {
  const result = await request<{ albumList2: { album: SubsonicAlbum[] } }>(
    config,
    "getAlbumList2",
    {
      type,
      size: size.toString(),
      offset: offset.toString(),
    },
  );

  if (!result.albumList2?.album) return [];
  return result.albumList2.album.map((album) => convertSubsonicAlbum(album, config));
};

/**
 * 获取专辑详情（包含歌曲）
 */
export const getAlbum = async (
  config: StreamingServerConfig,
  id: string,
): Promise<{ album: StreamingAlbumType; songs: SongType[] }> => {
  const result = await request<{ album: SubsonicAlbum & { song?: SubsonicSong[] } }>(
    config,
    "getAlbum",
    { id },
  );

  const album = convertSubsonicAlbum(result.album, config);
  const songs = (result.album.song || []).map((song) => convertSubsonicSong(song, config));

  return { album, songs };
};

/**
 * 获取随机歌曲
 */
export const getRandomSongs = async (
  config: StreamingServerConfig,
  size: number = 50,
): Promise<SongType[]> => {
  const result = await request<{ randomSongs: { song: SubsonicSong[] } }>(
    config,
    "getRandomSongs",
    {
      size: size.toString(),
    },
  );

  if (!result.randomSongs?.song) return [];
  return result.randomSongs.song.map((song) => convertSubsonicSong(song, config));
};

/**
 * 获取所有歌单
 */
export const getPlaylists = async (
  config: StreamingServerConfig,
): Promise<StreamingPlaylistType[]> => {
  const result = await request<{ playlists: { playlist: SubsonicPlaylist[] } }>(
    config,
    "getPlaylists",
  );

  if (!result.playlists?.playlist) return [];
  return result.playlists.playlist.map((playlist) => convertSubsonicPlaylist(playlist, config));
};

/**
 * 获取歌单详情（包含歌曲）
 */
export const getPlaylist = async (
  config: StreamingServerConfig,
  id: string,
): Promise<{ playlist: StreamingPlaylistType; songs: SongType[] }> => {
  const result = await request<{ playlist: SubsonicPlaylist }>(config, "getPlaylist", { id });

  const playlist = convertSubsonicPlaylist(result.playlist, config);
  const songs = (result.playlist.entry || []).map((song) => convertSubsonicSong(song, config));

  return { playlist, songs };
};

/**
 * 搜索
 */
export const search = async (
  config: StreamingServerConfig,
  query: string,
  artistCount: number = 20,
  albumCount: number = 20,
  songCount: number = 50,
): Promise<{
  artists: StreamingArtistType[];
  albums: StreamingAlbumType[];
  songs: SongType[];
}> => {
  const result = await request<{
    searchResult3: {
      artist?: SubsonicArtist[];
      album?: SubsonicAlbum[];
      song?: SubsonicSong[];
    };
  }>(config, "search3", {
    query,
    artistCount: artistCount.toString(),
    albumCount: albumCount.toString(),
    songCount: songCount.toString(),
  });

  const searchResult = result.searchResult3 || {};

  return {
    artists: (searchResult.artist || []).map((a) => convertSubsonicArtist(a, config)),
    albums: (searchResult.album || []).map((a) => convertSubsonicAlbum(a, config)),
    songs: (searchResult.song || []).map((s) => convertSubsonicSong(s, config)),
  };
};

/**
 * 获取歌曲列表（支持分页）
 */
export const getSongs = async (
  config: StreamingServerConfig,
  offset: number = 0,
  size: number = 50,
): Promise<SongType[]> => {
  // 尝试使用空字符串搜索获取所有歌曲
  const result = await request<{
    searchResult3: {
      song?: SubsonicSong[];
    };
  }>(config, "search3", {
    query: "",
    songCount: size.toString(),
    songOffset: offset.toString(),
    artistCount: "0",
    albumCount: "0",
  });

  if (!result.searchResult3?.song) return [];
  return result.searchResult3.song.map((song) => convertSubsonicSong(song, config));
};

export default {
  ping,
  getArtists,
  getAlbumList,
  getAlbum,
  getRandomSongs,
  getSongs,
  getPlaylists,
  getPlaylist,
  search,
  getCoverArtUrl,
  getStreamUrl,
  getLyrics,
  getLyricsBySongId,
};
