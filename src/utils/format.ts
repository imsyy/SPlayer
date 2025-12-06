import { SongType, CoverType, ArtistType, CommentType, MetaData, CatType } from "@/types/main";
import { msToTime } from "./time";
import { flatMap, isArray, uniqBy } from "lodash-es";
import { handleSongQuality } from "./helper";

/**
 * 从歌单详情构建 trackIds 映射表
 * @param trackIds 歌单详情中的 trackIds 数组
 * @returns 构建好的 Map，key 为歌曲 id，value 为 { at: 加入时间 }
 */
export const buildTrackIdsMap = (trackIds?: any[]): Map<number, { at: number }> => {
  const map = new Map<number, { at: number }>();
  if (!trackIds?.length) return map;
  for (const trackInfo of trackIds) {
    if (trackInfo?.id && trackInfo?.at) {
      map.set(trackInfo.id, { at: trackInfo.at });
    }
  }
  return map;
};

type CoverDataType = {
  cover: string;
  coverSize?: {
    s: string;
    m: string;
    l: string;
    xl: string;
  };
};

/**
 * 格式化歌曲列表
 * @param data 歌曲数据
 * @param trackIdsMap 歌单中的 trackIds 映射表（可选），用于获取歌曲加入时间（应传入 Map 类型以获得最佳性能）
 * @returns 格式化后的歌曲列表
 */
export const formatSongsList = (data: any[], trackIdsMap?: Map<number, { at: number }>): SongType[] => {
  if (!data) return [];
  data = isArray(data) ? data : [data];

  return data.map((item) => {
    // 必须在处理 item 前获取，以保留原始的 addTime 数据
    const addTimeFromCloud = item.addTime;

    item = item?.simpleSong ? { ...item.simpleSong, pc: true } : item?.songInfo || item;
    // 歌手数据
    const artist = (): MetaData[] | string => {
      const artistData = item.artist ?? item.artists ?? item.ar;
      if (!artistData) return "";
      if (typeof artistData === "string") return artistData;
      const artistArr = [item.artist, item.artists, item.ar].flat().filter(Boolean);
      if (!artistArr.length) return "";
      return artistArr.map((ar) => ({
        id: ar?.id,
        name: typeof ar === "string" ? ar : ar.name,
        cover: ar?.img1v1Url || ar?.picUrl,
        alias: ar?.alias,
      }));
    };

    // 获取歌曲的加入时间
    // - 云盘歌曲：使用 addTimeFromCloud（API 直接返回）
    // - 其他歌单：使用 trackIdsMap（从 playlistDetail 的 trackIds 构建）
    const addTime = addTimeFromCloud || trackIdsMap?.get(item.id)?.at;    return {
      id: item.id,
      name: item.name,
      artists: artist(),
      album:
        typeof item.album === "string"
          ? item.album
          : {
              id: (item.album || item.al)?.id,
              name: (item.album || item.al)?.name,
              cover: (item.album || item.al)?.picUrl,
            },
      alia: isArray(item.alia || item.alias || item.transNames || item.tns)
        ? item.alia?.[0] || item.alias?.[0] || item.transNames?.[0] || item.tns?.[0]
        : item.alia,
      dj: item.dj
        ? {
            id: item.mainTrackId || item.id,
            name: item.dj?.brand,
            creator: item.dj?.nickname,
          }
        : undefined,
      ...getCoverUrl(item),
      duration: Number(item.duration || item.dt || 0),
      originCoverType: item?.originCoverType,
      free: item.fee || 0,
      mv: item.mv,
      size: Number(item.size || 0),
      path: item.path,
      pc: !!item.pc,
      quality: item?.path
        ? handleSongQuality(item.quality, "local")
        : handleSongQuality(item, "online"),
      playCount: Number(item.playCount || item.listenerCount || 0),
      createTime: Number(item.createTime || item.publishTime) || undefined,
      updateTime: Number(item.lastProgramCreateTime || item.scheduledPublishTime) || undefined,
      addTime,
      type: item?.dj ? "radio" : "song",
    };
  });
};

/**
 * 格式化封面列表
 * @param data 封面数据
 * @returns 格式化后的封面列表
 */
