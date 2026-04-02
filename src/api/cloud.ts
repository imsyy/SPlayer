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

/**
 * 云盘导入歌曲
 * @param {number} id - 歌曲 id
 * @param {string} song - 歌曲名称
 * @param {string} fileType - 歌曲格式
 * @param {number} fileSize - 歌曲大小
 * @param {number} bitrate - 歌曲比特率
 * @param {string} md5 - 歌曲 md5
 * @param {string} artist - 歌手
 * @param {string} album - 专辑
 */
export const importCloudSong = (
  song: string,
  fileType: string,
  fileSize: number,
  bitrate: number,
  md5: string,
  id?: number,
  artist?: string,
  album?: string,
) => {
  return request({
    url: "/cloud/import",
    method: "POST",
    params: { id, song, fileType, fileSize, bitrate, md5, artist, album, timestamp: Date.now() },
  });
};

/**
 * 获取云盘上传凭证
 * @param {string} md5 - 文件MD5
 * @param {number} fileSize - 文件大小
 * @param {string} filename - 文件名
 */
export const getCloudUploadToken = (
  md5: string,
  fileSize: number,
  filename: string,
) => {
  return request({
    url: "/cloud/upload/token",
    method: "POST",
    params: {
      md5,
      fileSize,
      filename,
      timestamp: Date.now(),
    },
  });
};

/**
 * 完成云盘上传
 * @param {string} songId - 歌曲ID
 * @param {string} filename - 文件名
 * @param {string} resourceId - 资源ID
 * @param {string} md5 - 文件MD5
 * @param {string} song - 歌曲名（可选）
 * @param {string} artist - 艺术家（可选）
 * @param {string} album - 专辑（可选）
 */
export const completeCloudUpload = (
  songId: string,
  filename: string,
  resourceId: string,
  md5: string,
  song?: string,
  artist?: string,
  album?: string,
) => {
  return request({
    url: "/cloud/upload/complete",
    method: "POST",
    params: {
      songId,
      filename,
      resourceId,
      md5,
      song,
      artist,
      album,
      timestamp: Date.now(),
    },
  });
};
