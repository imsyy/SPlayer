import axios from "axios";

/**
 * 网易云音乐解灰
 * 目前音源采用 咪咕音乐
 */

// 请求头
const requestHeader = {
  Origin: "http://music.migu.cn/",
  Referer: "http://m.music.migu.cn/v3/",
  aversionid: import.meta.env.MAIN_VITE_MIGU_COOKIE || null,
  channel: "0146921",
};

/**
 * 获取咪咕音乐歌曲 ID
 * @param {string} keyword - 搜索关键字
 * @returns {Promise<any>}
 */
const getMiguSongId = async (keyword) => {
  const url =
    "https://m.music.migu.cn/migu/remoting/scr_search_tag?keyword=" +
    keyword.toString() +
    "&type=2&rows=20&pgc=1";
  const result = await axios.get(url, {
    headers: requestHeader,
  });
  if (result.data?.musics?.length) {
    console.log(result.data.musics[0]);
    const oldName = keyword.split("-");
    const songName = result.data.musics[0]?.songName;
    if (songName && !songName?.includes(oldName[0])) {
      console.log("匹配失败");
      return null;
    }
    return result.data.musics[0].id;
  }
  return null;
};

/**
 * 获取给定关键字的音乐 URL
 * @param {string} keyword - 关键字
 * @returns {Promise<?string>} 如果找到，则解析为音乐 URL 的 Promise；如果未找到，则为 null
 * @throws {Error} 抛出错误
 */
const getNeteaseMusicUrl = async (keyword) => {
  const songId = await getMiguSongId(keyword);
  if (!songId) return null;
  const soundQuality = "PQ";
  const url =
    "https://app.c.nf.migu.cn/MIGUM2.0/strategy/listen-url/v2.4?netType=01&resourceType=2&songId=" +
    songId.toString() +
    "&toneFlag=" +
    soundQuality;
  const result = await axios.get(url, {
    headers: requestHeader,
  });
  if (result.data?.data?.url) {
    return result.data.data.url;
  }
  return null;
};

export default getNeteaseMusicUrl;
