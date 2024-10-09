import { type RouteRecordRaw } from "vue-router";

const routes: Array<RouteRecordRaw> = [
  // 首页
  {
    path: "",
    name: "home",
    component: () => import("@/views/Home/index.vue"),
  },
  // 搜索
  {
    path: "/search",
    name: "search",
    component: () => import("@/views/Search/layout.vue"),
    beforeEnter: (to, _, next) => {
      if (!to.query.keyword) next({ path: "/403" });
      else next();
    },
    redirect: "/search/songs",
    children: [
      {
        path: "songs",
        name: "search-songs",
        component: () => import("@/views/Search/songs.vue"),
      },
      {
        path: "playlists",
        name: "search-playlists",
        component: () => import("@/views/Search/playlists.vue"),
      },
      {
        path: "artists",
        name: "search-artists",
        component: () => import("@/views/Search/artists.vue"),
      },
      {
        path: "albums",
        name: "search-albums",
        component: () => import("@/views/Search/albums.vue"),
      },
      {
        path: "videos",
        name: "search-videos",
        component: () => import("@/views/Search/videos.vue"),
      },
      {
        path: "radios",
        name: "search-radios",
        component: () => import("@/views/Search/radios.vue"),
      },
    ],
  },
  // 发现
  {
    path: "/discover",
    name: "discover",
    component: () => import("@/views/Discover/layout.vue"),
    redirect: "/discover/playlists",
    children: [
      {
        path: "playlists",
        name: "discover-playlists",
        component: () => import("@/views/Discover/playlists.vue"),
      },
      {
        path: "toplists",
        name: "discover-toplists",
        component: () => import("@/views/Discover/toplists.vue"),
      },
      {
        path: "artists",
        name: "discover-artists",
        component: () => import("@/views/Discover/artists.vue"),
      },
      {
        path: "new",
        name: "discover-new",
        component: () => import("@/views/Discover/new.vue"),
      },
    ],
  },
  // 歌手
  {
    path: "/artist",
    name: "artist",
    beforeEnter: (to, _, next) => {
      if (!to.query.id) next({ path: "/403" });
      else next();
    },
    component: () => import("@/views/Artist/layout.vue"),
    redirect: "/artist/songs",
    children: [
      {
        path: "songs",
        name: "artist-songs",
        component: () => import("@/views/Artist/songs.vue"),
      },
      {
        path: "albums",
        name: "artist-albums",
        component: () => import("@/views/Artist/albums.vue"),
      },
      {
        path: "videos",
        name: "artist-videos",
        component: () => import("@/views/Artist/videos.vue"),
      },
    ],
  },
  // 歌单
  {
    path: "/video",
    name: "video",
    beforeEnter: (to, _, next) => {
      if (!to.query.id) next({ path: "/403" });
      else next();
    },
    component: () => import("@/views/Video.vue"),
  },
  // 专辑
  {
    path: "/album",
    name: "album",
    beforeEnter: (to, _, next) => {
      if (!to.query.id) next({ path: "/403" });
      else next();
    },
    component: () => import("@/views/List/album.vue"),
  },
  // 歌单
  {
    path: "/playlist",
    name: "playlist",
    beforeEnter: (to, _, next) => {
      if (!to.query.id) next({ path: "/403" });
      else next();
    },
    component: () => import("@/views/List/playlist.vue"),
  },
  // 播客
  {
    path: "/radio",
    name: "radio",

    beforeEnter: (to, _, next) => {
      if (!to.query.id) next({ path: "/403" });
      else next();
    },
    component: () => import("@/views/List/radio.vue"),
  },
  // 热门播客
  {
    path: "/radio-hot",
    name: "radio-hot",
    component: () => import("@/views/Radio/hot.vue"),
  },
  // 播客分类
  {
    path: "/radio-type",
    name: "radio-type",
    beforeEnter: (to, _, next) => {
      if (!to.query.id || !to.query.name) next({ path: "/403" });
      else next();
    },
    component: () => import("@/views/Radio/type.vue"),
  },
  // 我喜欢的音乐
  {
    path: "/like-songs",
    name: "like-songs",
    meta: { needLogin: true },
    component: () => import("@/views/List/liked.vue"),
  },
  // 我的云盘
  {
    path: "/cloud",
    name: "cloud",
    meta: { needLogin: true },
    component: () => import("@/views/Cloud.vue"),
  },
  // 每日推荐
  {
    path: "/daily-songs",
    name: "daily-songs",
    meta: { needLogin: true },
    component: () => import("@/views/DailySongs.vue"),
  },
  // 收藏
  {
    path: "/like",
    name: "like",
    meta: { needLogin: true },
    component: () => import("@/views/Like/layout.vue"),
    redirect: "/like/playlists",
    children: [
      {
        path: "playlists",
        name: "like-playlists",
        component: () => import("@/views/Like/playlists.vue"),
      },
      {
        path: "albums",
        name: "like-albums",
        component: () => import("@/views/Like/albums.vue"),
      },
      {
        path: "artists",
        name: "like-artists",
        component: () => import("@/views/Like/artists.vue"),
      },
      {
        path: "videos",
        name: "like-videos",
        component: () => import("@/views/Like/videos.vue"),
      },
      {
        path: "radios",
        name: "like-radios",
        component: () => import("@/views/Like/radios.vue"),
      },
    ],
  },
  // 本地歌曲
  {
    path: "/local",
    name: "local",
    meta: { needApp: true },
    component: () => import("@/views/Local/layout.vue"),
    redirect: "/local/songs",
    children: [
      {
        path: "songs",
        name: "local-songs",
        component: () => import("@/views/Local/song.vue"),
      },
      {
        path: "artists",
        name: "local-artists",
        component: () => import("@/views/Local/artists.vue"),
      },
      {
        path: "albums",
        name: "local-albums",
        component: () => import("@/views/Local/albums.vue"),
      },
    ],
  },
  // 最近播放
  {
    path: "/history",
    name: "history",
    component: () => import("@/views/History.vue"),
  },
  // 状态
  {
    path: "/403",
    name: "403",
    component: () => import("@/views/Status/403.vue"),
  },
  {
    path: "/404",
    name: "404",
    component: () => import("@/views/Status/404.vue"),
  },
  {
    path: "/500",
    name: "500",
    component: () => import("@/views/Status/500.vue"),
  },
];

export default routes;
