import { getSongTime } from "@/utils/timeTools";

/**
 * 格式化原始数据
 * @param {Array} data - 必选参数，输入的原始数据
 * @param {String} type - 必选参数，格式化的类型
 * @return {string} 返回根据 type 参数生成的列表数据
 */
const formatData = (data, type = "playlist", noTracks = false) => {
  if (!data) return null;
  // 若传入的是单个数据对象，转为数组
  const dataArray = Array.isArray(data) ? data : [data];
  // 遍历
  return dataArray.map((v) => {
    // 特殊处理
    if (type === "song") v?.songInfo ? (v = v.songInfo) : v?.simpleSong ? (v = v.simpleSong) : v;
    // 封面处理
    const imgUrl =
      v &&
      (v.picUrl ||
        v.coverUrl ||
        v.coverImgUrl ||
        v.imgurl ||
        v.cover ||
        (v.album && v.album.picUrl) ||
        (v.al && (v.al.picUrl || v.al.xInfo?.picUrl)));
    const cover = getCoverUrl(imgUrl);
    const coverSize = {
      s: getCoverUrl(imgUrl, 100),
      m: getCoverUrl(imgUrl, 300),
      l: getCoverUrl(imgUrl, 1024),
      xl: getCoverUrl(imgUrl, 1920),
    };
    // 类型判断
    switch (type) {
      // 歌单
      case "playlist":
        return {
          id: v.id,
          name: v.name,
          cover,
          coverSize,
          count: v.trackCount,
          creator: v.creator || v.updateFrequency,
          tracks: noTracks ? null : v.tracks,
          playCount: v.playCount,
          createTime: v.createTime,
          updateTime: v.updateTime || v.trackNumberUpdateTime,
          description: v.description,
          tags: v.tags || v.algTags,
          userId: v.userId,
        };
      // 歌曲
      case "song":
        return {
          id: v.id,
          name: v.name,
          artists: v.artists || v.ar,
          album: v.album || v.al,
          cover,
          coverSize,
          mv: v.mv,
          alia: v.alia?.[0] || v.alias?.[0] || v.transNames?.[0],
          fee: v.fee,
          pc: v.pc,
          size: v.size,
          duration: getSongTime(v.duration || v.dt),
        };
      // 歌手
      case "artist":
        return {
          id: v.id,
          name: v.name,
          description: v.briefDesc,
          cover,
          coverSize,
          alias: v.alias,
          size: {
            music: v.musicSize,
            album: v.albumSize,
            mv: v.mvSize,
            fans: v.fansCount,
          },
        };
      // 专辑
      case "album":
        return {
          id: v.id,
          name: v.name,
          alia: v.alias?.[0],
          cover,
          coverSize,
          artists: v.artists,
          description: v.description,
          publishTime: v.publishTime,
          tags: v.tags || v.algTags,
          count: v.size,
          share: v.info?.shareCount,
        };
      // mv
      case "mv":
        return {
          id: v.id || v.vid,
          name: v.name || v.title,
          artists: v.artists || v.creator,
          desc: v.copywriter,
          cover,
          coverSize: getCoverUrl(cover, "464y260"),
          duration: v.duration || v.durationms,
          playCount: v.playCount || v.playTime,
        };
      // dj
      case "dj":
        return {
          id: v.mainTrackId || v.id || v.vid,
          name: v.name,
          creator: v.dj,
          count: v.programCount,
          desc: v.copywriter || v.lastProgramName || v.desc,
          cover,
          coverSize,
          tags: { id: v.categoryId, name: v.category },
          rcmdText: v.rcmdtext || v.rcmdText,
          playCount: v.playCount || v.listenerCount,
          createTime: v.createTime,
          updateTime: v.lastProgramCreateTime || v.scheduledPublishTime,
          duration: getSongTime(v.duration),
        };
      default:
        return null;
    }
  });
};

/**
 * 获取图片的 url
 * @param {string} url - 必选参数，输入的原始图片 url
 * @param {number} size - 可选参数，需要生成的图片尺寸，默认为 null
 * @return {string} 返回根据 url 和 size 参数生成的图片 url
 */
const getCoverUrl = (url, size = null) => {
  try {
    if (!url) return "/images/pic/song.jpg?assest";
    const sizeUrl = size
      ? typeof size === "number"
        ? `?param=${size}y${size}`
        : `?param=${size}`
      : "";
    const imageUrl = url?.replace(/^http:/, "https:");
    if (imageUrl.endsWith(".jpg")) {
      return imageUrl + sizeUrl;
    }
    if (imageUrl.endsWith("&")) {
      const url = imageUrl + "cl";
      return url.replace(/(thumbnail=[0-9]+y[0-9]+&cl)/, `thumbnail=${size}y${size}&`);
    }
    return imageUrl;
  } catch (error) {
    console.error("图片链接处理出错：", error);
    return "/images/pic/song.jpg?assest";
  }
};

export default formatData;
