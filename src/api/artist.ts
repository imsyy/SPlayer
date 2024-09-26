import request from "@/utils/request";

/**
 * 歌手分类列表
 * @param {number} type - 歌手类型（-1:全部 1:男歌手 2:女歌手 3:乐队）
 * @param {number} area - 歌手区域（-1:全部 7:华语 96:欧美 8:日本 16:韩国 0:其他）
 * @param {number|string} initial - 首字母索引查找参数
 * @param {number} [offset=0] - 偏移数量，默认 0
 * @param {number} [limit=50] - 返回数量，默认 50
 */
export const artistTypeList = (
  type: number = -1,
  area: number = -1,
  initial: number | string = -1,
  offset: number = 0,
  limit: number = 50,
) => {
  return request({
    url: "/artist/list",
    params: {
      type,
      area,
      initial,
      offset,
      limit,
    },
  });
};

/**
 * 获取歌手详情
 * @param {number} id - 歌手id
 */
export const artistDetail = (id: number) => {
  return request({
    url: "/artist/detail",
    params: { id },
  });
};

/**
 * 获取歌手部分信息和热门歌曲
 * @param {number} id - 歌手id
 */
export const artistHotSongs = (id: number) => {
  return request({
    url: "/artists",
    params: { id },
  });
};

/**
 * 获取歌手全部歌曲
 * @param {number} id - 歌手id
 * @param {number} [limit=50] - 返回数量，默认50
 * @param {number} [offset=0] - 偏移数量，默认0
 * @param {string} order - hot: 热门, time: 时间
 */
export const artistAllSongs = (
  id: number,
  limit: number = 50,
  offset: number = 0,
  order: "hot" | "time" = "hot",
) => {
  return request({
    url: "/artist/songs",
    params: { id, limit, offset, order },
  });
};

/**
 * 获取歌手专辑
 * @param {number} id - 歌手id
 * @param {number} [limit=50] - 返回数量，默认50
 * @param {number} [offset=0] - 偏移数量，默认0
 */
export const artistAblums = (id: number, limit: number = 50, offset: number = 0) => {
  return request({
    url: "/artist/album",
    params: { id, limit, offset },
  });
};

/**
 * 获取歌手视频
 * @param {number} id - 歌手id
 * @param {number} [limit=50] - 返回数量，默认50
 * @param {number} [offset=0] - 偏移数量，默认0
 */
export const artistVideos = (id: number, limit: number = 50, offset: number = 0) => {
  return request({
    url: "/artist/mv",
    params: { id, limit, offset },
  });
};

/**
 * 收藏/取消收藏歌手
 * @param {number} t - 操作类型，1 为收藏，其他为取消收藏
 * @param {number} id - 歌手id
 */
export const likeArtist = (id: number, t: number = 1 | 2) => {
  return request({
    url: "/artist/sub",
    params: { id, t, timestamp: new Date().getTime() },
  });
};

/**
 * 搜索歌手
 * @param {string} keyword - 关键词
 * @param {number} [limit=10] - 返回数量
 */
export const searchArtist = (keyword: string, limit: number = 10) => {
  return request({
    url: "/ugc/artist/search",
    params: { keyword, limit },
  });
};
