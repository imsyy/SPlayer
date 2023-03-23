import axios from "@/utils/request";

/**
 * 视频部分
 */

/**
 * 获取指定MV的详细信息
 * @param {number} mvid - 要查询的MV ID
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
 * 获取指定MV的播放地址
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
 * 获取与指定MV相似的MV列表
 * @param {number} mvid - 要查询的MV ID
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
