import { createI18n } from "vue-i18n";
import { settingStore } from "@/store";

// 引入语言文件
import en from "./lang/en.js";
import zhCN from "./lang/zh-CN.js";

// 注册 i8n 实例
export const useI18n = (app) => {
  const setting = settingStore();
  const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    locale: setting.language,
    fallbackLocale: "zh-CN",
    messages: {
      en,
      "zh-CN": zhCN,
    },
  });
  app.config.globalProperties.$i18n = i18n;
  app.use(i18n);
  return i18n;
};
