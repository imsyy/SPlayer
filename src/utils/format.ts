import { useDataStore, useMusicStore, useStatusStore } from "@/stores";
import type { ArtistType, CatType, CommentType, CoverType, MetaData, SongType } from "@/types/main";
import { flatMap, isArray, uniqBy } from "lodash-es";
import { handleSongQuality } from "./helper";
import { msToTime } from "./time";

/**
 * 移除文本中的括号内容（支持中英文括号）
 * @param text 原始文本
 * @returns 处理后的文本
 */
export const removeBrackets = (text: string | undefined): string => {
  if (!text) return "";
  return text.replace(/[（(][^）)]*[）)]/g, "").trim();
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
 * @returns 格式化后的歌曲列表
 */
export const formatSongsList = (data: any[]): SongType[] => {
  if (!data) return [];
  data = isArray(data) ? data : [data];
  return data.filter(Boolean).map((item) => {
    // 特殊处理
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
    return {
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
      mark: item.mark,
      size: Number(item.size || 0),
      path: item.path,
      pc: !!item.pc,
      quality: item?.path
        ? handleSongQuality(item.quality, "local")
        : handleSongQuality(item, "online"),
      playCount: Number(item.playCount || item.listenerCount || 0),
      createTime: Number(item.createTime || item.publishTime) || undefined,
      updateTime: Number(item.lastProgramCreateTime || item.scheduledPublishTime) || undefined,
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
  return data.filter(Boolean).map((item) => {
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
      updateTime: item.updateTime || item.trackNumberUpdateTime || item.trackUpdateTime,
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
  return data.filter(Boolean).map((item) => ({
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
  if (!data) return [];
  data = isArray(data) ? data : [data];
  return data.filter(Boolean).map((item) => ({
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
  if (!data) return [];
  data = isArray(data) ? data : [data];
  return data.filter(Boolean).map((item) => ({
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
    if (!url) return "/images/song.jpg?asset";
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
    return "/images/song.jpg?asset";
  }
};

/**
 * 检测歌词语言
 * @param lyric 歌词内容
 * @returns 语言代码（"ja" | "zh-CN" | "en"）
 */
export const getLyricLanguage = (lyric: string): "ja" | "ko" | "zh-CN" | "en" => {
  if (!lyric || typeof lyric !== "string") return "en";
  // 判断日语 根据平假名和片假名
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(lyric)) return "ja";
  // 判断韩语 根据韩文音节
  if (/[\uAC00-\uD7AF]/.test(lyric)) return "ko";
  // 判断简体中文 根据中日韩统一表意文字基本区
  if (/[\u4E00-\u9FFF]/.test(lyric)) return "zh-CN";
  // 默认英语
  return "en";
};

/**
 * 获取当前播放歌曲
 * @returns 当前播放歌曲
 */
export const getPlaySongData = (): SongType | null => {
  const dataStore = useDataStore();
  const musicStore = useMusicStore();
  const statusStore = useStatusStore();
  // 若为私人FM
  if (statusStore.personalFmMode) {
    return musicStore.personalFMSong;
  }
  // 播放列表
  const playlist = dataStore.playList;
  if (!playlist.length) return null;
  return playlist[statusStore.playIndex];
};

/**
 * 获取播放信息对象
 * @param song 歌曲
 * @param sep 分隔符
 * @returns 播放信息对象
 */
export const getPlayerInfoObj = (
  song?: SongType,
  sep: string = "/",
): { name: string; artist: string; album: string } | null => {
  const musicStore = useMusicStore();
  const playSongData = song || getPlaySongData() || musicStore.playSong;

  if (!playSongData) return null;

  // 标题
  const name = `${playSongData.name || "未知歌曲"}`;

  // 歌手
  const artist =
    playSongData.type === "radio"
      ? "播客电台"
      : Array.isArray(playSongData.artists)
        ? playSongData.artists.map((artists: { name: string }) => artists.name).join(sep)
        : String(playSongData?.artists || "未知歌手");

  // 专辑
  const album =
    playSongData.type === "radio"
      ? "播客电台"
      : typeof playSongData.album === "object"
        ? playSongData.album.name
        : String(playSongData.album || "未知专辑");

  return { name, artist, album };
};

/**
 * 获取播放信息
 * @param song 歌曲
 * @param sep 分隔符
 * @returns 播放信息
 */
export const getPlayerInfo = (song?: SongType, sep: string = "/"): string | null => {
  const info = getPlayerInfoObj(song, sep);
  if (!info) return null;
  return `${info.name} - ${info.artist}`;
};

/**
 * 检测所有输入行的共同最小缩进，将其从每一行中删除，如果第一行和最后一行是空白行，也将其删除
 * @param string 字符串
 * @param lineSplit 分割时的换行符
 * @param lineJoin 连接时的换行符
 * @returns 去除缩进后的字符串
 */
export const trimIndentString = (
  string: string,
  lineSplit: string = "\n",
  lineJoin: string = lineSplit,
): string => {
  if (!string) return "";
  const lines = string.split(lineSplit);
  // 删除第一行和最后一行的空白行
  const relevantLines = lines.filter(
    (line, index) => (index !== 0 && index !== lines.length - 1) || line.trim() !== "",
  );
  // 移除每行的最小缩进
  const minIndent = relevantLines
    .filter((line) => line.trim() !== "")
    .map((line) => line.match(/^\s*/)?.[0].length ?? 0)
    .reduce((min, indent) => Math.min(min, indent), Infinity);
  const trimmedLines = relevantLines.map((line) => line.slice(minIndent));
  return trimmedLines.join(lineJoin);
};

/**
 * 设置中多行描述的模板标签功能
 * 删除最小公共缩进并将换行符转换为 HTML <br> 标记
 *
 * @see trimIndentString
 */
export const descMultiline = (strings: TemplateStringsArray, ...values: any[]): string => {
  const fullString = String.raw(strings, ...values);
  return trimIndentString(fullString, "\n", "<br>");
};
