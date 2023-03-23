import axios from "@/api/request";

/*
 * 用户部分
 */

// 二维码 key 生成
export const getQrKey = () => {
  return axios({
    method: "GET",
    loadingBar: "Hidden",
    url: "/login/qr/key",
    params: {
      time: new Date().getTime(),
    },
  });
};

// 二维码生成
export const qrCreate = (key, qrimg = true) => {
  return axios({
    method: "GET",
    loadingBar: "Hidden",
    url: "/login/qr/create",
    params: {
      key,
      qrimg,
      time: new Date().getTime(),
    },
  });
};

// 二维码状态接口
export const checkQr = (key) => {
  return axios({
    method: "GET",
    url: "/login/qr/check",
    loadingBar: "Hidden",
    params: {
      key,
      time: new Date().getTime(),
    },
  });
};

// 手机登录
export const toLogin = (phone, captcha, type = "phone") => {
  return axios({
    method: "GET",
    url: `/login/${type == "phone" ? "cellphone" : null}`,
    params: {
      phone,
      captcha,
      time: new Date().getTime(),
    },
  });
};

// 发送验证码
export const sentCaptcha = (phone) => {
  return axios({
    method: "GET",
    url: "/captcha/sent",
    params: {
      phone,
      time: new Date().getTime(),
    },
  });
};

// 验证验证码
export const verifyCaptcha = (phone, captcha) => {
  return axios({
    method: "GET",
    url: "/captcha/verify",
    params: {
      phone,
      captcha,
      time: new Date().getTime(),
    },
  });
};

// 获取登录状态
export const getLoginState = () => {
  return axios({
    method: "GET",
    url: "/login/status",
    params: {
      time: new Date().getTime(),
    },
  });
};

// 获取用户信息 , 歌单，收藏，mv, dj 数量
export const getUserSubcount = () => {
  return axios({
    method: "GET",
    url: "/user/subcount",
    params: {
      time: new Date().getTime(),
    },
  });
};

// 获取用户等级信息
export const getUserLevel = () => {
  return axios({
    method: "GET",
    url: "/user/level",
    params: {
      time: new Date().getTime(),
    },
  });
};

// 获取用户歌单
export const getUserPlaylist = (uid, limit = 30, offset = 0) => {
  return axios({
    method: "GET",
    url: "/user/playlist",
    params: {
      uid,
      limit,
      offset,
      time: new Date().getTime(),
    },
  });
};

// 新建歌单
export const createPlaylist = (name, privacy = false) => {
  return axios({
    method: "GET",
    url: "/playlist/create",
    params: {
      name,
      privacy,
      time: new Date().getTime(),
    },
  });
};

// 获取用户收藏的歌手列表
export const getUserArtistlist = () => {
  return axios({
    method: "GET",
    url: "/artist/sublist",
    params: {
      time: new Date().getTime(),
    },
  });
};

// 退出登录
export const userLogOut = () => {
  return axios({
    method: "GET",
    url: "/logout",
    params: {
      time: new Date().getTime(),
    },
  });
};

/*
 * 首页部分
 */

// 轮播图
export const getBanner = () => {
  return axios({
    method: "GET",
    url: "/banner",
  });
};

// 热搜内容
export const getSearchHot = () => {
  return axios({
    method: "GET",
    loadingBar: "Hidden",
    url: "/search/hot/detail",
  });
};

// 推荐内容
// 默认歌单, mv, newsong（新音乐）, djprogram（电台）, privatecontent（独家放送）
export const getPersonalized = (type = null, limit = 10) => {
  return axios({
    method: "GET",
    url: `/personalized/${type}`,
    params: {
      limit,
    },
  });
};

// 热门歌手
export const getTopArtists = (limit = 6) => {
  return axios({
    method: "GET",
    url: "/top/artists",
    params: {
      limit,
    },
  });
};

/*
 * 搜索部分
 */

// 搜索建议
export const getSearchSuggest = (keywords) => {
  return axios({
    method: "GET",
    url: "/search/suggest",
    loadingBar: "Hidden",
    params: {
      keywords,
    },
  });
};

// 搜索结果
// 1: 单曲, 10: 专辑, 100: 歌手, 1000: 歌单, 1002: 用户, 1004: MV, 1006: 歌词, 1009: 电台, 1014: 视频, 1018:综合, 2000:声音
export const getSearchData = (keywords, limit = 30, offset = 0, type = 1) => {
  return axios({
    method: "GET",
    url: "/search",
    params: {
      keywords,
      limit,
      offset,
      type,
    },
  });
};

/*
 * 歌曲部分
 */

// 获取音乐是否可用
export const checkMusicCanUse = (id) => {
  return axios({
    method: "GET",
    url: "/check/music",
    loadingBar: "Hidden",
    params: {
      id,
      time: new Date().getTime(),
    },
  });
};

