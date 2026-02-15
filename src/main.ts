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
// 自定义指令
app.directive("debounce", debounceDirective);
app.directive("throttle", throttleDirective);
app.directive("visible", visibleDirective);
// 全局错误处理器
app.config.errorHandler = (err, _instance, info) => {
  // 判断是否为非致命错误
  const error = err as Error & { isAxiosError?: boolean; code?: string };
  const message = error?.message || "";
  const nonCriticalKeywords = [
    "timeout",
    "Network Error",
    "网络",
    "超时",
    "ECONNABORTED",
    "ECONNREFUSED",
    "ENOTFOUND",
    "Failed to fetch",
    "Load failed",
  ];
  const isNonCritical =
    error?.isAxiosError ||
    error?.code === "ECONNABORTED" ||
    nonCriticalKeywords.some((kw) => message.includes(kw));

  if (isNonCritical) {
    console.warn("[Vue ErrorHandler] 已忽略非致命错误：", err, info);
    return;
  }
  // 致命错误正常抛出
  console.error("[Vue ErrorHandler] 致命错误：", err, info);
};

// app
app.mount("#app");

// 初始化 ipc
if (!location.hash.includes("desktop-lyric")) initIpc();

// 根据设置判断是否要注册协议
if (isElectron && !location.hash.includes("desktop-lyric")) {
  const settings = useSettingStore();
  sendRegisterProtocol("orpheus", settings.registryProtocol.orpheus);
}
