/**
 * Jellyfin API 客户端
 */

import { SongType } from "@/types/main";
import type {
  StreamingServerConfig,
  JellyfinItem,
  JellyfinAuthResponse,
  JellyfinItemsResponse,
  StreamingAlbumType,
  StreamingArtistType,
  StreamingPlaylistType,
} from "@/types/streaming";

/**
 * 获取请求头
 */
const getHeaders = (config: StreamingServerConfig): HeadersInit => {
  // Jellyfin 需要 X-Emby-Authorization 头
  const authParts = [
    `MediaBrowser Client="SPlayer"`,
    `Version="1.0.0"`,
    `Device="SPlayer Web"`,
    `DeviceId="splayer-web-client"`,
  ];

  if (config.accessToken) {
    authParts.push(`Token="${config.accessToken}"`);
  }

  return {
    "Content-Type": "application/json",
    "X-Emby-Authorization": authParts.join(", "),
  };
};

/**
 * 构建 API URL
 */
const buildUrl = (config: StreamingServerConfig, endpoint: string): string => {
  const baseUrl = config.url.endsWith("/") ? config.url.slice(0, -1) : config.url;
  return `${baseUrl}/${endpoint}`;
};

/**
 * 发送 API 请求
 */
const request = async <T>(
  config: StreamingServerConfig,
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const url = buildUrl(config, endpoint);

  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(config),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // 某些端点可能返回空响应
  const text = await response.text();
  if (!text) return {} as T;

  return JSON.parse(text);
};

/**
 * 生成图片 URL
 */
export const getImageUrl = (
  config: StreamingServerConfig,
  itemId: string,
  imageType: "Primary" | "Backdrop" | "Banner" = "Primary",
  maxHeight?: number,
  tag?: string,
): string => {
  if (!itemId) return "";
  const baseUrl = config.url.endsWith("/") ? config.url.slice(0, -1) : config.url;
  const params = new URLSearchParams({
    quality: "100",
  });
  if (maxHeight) params.append("maxHeight", maxHeight.toString());
  if (tag) params.append("tag", tag);
  if (config.accessToken) params.append("api_key", config.accessToken);
  return `${baseUrl}/Items/${itemId}/Images/${imageType}?${params.toString()}`;
};

/**
 * 生成音频流 URL
 */
export const getAudioStreamUrl = (config: StreamingServerConfig, itemId: string): string => {
  const baseUrl = config.url.endsWith("/") ? config.url.slice(0, -1) : config.url;
  const params = new URLSearchParams({
    UserId: config.userId || "",
    DeviceId: "splayer-web-client",
    MaxStreamingBitrate: "140000000", // High bitrate to prefer direct play/high quality
    Container: "opus,webm|opus,ts|mp3,aac,m4a|aac,m4b|aac,flac,webma,webm|webma,wav,ogg",
    TranscodingContainer: "ts",
    TranscodingProtocol: "hls",
    AudioCodec: "aac",
    PlaySessionId: Date.now().toString(),
    api_key: config.accessToken || "",
    StartTimeTicks: "0",
    EnableRedirection: "true",
    EnableRemoteMedia: "true",
  });
  return `${baseUrl}/Audio/${itemId}/universal?${params.toString()}`;
};

/**
 * 将字符串 ID 转换为数字 ID（用于兼容现有播放器）
 */
const stringToNumericId = (id: string): number => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

/**
 * 转换 Jellyfin 项目为歌曲格式
 */
export const convertJellyfinSong = (
  item: JellyfinItem,
  config: StreamingServerConfig,
): SongType => {
  const artists = item.Artists?.join(", ") || item.AlbumArtist || "未知艺术家";
  const imageId = item.Id;
  const imageTag = item.ImageTags?.Primary;

  return {
    id: stringToNumericId(item.Id),
    originalId: item.Id,
    name: item.Name,
    artists,
    album: item.Album || "未知专辑",
    cover: imageTag ? getImageUrl(config, imageId, "Primary", 300, imageTag) : "",
    coverSize: imageTag
      ? {
          s: getImageUrl(config, imageId, "Primary", 100, imageTag),
          m: getImageUrl(config, imageId, "Primary", 300, imageTag),
          l: getImageUrl(config, imageId, "Primary", 1024, imageTag),
          xl: getImageUrl(config, imageId, "Primary", undefined, imageTag),
        }
      : undefined,
    duration: item.RunTimeTicks ? Math.floor(item.RunTimeTicks / 10000) : 0, // 转换为毫秒
    size: 0,
    free: 0,
    mv: null,
    type: "streaming",
    serverId: config.id,
    serverType: config.type,
    streamUrl: getAudioStreamUrl(config, item.Id),
    source: "streaming",
  };
};

/**
 * 转换 Jellyfin 项目为专辑格式
 */
