import { createApp } from "vue";
import App from "./App.vue";
// pinia
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
// router
import router from "@/router";
// 自定义指令
import { debounceDirective, throttleDirective, visibleDirective } from "@/utils/instruction";
// ipc
import initIpc from "@/utils/initIpc";
// use-store
import { useSettingStore } from "@/stores";
import { sendRegisterProtocol } from "@/utils/protocol";
// i18n
import i18n from "@/i18n";

// 全局样式
import "@/style/main.scss";
import "@/style/animate.scss";
import "github-markdown-css/github-markdown.css";
import { isElectron } from "./utils/env";

// 挂载
const app = createApp(App);
// pinia
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);
// router
app.use(router);
// i18n
app.use(i18n);

// 自定义指令
app.directive("debounce", debounceDirective);
app.directive("throttle", throttleDirective);
app.directive("visible", visibleDirective);
// app
app.mount("#app");

// 初始化 ipc
initIpc();

// 根据设置判断是否要注册协议
if (isElectron) {
  const settings = useSettingStore();
  sendRegisterProtocol("orpheus", settings.registryProtocol.orpheus);
}
