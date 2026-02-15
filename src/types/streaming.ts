/**
 * 流媒体服务器相关类型定义
 */

import type { SongType, CoverSize } from "./main";

/**
 * 流媒体服务器类型
 */
export type StreamingServerType = "navidrome" | "jellyfin" | "subsonic" | "opensubsonic" | "emby";

/**
 * 流媒体服务器配置
 */
export interface StreamingServerConfig {
  /** 服务器唯一标识（用于区分多个服务器配置） */
  id: string;
  /** 服务器名称（用户自定义） */
  name: string;
  /** 服务器类型 */
  type: StreamingServerType;
  /** 服务器地址（例如: https://music.example.com） */
  url: string;
  /** 用户名 */
  username: string;
  /** 密码（明文存储） */
  password: string;
  /** Jellyfin 专用: 认证 Token */
  accessToken?: string;
  /** Jellyfin 专用: 用户 ID */
  userId?: string;
  /** 最后连接时间 */
  lastConnected?: number;
  /** 是否为当前激活的服务器 */
  isActive?: boolean;
}

/**
 * Subsonic API 响应基础结构
 */
export interface SubsonicResponse<T = unknown> {
  "subsonic-response": {
    status: "ok" | "failed";
    version: string;
    type?: string;
    serverVersion?: string;
    error?: {
      code: number;
      message: string;
    };
  } & T;
}

/**
 * Subsonic 艺术家
 */
export interface SubsonicArtist {
  id: string;
  name: string;
  coverArt?: string;
  albumCount?: number;
  artistImageUrl?: string;
}

/**
 * Subsonic 艺术家索引
 */
export interface SubsonicArtistIndex {
  name: string;
  artist: SubsonicArtist[];
}

/**
 * Subsonic 专辑
 */
export interface SubsonicAlbum {
  id: string;
  name: string;
  artist?: string;
  artistId?: string;
  coverArt?: string;
  songCount?: number;
  duration?: number;
  created?: string;
  year?: number;
  genre?: string;
}

/**
 * Subsonic 歌曲
 */
export interface SubsonicSong {
  id: string;
  parent?: string;
  isDir: boolean;
  title: string;
  album?: string;
  artist?: string;
  track?: number;
  year?: number;
  genre?: string;
  coverArt?: string;
  size?: number;
  contentType?: string;
  suffix?: string;
  duration?: number;
  bitRate?: number;
  path?: string;
  albumId?: string;
  artistId?: string;
  type?: string;
  created?: string;
  /** 采样率 (Hz)，如 44100、96000 */
  samplingRate?: number;
  /** 位深度 (bit)，如 16、24 */
  bitDepth?: number;
  /** 声道数，如 2 表示立体声 */
  channelCount?: number;
}

/**
 * Subsonic 歌单
 */
export interface SubsonicPlaylist {
  id: string;
  name: string;
  comment?: string;
  owner?: string;
  public?: boolean;
  songCount?: number;
  duration?: number;
  created?: string;
  changed?: string;
  coverArt?: string;
  entry?: SubsonicSong[];
}

/**
 * Jellyfin 通用项目
 */
export interface JellyfinItem {
  Id: string;
  Name: string;
  ServerId?: string;
  Type: string;
  RunTimeTicks?: number;
  ProductionYear?: number;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  PremiereDate?: string;
  Album?: string;
  AlbumId?: string;
  AlbumArtist?: string;
  AlbumArtists?: { Id: string; Name: string }[];
  Artists?: string[];
  ArtistItems?: { Id: string; Name: string }[];
  ImageTags?: {
    Primary?: string;
    [key: string]: string | undefined;
  };
  BackdropImageTags?: string[];
  Overview?: string;
  ChildCount?: number;
  SongCount?: number;
  AlbumPrimaryImageTag?: string;
}

/**
 * Jellyfin 认证响应
 */
export interface JellyfinAuthResponse {
  User: {
    Id: string;
    Name: string;
  };
  AccessToken: string;
  ServerId: string;
}

/**
 * Jellyfin 项目列表响应
 */
export interface JellyfinItemsResponse {
  Items: JellyfinItem[];
  TotalRecordCount: number;
  StartIndex: number;
}

// ============ 转换后的统一类型 ============

/**
 * 流媒体专辑类型
 */
export interface StreamingAlbumType {
  id: string;
  name: string;
  artist?: string;
  artistId?: string;
  cover: string;
  coverSize?: CoverSize;
  songCount?: number;
  duration?: number;
  year?: number;
  genre?: string;
  serverId: string;
  serverType: StreamingServerType;
}

/**
 * 流媒体艺术家类型
 */
export interface StreamingArtistType {
  id: string;
  name: string;
  cover: string;
  coverSize?: CoverSize;
  albumCount?: number;
  serverId: string;
  serverType: StreamingServerType;
}

/**
 * 流媒体歌单类型
 */
export interface StreamingPlaylistType {
  id: string;
  name: string;
  description?: string;
  cover: string;
  coverSize?: CoverSize;
  owner?: string;
  songCount?: number;
  duration?: number;
  public?: boolean;
  serverId: string;
  serverType: StreamingServerType;
}

/**
 * 流媒体连接状态
 */
export interface StreamingConnectionStatus {
  connected: boolean;
  serverName?: string;
  serverVersion?: string;
  error?: string;
}

/**
 * 流媒体 Store 状态
 */
export interface StreamingState {
  /** 服务器配置列表 */
  servers: StreamingServerConfig[];
  /** 当前激活的服务器 ID */
  activeServerId: string | null;
  /** 连接状态 */
  connectionStatus: StreamingConnectionStatus;
  /** 是否正在加载 */
  loading: boolean;
  /** 歌曲列表缓存 */
  songs: SongType[];
  /** 艺术家列表缓存 */
  artists: StreamingArtistType[];
  /** 专辑列表缓存 */
  albums: StreamingAlbumType[];
  /** 歌单列表缓存 */
  playlists: StreamingPlaylistType[];
}