export const convertJellyfinAlbum = (
  item: JellyfinItem,
  config: StreamingServerConfig,
): StreamingAlbumType => {
  const artistId = item.AlbumArtists?.[0]?.Id || item.ArtistItems?.[0]?.Id;
  const imageTag = item.ImageTags?.Primary;

  return {
    id: item.Id,
    name: item.Name,
    artist: item.AlbumArtist || item.AlbumArtists?.[0]?.Name,
    artistId,
    cover: imageTag ? getImageUrl(config, item.Id, "Primary", undefined, imageTag) : "",
    coverSize: imageTag
      ? {
          s: getImageUrl(config, item.Id, "Primary", 100, imageTag),
          m: getImageUrl(config, item.Id, "Primary", 300, imageTag),
          l: getImageUrl(config, item.Id, "Primary", 1024, imageTag),
          xl: getImageUrl(config, item.Id, "Primary", undefined, imageTag),
        }
      : undefined,
    songCount: item.SongCount || item.ChildCount,
    year: item.ProductionYear,
    serverId: config.id,
    serverType: config.type,
  };
};

/**
 * 转换 Jellyfin 项目为艺术家格式
 */
export const convertJellyfinArtist = (
  item: JellyfinItem,
  config: StreamingServerConfig,
): StreamingArtistType => {
  const imageTag = item.ImageTags?.Primary;
  return {
    id: item.Id,
    name: item.Name,
    cover: imageTag ? getImageUrl(config, item.Id, "Primary", undefined, imageTag) : "",
    coverSize: imageTag
      ? {
          s: getImageUrl(config, item.Id, "Primary", 100, imageTag),
          m: getImageUrl(config, item.Id, "Primary", 300, imageTag),
          l: getImageUrl(config, item.Id, "Primary", 1024, imageTag),
          xl: getImageUrl(config, item.Id, "Primary", undefined, imageTag),
        }
      : undefined,
    albumCount: item.ChildCount,
    serverId: config.id,
    serverType: config.type,
  };
};

/**
 * 转换 Jellyfin 项目为歌单格式
 */
export const convertJellyfinPlaylist = (
  item: JellyfinItem,
  config: StreamingServerConfig,
): StreamingPlaylistType => {
  const imageTag = item.ImageTags?.Primary;
  return {
    id: item.Id,
    name: item.Name,
    description: item.Overview,
    cover: imageTag ? getImageUrl(config, item.Id, "Primary", undefined, imageTag) : "",
    coverSize: imageTag
      ? {
          s: getImageUrl(config, item.Id, "Primary", 100, imageTag),
          m: getImageUrl(config, item.Id, "Primary", 300, imageTag),
          l: getImageUrl(config, item.Id, "Primary", 1024, imageTag),
          xl: getImageUrl(config, item.Id, "Primary", undefined, imageTag),
        }
      : undefined,
    songCount: item.ChildCount,
    serverId: config.id,
    serverType: config.type,
  };
};

// ============ API 方法 ============

/**
 * 用户认证
 */
export const authenticate = async (
  config: StreamingServerConfig,
): Promise<{ accessToken: string; userId: string }> => {
  const result = await request<JellyfinAuthResponse>(config, "Users/AuthenticateByName", {
    method: "POST",
    body: JSON.stringify({
      Username: config.username,
      Pw: config.password,
    }),
  });

  return {
    accessToken: result.AccessToken,
    userId: result.User.Id,
  };
};

/**
 * 测试服务器连接（ping）
 */
export const ping = async (config: StreamingServerConfig): Promise<{ version: string }> => {
  const result = await request<{ Version: string }>(config, "System/Info/Public");
  return { version: result.Version };
};

/**
 * 获取所有艺术家
 */
export const getArtists = async (config: StreamingServerConfig): Promise<StreamingArtistType[]> => {
  if (!config.userId) throw new Error("User ID is required");

  const result = await request<JellyfinItemsResponse>(
    config,
    `Artists?userId=${config.userId}&Recursive=true&SortBy=Name&SortOrder=Ascending`,
  );

  return result.Items.map((item) => convertJellyfinArtist(item, config));
};

/**
 * 获取所有专辑
 */
export const getAlbums = async (
  config: StreamingServerConfig,
  startIndex: number = 0,
  limit: number = 500,
): Promise<StreamingAlbumType[]> => {
  if (!config.userId) throw new Error("User ID is required");

  const params = new URLSearchParams({
    userId: config.userId,
    IncludeItemTypes: "MusicAlbum",
    Recursive: "true",
    SortBy: "Name",
    SortOrder: "Ascending",
    StartIndex: startIndex.toString(),
    Limit: limit.toString(),
  });

  const result = await request<JellyfinItemsResponse>(
    config,
    `Users/${config.userId}/Items?${params.toString()}`,
  );

  return result.Items.map((item) => convertJellyfinAlbum(item, config));
};

/**
 * 获取专辑内歌曲
 */
export const getAlbumItems = async (
  config: StreamingServerConfig,
  albumId: string,
): Promise<SongType[]> => {
  if (!config.userId) throw new Error("User ID is required");

  const params = new URLSearchParams({
    ParentId: albumId,
    IncludeItemTypes: "Audio",
    SortBy: "ParentIndexNumber,IndexNumber,SortName",
    SortOrder: "Ascending",
  });

  const result = await request<JellyfinItemsResponse>(
    config,
    `Users/${config.userId}/Items?${params.toString()}`,
  );

  return result.Items.map((item) => convertJellyfinSong(item, config));
};

