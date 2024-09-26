import request from "@/utils/request";

// 获取专辑详情
export const albumDetail = (id: number) => {
  return request({ url: "/album", params: { id } });
};

// 收藏/取消收藏专辑
export const likeAlbum = (id: number, t: number = 1 | 2) => {
  return request({
    url: "/album/sub",
    params: {
      id,
      t,
      timestamp: new Date().getTime(),
    },
  });
};
