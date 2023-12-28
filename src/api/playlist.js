import axios from "@/utils/request";

/**
 * 歌单部分
 */

/**
 * 获取歌单分类信息
 * @param {boolean} [hq=false] - 是否为精品歌单
 */
export const getPlayListCatlist = (hq = false) => {
  return axios({
    method: "GET",
    url: `/playlist/${hq ? "highquality/tags" : "catlist"}`,
  });
};

/**
 * 获取分类歌单列表
 * @param {string} [cat='全部'] - 歌单分类
 * @param {number} [limit=50] - 返回数量，默认50
 * @param {number} [offset=0] - 偏移数量，默认0
 * @param {boolean} [hq=false] - 是否为精品歌单
 * @param {boolean} [before] - 分页参数,取上一页最后一个歌单的 updateTime 获取下一页数据
 */
export const getDscPlaylist = (cat = "全部", limit = 50, offset = 0, hq = false, before) => {
  const url = hq ? "/top/playlist/highquality" : "/top/playlist";
  return axios({
    method: "GET",
    url,
    params: {
      cat,
      limit,
      ...(!hq && { offset }),
      ...(hq && { before }),
    },
  });
};

/**
 * 获取专辑排行榜数据
 * @param {boolean} [detail=true] 是否获取详情数据，默认为 true
 */
export const getTopPlaylist = (detail = true) => {
  const url = detail ? "/toplist/detail" : "/toplist";
  return axios({
    method: "GET",
    url,
  });
};

/**
 * 获取歌单详情
 * @param {number} id - 歌单 id
 */
export const getPlayListDetail = (id) => {
  return axios({
    method: "GET",
    url: "/playlist/detail",
    params: {
      id,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取歌单中所有歌曲信息
 * @param {number} id - 歌单id
 * @param {number} [limit=50] - 返回数量，默认50
 * @param {number} [offset=0] - 偏移数量，默认0
 */
export const getAllPlayList = (id, limit = 50, offset = 0) => {
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
 * 获取心动模式播放列表
 * @param {number} id - 歌曲 id
 * @param {number} pid - 歌单 id
 * @param {number} sid - 要开始播放的歌曲的 id
 * @param {number} [offset=0] - 偏移数量，默认0
 */
export const getHeartRateList = (id, pid, sid) => {
  return axios({
    method: "GET",
    url: "/playmode/intelligence/list",
    params: {
      id,
      pid,
      sid,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 新建歌单
 * @param {string} name 歌单名称
 * @param {boolean} privacy 是否设置为隐私，默认为 false（公开）
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
 * 删除歌单
 * @param {number} id - 歌单 id
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
 * 更新歌单信息
 * @param {number} id - 歌单 id
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
 * 公开隐私歌单
 * @param {number} id - 歌单 id
 */
export const setPlaylistPrivacy = (id) => {
  return axios({
    method: "GET",
    url: "/playlist/privacy",
    params: {
      id,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 向歌单中添加或删除歌曲
 * @param {number} pid - 歌单 id
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
    noCookie: true, // 临时解决无法收藏歌单
    params: {
      t,
      id,
      timestamp: new Date().getTime(),
    },
  });
};
