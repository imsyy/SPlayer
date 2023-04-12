import axios from "@/utils/request";

/**
 * 歌单部分
 */

/**
 * 获取歌单分类信息
 * @param {boolean} [highquality=false] - 是否为精品歌单标签
 */
export const getPlayListCatlist = (highquality = false) => {
  return axios({
    method: "GET",
    url: `/playlist/${highquality ? "highquality/tags" : "catlist"}`,
  });
};

/**
 * 获取歌单分类列表
 * @param {string} [cat='全部'] - 歌单分类
 * @param {number} [limit=30] - 返回数量，默认30
 * @param {number} [offset=0] - 偏移数量，默认0
 */
export const getTopPlaylist = (cat = "全部", limit = 30, offset = 0) => {
  return axios({
    method: "GET",
    url: "/top/playlist",
    params: {
      cat,
      limit,
      offset,
    },
  });
};

/**
 * 获取精品歌单列表
 * @param {string} [cat='全部'] - 歌单分类
 * @param {number} [limit=30] - 返回数量，默认30
 * @param {number} [before] - 上一页最后一个歌单的updateTime，用于翻页
 */
export const getHighqualityPlaylist = (cat = "全部", limit = 30, before) => {
  return axios({
    method: "GET",
    url: "/top/playlist/highquality",
    params: {
      cat,
      limit,
      before,
    },
  });
};

/**
 * 获取歌单详情
 * @param {number} id - 歌单id
 */
export const getPlayListDetail = (id) => {
  return axios({
    method: "GET",
    url: "/playlist/detail",
    withCredentials: false,
    params: {
      id,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取歌单中所有歌曲信息
 * @param {number} id - 歌单id
 * @param {number} [limit=30] - 返回数量，默认30
 * @param {number} [offset=0] - 偏移数量，默认0
 */
export const getAllPlayList = (id, limit = 30, offset = 0) => {
  return axios({
    method: "GET",
    url: "/playlist/track/all",
    params: {
      id,
      limit,
      offset,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 新建歌单（登录后调用）
 * @param {string} name 歌单名称
 * @param {boolean} privacy 是否设置为隐私，默认为false（公开）
 */
export const createPlaylist = (name, privacy = false) => {
  return axios({
    method: "GET",
    url: "/playlist/create",
    params: {
      name,
      privacy,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 删除歌单（登录后调用）
 * @param {number} id - 歌单id
 */
export const delPlayList = (id) => {
  return axios({
    method: "GET",
    url: "/playlist/delete",
    params: {
      id,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 更新歌单信息（登录后调用）
 * @param {number} id - 歌单id
 * @param {string} name - 歌单名称
 * @param {string|null} [desc=null] - 歌单描述，可选
 * @param {string|null} [tags=null] - 歌单标签，可选，多个用 `;` 隔开，只能用官方规定标签
 */
export const playlistUpdate = (id, name, desc = null, tags = null) => {
  return axios({
    method: "GET",
    url: "/playlist/update",
    params: {
      id,
      name,
      desc,
      tags,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 向歌单中添加或删除歌曲
 * @param {number} pid - 歌单id
 * @param {Array<number>} tracks - 要添加或删除的歌曲id数组
 * @param {string} [op='add'] - 操作类型，可选，默认为添加
 */
export const addSongToPlayList = (pid, tracks, op = "add") => {
  return axios({
    method: "GET",
    url: "/playlist/tracks",
    params: {
      op,
      pid,
      tracks,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 收藏/取消收藏歌单
 * @param {number} t - 操作类型，1为收藏，2为取消收藏
 * @param {number} id - 歌单id
 */
export const likePlaylist = (t, id) => {
  return axios({
    method: "GET",
    url: "/playlist/subscribe",
    params: {
      t,
      id,
      timestamp: new Date().getTime(),
    },
  });
};
