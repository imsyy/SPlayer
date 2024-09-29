<!-- 全局配置 -->
<template>
  <n-config-provider
    :locale="zhCN"
    :date-locale="dateZhCN"
    :theme="theme"
    :theme-overrides="themeOverrides"
    abstract
    inline-theme-disabled
    preflight-style-disabled
  >
    <n-global-style />
    <n-loading-bar-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-message-provider :max="1" placement="bottom">
            <n-modal-provider>
              <slot />
              <NaiveProviderContent />
            </n-modal-provider>
          </n-message-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import {
  zhCN,
  dateZhCN,
  darkTheme,
  useOsTheme,
  useLoadingBar,
  useModal,
  useDialog,
  useMessage,
  useNotification,
  GlobalThemeOverrides,
} from "naive-ui";
import { useSettingStore, useStatusStore } from "@/stores";
import { setColorSchemes } from "@/utils/color";
// import { rgbToHex } from "@imsyy/color-utils";
import themeColor from "@/assets/data/themeColor.json";

const statusStore = useStatusStore();
const settingStore = useSettingStore();

// 操作系统主题
const osTheme = useOsTheme();

// 全局主题
const themeOverrides = ref<GlobalThemeOverrides>({});

// 获取明暗模式
const theme = computed(() => {
  return settingStore.themeMode === "auto"
    ? // 跟随系统
      osTheme.value === "dark"
      ? darkTheme
      : null
    : // 自定义
      settingStore.themeMode === "dark"
      ? darkTheme
      : null;
});

// 获取当前主题色数据
const getThemeMainColor = () => {
  const themeType = theme.value ? "dark" : "light";
  if (settingStore.themeFollowCover && statusStore.songCoverTheme) {
    const coverColor = statusStore.songCoverTheme;
    if (!coverColor) return {};
    return setColorSchemes(coverColor, themeType);
  } else if (settingStore.themeColorType !== "custom") {
    return setColorSchemes(themeColor[settingStore.themeColorType].color, themeType);
  } else {
    return setColorSchemes(settingStore.themeCustomColor, themeType);
  }
};