/**
 * 获取随机歌曲
 */
export const getRandomSongs = async (
  config: StreamingServerConfig,
  limit: number = 50,
): Promise<SongType[]> => {
  if (!config.userId) throw new Error("User ID is required");

  const params = new URLSearchParams({
    userId: config.userId,
    IncludeItemTypes: "Audio",
    Recursive: "true",
    SortBy: "Random",
    Limit: limit.toString(),
  });

  const result = await request<JellyfinItemsResponse>(
    config,
    `Users/${config.userId}/Items?${params.toString()}`,
  );

  return result.Items.map((item) => convertJellyfinSong(item, config));
};

/**
 * 获取所有歌单
 */
export const getPlaylists = async (
  config: StreamingServerConfig,
): Promise<StreamingPlaylistType[]> => {
  if (!config.userId) throw new Error("User ID is required");

  const params = new URLSearchParams({
    IncludeItemTypes: "Playlist",
    Recursive: "true",
  });

  const result = await request<JellyfinItemsResponse>(
    config,
    `Users/${config.userId}/Items?${params.toString()}`,
  );

  // 只返回音乐歌单
  return result.Items.filter((item) => item.Type === "Playlist").map((item) =>
    convertJellyfinPlaylist(item, config),
  );
};

/**
 * 获取歌单内歌曲
 */
export const getPlaylistItems = async (
  config: StreamingServerConfig,
  playlistId: string,
): Promise<SongType[]> => {
  if (!config.userId) throw new Error("User ID is required");

  const params = new URLSearchParams({
    userId: config.userId,
  });

  const result = await request<JellyfinItemsResponse>(
    config,
    `Playlists/${playlistId}/Items?${params.toString()}`,
  );

  return result.Items.filter((item) => item.Type === "Audio").map((item) =>
    convertJellyfinSong(item, config),
  );
};

/**
 * 搜索
 */
export const search = async (
  config: StreamingServerConfig,
  query: string,
  limit: number = 50,
): Promise<{
  artists: StreamingArtistType[];
  albums: StreamingAlbumType[];
  songs: SongType[];
}> => {
  if (!config.userId) throw new Error("User ID is required");

  const params = new URLSearchParams({
    searchTerm: query,
    IncludeItemTypes: "MusicArtist,MusicAlbum,Audio",
    Recursive: "true",
    Limit: limit.toString(),
  });

  const result = await request<JellyfinItemsResponse>(
    config,
    `Users/${config.userId}/Items?${params.toString()}`,
  );

  const artists: StreamingArtistType[] = [];
  const albums: StreamingAlbumType[] = [];
  const songs: SongType[] = [];

  for (const item of result.Items) {
    if (item.Type === "MusicArtist") {
      artists.push(convertJellyfinArtist(item, config));
    } else if (item.Type === "MusicAlbum") {
      albums.push(convertJellyfinAlbum(item, config));
    } else if (item.Type === "Audio") {
      songs.push(convertJellyfinSong(item, config));
    }
  }

  return { artists, albums, songs };
};

/**
 * 获取歌曲列表（支持分页）
 */
export const getSongs = async (
  config: StreamingServerConfig,
  offset: number = 0,
  limit: number = 50,
): Promise<SongType[]> => {
  if (!config.userId) throw new Error("User ID is required");

  const params = new URLSearchParams({
    userId: config.userId,
    IncludeItemTypes: "Audio",
    Recursive: "true",
    SortBy: "DateCreated", // 默认按添加时间排序
    SortOrder: "Descending",
    StartIndex: offset.toString(),
    Limit: limit.toString(),
  });

  const result = await request<JellyfinItemsResponse>(
    config,
    `Users/${config.userId}/Items?${params.toString()}`,
  );

  return result.Items.map((item) => convertJellyfinSong(item, config));
};

/**
 * 获取歌词
 */
export const getLyrics = async (config: StreamingServerConfig, itemId: string): Promise<string> => {
  if (!itemId) return "";
  try {
    const result = await request<{ Lyrics: { Text: string; Start: number }[] }>(
      config,
      `Audio/${itemId}/Lyrics`,
    );
    if (result && Array.isArray(result.Lyrics)) {
      return result.Lyrics.map((l) => {
        const totalSeconds = l.Start / 10000000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const milliseconds = Math.floor((totalSeconds % 1) * 100);

        const mm = minutes.toString().padStart(2, "0");
        const ss = seconds.toString().padStart(2, "0");
        const xx = milliseconds.toString().padStart(2, "0");

        return `[${mm}:${ss}.${xx}]${l.Text}`;
      }).join("\n");
    }
    return "";
  } catch (error) {
    console.warn("Failed to fetch lyrics from Jellyfin:", error);
    return "";
  }
};

export default {
  authenticate,
  ping,
  getArtists,
  getAlbums,
  getAlbumItems,
  getRandomSongs,
  getSongs,
  getPlaylists,
  getPlaylistItems,
  search,
  getImageUrl,
  getAudioStreamUrl,
  getLyrics,
};