// 获取音乐 url
export const getMusicUrl = (id, level = "exhigh") => {
  return axios({
    method: "GET",
    url: "/song/url/v1",
    loadingBar: "Hidden",
    params: {
      id,
      level,
    },
  });
};

// 获取音乐歌词
export const getMusicLyric = (id) => {
  return axios({
    method: "GET",
    url: "/lyric",
    loadingBar: "Hidden",
    params: {
      id,
    },
  });
};

// 获取歌曲详情
export const getMusicDetail = (ids) => {
  return axios({
    method: "GET",
    url: "/song/detail",
    params: {
      ids,
    },
  });
};

// 获取包含这首歌的歌单
export const getSimiPlayList = (id) => {
  return axios({
    method: "GET",
    url: "/simi/playlist",
    params: {
      id,
    },
  });
};

// 获取相似音乐
export const getSimiSong = (id) => {
  return axios({
    method: "GET",
    url: "/simi/song",
    params: {
      id,
    },
  });
};

/*
 * 视频部分
 */

// 获取 mv 数据
export const getVideoDetail = (mvid) => {
  return axios({
    method: "GET",
    url: "/mv/detail",
    params: {
      mvid,
    },
  });
};

// 获取 mv 播放地址
export const getVideoUrl = (id, r = null) => {
  return axios({
    method: "GET",
    url: "/mv/url",
    loadingBar: "Hidden",
    params: {
      id,
      r,
    },
  });
};

// 获取相似 mv
export const getSimiVideo = (mvid) => {
  return axios({
    method: "GET",
    url: "/simi/mv",
    params: {
      mvid,
    },
  });
};

/*
 * 评论部分
 */

// 获取评论
export const getComment = (id, offset = 0, before = null, type = "music") => {
  return axios({
    method: "GET",
    url: `/comment/${type}`,
    params: {
      id,
      offset,
      before,
      time: new Date().getTime(),
    },
  });
};

// 评论点赞
// 0: 歌曲 1: mv 2: 歌单 3: 专辑 4: 电台节目 5: 视频 6: 动态 7: 电台
export const likeComment = (id, cid, t, type = 0) => {
  return axios({
    method: "GET",
    loadingBar: "Hidden",
    url: "/comment/like",
    params: {
      id,
      cid,
      t,
      type,
      time: new Date().getTime(),
    },
  });
};

/*
 * 云盘部分
 */

// 获取云盘数据
export const getCloud = (limit = 30, offset = 0) => {
  return axios({
    method: "GET",
    url: "/user/cloud",
    params: {
      limit,
      offset,
      time: new Date().getTime(),
    },
  });
};

// 云盘歌曲删除
export const setCloudDel = (id) => {
  return axios({
    method: "GET",
    url: "/user/cloud/del",
    params: {
      id,
      time: new Date().getTime(),
    },
  });
};

// 云盘歌曲信息匹配纠正
export const setCloudMatch = (uid, sid, asid) => {
  return axios({
    method: "GET",
    url: "/cloud/match",
    params: {
      uid,
      sid,
      asid,
      time: new Date().getTime(),
    },
  });
};

// 云盘上传
export const upCloudSong = (file) => {
  let formData = new FormData();
  formData.append("songFile", file);
  return axios({
    url: "/cloud",
    method: "POST",
    loadingBar: "Hidden",
    params: {
      time: new Date().getTime(),
    },
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 200000,
  });
};

/*
 * 歌手部分
 */

// 歌手分类列表
export const getArtistList = (
  type = -1,
  area = -1,
  limit = 30,
  offset = 0,
  initial = -1
) => {
  return axios({
    method: "GET",
    url: "/artist/list",
    params: {
      type,
      area,
      limit,
      offset,
      initial,
    },
  });
};

// 获取歌手详情
export const getArtistDetail = (id) => {
  return axios({
    method: "GET",
    url: "/artist/detail",
    params: {
      id,
    },
  });
};

// 获取歌手单曲
export const getArtistSongs = (id) => {
  return axios({
    method: "GET",
    url: "/artists",
    params: {
      id,
    },
  });
};

// 歌手全部歌曲
export const getArtistAllSongs = (
  id,
  limit = 30,
  offset = 0,
  order = "hot"
) => {
  return axios({
    method: "GET",
    url: "/artist/songs",
    params: {
      id,
      limit,
      offset,
      order,
    },
  });
};

// 获取歌手专辑
export const getArtistAblums = (id, limit = 30, offset = 0) => {
  return axios({
    method: "GET",
    url: "/artist/album",
    params: {
      id,
      limit,
      offset,
    },
  });
};

// 获取歌手视频
export const getArtistVideos = (id, limit = 30, offset = 0) => {
  return axios({
    method: "GET",
    url: "/artist/mv",
    params: {
      id,
      limit,
      offset,
    },
  });
};

