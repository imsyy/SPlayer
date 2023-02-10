import {
    createApp
} from 'vue'
import {
    createPinia
} from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

import App from './App.vue'
import router from './router'

// 全局样式
import '@/style/global.scss'

// 字体文件
import 'vfonts/Lato.css'
import 'vfonts/FiraCode.css'

const app = createApp(App)

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);

app.use(router)

app.mount('#app')

// PWA
navigator.serviceWorker.addEventListener('controllerchange', () => {
    // 弹出更新提醒
    console.log("站点已更新，刷新后生效");
    $message.info("站点已更新，刷新后生效", {
        closable: true,
        duration: 0
    });
})