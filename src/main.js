import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

import App from "./App.vue";
import router from "./router";

// 全局样式
import "@/style/global.scss";

// 字体文件
import "vfonts/Lato.css";
import "vfonts/FiraCode.css";

const app = createApp(App);

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);

app.use(router);

app.mount("#app");

// PWA
if ("serviceWorker" in navigator) {
  console.log("serviceWorker 可用");
  navigator.serviceWorker.ready.then((registration) => {
    registration.addEventListener("updatefound", () => {
      // 新的 Service Worker 可用，准备安装
      registration.installing.addEventListener("statechange", () => {
        if (registration.installing.state === "installed") {
          // Service Worker 已安装，可以更新页面了
          if (navigator.serviceWorker.controller) {
            // 弹出更新提醒
            console.log("站点已更新，刷新后生效");
            $message.info("站点已更新，刷新后生效", {
              closable: true,
              duration: 0,
            });
          } else {
            // Service Worker 已激活，但页面尚未受其控制
            console.log("站点已安装，刷新后生效");
            // $message.info("站点已安装，刷新后生效", {
            //   closable: true,
            //   duration: 0,
            // });
          }
        }
      });
    });
  });
}