// 收藏/取消收藏歌手
export const likeArtist = (t, id) => {
  return axios({
    method: "GET",
    url: "/artist/sub",
    params: {
      t,
      id,
      time: new Date().getTime(),
    },
  });
};

/*
 * 歌单与专辑部分
 */

// 歌单分类
export const getPlayListCatlist = (highquality = false) => {
  return axios({
    method: "GET",
    url: `/playlist/${highquality ? "highquality/tags" : "catlist"}`,
  });
};

// 获取歌单列表
export const getTopPlaylist = (cat = "全部", limit = 30, offset = 0) => {
  return axios({
    method: "GET",
    url: "/top/playlist",
    params: {
      cat,
      limit,
      offset,
    },
  });
};

// 获取精品歌单列表
export const getHighqualityPlaylist = (cat = "全部", limit = 30, before) => {
  return axios({
    method: "GET",
    url: "/top/playlist/highquality",
    params: {
      cat,
      limit,
      before,
    },
  });
};

// 获取歌单详情
export const getPlayListDetail = (id) => {
  return axios({
    method: "GET",
    url: "/playlist/detail",
    params: {
      id,
    },
  });
};

// 获取歌单所有歌曲
export const getAllPlayList = (id, limit = 30, offset = 0) => {
  return axios({
    method: "GET",
    url: "/playlist/track/all",
    params: {
      id,
      limit,
      offset,
    },
  });
};

// 删除歌单
export const delPlayList = (id) => {
  return axios({
    method: "GET",
    url: "/playlist/delete",
    params: {
      id,
      time: new Date().getTime(),
    },
  });
};

// 更新歌单
export const playlistUpdate = (id, name, desc = null, tags = null) => {
  return axios({
    method: "GET",
    url: "/playlist/update",
    params: {
      id,
      name,
      desc,
      tags,
      time: new Date().getTime(),
    },
  });
};

// 对歌单添加或删除歌曲
export const addSongToPlayList = (pid, tracks, op = "add") => {
  return axios({
    method: "GET",
    url: "/playlist/tracks",
    params: {
      op,
      pid,
      tracks,
      time: new Date().getTime(),
    },
  });
};

// 收藏/取消收藏歌单
export const likePlaylist = (t, id) => {
  return axios({
    method: "GET",
    url: "/playlist/subscribe",
    params: {
      t,
      id,
      time: new Date().getTime(),
    },
  });
};

// 获取专辑内容
export const getAlbum = (id) => {
  return axios({
    method: "GET",
    url: "/album",
    params: {
      id,
    },
  });
};

// 最新专辑
export const getNewAlbum = () => {
  return axios({
    method: "GET",
    url: "/album/newest",
  });
};

// 全部新碟
export const getAlbumNew = (area, limit = 30, offset = 0) => {
  return axios({
    method: "GET",
    url: "/album/new",
    params: {
      area,
      limit,
      offset,
    },
  });
};

// 获取排行榜数据
export const getToplist = (detail = true) => {
  return axios({
    method: "GET",
    url: `/toplist${detail ? "/detail" : null}`,
  });
};

/*
 * 登录后部分
 */

// 获取每日推荐歌曲
export const getDailySongs = () => {
  return axios({
    method: "GET",
    url: "/recommend/songs",
    params: {
      time: new Date().getTime(),
    },
  });
};

// 获取历史日推可用日期列表
export const getDailySongsHistory = () => {
  return axios({
    method: "GET",
    url: "/history/recommend/songs",
    params: {
      time: new Date().getTime(),
    },
  });
};

// 获取历史日推详情数据
export const getDailySongsHistoryDetail = (date) => {
  return axios({
    method: "GET",
    url: "/history/recommend/songs/detail",
    params: {
      date,
      time: new Date().getTime(),
    },
  });
};

// 私人 FM
export const getPersonalFm = () => {
  return axios({
    method: "GET",
    url: "/personal_fm",
    loadingBar: "Hidden",
    params: {
      time: new Date().getTime(),
    },
  });
};

// 垃圾桶
export const setFmTrash = (id) => {
  return axios({
    method: "GET",
    url: "/fm_trash",
    loadingBar: "Hidden",
    params: {
      id,
      time: new Date().getTime(),
    },
  });
};

// 喜欢音乐列表
export const getLikelist = (uid) => {
  return axios({
    method: "GET",
    url: "/likelist",
    loadingBar: "Hidden",
    params: {
      uid,
      time: new Date().getTime(),
    },
  });
};

// 喜欢音乐
export const setLikeSong = (id, like = true) => {
  return axios({
    method: "GET",
    url: "/like",
    loadingBar: "Hidden",
    params: {
      id,
      like,
      time: new Date().getTime(),
    },
  });
};
