import type { CoverColors } from "@/types/main";
import {
  themeFromSourceColor,
  QuantizerCelebi,
  Hct,
  Score,
  argbFromHex,
  type Theme,
} from "@material/material-color-utilities";
import { rgbToHex } from "@imsyy/color-utils";
import { useSettingStore, useStatusStore } from "@/stores";
import { argbToRgb } from "./helper";
import { chunk } from "lodash-es";
import { sendTaskbarThemeColor } from "@/core/player/PlayerIpc";

// 单调主题（纯色模式）
export const MONOTONOUS_THEME = {
  main: { r: 239, g: 239, b: 239 },
  light: {
    primary: { r: 10, g: 10, b: 10 },
    background: { r: 238, g: 238, b: 238 },
    "surface-container": { r: 212, g: 212, b: 212 },
  },
  dark: {
    primary: { r: 239, g: 239, b: 239 },
    background: { r: 31, g: 31, b: 31 },
    "surface-container": { r: 39, g: 39, b: 39 },
  },
};

/**
 * 主色以 RGB 格式返回
 * @param {number} argb - 表示颜色的 ARGB 格式整数
 */
const getAccentColor = (argb: number) => {
  // 将 ARGB 转换为 RGB
  const [r, g, b] = [...argbToRgb(argb)];
  // 返回 rgb
  return { r, g, b };
};

/**
 * 生成主题配色方案
 * @param theme Material Theme 对象
 * @param variant 变体名称，默认为 'secondary'
 */
const getThemeSchema = (theme: Theme, variant: keyof Theme["palettes"] = "secondary") => {
  // 获取基于主色的 HCT 属性
  const hct = Hct.fromInt(theme.source);
  let targetHue = hct.hue;
  let targetChroma = hct.chroma;

  const palette = theme.palettes[variant];
  
  switch (variant) {
    case "secondary":
      targetHue = palette.hue;
      targetChroma = Math.max(hct.chroma * 0.7, 45);
      break;
    case "tertiary":
      targetHue = palette.hue;
      targetChroma = Math.max(hct.chroma * 0.8, 60);
      break;
    case "neutral":
      targetChroma = 15;
      break;
    case "neutralVariant":
      targetChroma = 20;
      break;
    case "error":
      targetHue = (hct.hue + 180) % 360;
      targetChroma = Math.max(hct.chroma, 80);
      break;
  }

  const getColor = (tone: number) => getAccentColor(Hct.from(targetHue, targetChroma, tone).toInt());

  /**
   * 生成辅助色
   */
  const getHelperColor = (tone: number, chroma: number = 4) => 
    getAccentColor(Hct.from(hct.hue, chroma, tone).toInt());

  const isPrimary = variant === "primary";
  const sourceRgb = getAccentColor(theme.source);
  const darkPrimary = isPrimary ? sourceRgb : getColor(80);
  
  return {
    main: darkPrimary,
    light: {
      primary: isPrimary ? sourceRgb : getColor(40),
      background: getHelperColor(98, 2),
      "surface-container": getHelperColor(94, 4),
    },
    dark: {
      primary: darkPrimary,
      background: getHelperColor(10, 0),
      "surface-container": getHelperColor(14, 2),
    },
  };
};

/**
 * 根据颜色生成主题
 * @param color 颜色 Hex
 * @param variant 变体名称
 */
export const getThemeFromColor = (
  color: string,
  variant: keyof Theme["palettes"] = "secondary",
) => {
  const argb = argbFromHex(color);
  const theme = themeFromSourceColor(argb);
  return getThemeSchema(theme, variant);
};

// 修改全局颜色
export const setGlobalColor = (name: string, colorValue: string): void => {
  if (!name.startsWith("--")) {
    throw new Error("Variable name must start with '--'");
  }
  const root = document.body;
  root.style.setProperty(name, colorValue);
};

