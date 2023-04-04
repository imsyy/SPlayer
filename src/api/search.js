import axios from "@/utils/request";

/**
 * 搜索部分
 */

/**
 * 获取热门搜索列表
 */
export const getSearchHot = () => {
  return axios({
    method: "GET",
    hiddenBar: true,
    url: "/search/hot/detail",
  });
};

/**
 * 搜索建议
 * @param {string} keywords - 搜索关键词
 */
export const getSearchSuggest = (keywords) => {
  return axios({
    method: "GET",
    hiddenBar: true,
    url: "/search/suggest",
    params: {
      keywords,
    },
  });
};

/**
 * 搜索结果
 * @param {string} keywords - 搜索关键词
 * @param {number} [limit=30] - 返回数量，默认30
 * @param {number} [offset=0] - 偏移数量，默认0
 * @param {number} [type=1] - 可选参数，搜索类型。1表示单曲，10表示专辑，100表示歌手，1000表示歌单，1002表示用户，1004表示MV，1006表示歌词，1009表示电台，1014表示视频，1018表示综合，2000表示声音。默认为1
 */
export const getSearchData = (keywords, limit = 30, offset = 0, type = 1) => {
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
