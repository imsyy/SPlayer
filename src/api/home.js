import axios from "@/utils/request";

/**
 * 首页推荐部分
 */

/**
 * 获取网站首页轮播图列表
 */
export const getBanner = () => {
  return axios({
    method: "GET",
    url: "/banner",
  });
};

/**
 * 获取每日推荐歌曲
 */
export const getDailySongs = () => {
  return axios({
    method: "GET",
    url: "/recommend/songs",
    params: {
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取历史日推可用日期列表
 */
export const getDailySongsHistory = () => {
  return axios({
    method: "GET",
    url: "/history/recommend/songs",
    params: {
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取历史日推详情数据
 * @param {string} date - 日期
 */
export const getDailySongsHistoryDetail = (date) => {
  return axios({
    method: "GET",
    url: "/history/recommend/songs/detail",
    params: {
      date,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取私人FM数据
 */
export const getPersonalFm = () => {
  return axios({
    method: "GET",
    hiddenBar: true,
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
export const setFmTrash = (id) => {
  return axios({
    method: "GET",
    hiddenBar: true,
    url: "/fm_trash",
    params: {
      id,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取首页推荐内容列表
 * @param {string} [type=null] - 推荐类型，可选值包括"null"（默认歌单），"mv"（MV），"newsong"（新音乐），"djprogram"（电台）和"privatecontent"（独家放送）
 * @param {number} [limit=10] - 返回结果的数量，默认为10
 */
export const getPersonalized = (type = null, limit = 10) => {
  return axios({
    method: "GET",
    url: `/personalized/${type}`,
    params: {
      limit,
    },
  });
};

/**
 * 获取首页热门歌手列表
 * @param {number} [limit=6] - 可选参数，要返回的歌手数量。默认为6个
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
 * 获取首页最新专辑列表
 */
export const getNewAlbum = () => {
  return axios({
    method: "GET",
    url: "/album/newest",
  });
};
