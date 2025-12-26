import { createI18n } from "vue-i18n";
import zhCN from "@/locales/zh-CN.json";
import enUS from "@/locales/en-US.json";
import jaJP from "@/locales/ja-JP.json";
import koKR from "@/locales/ko-KR.json";
import ruRU from "@/locales/ru-RU.json";

const getLanguage = () => {
  // 优先使用用户手动设置的语言
  const localLang = localStorage.getItem("locale");
  if (localLang) return localLang;

  // 根据系统语言自动匹配
  const sysLang = navigator.language.toLowerCase();
  if (sysLang.startsWith("en")) return "en-US";
  if (sysLang.startsWith("ja")) return "ja-JP";
  if (sysLang.startsWith("ko")) return "ko-KR";
  if (sysLang.startsWith("ru")) return "ru-RU";

  // 默认为中文
  return "zh-CN";
};

const defaultLocale = getLanguage();

const i18n = createI18n({
  legacy: false, // 必须为 false 以支持 Composition API
  locale: defaultLocale, // 默认语言
  fallbackLocale: "zh-CN", // 降级语言
  globalInjection: true, // 全局注入 $t
  messages: {
    "zh-CN": zhCN,
    "en-US": enUS,
    "ja-JP": jaJP,
    "ko-KR": koKR,
    "ru-RU": ruRU,
  },
});

export default i18n;
