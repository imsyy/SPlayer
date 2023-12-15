import { checkPlatform } from "@/utils/helper";
import { isLogin } from "@/utils/auth";

const routes = [
  // 首页
  {
    path: "/",
    name: "home",
    meta: {
      title: "主页",
    },
    component: () => import("@/views/home.vue"),
  },
  // 搜索
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
        name: "sea-songs",
        component: () => import("@/views/Search/songs.vue"),
      },
      {
        path: "artists",
        name: "sea-artists",
        component: () => import("@/views/Search/artists.vue"),
      },
      {
        path: "albums",
        name: "sea-albums",
        component: () => import("@/views/Search/albums.vue"),
      },
      {
        path: "videos",
        name: "sea-videos",
        component: () => import("@/views/Search/videos.vue"),
      },
      {
        path: "playlists",
        name: "sea-playlists",
        component: () => import("@/views/Search/playlists.vue"),
      },
    ],
  },
  // 发现音乐
  {
    path: "/discover",
    name: "discover",
    meta: {
      title: "发现",
    },
    component: () => import("@/views/Discover/index.vue"),
    redirect: "/Discover/playlists",
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
      {
        path: "new",
        name: "dsc-new",
        component: () => import("@/views/Discover/new.vue"),
      },
    ],
  },
  // 视频播放
  {
    path: "/videos-player",
    name: "videos-player",
    meta: {
      title: "视频播放器",
    },
    component: () => import("@/views/player.vue"),
  },
  // 评论
  {
    path: "/comment",
    name: "comment",
    meta: {
      title: "评论",
    },
    component: () => import("@/views/comment.vue"),
  },
  // 最近播放
  {
    path: "/history",
    name: "history",
    meta: {
      title: "最近播放",
    },
    component: () => import("@/views/history.vue"),
  },
  // 我的云盘
  {
    path: "/cloud",
    name: "cloud",
    meta: {
      title: "我的云盘",
    },
    component: () => import("@/views/cloud.vue"),
    beforeEnter: (_, __, next) => {
      if (isLogin()) {
        next();
      } else {
        if (typeof $changeLogin !== "undefined") $changeLogin();
        $message.error("请登录后使用");
        $loadingBar.error();
      }
    },
  },
  // 歌单
  {
    path: "/playlist",
    name: "playlist",
    meta: {
      title: "歌单",
    },
    component: () => import("@/views/List/playlist.vue"),
  },
  // 歌单 - 用户喜欢
  {
    path: "/like-songs",
    name: "like-songs",
    meta: {
      title: "歌单",
    },
    component: () => import("@/views/List/playlist.vue"),
    beforeEnter: (_, __, next) => {
      if (isLogin()) {
        next();
      } else {
        if (typeof $changeLogin !== "undefined") $changeLogin();
        $message.error("请登录后使用");
        $loadingBar.error();
      }
    },
  },
  // 专辑
  {
    path: "/album",
    name: "album",
    meta: {
      title: "歌单",
    },
    component: () => import("@/views/List/album.vue"),
  },
  // 歌手
  {
    path: "/artist",
    name: "artist",
    meta: {
      title: "歌手",
    },
    component: () => import("@/views/Artist/index.vue"),
    redirect: "/artist/hot",
    children: [
      {
        path: "hot",
        name: "ar-hot",
        component: () => import("@/views/Artist/hot.vue"),
      },
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
  // 我的收藏
  {
    path: "/like",
    name: "like",
    meta: {
      title: "我的收藏",
    },
    component: () => import("@/views/Like/index.vue"),
    beforeEnter: (_, __, next) => {
      if (isLogin()) {
        next();
      } else {
        if (typeof $changeLogin !== "undefined") $changeLogin();
        $message.error("请登录后使用");
        $loadingBar.error();
      }
    },
    redirect: "/like/albums",
    children: [
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
        path: "playlists",
        name: "like-playlists",
        component: () => import("@/views/Like/playlists.vue"),
      },
    ],
  },
  // 本地歌曲
  {
    path: "/local",
    name: "local",
    meta: {
      title: "本地歌曲",
      show: checkPlatform.electron(),
    },
    component: () => import("@/views/Local/index.vue"),
    beforeEnter: (to, from, next) => {
      if (checkPlatform.electron()) {
        next();
      } else {
        next("/403");
      }
    },
    redirect: "/local/songs",
    children: [
      {
        path: "songs",
        name: "local-songs",
        component: () => import("@/views/Local/songs.vue"),
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
  // 播客
  {
    path: "/record",
    name: "record",
    meta: {
      title: "播客",
    },
    component: () => import("@/views/Record/index.vue"),
    redirect: "/record/hot",
    children: [
      {
        path: "hot",
        name: "record-hot",
        component: () => import("@/views/Record/hot.vue"),
      },
    ],
  },
  // 全局设置
  {
    path: "/setting",
    name: "setting",
    meta: {
      title: "全局设置",
    },
    component: () => import("@/views/Setting/index.vue"),
  },
  // 单曲页面
  {
    path: "/song",
    name: "song",
    meta: {
      title: "全局设置",
    },
    component: () => import("@/views/song.vue"),
  },
  // 测试页面
  {
    path: "/test",
    name: "test",
    meta: {
      title: "测试页面",
    },
    component: () => import("@/views/test.vue"),
  },
  // 状态页
  {
    path: "/404",
    name: "404",
    meta: {
      title: "404",
    },
    component: () => import("@/views/State/404.vue"),
  },
  {
    path: "/403",
    name: "403",
    meta: {
      title: "403",
    },
    component: () => import("@/views/State/403.vue"),
  },
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
