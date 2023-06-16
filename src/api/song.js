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
      timestamp: new Date().getTime(),
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
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 网易云解灰
 * @param {number} id - 要替换播放链接的音乐ID
 */
export const getMusicNumUrl = async (id) => {
  // const server =
  //   process.env.NODE_ENV === "development"
  //     ? "kuwo,qq,pyncmd,kugou"
  //     : "qq,pyncmd,kugou";
  const server = "kuwo,qq,pyncmd,kugou";
  const url = `${import.meta.env.VITE_UNM_API}match?id=${id}&server=${server}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    return Promise.reject(new Error());
  }
  return await response.json();
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
 * 获取指定音乐的逐字歌词
 * @param {number} id - 要获取逐字歌词的音乐ID
 */
export const getMusicNewLyric = (id) => {
  return axios({
    method: "GET",
    hiddenBar: true,
    url: "/lyric/new",
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
    hiddenBar: true,
    url: "/song/detail",
    params: {
      ids,
      timestamp: new Date().getTime(),
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

/**
 * 获取客户端歌曲下载
 * @param {number} id - 要下载的音乐ID
 * @param {number} br - 码率, 默认设置了 999000 即最大码率, 如果要 320k 则可设置为 320000, 其他类推
 */
export const getSongDownload = (id, br = 999000) => {
  return axios({
    method: "GET",
    hiddenBar: true,
    url: "/song/download/url",
    params: {
      id,
      br,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 听歌打卡
 * @param {number} id - 音乐ID
 * @param {number} sourceid - 来源ID
 */
export const songScrobble = (id, sourceid = 0, time = 0) => {
  return axios({
    method: "GET",
    url: "/scrobble",
    hiddenBar: true,
    params: {
      id,
      sourceid,
      time,
      timestamp: new Date().getTime(),
    },
  });
};
