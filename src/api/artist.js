import axios from "@/utils/request";

/**
 * 歌手部分
 */

/**
 * 歌手分类列表
 * @param {number} type - 歌手类型（-1:全部 1:男歌手 2:女歌手 3:乐队）
 * @param {number} area - 歌手区域（-1:全部 7:华语 96:欧美 8:日本 16:韩国 0:其他）
 * @param {number} [limit=50] - 返回数量，默认 50
 * @param {number} [offset=0] - 偏移数量，默认 0
 * @param {number} initial - 首字母索引查找参数
 */
export const getArtistList = (type = -1, area = -1, offset = 0, initial = -1, limit = 50) => {
  return axios({
    method: "GET",
    url: "/artist/list",
    params: {
      type,
      area,
      offset,
      initial,
      limit,
    },
  });
};
