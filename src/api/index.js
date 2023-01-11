import axios from "@/api/request";

/* 
 * 用户部分
 */

// 二维码 key 生成
export const getQrKey = () => {
    return axios({
        method: "GET",
        url: "/login/qr/key",
        params: {
            time: new Date().getTime(),
        }
    })
}

// 二维码生成
export const qrCreate = (key, qrimg = true) => {
    return axios({
        method: "GET",
        url: "/login/qr/create",
        params: {
            key,
            qrimg,
            time: new Date().getTime(),
        }
    })
}

// 二维码状态接口
export const checkQr = (key) => {
    return axios({
        method: "GET",
        url: "/login/qr/check",
        loadingBar: "Hidden",
        params: {
            key,
            time: new Date().getTime(),
        }
    })
}

// 获取登录状态
export const getLoginState = () => {
    return axios({
        method: "GET",
        url: "/login/status",
        params: {
            time: new Date().getTime(),
        }
    })
}

// 获取用户等级信息
export const getUserLevel = () => {
    return axios({
        method: "GET",
        url: "/user/level",
        params: {
            time: new Date().getTime(),
        }
    })
}

// 退出登录
export const userLogOut = () => {
    return axios({
        method: "GET",
        url: "/logout",
        params: {
            time: new Date().getTime(),
        }
    })
}

/* 
 * 首页部分
 */

// 轮播图
export const getBanner = () => {
    return axios({
        method: "GET",
        url: "/banner"
    })
}

// 热搜内容
export const getSearchHot = () => {
    return axios({
        method: "GET",
        loadingBar: "Hidden",
        url: "/search/hot/detail"
    })
}

// 推荐内容
// 默认歌单, mv, newsong（新音乐）, djprogram（电台）, privatecontent（独家放送）
export const getPersonalized = (type = null, limit = 10) => {
    return axios({
        method: "GET",
        url: `/personalized/${type}`,
        params: {
            limit,
        }
    })
}

// 热门歌手
export const getTopArtists = (limit = 6) => {
    return axios({
        method: "GET",
        url: "/top/artists",
        params: {
            limit,
        }
    })
}

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
        }
    })
}

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
            type
        }
    })
}

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
        }
    })
}

// 获取音乐 url
export const getMusicUrl = (id) => {
    return axios({
        method: "GET",
        url: "/song/url",
        loadingBar: "Hidden",
        params: {
            id,
            time: new Date().getTime(),
        }
    })
}

// 获取音乐歌词
export const getMusicLyric = (id) => {
    return axios({
        method: "GET",
        url: "/lyric",
        loadingBar: "Hidden",
        params: {
            id,
        }
    })
}

// 获取歌曲详情
export const getMusicDetail = (ids) => {
    return axios({
        method: "GET",
        url: "/song/detail",
        params: {
            ids,
        }
    })
}

// 获取包含这首歌的歌单
export const getSimiPlayList = (id) => {
    return axios({
        method: "GET",
        url: "/simi/playlist",
        params: {
            id,
        }
    })
}

// 获取相似音乐
export const getSimiSong = (id) => {
    return axios({
        method: "GET",
        url: "/simi/song",
        params: {
            id,
        }
    })
}

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
        }
    })
}

// 获取 mv 播放地址
export const getVideoUrl = (id, r = null) => {
    return axios({
        method: "GET",
        url: "/mv/url",
        loadingBar: "Hidden",
        params: {
            id,
            r
        }
    })
}

// 获取相似 mv
export const getSimiVideo = (mvid) => {
    return axios({
        method: "GET",
        url: "/simi/mv",
        params: {
            mvid,
        }
    })
}

/* 
 * 评论部分
 */

// 获取歌曲评论
export const getComment = (id, offset = 0, before = null, type = "music") => {
    return axios({
        method: "GET",
        url: `/comment/${type}`,
        params: {
            id,
            offset,
            before
        }
    })
}

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
        }
    })
}

// 云盘歌曲删除
export const setCloudDel = (id) => {
    return axios({
        method: "GET",
        url: "/user/cloud/del",
        params: {
            id,
            time: new Date().getTime(),
        }
    })
}

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
        }
    })
}

/* 
 * 歌手部分
 */

// 歌手分类列表
export const getArtistList = (type = -1, area = -1, limit = 30, offset = 0, initial = -1) => {
    return axios({
        method: "GET",
        url: "/artist/list",
        params: {
            type,
            area,
            limit,
            offset,
            initial,
        }
    })
}

// 获取歌手详情
export const getArtistDetail = (id) => {
    return axios({
        method: "GET",
        url: "/artist/detail",
        params: {
            id,
        }
    })
}

// 获取歌手单曲
export const getArtistSongs = (id) => {
    return axios({
        method: "GET",
        url: "/artists",
        params: {
            id,
        }
    })
}

// 获取歌手专辑
export const getArtistAblums = (id, limit = 30, offset = 0) => {
    return axios({
        method: "GET",
        url: "/artist/album",
        params: {
            id,
            limit,
            offset,
        }
    })
}

// 获取歌手视频
export const getArtistVideos = (id, limit = 30, offset = 0) => {
    return axios({
        method: "GET",
        url: "/artist/mv",
        params: {
            id,
            limit,
            offset,
        }
    })
}

/* 
 * 歌单与专辑部分
 */

// 歌单分类
export const getPlayListCatlist = (hot = false) => {
    return axios({
        method: "GET",
        url: `/playlist/${hot?'hot':'catlist'}`
    })
}

// 歌单 ( 网友精选碟 )
export const getTopPlaylist = (cat = "全部", limit = 30, offset = 0, order = "hot") => {
    return axios({
        method: "GET",
        url: "/top/playlist",
        params: {
            cat,
            limit,
            offset,
            order,
        }
    })
}

// 获取歌单详情
export const getPlayListDetail = (id) => {
    return axios({
        method: "GET",
        url: "/playlist/detail",
        params: {
            id,
        }
    })
}

// 获取歌单所有歌曲
export const getAllPlayList = (id, limit = 30, offset = 0) => {
    return axios({
        method: "GET",
        url: "/playlist/track/all",
        params: {
            id,
            limit,
            offset,
        }
    })
}

// 获取专辑内容
export const getAlbum = (id) => {
    return axios({
        method: "GET",
        url: "/album",
        params: {
            id,
        }
    })
}

// 最新专辑
export const getNewAlbum = () => {
    return axios({
        method: "GET",
        url: "/album/newest"
    })
}

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
        }
    })
}

// 获取历史日推可用日期列表
export const getDailySongsHistory = () => {
    return axios({
        method: "GET",
        url: "/history/recommend/songs",
        params: {
            time: new Date().getTime(),
        }
    })
}

// 获取历史日推详情数据
export const getDailySongsHistoryDetail = (date) => {
    return axios({
        method: "GET",
        url: "/history/recommend/songs/detail",
        params: {
            date,
            time: new Date().getTime(),
        }
    })
}

// 私人 FM
export const getPersonalFm = () => {
    return axios({
        method: "GET",
        url: "/personal_fm",
        loadingBar: "Hidden",
        params: {
            time: new Date().getTime(),
        }
    })
}

// 垃圾桶
export const setFmTrash = (id) => {
    return axios({
        method: "GET",
        url: "/fm_trash",
        loadingBar: "Hidden",
        params: {
            id,
            time: new Date().getTime(),
        }
    })
}

// 喜欢音乐列表
export const getLikelist = (uid) => {
    return axios({
        method: "GET",
        url: "/likelist",
        loadingBar: "Hidden",
        params: {
            uid,
            time: new Date().getTime(),
        }
    })
}

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
        }
    })
}