import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin, loadEnv } from "electron-vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";
import { VitePWA } from "vite-plugin-pwa";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import viteCompression from "vite-plugin-compression";
import checkPort from "./electron/main/utils/checkPort";

export default defineConfig(async ({ mode }) => {
  // 读取环境变量
  const getEnv = (name) => {
    return loadEnv(mode, process.cwd())[name];
  };
  // 获取端口
  const devPort = await checkPort(getEnv("MAIN_VITE_DEV_PORT"));
  const serverPort = await checkPort(getEnv("MAIN_VITE_SERVER_PORT"));
  // 返回配置
  return {
    // 主进程
    main: {
      resolve: {
        alias: {
          "@main": resolve(__dirname, "electron/main"),
        },
      },
      plugins: [externalizeDepsPlugin()],
      build: {
        publicDir: resolve(__dirname, "public"),
        rollupOptions: {
          input: {
            index: resolve(__dirname, "electron/main/index.js"),
          },
        },
      },
    },
    // 预渲染
    preload: {
      plugins: [externalizeDepsPlugin()],
      build: {
        rollupOptions: {
          input: {
            index: resolve(__dirname, "electron/preload/index.mjs"),
          },
        },
      },
    },
    // 渲染进程
    renderer: {
      resolve: {
        extensions: [".js", ".vue", ".json"],
        alias: {
          "@": resolve(__dirname, "src"),
        },
      },
      plugins: [
        vue(),
        AutoImport({
          imports: [
            "vue",
            {
              "naive-ui": ["useDialog", "useMessage", "useNotification", "useLoadingBar"],
            },
          ],
        }),
        Components({
          resolvers: [NaiveUiResolver()],
        }),
        // viteCompression
        viteCompression(),
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
                urlPattern: /(.*?)\.(webp|png|jpe?g|svg|gif|bmp|psd|tiff|tga|eps)/,
                handler: "CacheFirst",
                options: {
                  cacheName: "image-cache",
                },
              },
            ],
          },
          manifest: {
            name: getEnv("RENDERER_VITE_SITE_TITLE"),
            short_name: getEnv("RENDERER_VITE_SITE_TITLE"),
            description: getEnv("RENDERER_VITE_SITE_DES"),
            display: "standalone",
            start_url: "/",
            theme_color: "#fff",
            background_color: "#efefef",
            icons: [
              {
                src: "/imgs/icons/favicon-32x32.png",
                sizes: "32x32",
                type: "image/png",
              },
              {
                src: "/imgs/icons/favicon-96x96.png",
                sizes: "96x96",
                type: "image/png",
              },
              {
                src: "/imgs/icons/favicon-256x256.png",
                sizes: "256x256",
                type: "image/png",
              },
              {
                src: "/imgs/icons/favicon-512x512.png",
                sizes: "512x512",
                type: "image/png",
              },
            ],
          },
        }),
      ],
      // 服务器配置
      server: {
        port: devPort,
        // 代理
        proxy: {
          "/api": {
            target: `http://${getEnv("MAIN_VITE_SERVER_HOST")}:${serverPort}`,
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ""),
          },
        },
      },
      // 构建
      root: ".",
      build: {
        minify: "terser",
        publicDir: resolve(__dirname, "public"),
        rollupOptions: {
          input: {
            index: resolve(__dirname, "index.html"),
          },
        },
        terserOptions: {
          compress: {
            pure_funcs: ["console.log"],
          },
        },
        sourcemap: false,
      },
    },
  };
});
