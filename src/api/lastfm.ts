import axios, { AxiosError, AxiosInstance } from "axios";
import md5 from "md5";
import { useSettingStore } from "@/stores";

/**
 * Last.fm API 封装
 * API 文档: https://www.last.fm/api
 */

// 错误响应接口
interface LastfmErrorResponse {
  error: number;
  message: string;
}

const LASTFM_API_URL = "https://ws.audioscrobbler.com/2.0/";

// Last.fm API 客户端
const lastfmClient: AxiosInstance = axios.create({
  baseURL: LASTFM_API_URL,
  timeout: 15000,
});

// 响应拦截器，显示错误提示
lastfmClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<LastfmErrorResponse>) => {
    const response = error.response;
    if (!response) {
      window.$message.error("Last.fm 请求失败，请检查网络连接");
      return Promise.reject(error);
    }

    const { status, data } = response;

    switch (status) {
      case 403: {
        const code = data?.error;
        if (code === 9 || code === 4 || code === 26) {
          window.$message.error("Last.fm 认证失败，需要重新授权，已断开与 Last.fm 的连接！");
          disconnect();
        } else {
          window.$message.error("Last.fm 认证失败，可能需要重新授权");
        }
        break;
      }
      case 401:
        window.$message.error("Last.fm 未授权，已断开与 Last.fm 的连接！");
        disconnect();
        break;
      case 429:
        window.$message.error("Last.fm 请求过于频繁，请稍后再试");
        break;
      case 500:
      case 502:
      case 503:
        window.$message.error("Last.fm 服务暂时不可用，请稍后再试");
        break;
      default:
        window.$message.error("Last.fm 请求失败");
        break;
    }
    return Promise.reject(error);
  },
);

/**
 * 断开与 Last.fm 的连接
 */
export const disconnect = () => {
  const settingStore = useSettingStore();
  settingStore.lastfm.sessionKey = "";
  settingStore.lastfm.username = "";
};

/**
 * 获取 API 配置
 */
const getApiConfig = () => {
  const settingStore = useSettingStore();
  return {
    apiKey: settingStore.lastfm.apiKey,
    apiSecret: settingStore.lastfm.apiSecret,
  };
};

/**
 * 准备请求参数
 * @param method API 方法名
 * @param params 参数
 * @returns 请求参数
 */
const prepareRequestParams = (method: string, params: Record<string, string | number> = {}) => {
  const { apiKey } = getApiConfig();
  const requestParams: Record<string, string | number> = {
    method,
    api_key: apiKey,
    format: "json",
    ...params,
  };
  return requestParams;
};

/**
 * 生成 API 签名
 * @param params 参数对象
 */
const generateSignature = (params: Record<string, string | number>): string => {
  const { apiSecret } = getApiConfig();
  // 排除 format 参数，按字母顺序排序
  const sorted = Object.keys(params)
    .filter((key) => key !== "format")
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join("");
  return md5(sorted + apiSecret);
};

/**
 * Last.fm API 请求
 * @param method API 方法名
 * @param params 参数
 * @param needAuth 是否需要签名
 */
const lastfmRequest = async (
  method: string,
  params: Record<string, string | number> = {},
  needAuth: boolean = false,
) => {
  const requestParams = prepareRequestParams(method, params);

  if (needAuth) {
    requestParams.api_sig = generateSignature(requestParams);
  }

  try {
    const response = await lastfmClient.get("", { params: requestParams });
    return response.data;
  } catch (error) {
    console.error("Last.fm API 错误:", error);
    throw error;
  }
};

/**
 * Last.fm API POST 请求（用于需要签名的写操作）
 * @param method API 方法名
 * @param params 参数
 */
