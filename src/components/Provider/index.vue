<template>
  <!-- 全局配置组件 -->
  <n-config-provider
    :locale="zhCN"
    :date-locale="dateZhCN"
    :theme="theme"
    :theme-overrides="themeOverrides"
    :breakpoints="{
      xs: 0,
      mb: 480,
      s: 640,
      m: 1024,
      l: 1280,
      xl: 1536,
      xxl: 1920,
    }"
    abstract
    inline-theme-disabled
  >
    <n-global-style />
    <n-loading-bar-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-message-provider>
            <slot></slot>
            <NaiveProviderContent />
          </n-message-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<script setup>
import {
  zhCN,
  dateZhCN,
  darkTheme,
  useOsTheme,
  useLoadingBar,
  useDialog,
  useMessage,
  useNotification,
} from "naive-ui";
import { settingStore } from "@/store";
const setting = settingStore();
const osThemeRef = useOsTheme();

// 标题栏元素
const themeColorMeta = document.querySelector('meta[name="theme-color"]');

// 明暗切换
const theme = ref(null);
const changeTheme = () => {
  if (setting.getSiteTheme == "light") {
    theme.value = null;
    themeColorMeta.setAttribute("content", "#ffffff");
  } else if (setting.getSiteTheme == "dark") {
    theme.value = darkTheme;
    themeColorMeta.setAttribute("content", "#18181c");
  }
};

onMounted(() => {
  changeTheme();
});

// 监听明暗变化
watch(
  () => setting.getSiteTheme,
  () => {
    changeTheme();
  }
);

// 监听系统明暗变化
watch(
  () => osThemeRef.value,
  (value) => {
    if (setting.themeAuto) {
      value == "dark"
        ? setting.setSiteTheme("dark")
        : setting.setSiteTheme("light");
    }
  }
);

// 配置主题色
const themeOverrides = {
  common: {
    primaryColor: "#f55e55",
    primaryColorHover: "#F57B74",
    primaryColorSuppl: "#F57B74",
    primaryColorPressed: "#F64B41",
  },
};

// 挂载 naive 组件的方法
const setupNaiveTools = () => {
  window.$loadingBar = useLoadingBar(); // 进度条
  window.$notification = useNotification(); // 通知
  window.$message = useMessage(); // 信息
  window.$dialog = useDialog(); // 对话框
};

const NaiveProviderContent = defineComponent({
  setup() {
    setupNaiveTools();
  },
  render() {
    return h("div", {
      class: {
        tools: true,
      },
    });
  },
});
</script>
