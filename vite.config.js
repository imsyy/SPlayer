import {
  fileURLToPath,
  URL
} from 'node:url'
import {
  defineConfig,
  loadEnv
} from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import {
  NaiveUiResolver
} from 'unplugin-vue-components/resolvers'

// https://vitejs.dev/config/
export default ({
  mode
}) => defineConfig({
  plugins: [vue(), AutoImport({
      imports: [
        'vue',
        {
          'naive-ui': [
            'useDialog',
            'useMessage',
            'useNotification',
            'useLoadingBar'
          ]
        }
      ]
    }),
    Components({
      resolvers: [NaiveUiResolver()]
    })
  ],
  server: {
    port: 2048,
    open: true,
    http: true,
    ssr: false,
    proxy: {
      '/api': {
        target: loadEnv(mode, process.cwd()).VITE_MUSIC_API,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      },
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@import "src/style/index.scss";'
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src',
        import.meta.url))
    }
  }
})