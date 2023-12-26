import axios from "@/utils/request";

/**
 * 用户部分
 */

/**
 * 获取用户信息
 */
export const getUserProfile = () => {
  return axios({
    method: "GET",
    url: "/user/account",
    params: {
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取用户全部信息
 */
export const getUserDetail = (uid) => {
  return axios({
    method: "GET",
    url: "/user/detail",
    params: {
      uid,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取用户等级信息
 */
export const getUserLevel = () => {
  return axios({
    method: "GET",
    url: "/user/level",
    params: {
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取用户订阅信息，包括歌单、收藏、MV 和 DJ 数量
 */
export const getUserSubcount = () => {
  return axios({
    method: "GET",
    url: "/user/subcount",
    params: {
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取用户的歌单列表
 * @param {string} uid 用户的id
 * @param {number} [limit=30] - 返回数量，默认30
 * @param {number} [offset=0] - 偏移数量，默认0
 */
export const getUserPlaylist = (uid, limit = 30, offset = 0) => {
  return axios({
    method: "GET",
    url: "/user/playlist",
    params: {
      uid,
      limit,
      offset,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取用户的专辑列表
 * @param {number} [limit=30] - 返回数量，默认30
 * @param {number} [offset=0] - 偏移数量，默认0
 */
export const getUserAlbum = (limit = 30, offset = 0) => {
  return axios({
    method: "GET",
    url: "/album/sublist",
    params: {
      limit,
      offset,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取用户收藏的歌手列表
 */
export const getUserArtist = () => {
  return axios({
    method: "GET",
    url: "/artist/sublist",
    params: {
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取用户收藏的 MV 列表
 */
export const getUserMv = () => {
  return axios({
    method: "GET",
    url: "/mv/sublist",
    params: {
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取用户电台的订阅列表
 */
export const getUserDj = () => {
  return axios({
    method: "GET",
    url: "/dj/sublist",
    params: {
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取用户喜欢的音乐列表
 * @param {string} uid 用户的id
 */
export const getLikelist = (uid) => {
  return axios({
    method: "GET",
    url: "/likelist",
    params: {
      uid,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 将指定音乐添加或移除喜欢列表
 * @param {number} id 音乐ID
 * @param {boolean} [like=true] 是否添加到喜欢列表，默认为true
 */
export const setLikeSong = (id, like = true) => {
  return axios({
    method: "GET",
    url: "/like",
    params: {
      id,
      like,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 退出登录
 */
export const userLogOut = () => {
  return axios({
    method: "GET",
    url: "/logout",
    params: {
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 每日签到
 * @param {type} type - 签到类型 , 默认 0, 其中 0 为安卓端签到 ,1 为 web/PC 签到
 */
export const userDailySignin = (type = 0) => {
  return axios({
    method: "GET",
    url: "/daily_signin",
    params: {
      type,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 云贝签到
 */
export const userYunbeiSign = () => {
  return axios({
    method: "GET",
    url: "/yunbei/sign",
    params: {
      timestamp: new Date().getTime(),
    },
  });
};
