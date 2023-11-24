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
    component: () => import("@/views/search/index.vue"),
    redirect: "/search/songs",
    children: [
      {
        path: "songs",
        name: "sea-songs",
        component: () => import("@/views/search/songs.vue"),
      },
      {
        path: "artists",
        name: "sea-artists",
        component: () => import("@/views/search/artists.vue"),
      },
      {
        path: "albums",
        name: "sea-albums",
        component: () => import("@/views/search/albums.vue"),
      },
      {
        path: "videos",
        name: "sea-videos",
        component: () => import("@/views/search/videos.vue"),
      },
      {
        path: "playlists",
        name: "sea-playlists",
        component: () => import("@/views/search/playlists.vue"),
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
    component: () => import("@/views/discover/index.vue"),
    redirect: "/discover/playlists",
    children: [
      {
        path: "playlists",
        name: "dsc-playlists",
        component: () => import("@/views/discover/playlists.vue"),
      },
      {
        path: "toplists",
        name: "dsc-toplists",
        component: () => import("@/views/discover/toplists.vue"),
      },
      {
        path: "artists",
        name: "dsc-artists",
        component: () => import("@/views/discover/artists.vue"),
      },
      {
        path: "new",
        name: "dsc-new",
        component: () => import("@/views/discover/new.vue"),
      },
    ],
  },
  // 视频
  {
    path: "/videos",
    name: "videos",
    meta: {
      title: "视频",
    },
    component: () => import("@/views/videos/index.vue"),
    redirect: "/videos/list",
    children: [
      {
        path: "list",
        name: "video-list",
        component: () => import("@/views/videos/list.vue"),
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
    component: () => import("@/views/videos/Player.vue"),
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
    component: () => import("@/views/list/playlist.vue"),
  },
  // 歌单 - 用户喜欢
  {
    path: "/like-songs",
    name: "like-songs",
    meta: {
      title: "歌单",
    },
    component: () => import("@/views/list/playlist.vue"),
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
    component: () => import("@/views/list/album.vue"),
  },
  // 本地歌曲
  {
    path: "/local",
    name: "local",
    meta: {
      title: "本地歌曲",
      show: checkPlatform.electron(),
    },
    component: () => import("@/views/local/index.vue"),
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
        component: () => import("@/views/local/songs.vue"),
      },
      {
        path: "artists",
        name: "local-artists",
        component: () => import("@/views/local/artists.vue"),
      },
      {
        path: "albums",
        name: "local-albums",
        component: () => import("@/views/local/albums.vue"),
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
    component: () => import("@/views/setting/index.vue"),
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
    component: () => import("@/views/state/404.vue"),
  },
  {
    path: "/403",
    name: "403",
    meta: {
      title: "403",
    },
    component: () => import("@/views/state/403.vue"),
  },
  {
    path: "/500",
    name: "500",
    meta: {
      title: "500",
    },
    component: () => import("@/views/state/500.vue"),
  },
  {
    path: "/:pathMatch(.*)",
    redirect: "/404",
  },
];

export default routes;
