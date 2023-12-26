import axios from "@/utils/request";

/**
 * 视频
 */

/**
 * 获取指定 MV 的详细信息
 * @param {number} mvid - MV ID
 */
export const getVideoDetail = (mvid) => {
  return axios({
    method: "GET",
    url: "/mv/detail",
    params: {
      mvid,
    },
  });
};

/**
 * 获取指定 MV 的点赞转发评论数
 * @param {number} mvid - MV ID
 */
export const getVideoInfo = (mvid) => {
  return axios({
    method: "GET",
    url: "/mv/detail/info",
    params: {
      mvid,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取指定 MV 的播放地址
 * @param {number} id - 要查询的MV ID
 * @param {string} [r=null] - 分辨率。默认值为null
 */
export const getVideoUrl = (id, r = null) => {
  return axios({
    method: "GET",
    hiddenBar: true,
    url: "/mv/url",
    params: {
      id,
      r,
    },
  });
};

/**
 * 获取与指定 MV 相似的 MV 列表
 * @param {number} mvid - 要查询的 MV ID
 */
export const getSimiVideo = (mvid) => {
  return axios({
    method: "GET",
    url: "/simi/mv",
    params: {
      mvid,
    },
  });
};

/**
 * 收藏/取消收藏视频
 * @param {number} t - 操作类型，1为收藏，2为取消收藏
 * @param {number} id - 视频id
 */
export const likeVideo = (t, id) => {
  return axios({
    method: "GET",
    url: "/video/sub",
    params: {
      t,
      id,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 收藏/取消收藏 MV
 * @param {number} t - 操作类型，1为收藏，2为取消收藏
 * @param {number} mvid - MV id
 */
export const likeMv = (t, mvid) => {
  return axios({
    method: "GET",
    url: "/mv/sub",
    params: {
      t,
      mvid,
      timestamp: new Date().getTime(),
    },
  });
};
