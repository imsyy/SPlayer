import axios from "@/utils/request";

/**
 * 专辑部分
 */

/**
 * 获取专辑内容
 * @param {number} id - 专辑id
 */
export const getAlbum = (id) => {
  return axios({
    method: "GET",
    url: "/album",
    params: {
      id,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取全部新碟
 * @param {string} area - 地区码，ALL:全部,ZH:华语,EA:欧美,KR:韩国,JP:日本
 * @param {number} [limit=30] - 返回数量，默认30
 * @param {number} [offset=0] - 偏移数量，默认0
 */
export const getAlbumNew = (area, limit = 30, offset = 0) => {
  return axios({
    method: "GET",
    url: "/album/new",
    params: {
      area,
      limit,
      offset,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取专辑排行榜数据
 * @param {boolean} [detail=true] 是否获取详情数据，默认为true
 */
export const getToplist = (detail = true) => {
  return axios({
    method: "GET",
    url: `/toplist${detail ? "/detail" : null}`,
  });
};

/**
 * 收藏/取消收藏专辑
 * @param {number} t - 操作类型，1为收藏，2为取消收藏
 * @param {number} id - 专辑id
 */
export const likeAlbum = (t, id) => {
  return axios({
    method: "GET",
    url: "/album/sub",
    params: {
      t,
      id,
      timestamp: new Date().getTime(),
    },
  });
};