const lastfmPostRequest = async (method: string, params: Record<string, string | number> = {}) => {
  const requestParams = prepareRequestParams(method, params);

  requestParams.api_sig = generateSignature(requestParams);

  try {
    const formData = new URLSearchParams();
    Object.entries(requestParams).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const response = await lastfmClient.post("", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Last.fm API POST 错误:", error);
    throw error;
  }
};

/**
 * 获取认证令牌
 */
export const getAuthToken = async () => {
  return await lastfmRequest("auth.getToken", {}, true);
};

/**
 * 获取认证 URL
 * @param token 认证令牌
 */
export const getAuthUrl = (token: string): string => {
  const { apiKey } = getApiConfig();
  return `https://www.last.fm/zh/api/auth/?api_key=${apiKey}&token=${token}`;
};

/**
 * 获取会话密钥
 * @param token 认证令牌
 */
export const getSession = async (token: string) => {
  return await lastfmRequest("auth.getSession", { token }, true);
};

/**
 * 获取用户信息
 * @param user 用户名
 */
export const getUserInfo = async (user: string) => {
  return await lastfmRequest("user.getInfo", { user });
};

/**
 * 获取用户最近播放的歌曲
 * @param user 用户名
 * @param limit 数量限制
 */
export const getUserRecentTracks = async (user: string, limit: number = 50) => {
  return await lastfmRequest("user.getRecentTracks", { user, limit });
};

/**
 * 获取用户喜欢的艺术家
 * @param user 用户名
 * @param limit 数量限制
 */
export const getUserTopArtists = async (user: string, limit: number = 50) => {
  return await lastfmRequest("user.getTopArtists", { user, limit });
};

/**
 * 获取用户喜欢的歌曲
 * @param user 用户名
 * @param limit 数量限制
 */
export const getUserTopTracks = async (user: string, limit: number = 50) => {
  return await lastfmRequest("user.getTopTracks", { user, limit });
};

/**
 * 更新正在播放的歌曲
 * @param sessionKey 会话密钥
 * @param track 歌曲名
 * @param artist 艺术家名
 * @param album 专辑名
 * @param duration 时长（秒）
 */
export const updateNowPlaying = async (
  sessionKey: string,
  track: string,
  artist: string,
  album?: string,
  duration?: number,
) => {
  const params: Record<string, string | number> = {
    sk: sessionKey,
    track,
    artist,
  };

  if (album) params.album = album;
  if (duration) params.duration = duration;

  return await lastfmPostRequest("track.updateNowPlaying", params);
};

/**
 * Scrobble 歌曲（记录播放）
 * @param sessionKey 会话密钥
 * @param track 歌曲名
 * @param artist 艺术家名
 * @param timestamp 播放时间戳（秒）
 * @param album 专辑名
 * @param duration 时长（秒）
 */
export const scrobbleTrack = async (
  sessionKey: string,
  track: string,
  artist: string,
  timestamp: number,
  album?: string,
  duration?: number,
) => {
  const params: Record<string, string | number> = {
    sk: sessionKey,
    track,
    artist,
    timestamp,
  };

  if (album) params.album = album;
  if (duration) params.duration = duration;

  return await lastfmPostRequest("track.scrobble", params);
};

/**
 * 喜欢歌曲
 * @param sessionKey 会话密钥
 * @param track 歌曲名
 * @param artist 艺术家名
 */
export const loveTrack = async (sessionKey: string, track: string, artist: string) => {
  return await lastfmPostRequest("track.love", {
    sk: sessionKey,
    track,
    artist,
  });
};

/**
 * 取消喜欢歌曲
 * @param sessionKey 会话密钥
 * @param track 歌曲名
 * @param artist 艺术家名
 */
export const unloveTrack = async (sessionKey: string, track: string, artist: string) => {
  return await lastfmPostRequest("track.unlove", {
    sk: sessionKey,
    track,
    artist,
  });
};

/**
 * 获取歌曲信息
 * @param track 歌曲名
 * @param artist 艺术家名
 */
export const getTrackInfo = async (track: string, artist: string) => {
  return await lastfmRequest("track.getInfo", { track, artist });
};

/**
 * 获取相似歌曲
 * @param track 歌曲名
 * @param artist 艺术家名
 * @param limit 数量限制
 */
export const getSimilarTracks = async (track: string, artist: string, limit: number = 30) => {
  return await lastfmRequest("track.getSimilar", { track, artist, limit });
};

/**
 * 获取艺术家信息
 * @param artist 艺术家名
 */
export const getArtistInfo = async (artist: string) => {
  return await lastfmRequest("artist.getInfo", { artist });
};

/**
 * 获取相似艺术家
 * @param artist 艺术家名
 * @param limit 数量限制
 */
export const getSimilarArtists = async (artist: string, limit: number = 30) => {
  return await lastfmRequest("artist.getSimilar", { artist, limit });
};

/**
 * 获取艺术家热门歌曲
 * @param artist 艺术家名
 * @param limit 数量限制
 */
export const getArtistTopTracks = async (artist: string, limit: number = 50) => {
  return await lastfmRequest("artist.getTopTracks", { artist, limit });
};

/**
 * 获取专辑信息
 * @param artist 艺术家名
 * @param album 专辑名
 */
export const getAlbumInfo = async (artist: string, album: string) => {
  return await lastfmRequest("album.getInfo", { artist, album });
};
