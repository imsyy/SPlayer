import DefaultTheme from "vitepress/theme";
import "./custom.css";
import DownloadPage from "../components/DownloadPage.vue";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // 注册全局组件
    app.component("DownloadPage", DownloadPage);
  },
};
