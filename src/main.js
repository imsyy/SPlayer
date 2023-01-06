import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

import App from './App.vue'
import router from './router'

// 字体文件
import 'vfonts/Lato.css'
import 'vfonts/FiraCode.css'

const app = createApp(App)

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);

app.use(router)

app.mount('#app')
