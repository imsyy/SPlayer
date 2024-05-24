import axios from "@/utils/request";

/**
 * 评论部分
 */

/**
 * 获取评论
 * @param {number} id - 对应资源的 id
 * @param {string} type - 对应资源的类型，0: 歌曲, 1: mv, 2: 歌单, 3: 专辑, 4: 电台节目, 5: 视频, 6: 动态, 7: 电台
 * @param {number} pageNo - 分页参数,第 N 页, 默认 1
 * @param {number} pageSize - 分页参数,每页多少条数据, 默认 20
 * @param {number} sortType - 排序方式, 1:按推荐排序, 2:按热度排序, 3:按时间排序
 * @param {number} cursor - 当 sortType 为 3 时且页数不是第一页时需传入, 值为上一条数据的 time
 */
export const getComment = (id, type = 0, pageNo = 1, sortType = 3, pageSize = 20, cursor) => {
  return axios({
    method: "GET",
    url: "/comment/new",
    params: {
      id,
      type,
      pageNo,
      pageSize,
      sortType,
      cursor,
      timestamp: new Date().getTime(),
    },
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
export const getHotComment = (id, type = 0, limit = 20, offset = 0, before) => {
  return axios({
    method: "GET",
    url: "/comment/hot",
    params: {
      id,
      type,
      limit,
      offset,
      before,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 发送 / 删除评论
 * @param {number} id - 对应资源的id
 * @param {number} commentId - 回复的评论 id（回复评论时必填）
 * @param {string} content - 要发送的内容
 * @param {number} t - 是否点赞，0为删除，1为发送，2为回复
 * @param {number} [type=0] - 对应资源的类型，默认为0（歌曲）
 */
export const sendComment = (id, commentId = null, content, t, type = 0) => {
  return axios({
    method: "GET",
    url: "/comment",
    params: {
      id,
      commentId,
      content,
      t,
      type,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 评论点赞
 * @param {number} id - 对应资源的 id
 * @param {number} cid - 评论的 id
 * @param {number} t - 操作, 1 为点赞, 其他为取消点赞
 * @param {number} type - 资源类型 / 0: 歌曲 / 1: mv / 2: 歌单 / 3: 专辑 / 4: 电台节目 / 5: 视频 / 6: 动态 / 7: 电台
 */
export const likeComment = (id, cid, t, type = 0) => {
  return axios({
    method: "GET",
    url: "/comment/like",
    params: {
      id,
      cid,
      t,
      type,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 电台节目评论
 * @param {number} id - 电台节目的 id
 * @param {number} limit - 取出评论数量 , 默认为 20
 * @param {number} offset - 偏移数量 , 用于分页 , 如 :( 评论页数 -1)*20, 其中 20 为 limit 的值
 * @param {string} before - 分页参数,取上一页最后一项的 time 获取下一页数据(获取超过 5000 条评论的时候需要用到)
 */
export const commentDj = (id, limit, offset, before) => {
  return axios({
    method: "GET",
    url: "/comment/dj",
    params: {
      id,
      limit,
      offset,
      before,
      timestamp: new Date().getTime(),
    },
  });
};
