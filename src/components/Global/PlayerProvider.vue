<!-- 全局配置 -->
<template>
  <n-config-provider :theme-overrides="themeOverrides" abstract preflight-style-disabled>
    <slot />
  </n-config-provider>
</template>

<script setup lang="ts">
import type { GlobalThemeOverrides } from "naive-ui";
import { useStatusStore } from "@/stores";

const statusStore = useStatusStore();

// 轻量的 rgba 构造器
const toRGBA = (rgb: string, alpha: number) => `rgba(${rgb}, ${alpha})`;

const themeOverrides = computed<GlobalThemeOverrides>(() => {
  const { r, g, b } = statusStore.songCoverTheme.main ?? { r: 239, g: 239, b: 239 };
  const coverRGB = `${r},${g},${b}`;
  const commonBase = {
    primaryColor: `rgb(${coverRGB})`,
    primaryColorHover: toRGBA(coverRGB, 0.78),
    primaryColorPressed: toRGBA(coverRGB, 0.26),
    primaryColorSuppl: toRGBA(coverRGB, 0.12),
  } as GlobalThemeOverrides["common"];

  return {
    common: {
      ...commonBase,
      textColorBase: coverRGB,
      textColor1: coverRGB,
      textColor2: toRGBA(coverRGB, 0.82),
      textColor3: toRGBA(coverRGB, 0.52),
      cardColor: toRGBA(coverRGB, 0.2),
      tagColor: toRGBA(coverRGB, 0.2),
      modalColor: toRGBA(coverRGB, 0.2),
      popoverColor: toRGBA(coverRGB, 0.2),
      buttonColor2: toRGBA(coverRGB, 0.08),
      buttonColor2Hover: toRGBA(coverRGB, 0.12),
      buttonColor2Pressed: toRGBA(coverRGB, 0.08),
      iconColor: coverRGB,
      iconColorHover: toRGBA(coverRGB, 0.475),
      closeIconColor: toRGBA(coverRGB, 0.58),
      hoverColor: toRGBA(coverRGB, 0.09),
      borderColor: toRGBA(coverRGB, 0.09),
      textColorDisabled: toRGBA(coverRGB, 0.3),
      placeholderColorDisabled: toRGBA(coverRGB, 0.3),
      iconColorDisabled: toRGBA(coverRGB, 0.3),
    },
    Button: {
      textColorHover: toRGBA(coverRGB, 0.82),
      textColorFocus: toRGBA(coverRGB, 0.82),
      colorPrimary: toRGBA(coverRGB, 0.9),
      colorHoverPrimary: toRGBA(coverRGB, 0.8),
      colorPressedPrimary: toRGBA(coverRGB, 0.7),
      colorFocusPrimary: toRGBA(coverRGB, 0.6),
    },
    Slider: {
      handleColor: toRGBA(coverRGB, 0.9),
      fillColor: toRGBA(coverRGB, 0.9),
      fillColorHover: toRGBA(coverRGB, 0.9),
      railColor: toRGBA(coverRGB, 0.2),
      railColorHover: toRGBA(coverRGB, 0.3),
      indicatorColor: toRGBA(coverRGB, 0.2),
      indicatorTextColor: toRGBA(coverRGB, 0.9),
    },
    Popover: {
      color: toRGBA(coverRGB, 0.2),
    },
    Icon: {
      color: coverRGB,
    },
    Tooltip: {
      color: coverRGB,
    },
  };
});
</script>
