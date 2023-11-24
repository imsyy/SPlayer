import axios from "@/utils/request";

/**
 * 专辑部分
 */

/**
 * 获取专辑内容
 * @param {number} id - 专辑id
 */
export const getAlbumDetail = (id) => {
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
