import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "SPlayer",
  description: "一个简约的音乐播放器",
  lang: "zh-CN",
  ignoreDeadLinks: true,
  head: [
    ["link", { rel: "icon", href: "/favicon.png" }],
    ["meta", { name: "author", content: "imsyy" }],
    ["meta", { name: "keywords", content: "SPlayer,音乐播放器,网易云音乐,Electron,Vue3" }],
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: "/favicon.png",
    siteTitle: "SPlayer",
    nav: [
      { text: "首页", link: "/" },
      { text: "下载", link: "/download" },
      { text: "使用指南", link: "/guide" },
      { text: "API", link: "/api" },
      { text: "GitHub", link: "https://github.com/imsyy/SPlayer" },
    ],

    sidebar: [
      {
        text: "指南",
        items: [
          { text: "下载", link: "/download" },
          { text: "使用指南", link: "/guide" },
        ],
      },
      {
        text: "API",
        items: [{ text: "API 文档", link: "/API" }],
      },
    ],

    outline: {
      level: [2, 3],
      label: "文章目录",
    },

    socialLinks: [{ icon: "github", link: "https://github.com/imsyy/SPlayer" }],

    footer: {
      message: "基于 AGPL-3.0 许可发布",
      copyright: "Copyright © 2025-present imsyy",
    },

    editLink: {
      pattern: "https://github.com/imsyy/SPlayer/edit/main/docs/:path",
      text: "在 GitHub 上编辑此页",
    },

    lastUpdated: {
      text: "最后更新于",
      formatOptions: {
        dateStyle: "short",
        timeStyle: "medium",
      },
    },
  },
});
