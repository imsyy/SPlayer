import { createApp } from "vue";
import App from "./App.vue";
// pinia
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
// router
import router from "@/router";
// 自定义指令
import { debounceDirective, throttleDirective, visibleDirective } from "@/utils/instruction";
// VueVirtualScroller
import VueVirtualScroller from "vue-virtual-scroller";
import "vue-virtual-scroller/dist/vue-virtual-scroller.css";
// ipc
import initIpc from "@/utils/initIpc";
// 全局样式
import "@/style/main.scss";
import "@/style/animate.scss";

// 初始化 ipc
initIpc();

// 挂载
const app = createApp(App);
// pinia
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);
// router
app.use(router);
// VueVirtualScroller
app.use(VueVirtualScroller);
// 自定义指令
app.directive("debounce", debounceDirective);
app.directive("throttle", throttleDirective);
app.directive("visible", visibleDirective);
// app
app.mount("#app");
