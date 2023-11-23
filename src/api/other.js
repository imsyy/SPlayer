import axios from "@/utils/request";

/**
 * 杂项
 */

/**
 * 获取轮播图
 * @param {number} type - 资源类型 / 0: pc / 1: android / 2: iphone / 3: ipad
 */
export const getBanner = (type = 0) => {
  return axios({
    method: "GET",
    url: `/banner?type=${type}`,
  });
};

/**
 * 资源点赞 ( MV,电台,视频 )
 * @param {number} id - 资源 id
 * @param {number} t - 操作, 1 为点赞, 其他为取消点赞
 * @param {number} type - 资源类型 / 0: 歌曲 / 1: mv / 2: 歌单 / 3: 专辑 / 4: 电台节目 / 5: 视频 / 6: 动态 / 7: 电台
 */
export const resourceLike = (id, t = 1, type = 0) => {
  return axios({
    method: "GET",
    url: "/resource/like",
    params: {
      id,
      t,
      type,
    },
  });
};
