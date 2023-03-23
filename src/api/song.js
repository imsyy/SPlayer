import axios from "@/utils/request";

/**
 * 歌曲部分
 */

/**
 * 检查指定音乐是否可用
 * @param {number} id - 要检查的音乐ID
 */
export const checkMusicCanUse = (id) => {
  return axios({
    method: "GET",
    hiddenBar: true,
    url: "/check/music",
    params: {
      id,
      time: new Date().getTime(),
    },
  });
};

/**
 * 获取指定音乐的播放链接
 * @param {number} id - 要获取播放链接的音乐ID
 * @param {string} [level='exhigh'] - 可选参数，音质等级。可选值包括'low'、'medium'、'high'、'exhigh'。默认为'exhigh'
 */
export const getMusicUrl = (id, level = "exhigh") => {
  return axios({
    method: "GET",
    hiddenBar: true,
    url: "/song/url/v1",
    params: {
      id,
      level,
    },
  });
};

/**
 * 获取指定音乐的歌词
 * @param {number} id - 要获取歌词的音乐ID
 */
export const getMusicLyric = (id) => {
  return axios({
    method: "GET",
    hiddenBar: true,
    url: "/lyric",
    params: {
      id,
    },
  });
};

/**
 * 获取指定音乐的详情。
 * @param {string} ids - 要获取详情的音乐ID，多个ID用逗号分隔
 */
export const getMusicDetail = (ids) => {
  return axios({
    method: "GET",
    url: "/song/detail",
    params: {
      ids,
    },
  });
};

/**
 * 获取包含指定音乐的相似歌单
 * @param {number} id - 要查询的音乐ID
 */
export const getSimiPlayList = (id) => {
  return axios({
    method: "GET",
    url: "/simi/playlist",
    params: {
      id,
    },
  });
};

/**
 * 获取与指定音乐相似的音乐列表
 * @param {number} id - 要查询的音乐ID
 */
export const getSimiSong = (id) => {
  return axios({
    method: "GET",
    url: "/simi/song",
    params: {
      id,
    },
  });
};
