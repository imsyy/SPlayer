import axios from "@/utils/request";
import idMeta from "@/assets/idMeta.json";

/**
 * 推荐部分
 */

/**
 * 每日推荐 - 需要登录
 * @param {string} [type] - 推荐类型，songs 日推歌曲 / resource 推荐歌单
 */
export const getDailyRec = (type = "songs") => {
  return axios({
    method: "GET",
    url: `/recommend/${type}`,
    params: {
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 推荐内容
 * @param {string} [type] - 推荐类型，mv MV / newsong 新音乐 / djprogram 电台 / privatecontent 独家放送
 * @param {number} [limit=12] - 返回结果的数量，默认为 12
 */
export const getPersonalized = (type, limit = 12) => {
  const url = type ? `/personalized/${type}` : "/personalized";
  return axios({
    method: "GET",
    url,
    params: {
      limit,
    },
  });
};

/**
 * 雷达歌单
 */
export const getRadarPlaylist = async () => {
  const allRadar = idMeta.radarPlaylist.map((playlist) => {
    return axios({
      method: "GET",
      url: "/playlist/detail",
      params: { id: playlist.id },
    });
  });
  const result = await Promise.allSettled(allRadar);
  return result.map((res) => res?.value.playlist);
};

/**
 * 热门歌手列表
 * @param {number} [limit=6] - 要返回的歌手数量，默认为 6 个
 */
export const getTopArtists = (limit = 6) => {
  return axios({
    method: "GET",
    url: "/top/artists",
    params: {
      limit,
    },
  });
};

/**
 * 新歌速递
 * @param {number} type - 全部:0 / 华语:7 / 欧美:96 / 韩国:16 / 日本:8
 */
export const getNewSong = (type = 0) => {
  return axios({
    method: "GET",
    url: "/top/song",
    params: {
      type,
    },
  });
};

/**
 * 新碟上架 - 首页
 */
export const getNewAlbum = () => {
  return axios({
    method: "GET",
    url: "/album/newest",
  });
};

/**
 * 新碟上架 - 全部
 * @param {string} [cat='ALL'] - ALL:全部 / ZH:华语 / EA:欧美 / KR:韩国 / JP:日本
 * @param {number} [limit=50] - 返回数量，默认50
 * @param {number} [offset=0] - 偏移数量，默认0
 */
export const getAllNewAlbum = (area = "ALL", limit = 50, offset = 0) => {
  return axios({
    method: "GET",
    url: "/album/new",
    params: {
      area,
      limit,
      offset,
    },
  });
};

/**
 * 获取私人FM数据
 */
export const getPersonalFm = () => {
  return axios({
    method: "GET",
    url: "/personal_fm",
    params: {
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 将指定歌曲加入垃圾桶
 * @param {number} id 歌曲ID
 */
export const setFmToTrash = (id) => {
  return axios({
    method: "GET",
    url: "/fm_trash",
    params: {
      id,
      timestamp: new Date().getTime(),
    },
  });
};
