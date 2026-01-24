import { useStyleTag } from "@vueuse/core";
import { useSettingStore } from "@/stores";
import { storeToRefs } from "pinia";

/**
 * 自定义代码注入
 */
export const useCustomCode = () => {
  const settingStore = useSettingStore();

  // 注入自定义 CSS (String)
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

  // 注入自定义 CSS (File)
  const { customCssFiles } = storeToRefs(settingStore);
  const { css: fileCss, load: loadCustomFileCss } = useStyleTag("", {
    id: "custom-user-file-css",
  });

  const updateCustomFileCss = async () => {
    if (!customCssFiles.value.length) {
      fileCss.value = "";
      return;
    }
    try {
      const contents = await Promise.all(
        customCssFiles.value.map((path) =>
          window.electron.ipcRenderer.invoke("read-file-content", path),
        ),
      );
      fileCss.value = contents.filter(Boolean).join("\n");
    } catch (error) {
      console.error("[CustomCode] Failed to load custom CSS files:", error);
    }
  };

  watch(
    () => customCssFiles.value,
    () => updateCustomFileCss(),
    { deep: true },
  );

  // 执行自定义 JS
  const executeCustomJs = () => {
    // String JS
    if (settingStore.customJs.trim()) {
      try {
        const customFn = new Function(settingStore.customJs);
        customFn();
        console.log("[CustomCode] Custom JS (String) executed");
      } catch (error) {
        console.error("[CustomCode] Custom JS (String) execution failed:", error);
      }
    }
    // File JS
    if (settingStore.customJsFiles.length) {
      settingStore.customJsFiles.forEach(async (path) => {
        try {
          const content = await window.electron.ipcRenderer.invoke("read-file-content", path);
          if (content) {
            const customFn = new Function(content);
            customFn();
            console.log(`[CustomCode] Custom JS (File: ${path}) executed`);
          }
        } catch (error) {
          console.error(`[CustomCode] Failed to execute custom JS file (${path}):`, error);
        }
      });
    }
  };

  // 初始化时执行
  loadCustomCss();
  loadCustomFileCss();
  updateCustomFileCss();
  executeCustomJs();

  return {
    css,
    fileCss,
    executeCustomJs,
    updateCustomFileCss,
  };
};