// 更改全局主题
const changeGlobalTheme = () => {
  try {
    // 获取配色方案
    const colorSchemes = getThemeMainColor();
    if (!colorSchemes || Object.keys(colorSchemes).length === 0) {
      themeOverrides.value = {};
      return;
    }
    // 修改主题
    themeOverrides.value = settingStore.themeGlobalColor
      ? {
          common: {
            fontFamily: `${settingStore.globalFont === "default" ? "v-sans" : settingStore.globalFont}, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
            primaryColor: `rgb(${colorSchemes.primary})`,
            primaryColorHover: `rgba(${colorSchemes.primary}, 0.78)`,
            primaryColorPressed: `rgba(${colorSchemes.primary}, 0.26)`,
            primaryColorSuppl: `rgba(${colorSchemes.primary}, 0.12)`,
            textColorBase: colorSchemes.primary,
            textColor1: `rgb(${colorSchemes.primary})`,
            textColor2: `rgba(${colorSchemes.primary}, 0.82)`,
            textColor3: `rgba(${colorSchemes.primary}, 0.52)`,
            bodyColor: `rgb(${colorSchemes.background})`,
            cardColor: `rgb(${colorSchemes["surface-container"]})`,
            tagColor: `rgb(${colorSchemes["surface-container"]})`,
            modalColor: `rgb(${colorSchemes["surface-container"]})`,
            popoverColor: `rgb(${colorSchemes["surface-container"]})`,
            buttonColor2: `rgba(${colorSchemes.primary}, 0.08)`,
            buttonColor2Hover: `rgba(${colorSchemes.primary}, 0.12)`,
            buttonColor2Pressed: `rgba(${colorSchemes.primary}, 0.08)`,
            iconColor: `rgb(${colorSchemes.primary})`,
            iconColorHover: `rgba(${colorSchemes.primary}, 0.475)`,
            closeIconColor: `rgba(${colorSchemes.primary}, 0.58)`,
            hoverColor: `rgba(${colorSchemes.primary}, 0.09)`,
            borderColor: `rgba(${colorSchemes.primary}, 0.09)`,
            textColorDisabled: `rgba(${colorSchemes.primary}, 0.3)`,
            placeholderColorDisabled: `rgba(${colorSchemes.primary}, 0.3)`,
            iconColorDisabled: `rgba(${colorSchemes.primary}, 0.3)`,
          },
          Card: {
            borderColor: `rgba(${colorSchemes.primary}, 0.09)`,
          },
          Button: {
            textColorHover: `rgba(${colorSchemes.primary}, 0.78)`,
            textColorFocus: `rgba(${colorSchemes.primary}, 0.58)`,
            colorPrimary: `rgba(${colorSchemes.primary}, 0.9)`,
            colorHoverPrimary: `rgb(${colorSchemes.primary})`,
            colorPressedPrimary: `rgba(${colorSchemes.primary}, 0.8)`,
            colorFocusPrimary: `rgb(${colorSchemes.primary})`,
          },
          Slider: {
            handleColor: `rgb(${colorSchemes.primary})`,
            fillColor: `rgb(${colorSchemes.primary})`,
            fillColorHover: `rgb(${colorSchemes.primary})`,
            railColor: `rgba(${colorSchemes.primary}, 0.2)`,
            railColorHover: `rgba(${colorSchemes.primary}, 0.3)`,
          },
          Switch: {
            railColorActive: `rgba(${colorSchemes.primary}, 0.8)`,
          },
          Input: {
            color: `rgba(${colorSchemes.primary}, 0.1)`,
            colorFocus: `rgb(${colorSchemes["surface-container"]})`,
            placeholderColor: `rgba(${colorSchemes.primary}, 0.58)`,
            border: `1px solid rgba(${colorSchemes.primary}, 0.1)`,
            clearColor: `rgba(${colorSchemes.primary}, 0.38)`,
            clearColorHover: `rgba(${colorSchemes.primary}, 0.48)`,
            clearColorPressed: `rgba(${colorSchemes.primary}, 0.3)`,
          },
          Icon: {
            color: `rgb(${colorSchemes.primary})`,
          },
          Empty: {
            textColor: `rgba(${colorSchemes.primary}, 0.38)`,
          },
          Divider: {
            color: `rgba(${colorSchemes.primary}, 0.09)`,
          },
          Dropdown: {
            dividerColor: `rgba(${colorSchemes.primary}, 0.09)`,
          },
          Layout: {
            siderBorderColor: `rgba(${colorSchemes.primary}, 0.09)`,
          },
          Tabs: {
            colorSegment: `rgba(${colorSchemes.primary}, 0.08)`,
            tabColorSegment: `rgba(${colorSchemes.primary}, 0.12)`,
          },
          Drawer: {
            headerBorderBottom: `1px solid rgba(${colorSchemes.primary}, 0.09)`,
            footerBorderTop: `1px solid rgba(${colorSchemes.primary}, 0.09)`,
          },
          Menu: {
            dividerColor: `rgba(${colorSchemes.primary}, 0.09)`,
          },
          Progress: {
            railColor: `rgba(${colorSchemes.primary}, 0.16)`,
          },
          Popover: {
            color: `rgb(${colorSchemes["surface-container"]})`,
          },
        }
      : {
          common: {
            fontFamily: `${settingStore.globalFont === "default" ? "v-sans" : settingStore.globalFont}, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
            primaryColor: `rgb(${colorSchemes.primary})`,
            primaryColorHover: `rgba(${colorSchemes.primary}, 0.78)`,
            primaryColorPressed: `rgba(${colorSchemes.primary}, 0.26)`,
            primaryColorSuppl: `rgba(${colorSchemes.primary}, 0.12)`,
          },
          Icon: {
            color: `rgb(${colorSchemes.primary})`,
          },
          Slider: {
            handleColor: `rgb(${colorSchemes.primary})`,
            fillColor: `rgb(${colorSchemes.primary})`,
            fillColorHover: `rgb(${colorSchemes.primary})`,
            railColor: `rgba(${colorSchemes.primary}, 0.2)`,
            railColorHover: `rgba(${colorSchemes.primary}, 0.3)`,
          },
          Popover: {
            color: `rgb(${colorSchemes["surface-container"]})`,
          },
        };
  } catch (error) {
    themeOverrides.value = {};
    console.error("切换主题色出现错误：", error);
    window.$message.error("切换主题色出现错误，已使用默认配置");
  }
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
  // 模态框
  window.$modal = useModal();
};

// 挂载工具
const NaiveProviderContent = defineComponent({
  setup() {
    setupNaiveTools();
  },
  render() {
    return h("div", { className: "main-tools" });
  },
});

// 监听设置更改
watch(
  () => [
    settingStore.themeColorType,
    settingStore.themeFollowCover,
    settingStore.themeGlobalColor,
    settingStore.globalFont,
    statusStore.songCoverTheme?.main,
    theme.value,
  ],
  () => changeGlobalTheme(),
);

// 自定义颜色更改
watchDebounced(
  () => settingStore.themeCustomColor,
  () => {
    changeGlobalTheme();
  },
  { debounce: 500, maxWait: 1000 },
);

onMounted(() => {
  changeGlobalTheme();
});
</script>
