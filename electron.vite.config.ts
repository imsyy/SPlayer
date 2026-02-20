import vue from "@vitejs/plugin-vue";
import { defineConfig, loadEnv } from "electron-vite";
import { resolve } from "path";
import AutoImport from "unplugin-auto-import/vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";
import viteCompression from "vite-plugin-compression";
import type { MainEnv } from "./env";
// import VueDevTools from "vite-plugin-vue-devtools";
import wasm from "vite-plugin-wasm";

const commonResolve = {
  alias: {
    "@": resolve(__dirname, "src/"),
    "@emi": resolve(__dirname, "native/external-media-integration"),
    "@shared": resolve(__dirname, "src/types/shared"),
    "@opencc": resolve(__dirname, "native/ferrous-opencc-wasm/pkg"),
    "@native": resolve(__dirname, "native"),
  },
};

export default defineConfig(({ mode }) => {
  // 读取环境变量
  const getEnv = (name: keyof MainEnv): string => {
    return loadEnv(mode, process.cwd())[name];
  };
  // 获取端口
  const webPort: number = Number(getEnv("VITE_WEB_PORT") || 14558);
  const servePort: number = Number(getEnv("VITE_SERVER_PORT") || 25884);
  // 返回配置
  return {
    // 主进程
    main: {
      build: {
        publicDir: resolve(__dirname, "public"),
        rollupOptions: {
          input: {
            index: resolve(__dirname, "electron/main/index.ts"),
            "workers/audio-analysis.worker": resolve(
              __dirname,
              "electron/main/workers/audio-analysis.worker.ts",
            ),
          },
        },
      },
      resolve: commonResolve,
    },
    // 预加载
    preload: {
      build: {
        rollupOptions: {
          input: {
            index: resolve(__dirname, "electron/preload/index.ts"),
          },
        },
      },
      resolve: commonResolve,
    },
    // 渲染进程
    renderer: {
      root: ".",
      plugins: [
        vue(),
        // mode === "development" && VueDevTools(),
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
      resolve: commonResolve,
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
            rewrite: (path) => path.replace(/^\/api/, "/api"),
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
            loading: resolve(__dirname, "web/loading/index.html"),
          },
          external: ["external-media-integration.node"],
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
