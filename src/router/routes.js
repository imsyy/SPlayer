const routes = [
  {
    path: "/",
    name: "home",
    meta: {
      title: "首页",
    },
    component: () => import("@/views/Home/HomeView.vue"),
  },
  // 搜索页
  {
    path: "/search",
    name: "search",
    meta: {
      title: "搜索",
    },
    component: () => import("@/views/Search/index.vue"),
    redirect: "/search/songs",
    children: [
      {
        path: "songs",
        name: "s-songs",
        component: () => import("@/views/Search/songs.vue"),
      },
      {
        path: "artists",
        name: "s-artists",
        component: () => import("@/views/Search/artists.vue"),
      },
      {
        path: "albums",
        name: "s-albums",
        component: () => import("@/views/Search/albums.vue"),
      },
      {
        path: "videos",
        name: "s-videos",
        component: () => import("@/views/Search/videos.vue"),
      },
      {
        path: "playlists",
        name: "s-playlists",
        component: () => import("@/views/Search/playlists.vue"),
      },
    ],
  },
  // 发现页
  {
    path: "/discover",
    name: "discover",
    meta: {
      title: "发现",
    },
    component: () => import("@/views/Discover/index.vue"),
    redirect: "/discover/playlists",
    children: [
      {
        path: "playlists",
        name: "dsc-playlists",
        component: () => import("@/views/Discover/playlists.vue"),
      },
      {
        path: "toplists",
        name: "dsc-toplists",
        component: () => import("@/views/Discover/toplists.vue"),
      },
      {
        path: "artists",
        name: "dsc-artists",
        component: () => import("@/views/Discover/artists.vue"),
      },
    ],
  },
  // 我的页面
  {
    path: "/user",
    name: "user",
    meta: {
      title: "我的",
      needLogin: true,
    },
    component: () => import("@/views/User/index.vue"),
    redirect: "/user/playlists",
    children: [
      {
        path: "playlists",
        name: "user-playlists",
        component: () => import("@/views/User/playlists.vue"),
      },
      {
        path: "like",
        name: "user-like",
        component: () => import("@/views/User/like.vue"),
      },
      {
        path: "album",
        name: "user-album",
        component: () => import("@/views/User/album.vue"),
      },
      {
        path: "artists",
        name: "user-artists",
        component: () => import("@/views/User/artists.vue"),
      },
      {
        path: "cloud",
        name: "user-cloud",
        component: () => import("@/views/User/cloud.vue"),
      },
    ],
  },
  // 评论页
  {
    path: "/comment",
    name: "comment",
    meta: {
      title: "歌曲评论",
    },
    component: () => import("@/views/Comment/CommentView.vue"),
  },
  // 设置页
  {
    path: "/setting",
    name: "setting",
    meta: {
      title: "全局设置",
    },
    component: () => import("@/views/Setting/index.vue"),
    redirect: "/setting/main",
    children: [
      {
        path: "main",
        name: "setting-main",
        component: () => import("@/views/Setting/main.vue"),
      },
      {
        path: "player",
        name: "setting-player",
        component: () => import("@/views/Setting/player.vue"),
      },
      {
        path: "other",
        name: "setting-other",
        component: () => import("@/views/Setting/other.vue"),
      },
    ],
  },
  // 登录页
  {
    path: "/login",
    name: "login",
    meta: {
      title: "登录",
    },
    component: () => import("@/views/Login/LoginView.vue"),
  },
  // 视频页
  {
    path: "/video",
    name: "video",
    meta: {
      title: "视频",
    },
    component: () => import("@/views/Video/VideoView.vue"),
  },
  // 歌单页
  {
    path: "/playlist",
    name: "playlist",
    meta: {
      title: "歌单",
    },
    component: () => import("@/views/PlayList/PlayListView.vue"),
  },
  // 歌曲页
  {
    path: "/song",
    name: "song",
    meta: {
      title: "歌曲",
    },
    component: () => import("@/views/Song/SongView.vue"),
  },
  // 每日推荐
  {
    path: "/dailySongs",
    name: "dailySongs",
    meta: {
      title: "每日推荐",
      needLogin: true,
    },
    component: () => import("@/views/DailySongs/DailySongsView.vue"),
  },
  // 专辑页
  {
    path: "/album",
    name: "album",
    meta: {
      title: "专辑",
    },
    component: () => import("@/views/Album/AlbumView.vue"),
  },
  // 歌手页
  {
    path: "/artist",
    name: "artist",
    meta: {
      title: "歌手",
    },
    component: () => import("@/views/Artist/index.vue"),
    redirect: "/artist/songs",
    children: [
      {
        path: "songs",
        name: "ar-songs",
        component: () => import("@/views/Artist/songs.vue"),
      },
      {
        path: "albums",
        name: "ar-albums",
        component: () => import("@/views/Artist/albums.vue"),
      },
      {
        path: "videos",
        name: "ar-videos",
        component: () => import("@/views/Artist/videos.vue"),
      },
    ],
  },
  // 歌手全部歌曲
  {
    path: "/all-songs",
    name: "all-songs",
    meta: {
      title: "全部歌曲",
    },
    component: () => import("@/views/Artist/all-songs.vue"),
  },
  // 历史记录
  {
    path: "/history",
    name: "history",
    meta: {
      title: "history",
    },
    component: () => import("@/views/History/HistoryView.vue"),
  },
  // 全部新碟
  {
    path: "/new-album",
    name: "new-album",
    meta: {
      title: "全部新碟",
    },
    component: () => import("@/views/NewAlbum/NewAlbumView.vue"),
  },
  // 状态页
  // 404
  {
    path: "/404",
    name: "404",
    meta: {
      title: "404",
    },
    component: () => import("@/views/State/404.vue"),
  },
  // 403
  {
    path: "/403",
    name: "403",
    meta: {
      title: "403",
    },
    component: () => import("@/views/State/403.vue"),
  },
  // 500
  {
    path: "/500",
    name: "500",
    meta: {
      title: "500",
    },
    component: () => import("@/views/State/500.vue"),
  },
  {
    path: "/:pathMatch(.*)",
    redirect: "/404",
  },
];

export default routes;
