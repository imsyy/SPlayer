import request from "@/utils/request";

/**
 * 获取用户账号信息
 */
export const userAccount = () => {
  return request({
    url: "/user/account",
    params: {
      timestamp: Date.now(),
    },
  });
};

// 获取用户详情
export const userDetail = (uid: number) => {
  return request({
    url: "/user/detail",
    params: {
      uid,
      timestamp: Date.now(),
    },
  });
};

// 获取用户等级信息
export const userLevel = () => {
  return request({
    url: "/user/level",
    params: {
      timestamp: Date.now(),
    },
  });
};

// 获取用户订阅信息，包括歌单、收藏、MV 和 DJ 数量
export const userSubcount = () => {
  return request({
    url: "/user/subcount",
    params: {
      timestamp: Date.now(),
    },
  });
};

// 获取用户歌单
export const userPlaylist = (limit: number = 50, offset: number = 0, uid: number) => {
  return request({
    url: "/user/playlist",
    params: {
      uid,
      limit,
      offset,
      timestamp: Date.now(),
    },
  });
};

// 获取用户收藏专辑
export const userAlbum = (limit: number = 50, offset: number = 0) => {
  return request({
    url: "/album/sublist",
    params: {
      limit,
      offset,
      timestamp: Date.now(),
    },
  });
};

// 获取用户收藏歌手
export const userArtist = (limit: number = 50, offset: number = 0) => {
  return request({
    url: "/artist/sublist",
    params: {
      limit,
      offset,
      timestamp: Date.now(),
    },
  });
};

// 获取用户收藏 MV
export const userMv = () => {
  return request({
    url: "/mv/sublist",
    params: {
      timestamp: Date.now(),
    },
  });
};

// 获取用户收藏电台
export const userDj = () => {
  return request({
    url: "/dj/sublist",
    params: {
      timestamp: Date.now(),
    },
  });
};

// 获取用户喜欢的音乐
export const userLike = (uid: number) => {
  return request({
    url: "/likelist",
    params: {
      uid,
      timestamp: Date.now(),
    },
  });
};

// 听歌打卡
export const scrobble = (id: number, sourceid?: number, time?: number) => {
  return request({
    url: "/scrobble",
    params: {
      id,
      sourceid,
      time,
      timestamp: Date.now(),
    },
  });
};

// 每日签到
export const dailySignin = (type: 0 | 1 = 0) => {
  return request({
    url: "/daily_signin",
    params: {
      type,
      timestamp: Date.now(),
    },
  });
};
