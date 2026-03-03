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

/**
 * 本地歌曲匹配网易云信息
 * @param title 文件的标题信息
 * @param album 文件的专辑信息
 * @param artist 文件的艺术家信息
 * @param duration 文件的时长，单位为秒
 * @param md5 文件的 md5
 */
export const searchMatch = (
  title: string,
  album: string = "",
  artist: string = "",
  duration: number = 0,
  md5: string = "",
) => {
  return request({
    url: "/search/match",
    params: {
      title,
      album,
      artist,
      duration,
      md5,
    },
  });
};
