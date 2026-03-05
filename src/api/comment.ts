import request from "@/utils/request";

/**
 * 获取评论
 * @param {number} id - 对应资源的 id
 * @param {string} type - 对应资源的类型，0: 歌曲, 1: mv, 2: 歌单, 3: 专辑, 4: 电台节目, 5: 视频, 6: 动态, 7: 电台
 * @param {number} pageNo - 分页参数,第 N 页, 默认 1
 * @param {number} pageSize - 分页参数,每页多少条数据, 默认 20
 * @param {number} sortType - 排序方式, 1:按推荐排序, 2:按热度排序, 3:按时间排序
 * @param {number} cursor - 当 sortType 为 3 时且页数不是第一页时需传入, 值为上一条数据的 time
 */
export const getComment = (
  id: number,
  type: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 = 0,
  pageNo: number = 1,
  pageSize: number = 20,
  sortType: 1 | 2 | 3 = 1,
  cursor?: number,
) => {
  return request({
    url: "/comment/new",
    params: { id, type, pageNo, pageSize, sortType, cursor, timestamp: Date.now() },
  });
};

/**
 * 获取热门评论
 * @param {number} id - 对应资源的 id
 * @param {string} type - 对应资源的类型，0: 歌曲, 1: mv, 2: 歌单, 3: 专辑, 4: 电台节目, 5: 视频, 6: 动态, 7: 电台
 * @param {number} limit - 取出评论数量 , 默认为 20
 * @param {number} offset - 偏移数量 , 用于分页 , 如 :( 评论页数 -1)*20, 其中 20 为 limit 的值
 * @param {string} before - 分页参数,取上一页最后一项的 time 获取下一页数据(获取超过 5000 条评论的时候需要用到)
 */
export const getHotComment = (
  id: number,
  type: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 = 0,
  limit: number = 20,
  offset: number = 0,
  before?: number,
) => {
  return request({
    url: "/comment/hot",
    params: { id, type, limit, offset, before, timestamp: Date.now() },
  });
};

/**
 * 评论点赞
 * @param {number} id - 对应资源的 id
 * @param {number} t - 操作, 1 为点赞, 其他为取消点赞
 * @param {number} type - 资源类型 / 0: 歌曲 / 1: mv / 2: 歌单 / 3: 专辑 / 4: 电台节目 / 5: 视频 / 6: 动态 / 7: 电台
 */
export const commentLike = (id: number, t: 1 | 2 = 1, type: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 = 0) => {
  return request({
    url: "/resource/like",
    params: { id, t, type, timestamp: Date.now() },
  });
};
