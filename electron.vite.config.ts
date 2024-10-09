import { resolve } from "path";
import { MainEnv } from "./env";
import { defineConfig, externalizeDepsPlugin, loadEnv } from "electron-vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import viteCompression from "vite-plugin-compression";
import wasm from "vite-plugin-wasm";

export default defineConfig(({ command, mode }) => {
  // 读取环境变量
  const getEnv = (name: keyof MainEnv): string => {
    return loadEnv(mode, process.cwd())[name];
  };
  console.log(command);
  // 获取端口
  const webPort: number = Number(getEnv("VITE_WEB_PORT") || 14558);
  const servePort: number = Number(getEnv("VITE_SERVER_PORT") || 25884);
  // 返回配置
  return {
    // 主进程
    main: {
      plugins: [externalizeDepsPlugin()],
      build: {
        publicDir: resolve(__dirname, "public"),
        rollupOptions: {
          input: {
            index: resolve(__dirname, "electron/main/index.ts"),
            lyric: resolve(__dirname, "web/lyric.html"),
            loading: resolve(__dirname, "web/loading.html"),
          },
        },
      },
    },
    // 预加载
    preload: {
      plugins: [externalizeDepsPlugin()],
      build: {
        rollupOptions: {
          input: {
            index: resolve(__dirname, "electron/preload/index.ts"),
          },
        },
      },
    },
    // 渲染进程
    renderer: {
      root: ".",
      plugins: [
        vue(),
        AutoImport({
          imports: [
            "vue",
            "vue-router",
            "@vueuse/core",
            {
              "naive-ui": ["useDialog", "useMessage", "useNotification", "useLoadingBar"],
            },
          ],
          eslintrc: {
            enabled: true,
            filepath: "./auto-eslint.mjs",
          },
        }),
        Components({
          resolvers: [NaiveUiResolver()],
        }),
        viteCompression(),
        wasm(),
      ],
      resolve: {
        alias: {
          "@": resolve(__dirname, "src/"),
        },
      },
      css: {
        preprocessorOptions: {
          scss: {
            silenceDeprecations: ["legacy-js-api"],
          },
        },
      },
      server: {
        port: webPort,
        // 代理
        proxy: {
          "/api": {
            target: `http://127.0.0.1:${servePort}`,
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, "/api/"),
          },
        },
      },
      preview: {
        port: webPort,
      },
      build: {
        minify: "terser",
        publicDir: resolve(__dirname, "public"),
        rollupOptions: {
          input: {
            index: resolve(__dirname, "index.html"),
          },
          output: {
            manualChunks: {
              stores: ["src/stores/data.ts", "src/stores/index.ts"],
            },
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
