import request from "@/utils/request";
import idMeta from "@/assets/data/idMeta.json";

/**
 * 每日推荐 - 需要登录
 * @param {string} [type] - 推荐类型，songs 日推歌曲 / resource 推荐歌单
 */
export const dailyRecommend = (type: "songs" | "resource" = "songs") => {
  return request({
    url: `/recommend/${type}`,
    params: { timestamp: Date.now() },
  });
};

/**
 * 推荐内容
 * @param {string} [type] - 推荐类型
 * @param {number} [limit=50] - 返回结果的数量
 */
export const personalized = (
  type: "playlist" | "mv" | "newsong" | "djprogram" | "privatecontent" = "playlist",
  limit: number = 50,
) => {
  const url = type === "playlist" ? "/personalized" : `/personalized/${type}`;
  return request({
    url,
    params: {
      limit,
    },
  });
};

// 雷达歌单
export const radarPlaylist = async () => {
  const allRadar = idMeta.radarPlaylist.map((playlist) => {
    return request({
      url: "/playlist/detail",
      params: { id: playlist.id },
    });
  });
  const result = await Promise.allSettled(allRadar);
  return result.map((res: any) => res?.value.playlist);
};

/**
 * 获取热门歌手
 * @param limit - 返回数量，默认为 10
 */
export const topArtists = async (limit: number = 10) => {
  return request({
    url: "/top/artists",
    params: { limit },
  });
};

/**
 * 新歌速递
 * @param {number} type - 全部:0 / 华语:7 / 欧美:96 / 韩国:16 / 日本:8
 */
export const newSongs = async (type: 0 | 7 | 96 | 16 | 8 = 0) => {
  return request({
    url: "/top/song",
    params: { type },
  });
};

// 最新专辑
export const newAlbums = async () => {
  return request({
    url: "/album/new",
  });
};

/**
 * 新碟上架 - 全部
 * @param {string} [cat="ALL"] - ALL:全部 / ZH:华语 / EA:欧美 / KR:韩国 / JP:日本
 * @param {number} [limit=20] - 返回数量，默认20
 * @param {number} [offset=0] - 偏移数量，默认0
 */
export const newAlbumsAll = (
  cat: "ALL" | "ZH" | "EA" | "KR" | "JP" = "ALL",
  limit: number = 20,
  offset: number = 0,
) => {
  return request({
    url: "/album/new",
    params: { cat, limit, offset },
  });
};

// 私人 FM
export const personalFm = () => {
  return request({
    url: "/personal_fm",
    params: {
      timestamp: Date.now(),
    },
  });
};

// 私人 FM - 垃圾桶
export const personalFmToTrash = (id: number) => {
  return request({
    url: "/fm_trash",
    params: { id, timestamp: Date.now() },
  });
};
