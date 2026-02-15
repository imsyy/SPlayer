import { useStyleTag } from "@vueuse/core";
import { useSettingStore } from "@/stores";
import { storeToRefs } from "pinia";

/**
 * 自定义代码注入
 */
export const useCustomCode = () => {
  const settingStore = useSettingStore();

  // 注入自定义 CSS
  const { customCss } = storeToRefs(settingStore);

  const { css, load: loadCustomCss } = useStyleTag(customCss.value, {
    id: "custom-user-css",
  });

  watch(
    () => customCss.value,
    (newCss) => {
      css.value = newCss;
    },
  );

  // 执行自定义 JS
  const executeCustomJs = () => {
    if (!settingStore.customJs.trim()) return;
    try {
      const customFn = new Function(settingStore.customJs);
      customFn();
      console.log("[CustomCode] 自定义 JavaScript 已执行");
    } catch (error) {
      console.error("[CustomCode] 自定义 JavaScript 执行失败:", error);
    }
  };

  // 初始化时执行
  loadCustomCss();
  executeCustomJs();

  return {
    css,
    executeCustomJs,
  };
};
