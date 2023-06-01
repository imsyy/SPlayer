import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";
import { VitePWA } from "vite-plugin-pwa";
import { createHtmlPlugin } from "vite-plugin-html";

// https://vitejs.dev/config/
export default ({ mode }) =>
  defineConfig({
    plugins: [
      vue(),
      AutoImport({
        imports: [
          "vue",
          {
            "naive-ui": [
              "useDialog",
              "useMessage",
              "useNotification",
              "useLoadingBar",
            ],
          },
        ],
      }),
      Components({
        resolvers: [NaiveUiResolver()],
      }),
      createHtmlPlugin({
        minify: true,
        template: "index.html",
        inject: {
          data: {
            logo: loadEnv(mode, process.cwd()).VITE_SITE_LOGO,
            appleLogo: loadEnv(mode, process.cwd()).VITE_SITE_APPLE_LOGO,
            title: loadEnv(mode, process.cwd()).VITE_SITE_TITLE,
            author: loadEnv(mode, process.cwd()).VITE_SITE_ANTHOR,
            keywords: loadEnv(mode, process.cwd()).VITE_SITE_KEYWORDS,
            description: loadEnv(mode, process.cwd()).VITE_SITE_DES,
            tongji: loadEnv(mode, process.cwd()).VITE_SITE_BAIDUTONGJI,
          },
        },
      }),
      // PWA
      VitePWA({
        registerType: "autoUpdate",
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: /(.*?)\.(woff2|woff|ttf)/,
              handler: "CacheFirst",
              options: {
                cacheName: "file-cache",
              },
            },
            {
              urlPattern:
                /(.*?)\.(webp|png|jpe?g|svg|gif|bmp|psd|tiff|tga|eps)/,
              handler: "CacheFirst",
              options: {
                cacheName: "image-cache",
              },
            },
          ],
        },
        manifest: {
          name: loadEnv(mode, process.cwd()).VITE_SITE_TITLE,
          short_name: loadEnv(mode, process.cwd()).VITE_SITE_TITLE,
          description: loadEnv(mode, process.cwd()).VITE_SITE_DES,
          display: "standalone",
          start_url: "/",
          theme_color: "#fff",
          background_color: "#efefef",
          icons: [
            {
              src: "/images/logo/favicon.png",
              sizes: "200x200",
              type: "image/png",
            },
          ],
        },
      }),
    ],
    server: {
      port: 2048,
      open: true,
      http: true,
      ssr: false,
      proxy: {
        "/api": {
          target: loadEnv(mode, process.cwd()).VITE_MUSIC_API,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "vue-i18n": "vue-i18n/dist/vue-i18n.cjs.js",
      },
    },
    build: {
      minify: "terser",
      terserOptions: {
        compress: {
          pure_funcs: ["console.log"],
        },
      },
      sourcemap: false,
    },
  });
