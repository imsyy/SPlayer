import axios from "@/utils/request";

/**
 * 搜索部分
 */

/**
 * 热搜列表 - 详细
 */
export const getSearchHot = () => {
  return axios({
    method: "GET",
    url: "/search/hot/detail",
    params: {
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 搜索建议
 * @param {string} keywords - 搜索关键词
 * @param {Boolean} mobile - 如果传入 true 则返回移动端数据
 */
export const getSearchSuggest = (keywords, mobile = false) => {
  return axios({
    method: "GET",
    url: "/search/suggest",
    params: {
      keywords,
      ...(mobile && { type: "mobile" }),
    },
  });
};

/**
 * 默认搜索关键词
 */
export const getSearchDefault = () => {
  return axios({
    method: "GET",
    url: "/search/default",
    params: {
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 搜索结果
 * @param {string} keywords - 搜索关键词
 * @param {number} [limit=30] - 返回数量，默认30
 * @param {number} [offset=0] - 偏移数量，默认0
 * @param {number} [type=1] - 可选参数，搜索类型。1表示单曲，10表示专辑，100表示歌手，1000表示歌单，1002表示用户，1004表示MV，1006表示歌词，1009表示电台，1014表示视频，1018表示综合，2000表示声音。默认为 1
 */
export const getSearchRes = (keywords, limit = 50, offset = 0, type = 1) => {
  return axios({
    method: "GET",
    url: "/cloudsearch",
    params: {
      keywords,
      limit,
      offset,
      type,
    },
  });
};
