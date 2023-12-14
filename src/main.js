import { createApp } from "vue";
import { createPinia } from "pinia";
import { checkPlatform } from "@/utils/helper";
import App from "@/App.vue";
import router from "@/router";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import packageJson from "@/../package.json";

// 全局样式
import "@/style/main.scss";
import "@/style/animate.scss";

// 是否为 Electron
const isElectron = checkPlatform.electron();

// 根据设备类型动态添加
const linkElement = document.createElement("link");
linkElement.rel = "stylesheet";
linkElement.href = isElectron
  ? `${import.meta.env.BASE_URL}font/font.min.css`
  : "https://s1.hdslb.com/bfs/static/jinkela/long/font/regular.css";
document.head.appendChild(linkElement);
document.body.classList.add(isElectron ? "electron" : null);

// 程序重置
window.$cleanAll = (tip = true) => {
  if (tip) {
    const isConfirmed = window.confirm(`确认要重置${isElectron ? "应用程序" : "该站点"}吗？`);
    if (!isConfirmed) return false;
  }
  // 清除 localStorage
  localStorage.clear();
  // 清除 IndexedDB 数据库
  indexedDB.deleteDatabase("filesDB");
  // 清除所有 Cookie
  document.cookie.split(";").forEach((cookie) => {
    var eqPos = cookie.indexOf("=");
    var name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });
  // 清除缓存
  if (caches) {
    caches.keys().then((names) => {
      for (let name of names) caches.delete(name);
    });
  }
  return "已重置应用，请" + (isElectron ? "重启应用" : "刷新页面");
};

// 版权声明
const logoText = import.meta.env.RENDERER_VITE_SITE_TITLE;
const copyrightNotice = `\n\n版本: ${packageJson.version}\n作者: ${packageJson.author}\n作者主页: ${packageJson.home}\nGitHub: ${packageJson.github}`;
console.info(
  `%c${logoText} %c ${copyrightNotice}`,
  "color:#f55e55;font-size:26px;font-weight:bold;",
  "font-size:16px",
);
console.info(
  "若站点出现异常，可尝试在下方输入 %c$cleanAll()%c 然后按回车来重置",
  "background: #eaeffd;color:#f55e55;padding: 4px 6px;border-radius:8px;",
  "background:unset;color:unset;",
);

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
