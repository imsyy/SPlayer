import axios from "@/utils/request";

/**
 * 电台部分
 */

/**
 * 获取电台 - 分类
 */
export const getDjCatelist = () => {
  return axios({
    method: "GET",
    url: "/dj/catelist",
  });
};

/**
 * 获取电台 - 推荐
 */
export const getDjRecommend = () => {
  return axios({
    method: "GET",
    url: "/dj/recommend",
  });
};

/**
 * 电台个性推荐
 */
export const getDjPersonalRec = () => {
  return axios({
    method: "GET",
    url: "/dj/personalize/recommend",
  });
};

/**
 * 获取电台 - 推荐类型
 */
export const getDjCategoryRec = () => {
  return axios({
    method: "GET",
    url: "/dj/category/recommend",
  });
};

/**
 * 私人 DJ
 */
export const getPrivateDj = () => {
  return axios({
    method: "GET",
    url: "/aidj/content/rcmd",
  });
};

/**
 * 电台 - 类别热门电台
 * @param {string} cateId - 类别 id
 * @param {number} [limit=50] - 返回数量，默认 50
 * @param {number} [offset=0] - 偏移数量，默认 0
 */
export const getRadioHot = (cateId, limit = 50, offset = 0) => {
  return axios({
    method: "GET",
    url: "/dj/radio/hot",
    params: {
      cateId,
      limit,
      offset,
    },
  });
};

/**
 * 电台 - 分类推荐
 * @param {string} type - 类别 id
 */
export const getRecType = (type) => {
  return axios({
    method: "GET",
    url: "/dj/recommend/type",
    params: {
      type,
    },
  });
};

/**
 * 电台 - 详情
 * @param {string} rid - 电台 的 id
 */
export const getDjDetail = (rid) => {
  return axios({
    method: "GET",
    url: "/dj/detail",
    params: {
      rid,
    },
  });
};

/**
 * 电台 - 节目
 * @param {string} rid - 电台 的 id
 * @param {number} [limit=50] - 返回数量，默认 50
 * @param {number} [offset=0] - 偏移数量，默认 0
 */
export const getDjProgram = (rid, limit = 50, offset = 0) => {
  return axios({
    method: "GET",
    url: "/dj/program",
    params: {
      rid,
      limit,
      offset,
    },
  });
};

/**
 * 电台 - 订阅
 * @param {number} rid - 电台 的 id
 * @param {number} t - 操作类型，1为收藏，0为取消收藏
 */
export const likeDj = (rid, t) => {
  return axios({
    method: "GET",
    url: "/dj/sub",
    params: {
      rid,
      t,
      timestamp: new Date().getTime(),
    },
  });
};
