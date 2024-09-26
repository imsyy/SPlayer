import request from "@/utils/request";

// 获取歌单详情
export const playlistDetail = (id: number) => {
  return request({
    url: "/playlist/detail",
    params: {
      id,
      s: 0, // 去除返回收藏者
      noCookie: true, // 去除返回 privileges
      timestamp: Date.now(),
    },
  });
};

// 获取歌单所有歌曲
export const playlistAllSongs = (id: number, limit: number = 50, offset: number = 0) => {
  return request({
    url: "/playlist/track/all",
    params: { id, limit, offset, timestamp: Date.now() },
  });
};

/**
 * 获取心动模式播放列表
 * @param {number} id - 歌曲 id
 * @param {number} pid - 歌单 id
 * @param {number} sid - 要开始播放的歌曲的 id
 */
export const heartRateList = (id: number, pid: number, sid?: number) => {
  return request({
    url: "/playmode/intelligence/list",
    params: { id, pid, sid, timestamp: Date.now() },
  });
};

// 获取歌单分类信息
export const playlistCatlist = (hq: boolean = false) => {
  return request({
    url: `/playlist/${hq ? "highquality/tags" : "catlist"}`,
    params: { hq, timestamp: Date.now() },
  });
};

/**
 * 获取所有分类歌单
 * @param cat 歌单分类
 * @param {number} [limit=50] - 返回数量，默认 50
 * @param {number} [offset=0] - 偏移数量，默认 0
 * @param hq 是否精品歌单
 * @param before 分页参数,取上一页最后一个歌单的 updateTime 获取下一页数据
 * @returns
 */
export const allCatlistPlaylist = (
  cat: string,
  limit: number = 50,
  offset: number = 0,
  hq: boolean = false,
  before?: number,
) => {
  // 是否精品歌单
  const url = hq ? "/top/playlist/highquality" : "/top/playlist";
  return request({
    url,
    params: { cat, limit, offset, ...(hq && { before }), timestamp: Date.now() },
  });
};

// 新建歌单
export const createPlaylist = (
  name: string,
  privacy: boolean = false,
  type: "NORMAL" | "VIDEO" | "SHARED" = "NORMAL",
) => {
  return request({
    url: "/playlist/create",
    params: { name, privacy: privacy ? "10" : null, type, timestamp: Date.now() },
  });
};

// 删除歌单
export const deletePlaylist = (id: number) => {
  return request({
    url: "/playlist/delete",
    params: { id, timestamp: Date.now() },
  });
};

// 更新歌单信息
export const updatePlaylist = (id: number, name: string, desc: string, tags: string[]) => {
  return request({
    url: "/playlist/update",
    params: { id, name, desc, tags: tags.join(";"), timestamp: Date.now() },
  });
};

// 公开隐私歌单
export const updatePlaylistPrivacy = (id: number) => {
  return request({
    url: "/playlist/privacy",
    params: { id, timestamp: Date.now() },
  });
};

/**
 * 向歌单中添加或删除歌曲
 * @param {number} pid - 歌单 id
 * @param {Array<number>} tracks - 要添加或删除的歌曲id数组
 * @param {string} [op="add"] - 操作类型，可选，默认为添加
 */
export const playlistTracks = (pid: number, tracks: number[], op: "add" | "del" = "add") => {
  return request({
    url: "/playlist/tracks",
    method: "post",
    data: { pid, tracks: tracks.join(","), op },
    params: { timestamp: Date.now() },
  });
};

/**
 * 收藏/取消收藏歌单
 * @param {number} t - 操作类型，1为收藏，2为取消收藏
 * @param {number} id - 歌单id
 */
export const likePlaylist = (id: number, t: number = 1 | 2) => {
  return request({
    url: "/playlist/subscribe",
    params: { id, t, timestamp: Date.now() },
  });
};

/**
 * 获取专辑排行榜数据
 * @param {boolean} [detail=true] 是否获取详情数据，默认为 true
 */
export const topPlaylist = (detail: boolean = true) => {
  const url = detail ? "/toplist/detail" : "/toplist";
  return request({ url });
};
