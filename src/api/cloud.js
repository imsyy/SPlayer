import axios from "@/utils/request";

/**
 * 云盘部分
 */

/**
 * 获取云盘数据
 * @param {number} [limit=50] - 返回数量，默认 50
 * @param {number} [offset=0] - 偏移数量，默认 0
 */
export const getUserCloud = (limit = 50, offset = 0) => {
  return axios({
    method: "GET",
    url: "/user/cloud",
    params: {
      limit,
      offset,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 用户云盘歌曲删除
 * @param {string} id - 歌曲的id
 */
export const setCloudDel = (id) => {
  return axios({
    method: "GET",
    url: "/user/cloud/del",
    params: {
      id,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 云盘歌曲信息匹配纠正
 * @param {string} uid - 用户 id
 * @param {string} sid - 原歌曲 id
 * @param {string} asid - 要匹配的歌曲 id
 */
export const setCloudMatch = (uid, sid, asid) => {
  return axios({
    method: "GET",
    url: "/cloud/match",
    params: {
      uid,
      sid,
      asid,
      timestamp: new Date().getTime(),
    },
  });
};

/**
 * 用户云盘上传
 * @param {File} file - 要上传的文件
 */
export const upCloudSong = (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append("songFile", file);
  return axios({
    url: "/cloud",
    method: "POST",
    hiddenBar: true,
    params: {
      timestamp: new Date().getTime(),
    },
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 200000,
    onUploadProgress,
  });
};
