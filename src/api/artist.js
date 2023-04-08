import axios from "@/utils/request";

/**
 * 歌手部分
 */

/**
 * 歌手分类列表
 * @param {number} type - 歌手类型（-1:全部 1:男歌手 2:女歌手 3:乐队）
 * @param {number} area - 歌手区域（-1:全部 7:华语 96:欧美 8:日本 16:韩国 0:其他）
 * @param {number} [limit=30] - 返回数量，默认30
 * @param {number} [offset=0] - 偏移数量，默认0
 * @param {number} initial - 首字母索引查找参数
 */
export const getArtistList = (
  type = -1,
  area = -1,
  limit = 30,
  offset = 0,
  initial = -1
) => {
  return axios({
    method: "GET",
    url: "/artist/list",
    params: {
      type,
      area,
      limit,
      offset,
      initial,
    },
  });
};

/**
 * 获取歌手详情
 * @param {number} id - 歌手id
 */
export const getArtistDetail = (id) => {
  return axios({
    method: "GET",
    url: "/artist/detail",
    params: {
      id,
    },
  });
};

/**
 * 获取歌手部分信息和热门歌曲
 * @param {number} id - 歌手id
 */
export const getArtistSongs = (id) => {
  return axios({
    method: "GET",
    url: "/artists",
    params: {
      id,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取歌手全部歌曲
 * @param {number} id - 歌手id
 * @param {number} [limit=30] - 返回数量，默认30
 * @param {number} [offset=0] - 偏移数量，默认0
 * @param {string} order - hot: 热门, time: 时间
 */
export const getArtistAllSongs = (
  id,
  limit = 30,
  offset = 0,
  order = "hot"
) => {
  return axios({
    method: "GET",
    url: "/artist/songs",
    params: {
      id,
      limit,
      offset,
      order,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取歌手专辑
 * @param {number} id - 歌手id
 * @param {number} [limit=30] - 返回数量，默认30
 * @param {number} [offset=0] - 偏移数量，默认0
 */
export const getArtistAblums = (id, limit = 30, offset = 0) => {
  return axios({
    method: "GET",
    url: "/artist/album",
    params: {
      id,
      limit,
      offset,
    },
  });
};

/**
 * 获取歌手视频
 * @param {number} id - 歌手id
 * @param {number} [limit=30] - 返回数量，默认30
 * @param {number} [offset=0] - 偏移数量，默认0
 */
export const getArtistVideos = (id, limit = 30, offset = 0) => {
  return axios({
    method: "GET",
    url: "/artist/mv",
    params: {
      id,
      limit,
      offset,
    },
  });
};

/**
 * 收藏/取消收藏歌手
 * @param {number} t - 操作类型，1 为收藏，其他为取消收藏
 * @param {number} id - 歌手id
 */
export const likeArtist = (t, id) => {
  return axios({
    method: "GET",
    hiddenBar: true,
    url: "/artist/sub",
    params: {
      t,
      id,
      timestamp: new Date().getTime(),
    },
  });
};
