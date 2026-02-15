/**
 * 流媒体 Store
 * 管理流媒体服务器配置和数据缓存
 */

import type {
  StreamingServerConfig,
  StreamingConnectionStatus,
  StreamingAlbumType,
  StreamingArtistType,
  StreamingPlaylistType,
} from "@/types/streaming";
import { SongType } from "@/types/main";
import { subsonic, jellyfin, emby } from "@/api/streaming";
import localforage from "localforage";

// 创建存储实例
const streamingDB = localforage.createInstance({
  name: "streaming-data",
  description: "Streaming media server data",
  storeName: "streaming",
});

/**
 * 生成唯一 ID
 */
const generateId = (): string => {
  // 使用时间戳 + 随机数生成简单的唯一 ID
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 创建流媒体 Store
 */
const createStreamingStore = () => {
  // 响应式状态
  const servers = ref<StreamingServerConfig[]>([]);
  const activeServerId = ref<string | null>(null);
  const connectionStatus = ref<StreamingConnectionStatus>({ connected: false });
  const loading = ref(false);
  const songs = ref<SongType[]>([]);
  const artists = ref<StreamingArtistType[]>([]);
  const albums = ref<StreamingAlbumType[]>([]);
  const playlists = ref<StreamingPlaylistType[]>([]);

  // 计算属性：当前激活的服务器配置
  const activeServer = computed<StreamingServerConfig | null>(() => {
    if (!activeServerId.value) return null;
    return servers.value.find((s) => s.id === activeServerId.value) || null;
  });

  // 计算属性：是否已连接
  const isConnected = computed(() => connectionStatus.value.connected);

  // 计算属性：是否已配置服务器
  const hasServer = computed(() => servers.value.length > 0);

  /**
   * 加载服务器配置
   */
  const loadServers = async (): Promise<void> => {
    try {
      const savedServers = await streamingDB.getItem<StreamingServerConfig[]>("servers");
      if (savedServers) {
        servers.value = savedServers;
      }

      const savedActiveId = await streamingDB.getItem<string>("activeServerId");
      if (savedActiveId && servers.value.some((s) => s.id === savedActiveId)) {
        activeServerId.value = savedActiveId;
      }

      // 自动连接
      if (servers.value.length > 0 && activeServerId.value) {
        connectToServer(activeServerId.value);
      }
    } catch (error) {
      console.error("Failed to load streaming servers:", error);
    }
  };

  /**
   * 保存服务器配置
   */
  const saveServers = async (): Promise<void> => {
    try {
      // 使用 JSON 序列化来避免 DataCloneError
      const serversData = JSON.parse(JSON.stringify(servers.value));
      await streamingDB.setItem("servers", serversData);
      await streamingDB.setItem("activeServerId", activeServerId.value);
    } catch (error) {
      console.error("Failed to save streaming servers:", error);
    }
  };

  /**
   * 添加服务器配置
   */
  const addServer = async (
    config: Omit<StreamingServerConfig, "id">,
  ): Promise<StreamingServerConfig> => {
    const newServer: StreamingServerConfig = {
      ...config,
      id: generateId(),
    };

    servers.value.push(newServer);
    await saveServers();

    return newServer;
  };

  /**
   * 更新服务器配置
   */
  const updateServer = async (
    id: string,
    updates: Partial<StreamingServerConfig>,
  ): Promise<boolean> => {
    const index = servers.value.findIndex((s) => s.id === id);
    if (index === -1) return false;

    servers.value[index] = { ...servers.value[index], ...updates };
    await saveServers();

    return true;
  };

  /**
   * 删除服务器配置
   */
  const removeServer = async (id: string): Promise<boolean> => {
    const index = servers.value.findIndex((s) => s.id === id);
    if (index === -1) return false;

    servers.value.splice(index, 1);

    // 如果删除的是当前激活的服务器，清除激活状态
    if (activeServerId.value === id) {
      activeServerId.value = null;
      connectionStatus.value = { connected: false };
      clearCache();
    }

    await saveServers();
    return true;
  };

  /**
   * 测试服务器连接
   */
  const testConnection = async (
    config: StreamingServerConfig,
  ): Promise<StreamingConnectionStatus> => {
    try {
      if (config.type === "jellyfin") {
        // Jellyfin 需要先认证
        const authResult = await jellyfin.authenticate(config);
        config.accessToken = authResult.accessToken;
        config.userId = authResult.userId;

        const pingResult = await jellyfin.ping(config);
        return {
          connected: true,
          serverName: config.name,
          serverVersion: pingResult.version,
        };
      } else if (config.type === "emby") {
        // Emby 需要先认证
        const authResult = await emby.authenticate(config);
        config.accessToken = authResult.accessToken;
        config.userId = authResult.userId;

        const pingResult = await emby.ping(config);
        return {
          connected: true,
          serverName: config.name,
          serverVersion: pingResult.version,
        };
      } else {
        // Subsonic API (Navidrome / OpenSubsonic)
        const pingResult = await subsonic.ping(config);
        return {
          connected: true,
          serverName: config.name,
          serverVersion: pingResult.serverVersion || pingResult.version,
        };
      }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : "连接失败",
      };
    }
  };

  /**
   * 连接到服务器
   */
  const connectToServer = async (serverId: string): Promise<boolean> => {
    const server = servers.value.find((s) => s.id === serverId);
    if (!server) return false;

    loading.value = true;
    connectionStatus.value = { connected: false };

    try {
      const status = await testConnection(server);
      connectionStatus.value = status;

      if (status.connected) {
        activeServerId.value = serverId;
        server.lastConnected = Date.now();

        // 如果是 Jellyfin 或 Emby，保存认证信息
        if ((server.type === "jellyfin" || server.type === "emby") && server.accessToken) {
          await updateServer(serverId, {
            accessToken: server.accessToken,
            userId: server.userId,
            lastConnected: server.lastConnected,
          });
        } else {
          await updateServer(serverId, { lastConnected: server.lastConnected });
        }

        return true;
      }

      return false;
    } catch (error) {
      connectionStatus.value = {
        connected: false,
        error: error instanceof Error ? error.message : "连接失败",
      };
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 断开连接
   */
  const disconnect = (): void => {
    activeServerId.value = null;
    connectionStatus.value = { connected: false };
    clearCache();
  };

  /**
   * 清除缓存
   */
  const clearCache = (): void => {
    songs.value = [];
    artists.value = [];
    albums.value = [];
    playlists.value = [];
  };

  /**
   * 获取随机歌曲
   */
  const fetchRandomSongs = async (count: number = 50): Promise<SongType[]> => {
    const server = activeServer.value;
    if (!server || !isConnected.value) return [];

    loading.value = true;
    try {
      let result: SongType[];

      if (server.type === "jellyfin") {
        result = await jellyfin.getRandomSongs(server, count);
      } else if (server.type === "emby") {
        result = await emby.getRandomSongs(server, count);
      } else {
        result = await subsonic.getRandomSongs(server, count);
      }

      songs.value = result;
      return result;
    } catch (error) {
      console.error("Failed to fetch random songs:", error);
      return [];
    } finally {
      loading.value = false;
    }
  };

  /**
   * 获取歌曲列表（支持分页）
   * @param offset 偏移量
   * @param size 数量
   * @param append 是否追加到现有列表
   */
  const fetchSongs = async (
    offset: number = 0,
    size: number = 50,
    append: boolean = false,
  ): Promise<SongType[]> => {
    const server = activeServer.value;
    if (!server || !isConnected.value) return [];

    loading.value = true;
    try {
      let result: SongType[];

      if (server.type === "jellyfin") {
        result = await jellyfin.getSongs(server, offset, size);
      } else if (server.type === "emby") {
        result = await emby.getSongs(server, offset, size);
      } else {
        result = await subsonic.getSongs(server, offset, size);
      }

      if (append) {
        songs.value = [...songs.value, ...result];
      } else {
        songs.value = result;
      }
      return result;
    } catch (error) {
      console.error("Failed to fetch songs:", error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 获取艺术家列表
   */
  const fetchArtists = async (): Promise<StreamingArtistType[]> => {
    const server = activeServer.value;
    if (!server || !isConnected.value) return [];

    loading.value = true;
    try {
      let result: StreamingArtistType[];

      if (server.type === "jellyfin") {
        result = await jellyfin.getArtists(server);
      } else if (server.type === "emby") {
        result = await emby.getArtists(server);
      } else {
        result = await subsonic.getArtists(server);
      }

      artists.value = result;
      return result;
    } catch (error) {
      console.error("Failed to fetch artists:", error);
      return [];
    } finally {
      loading.value = false;
    }
  };

  /**
   * 获取专辑列表
   */
  const fetchAlbums = async (): Promise<StreamingAlbumType[]> => {
    const server = activeServer.value;
    if (!server || !isConnected.value) return [];

    loading.value = true;
    try {
      let result: StreamingAlbumType[];

      if (server.type === "jellyfin") {
        result = await jellyfin.getAlbums(server);
      } else if (server.type === "emby") {
        result = await emby.getAlbums(server);
      } else {
        result = await subsonic.getAlbumList(server, "alphabeticalByName");
      }

      albums.value = result;
      return result;
    } catch (error) {
      console.error("Failed to fetch albums:", error);
      return [];
    } finally {
      loading.value = false;
    }
  };

  /**
   * 获取歌单列表
   */
  const fetchPlaylists = async (): Promise<StreamingPlaylistType[]> => {
    const server = activeServer.value;
    if (!server || !isConnected.value) return [];

    loading.value = true;
    try {
      let result: StreamingPlaylistType[];

      if (server.type === "jellyfin") {
        result = await jellyfin.getPlaylists(server);
      } else if (server.type === "emby") {
        result = await emby.getPlaylists(server);
      } else {
        result = await subsonic.getPlaylists(server);
      }

      playlists.value = result;
      return result;
    } catch (error) {
      console.error("Failed to fetch playlists:", error);
      return [];
    } finally {
      loading.value = false;
    }
  };

  /**
   * 获取专辑歌曲
   */
  const fetchAlbumSongs = async (albumId: string): Promise<SongType[]> => {
    const server = activeServer.value;
    if (!server || !isConnected.value) return [];

    try {
      if (server.type === "jellyfin") {
        return await jellyfin.getAlbumItems(server, albumId);
      } else if (server.type === "emby") {
        return await emby.getAlbumItems(server, albumId);
      } else {
        const result = await subsonic.getAlbum(server, albumId);
        return result.songs;
      }
    } catch (error) {
      console.error("Failed to fetch album songs:", error);
      return [];
    }
  };

  /**
   * 获取歌单歌曲
   */
  const fetchPlaylistSongs = async (playlistId: string): Promise<SongType[]> => {
    const server = activeServer.value;
    if (!server || !isConnected.value) return [];

    try {
      if (server.type === "jellyfin") {
        return await jellyfin.getPlaylistItems(server, playlistId);
      } else if (server.type === "emby") {
        return await emby.getPlaylistItems(server, playlistId);
      } else {
        const result = await subsonic.getPlaylist(server, playlistId);
        return result.songs;
      }
    } catch (error) {
      console.error("Failed to fetch playlist songs:", error);
      return [];
    }
  };

  /**
   * 搜索
   */
  const search = async (
    query: string,
  ): Promise<{
    artists: StreamingArtistType[];
    albums: StreamingAlbumType[];
    songs: SongType[];
  }> => {
    const server = activeServer.value;
    if (!server || !isConnected.value) {
      return { artists: [], albums: [], songs: [] };
    }

    try {
      if (server.type === "jellyfin") {
        return await jellyfin.search(server, query);
      } else if (server.type === "emby") {
        return await emby.search(server, query);
      } else {
        return await subsonic.search(server, query);
      }
    } catch (error) {
      console.error("Failed to search:", error);
      return { artists: [], albums: [], songs: [] };
    }
  };

  /**
   * 获取歌词
   */
  const fetchLyrics = async (song: SongType): Promise<string> => {
    const server = activeServer.value;
    if (!server || !isConnected.value) return "";

    try {
      if (server.type === "jellyfin" && song.originalId) {
        return await jellyfin.getLyrics(server, song.originalId);
      } else if (server.type === "emby" && song.originalId) {
        return await emby.getLyrics(server, song.originalId);
      } else {
        // 优先使用 ID 获取
        if (song.originalId) {
          const lyrics = await subsonic.getLyricsBySongId(server, song.originalId);
          if (lyrics) return lyrics;
        }
        return "";
      }
    } catch (error) {
      console.error("Failed to fetch lyrics:", error);
      return "";
    }
  };

  /**
   * 获取流媒体歌曲播放地址
   */
  const getSongUrl = (song: SongType): string => {
    if (song.type !== "streaming" || !song.serverId) return song.streamUrl || "";

    const server = servers.value.find((s) => s.id === song.serverId);
    if (!server) return song.streamUrl || "";

    if (server.type === "jellyfin" && server.accessToken && song.originalId) {
      return jellyfin.getAudioStreamUrl(server, song.originalId);
    }

    if (server.type === "emby" && server.accessToken && song.originalId) {
      return emby.getAudioStreamUrl(server, song.originalId);
    }

    return song.streamUrl || "";
  };

  // 初始化：加载保存的配置
  loadServers();

  return {
    // 状态
    servers,
    activeServerId,
    activeServer,
    connectionStatus,
    isConnected,
    hasServer,
    loading,
    songs,
    artists,
    albums,
    playlists,

    // 方法
    loadServers,
    saveServers,
    addServer,
    updateServer,
    removeServer,
    testConnection,
    connectToServer,
    disconnect,
    clearCache,
    fetchRandomSongs,
    fetchSongs,
    fetchArtists,
    fetchAlbums,
    fetchPlaylists,
    fetchAlbumSongs,
    fetchPlaylistSongs,
    search,
    fetchLyrics,
    getSongUrl,
  };
};

// 创建全局实例
const streamingStoreInstance = createStreamingStore();

/**
 * 获取流媒体 Store 实例
 */
export const useStreamingStore = () => streamingStoreInstance;

export default useStreamingStore;
