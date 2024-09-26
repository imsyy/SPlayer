import type { CoverColors } from "@/types/main";
import {
  themeFromSourceColor,
  QuantizerCelebi,
  Hct,
  Score,
} from "@material/material-color-utilities";
import { getMDColor, rgbToHex } from "@imsyy/color-utils";
import { useSettingStore } from "@/stores";
import { argbToRgb } from "./helper";
import { chunk } from "lodash-es";

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

// 修改全局颜色
export const setGlobalColor = (name: string, colorValue: string): void => {
  if (!name.startsWith("--")) {
    throw new Error("Variable name must start with '--'");
  }
  const root = document.body;
  // const root = document.documentElement;
  // 检查变量是否已经存在
  const existingValue = getComputedStyle(root).getPropertyValue(name).trim();
  if (existingValue === colorValue) return;
  // 设置变量
  root.style.setProperty(name, colorValue);
};

// 设置动态配色
export const setColorSchemes = (
  color: string | CoverColors,
  // 明暗模式
  mode: "dark" | "light",
): { [key: string]: string } => {
  const settingStore = useSettingStore();
  const colorData = typeof color === "string" ? getMDColor(color) : color;
  if (!colorData) throw new Error("Color data not found");
  // 指定模式颜色数据
  const colorModeData = colorData[mode];
  const modifiedColorModeData: { [key: string]: string } = {};
  // 是否全局应用
  if (!settingStore.themeGlobalColor && colorModeData) {
    // 修改关键颜色
    colorModeData.background =
      mode === "dark" ? { r: 16, g: 16, b: 20 } : { r: 239, g: 239, b: 239 };
    colorModeData["surface-container"] =
      mode === "dark" ? { r: 24, g: 24, b: 28 } : { r: 255, g: 255, b: 255 };
    console.log(colorModeData);
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
    console.log("该封面颜色单调");
    return {
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
  }
  // 使用 Score 库对颜色进行评分
  const ranked = Score.score(new Map(sortedQuantizedColors.slice(0, 50)));
  const topColor = ranked[0];
  const theme = themeFromSourceColor(topColor);
  // 颜色主题
  const variant = "secondary";
  // 移除 canvas
  canvas.remove();
  // 返回主题
  return {
    main: getAccentColor(
      Hct.from(theme.palettes[variant].hue, theme.palettes[variant].chroma, 90).toInt(),
    ),
    light: {
      primary: getAccentColor(
        Hct.from(theme.palettes[variant].hue, theme.palettes[variant].chroma, 10).toInt(),
      ),
      background: getAccentColor(
        Hct.from(theme.palettes[variant].hue, theme.palettes[variant].chroma, 94).toInt(),
      ),
      "surface-container": getAccentColor(
        Hct.from(theme.palettes[variant].hue, theme.palettes[variant].chroma, 90).toInt(),
      ),
    },
    dark: {
      primary: getAccentColor(
        Hct.from(theme.palettes[variant].hue, theme.palettes[variant].chroma, 90).toInt(),
      ),
      background: getAccentColor(
        Hct.from(theme.palettes[variant].hue, theme.palettes[variant].chroma, 20).toInt(),
      ),
      "surface-container": getAccentColor(
        Hct.from(theme.palettes[variant].hue, theme.palettes[variant].chroma, 16).toInt(),
      ),
    },
  };
};