export const formatCoverList = (data: any[]): CoverType[] => {
  if (!data) return [];
  data = isArray(data) ? data : [data];
  return data.map((item) => {
    // 处理数据
    const creator = isArray(item.creator) ? item.creator[0] : item.creator;
    // 获取歌手信息
    const artists = (): string | MetaData[] => {
      const artistData = uniqBy(
        flatMap([item.artist, item.artists, item.ar]).filter(Boolean),
        "id",
      );
      if (artistData.length === 0) return "";
      return artistData.map((artist) => ({
        id: artist?.id,
        name: artist?.name,
        cover: artist?.img1v1Url || artist?.picUrl,
        alias: artist?.alias,
      }));
    };
    return {
      id: item.id || item.vid,
      name: item.name || item.title,
      ...getCoverUrl(item),
      description: item.description || item.desc,
      updateTip: item.updateFrequency,
      creator: {
        id: creator?.userId || item.dj?.userId || 0,
        name: creator?.nickname || creator?.name || creator?.userName || item.dj?.nickname || "",
        avatarUrl: creator?.avatarUrl || item.dj?.avatarUrl || "",
      },
      artists: artists(),
      count: item.trackCount ?? item.size ?? item.programCount ?? 0,
      tags:
        item.tags ||
        item.algTags ||
        item.videoGroup?.map((tag: any) => tag.name) ||
        (item.category ? [item.category] : []),
      userId: item.userId,
      playCount: item.playCount,
      commentCount: item.commentCount,
      shareCount: item.shareCount,
      subCount: item.subCount,
      privacy: item.privacy,
      liked: item.liked,
      likedCount: item.likedCount,
      duration: msToTime(item.duration || item.dt || item.playTime),
      createTime: item.createTime || item.publishTime,
      updateTime: item.updateTime || item.trackNumberUpdateTime,
      // 热榜特殊数据
      tracks: item.tracks,
    };
  });
};

/**
 * 格式化歌手列表
 * @param data 歌手数据
 * @returns 格式化后的歌手列表
 */
export const formatArtistsList = (data: any[]): ArtistType[] => {
  if (!data) return [];
  data = isArray(data) ? data : [data];
  return data.map((item) => ({
    id: item.id,
    name: item.name,
    ...getCoverUrl(item),
    alia: item.alias?.[0],
    identify: item?.identifyTag?.[0],
    description: item.description || item.briefDesc,
    albumSize: item.albumSize,
    musicSize: item.musicSize,
    mvSize: item.mvSize,
    fansSize: item.fans,
  }));
};

/**
 * 格式化评论列表
 * @param data 评论数据
 * @returns 格式化后的评论列表
 */
export const formatCommentList = (data: any[]): CommentType[] => {
  data = isArray(data) ? data : [data];
  return data.map((item) => ({
    id: item.commentId,
    content: item.content,
    beReplied:
      item.beReplied?.length > 0
        ? {
            content: item.beReplied[0]?.content,
            user: {
              id: item.beReplied[0]?.user.userId,
              name: item.beReplied[0]?.user.nickname,
              avatarUrl: item.beReplied[0]?.user.avatarUrl,
            },
          }
        : undefined,
    time: item.time,
    likedCount: item.likedCount,
    liked: item.liked,
    user: {
      id: item.user.userId,
      name: item.user.nickname,
      avatarUrl: item.user.avatarUrl,
      vipType: item.user.vipType,
      vipLevel: item.user.vipRights?.redVipLevel,
      vipIconUrl: item.user.vipRights?.associator?.iconUrl,
      isAnnualCount: item.user.vipRights?.redVipAnnualCount > 0,
    },
    ip: item?.ip
      ? {
          ip: item.ip,
          location: item.location,
        }
      : undefined,
  }));
};

/**
 * 格式化分类列表
 * @param data 分类数据
 * @returns 格式化后的分类列表
 */
export const formatCategoryList = (data: any[]): CatType[] => {
  data = isArray(data) ? data : [data];
  return data.map((item) => ({
    name: item.name,
    category: item.category,
    hot: item.hot,
    count: item.resourceCount,
  }));
};

/**
 * 获取封面图片 URL
 * @param item 封面数据项
 * @returns 格式化后的封面数据
 */
const getCoverUrl = (item: any): CoverDataType => {
  const cover =
    item.cover ||
    item.picUrl ||
    item.coverUrl ||
    item.coverImgUrl ||
    item.imgurl ||
    item.img1v1Url ||
    (item.album || item.al)?.picUrl ||
    item.al?.xInfo?.picUrl;
  const coverSize = {
    s: getCoverSizeUrl(cover, 100),
    m: getCoverSizeUrl(cover, 300),
    l: getCoverSizeUrl(cover, 1024),
    xl: getCoverSizeUrl(cover, 1920),
  };
  return { cover, coverSize };
};

/**
 * 获取封面图片不同尺寸 URL
 * @param url 封面图片 URL
 * @param size 尺寸参数（可选）
 * @returns 格式化后的封面图片 URL
 */
const getCoverSizeUrl = (url: string, size: number | null = null) => {
  try {
    if (!url) return "/images/song.jpg?assest";
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
    return "/images/song.jpg?assest";
  }
};

/**
 * 检测歌词语言
 * @param lyric 歌词内容
 * @returns 语言代码（"ja" | "zh-CN" | "en"）
 */
export const getLyricLanguage = (lyric: string): string => {
  // 判断日语 根据平假名和片假名
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(lyric)) return "ja";
  // 判断简体中文 根据中日韩统一表意文字基本区
  if (/[\u4e00-\u9fa5]/.test(lyric)) return "zh-CN";
  // 默认英语
  return "en";
};
