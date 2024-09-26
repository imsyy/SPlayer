import request from "@/utils/request";

// 获取云盘数据
export const userCloud = (limit: number = 50, offset: number = 0) => {
  return request({
    url: "/user/cloud",
    params: {
      limit,
      offset,
      timestamp: Date.now(),
    },
  });
};

// 云盘歌曲删除
export const deleteCloudSong = (id: number) => {
  return request({
    url: "/user/cloud/del",
    params: {
      id,
      timestamp: Date.now(),
    },
  });
};

/**
 * 云盘歌曲信息匹配纠正
 * @param {string} uid - 用户 id
 * @param {string} sid - 原歌曲 id
 * @param {string} asid - 要匹配的歌曲 id
 */
export const matchCloudSong = (uid: number, sid: number, asid: number) => {
  return request({
    url: "/cloud/match",
    params: {
      uid,
      sid,
      asid,
      timestamp: Date.now(),
    },
  });
};

// 上传歌曲到云盘
export const uploadCloudSong = (file: File) => {
  const formData = new FormData();
  formData.append("songFile", file);
  return request({
    url: "/cloud",
    method: "post",
    headers: {
      "Content-Type": "multipart/form-data",
    },
    data: formData,
    params: {
      timestamp: Date.now(),
    },
  });
};
