import axios from "@/utils/request";

/**
 * 歌曲部分
 */

/**
 * 获取指定音乐的详情
 * @param {string} ids - 要获取详情的音乐ID，多个ID用逗号分隔
 */
export const getSongDetail = (ids) => {
  const timestamp = new Date().getTime();
  return axios({
    method: "POST",
    url: `/song/detail?timestamp=${timestamp}`,
    data: {
      ids,
    },
  });
};

/**
 * 获取音乐 URL
 * @param {number} id - 要获取音乐的 ID。
 * @param {string} [level=standard] - 播放音质等级 / standard: 标准 /  higher: 较高 / exhigh: 极高 / lossless: 无损 / hires: Hi-Res / jyeffect: 高清环绕声 / sky: 沉浸环绕声 / jymaster: 超清母带
 */
export const getSongUrl = (id, level = "standard") => {
  return axios({
    method: "GET",
    url: "/song/url/v1",
    params: {
      id,
      level,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 获取指定音乐的歌词
 * @param {number} id - 要获取歌词的音乐ID
 */
export const getSongLyric = (id) => {
  return axios({
    method: "GET",
    url: "/lyric/new",
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
    params: {
      id,
      sourceid,
      time,
      timestamp: new Date().getTime(),
    },
  });
};
