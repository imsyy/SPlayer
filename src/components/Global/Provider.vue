<!-- 全局配置 -->
<template>
  <n-config-provider
    :locale="zhCN"
    :date-locale="dateZhCN"
    :breakpoints="breakpoints"
    :theme="theme"
    :theme-overrides="themeOverrides"
    abstract
    inline-theme-disabled
  >
    <n-global-style />
    <n-loading-bar-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-message-provider :max="1" placement="bottom">
            <slot />
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
import { storeToRefs } from "pinia";
import { siteSettings, siteStatus } from "@/stores";
import themeColorData from "@/assets/themeColor.json";

const status = siteStatus();
const settings = siteSettings();
const osThemeRef = useOsTheme();
const { coverTheme } = storeToRefs(status);
const { themeType, themeAuto, themeTypeName, themeTypeData, themeAutoCover } =
  storeToRefs(settings);

// 默认配置数据
const themeOverrides = ref(null);
const theme = ref(themeType.value === "dark" ? darkTheme : null);
const breakpoints = { xs: 320, s: 540, sm: 780, m: 1024, l: 1280, xl: 1536 };

// 明暗切换
const changeTheme = () => {
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeType.value === "light") {
    theme.value = null;
    themeColorMeta.setAttribute("content", "#ffffff");
  } else if (themeType.value === "dark") {
    theme.value = darkTheme;
    themeColorMeta.setAttribute("content", "#18181c");
  }
};

// 配置主题色
const changeThemeColor = (val, isCover = false) => {
  try {
    // 获取主色数据
    const mainColorData =
      isCover && Object.keys(val)?.length
        ? val[themeType.value]
        : val !== "custom"
          ? themeColorData[val]
          : themeTypeData.value;
    // 微调主题色
    const primaryColor = isCover ? `rgb(${mainColorData.bg})` : mainColorData.primaryColor;
    const primaryColorHover = isCover ? `rgba(${mainColorData.bg}, 0.29)` : primaryColor + "29";
    const primaryColorPressed = isCover ? `rgba(${mainColorData.bg}, 0.26)` : primaryColor + "26";
    const primaryColorSuppl = isCover ? `rgba(${mainColorData.bg}, 0.05)` : primaryColor + "05";
    // 自适应主题背景色
    const coverAutobgCover = isCover
      ? themeType.value === "dark"
        ? val.light.bg
        : "250, 250, 252"
      : null;
    // 更新主题覆盖
    themeOverrides.value = {
      common:
        isCover && Object.keys(val)?.length
          ? themeType.value === "dark"
            ? {
                primaryColor,
                primaryColorHover,
                primaryColorPressed,
                primaryColorSuppl,
                textColor1: `rgba(${mainColorData.bg}, 0.9)`,
                textColor2: `rgba(${mainColorData.bg}, 0.82)`,
                textColor3: `rgba(${mainColorData.bg}, 0.52)`,
                bodyColor: `rgb(${val.dark.mainBg})`,
                cardColor: `rgb(${coverAutobgCover})`,
                tagColor: `rgb(${coverAutobgCover})`,
                modalColor: `rgb(${coverAutobgCover})`,
                popoverColor: `rgb(${coverAutobgCover})`,
              }
            : {
                primaryColor,
                primaryColorHover,
                primaryColorPressed,
                primaryColorSuppl,
              }
          : mainColorData,
      Icon: { color: isCover ? primaryColor : null },
    };
    if (!isCover) themeTypeData.value = mainColorData;
    // 更新全局颜色变量
    setCssVariable("--main-color", primaryColor);
    setCssVariable("--main-second-color", primaryColorHover);
    setCssVariable("--main-boxshadow-color", primaryColorPressed);
    setCssVariable("--main-boxshadow-hover-color", primaryColorSuppl);
  } catch (error) {
    themeOverrides.value = {};
    console.error("切换主题色出现错误：", error);
    $message.error("切换主题色出现错误，已使用默认配置");
  }
};

// 修改全局颜色
const setCssVariable = (name, value) => {
  // document.documentElement.style.setProperty(name, value);
  document.body.style.setProperty(name, value);
};

// 挂载 naive 组件
const setupNaiveTools = () => {
  // 进度条
  window.$loadingBar = useLoadingBar();
  // 通知
  window.$notification = useNotification();
  // 信息
  window.$message = useMessage();
  // 对话框
  window.$dialog = useDialog();
};

const NaiveProviderContent = defineComponent({
  setup() {
    setupNaiveTools();
  },
  render() {
    return h("div", { className: "main-tools" });
  },
});

// 监听明暗变化
watch(
  () => themeType.value,
  () => {
    changeTheme();
    changeThemeColor(
      themeAutoCover.value && Object.keys(coverTheme.value)?.length
        ? coverTheme.value
        : themeTypeName.value,
      themeAutoCover.value && Object.keys(coverTheme.value)?.length,
    );
  },
);
watch(
  () => osThemeRef.value,
  (val) => {
    if (themeAuto.value) themeType.value = val === "dark" ? "dark" : "light";
  },
);

// 监听主题色变化
watch(
  () => themeTypeName.value,
  (val) => changeThemeColor(val),
);
watch(
  () => themeTypeData.value,
  (val) => changeThemeColor(val.label),
);
watch(
  () => coverTheme.value,
  (val) => {
    if (themeAutoCover.value) changeThemeColor(val, themeAutoCover.value);
  },
);

onBeforeMount(() => {
  // 主题类型
  changeTheme();
  // 主题色
  changeThemeColor(themeTypeName.value);
});

onMounted(() => {
  // 挂载方法
  window.$changeThemeColor = changeThemeColor;
});
</script>
