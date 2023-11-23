import { createApp } from "vue";
import { createPinia } from "pinia";
import { checkPlatform } from "@/utils/helper";
import App from "@/App.vue";
import router from "@/router";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

// 全局样式
import "@/style/main.scss";
import "@/style/animate.scss";

// 根据设备类型动态添加
const isElectron = checkPlatform.electron();
const linkElement = document.createElement("link");
linkElement.rel = "stylesheet";
linkElement.href = isElectron
  ? `${import.meta.env.BASE_URL}font/font.min.css`
  : "https://s1.hdslb.com/bfs/static/jinkela/long/font/regular.css";
document.head.appendChild(linkElement);
document.body.classList.add(isElectron ? "electron" : null);

// 挂载
const app = createApp(App);
// pinia
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);
// router
app.use(router);
// app
app.mount("#app");
