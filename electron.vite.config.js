import { resolve } from "path";
import {
  defineConfig,
  externalizeDepsPlugin,
  loadEnv,
  splitVendorChunkPlugin,
} from "electron-vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import viteCompression from "vite-plugin-compression";

export default defineConfig(({ mode }) => {
  // 读取环境变量
  const getEnv = (name) => {
    return loadEnv(mode, process.cwd())[name];
  };
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
            index: resolve(__dirname, "electron/preload/index.js"),
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
        // splitVendorChunkPlugin
        splitVendorChunkPlugin(),
      ],
      // 服务器配置
      server: {
        port: getEnv("MAIN_VITE_DEV_PORT"),
        // 代理
        proxy: {
          "/api": {
            target: `http://${getEnv("MAIN_VITE_SERVER_HOST")}:${getEnv("MAIN_VITE_SERVER_PORT")}`,
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
        win: {
          icon: resolve(__dirname, "/public/images/logo/favicon.png"),
        },
      },
    },
  };
});