// 设置动态配色
export const setColorSchemes = (
  color: string | CoverColors,
  // 明暗模式
  mode: "dark" | "light",
): { [key: string]: string } => {
  const settingStore = useSettingStore();
  const colorData =
    typeof color === "string" ? getThemeFromColor(color, settingStore.themeVariant) : color;
  if (!colorData) throw new Error("Color data not found");
  // 指定模式颜色数据
  const colorModeData = colorData[mode];
  const modifiedColorModeData: { [key: string]: string } = {};
  // 是否全局应用
  if (!settingStore.themeGlobalColor && colorModeData) {
    // 修改关键颜色
    colorModeData.background =
      mode === "dark" ? { r: 16, g: 16, b: 20 } : { r: 246, g: 246, b: 246 };
    colorModeData["surface-container"] =
      mode === "dark" ? { r: 24, g: 24, b: 28 } : { r: 255, g: 255, b: 255 };
  }
  // 遍历颜色并修改
  for (const key in colorModeData) {
    const color = colorModeData[key];
    if (typeof color === "object" && "r" in color && "g" in color && "b" in color) {
      const hexValue = rgbToHex(color.r, color.g, color.b);
      // 修改后的颜色值存储在新的对象中
      modifiedColorModeData[`${key}-hex`] = hexValue;
      modifiedColorModeData[key] = `${color.r}, ${color.g}, ${color.b}`;
      // 设置样式
      setGlobalColor(`--${key}`, `${color.r}, ${color.g}, ${color.b}`);
      setGlobalColor(`--${key}-hex`, hexValue);
    } else {
      console.error(`Invalid color data for key: ${key}`);
    }
  }
  return modifiedColorModeData;
};

// 获取封面主题
export const getCoverColorData = (dom: HTMLImageElement) => {
  if (!dom) return null;
  // canvas
  const canvas = document.createElement("canvas");
  canvas.width = 50;
  canvas.height = 50;
  // 获取 50x50 大小的图像颜色数据
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(dom, 0, 0, dom.naturalWidth, dom.naturalHeight, 0, 0, 50, 50);
  const pixels = chunk(ctx.getImageData(0, 0, 50, 50).data, 4).map((pixel) => {
    // 将颜色数据转换为整数表示
    return (
      (((pixel[3] << 24) >>> 0) | ((pixel[0] << 16) >>> 0) | ((pixel[1] << 8) >>> 0) | pixel[2]) >>>
      0
    );
  });
  // 使用 QuantizerCelebi 进行颜色量化
  const quantizedColors = QuantizerCelebi.quantize(pixels, 128);
  const sortedQuantizedColors = Array.from(quantizedColors).sort((a, b) => b[1] - a[1]);
  // 获取最频繁的颜色，并转换为 RGB 格式
  const mostFrequentColors = sortedQuantizedColors.slice(0, 5).map((x) => argbToRgb(x[0]));
  // 如果最频繁的颜色差异很小，使用灰色强调色
  if (mostFrequentColors.every((x) => Math.max(...x) - Math.min(...x) < 5)) {
    return MONOTONOUS_THEME;
  }
  // 使用 Score 库对颜色进行评分
  const ranked = Score.score(new Map(sortedQuantizedColors.slice(0, 50)));
  const topColor = ranked[0];
  const theme = themeFromSourceColor(topColor);
  // 移除 canvas
  canvas.remove();
  const settingStore = useSettingStore();
  // 返回主题
  return getThemeSchema(theme, settingStore.themeVariant);
};

/**
 * 获取歌曲封面颜色数据
 * @param coverUrl 歌曲封面地址
 */
export const getCoverColor = async (coverUrl: string) => {
  if (!coverUrl) return;
  const statusStore = useStatusStore();
  const settingStore = useSettingStore();
  // 创建图像元素
  const image = new Image();
  image.crossOrigin = "Anonymous";
  image.src = coverUrl;
  // 图像加载完成
  image.onload = () => {
    // 获取图片数据
    const coverColorData = getCoverColorData(image);
    if (coverColorData) statusStore.songCoverTheme = coverColorData;
    if (!settingStore.playerFollowCoverColor) {
      statusStore.songCoverTheme.main = { r: 239, g: 239, b: 239 };
    }
    // 获取任务栏封面颜色
    sendTaskbarCoverColor();
    // 移除元素
    image.remove();
  };
};

/**
 * 发送任务栏封面颜色
 * 从 statusStore.songCoverTheme 读取封面主色
 */
export const sendTaskbarCoverColor = () => {
  const settingStore = useSettingStore();
  if (!settingStore.taskbarLyricUseThemeColor) {
    sendTaskbarThemeColor(null);
    return;
  }
  const statusStore = useStatusStore();
  const coverTheme = statusStore.songCoverTheme;
  // 检查亮暗模式数据是否存在
  if (!coverTheme?.dark?.primary || !coverTheme?.light?.primary) return;
  const darkPrimary = coverTheme.dark.primary;
  const lightPrimary = coverTheme.light.primary;
  sendTaskbarThemeColor({
    dark: rgbToHex(darkPrimary.r, darkPrimary.g, darkPrimary.b),
    light: rgbToHex(lightPrimary.r, lightPrimary.g, lightPrimary.b),
  });
};
