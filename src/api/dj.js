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
 * 获取电台 - 推荐类型
 */
export const getDjCategoryRec = () => {
  return axios({
    method: "GET",
    url: "/dj/category/recommend",
  });
};
