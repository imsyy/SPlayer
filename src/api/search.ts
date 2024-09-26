import request from "@/utils/request";

// 搜索类型枚举
export enum SearchTypes {
  Single = 1,
  Album = 10,
  Artist = 100,
  Playlist = 1000,
  User = 1002,
  Mv = 1004,
  Lyrics = 1006,
  Radio = 1009,
  Video = 1014,
  All = 1018,
  Audio = 2000,
}

// 热搜
export const searchHot = () => {
  return request({
    url: "/search/hot/detail",
  });
};

// 搜索建议
export const searchSuggest = (keywords: string, mobile: boolean = false) => {
  return request({
    url: "/search/suggest",
    params: {
      keywords,
      ...(mobile && { type: "mobile" }),
    },
  });
};

// 搜索多重匹配
export const searchMultimatch = (keywords: string) => {
  return request({
    url: "/search/multimatch",
    params: {
      keywords,
    },
  });
};

// 默认搜索关键词
export const searchDefault = () => {
  return request({
    url: "/search/default",
    params: {
      timestamp: Date.now(),
    },
  });
};

// 搜索结果
export const searchResult = (
  keywords: string,
  limit: number = 50,
  offset = 0,
  type: SearchTypes = SearchTypes.All,
) => {
  return request({
    url: "/cloudsearch",
    params: {
      keywords,
      limit,
      offset,
      type,
    },
  });
};
