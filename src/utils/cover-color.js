import {
  themeFromSourceColor,
  QuantizerCelebi,
  Hct,
  Score,
} from "@material/material-color-utilities";
import { siteSettings, siteStatus } from "@/stores";
import { getGradientFromPalette, argb2Rgb, rgb2Argb } from "@/utils/color-utils";
import { chunk } from "@/utils/helper";
import ColorThief from "colorthief";

/**
 * 根据图像的主色获取渐变色
 * @param {string} coverSrc - 图片 URL
 * @returns {string} - 生成的渐变色
 */
export const getCoverGradient = (coverSrc) => {
  return new Promise((resolve, reject) => {
    try {
      const colorThief = new ColorThief();
      // 创建图像元素
      const image = new Image();
      image.crossOrigin = "Anonymous";
      image.src = coverSrc;
      // 图像加载完成
      image.onload = async () => {
        // 获取渐变色
        const palette = await colorThief.getPalette(image);
        const gradient = getGradientFromPalette(palette);
        console.log("图片加载完成：", gradient);
        // 获取图片主色
        calcAccentColor(image);
        resolve(gradient);
      };
    } catch (error) {
      console.error("图片渐变色生成失败：", error);
      reject("linear-gradient(-45deg, #666, #fff)");
    }
  });
};

/**
 * 从图像中计算强调色并更新页面主题
 * @param {HTMLImageElement} dom - 包含图像的 DOM 元素
 */
const calcAccentColor = (dom) => {
  // pinia
  const status = siteStatus();
  const settings = siteSettings();
  // 创建一个用于提取颜色的 canvas
  const canvas = document.createElement("canvas");
  canvas.width = 50;
  canvas.height = 50;
  // 获取 50x50 大小的图像颜色数据
  const ctx = canvas.getContext("2d");
  ctx.drawImage(dom, 0, 0, dom.naturalWidth, dom.naturalHeight, 0, 0, 50, 50);
  const pixels = chunk(ctx.getImageData(0, 0, 50, 50).data, 4).map((pixel) => {
    // 将颜色数据转换为整数表示
    return (
      (((pixel[3] << 24) >>> 0) | ((pixel[0] << 16) >>> 0) | ((pixel[1] << 8) >>> 0) | pixel[2]) >>>
      0
    );
  });
  // 使用 QuantizerCelebi 库进行颜色量化
  const quantizedColors = QuantizerCelebi.quantize(pixels, 128);
  const sortedQuantizedColors = Array.from(quantizedColors).sort((a, b) => b[1] - a[1]);
  // 获取最频繁的颜色，并转换为 RGB 格式
  const mostFrequentColors = sortedQuantizedColors.slice(0, 5).map((x) => argb2Rgb(x[0]));
  // 如果最频繁的颜色差异很小，使用灰色强调色
  if (mostFrequentColors.every((x) => Math.max(...x) - Math.min(...x) < 5)) {
    console.log("封面单调");
    useGreyAccentColor();
    return true;
  }
  // 使用 Score 库对颜色进行评分
  const ranked = Score.score(new Map(sortedQuantizedColors.slice(0, 50)));
  const top = ranked[0];
  const theme = themeFromSourceColor(top);
  // 错误 error, 中性 neutral, 中性的变体 neutralVariant, 主要的 primary, 二次 secondary, 三级 tertiary
  const variant = settings.themeAutoCoverType;
  // 更新主题色
  status.coverTheme = {
    dark: {
      dark: getAccentColor(theme.schemes.dark[variant]),
      primary: getAccentColor(
        Hct.from(theme.palettes[variant].hue, theme.palettes[variant].chroma, 100).toInt(),
      ),
      shade: getAccentColor(
        Hct.from(theme.palettes[variant].hue, theme.palettes[variant].chroma, 25).toInt(),
      ),
      shadeTwo: getAccentColor(
        Hct.from(theme.palettes[variant].hue, theme.palettes[variant].chroma, 15).toInt(),
      ),
      bg: getAccentColor(
        Hct.from(theme.palettes[variant].hue, theme.palettes[variant].chroma, 90).toInt(),
      ),
      mainBg: getAccentColor(
        Hct.from(theme.palettes[variant].hue, theme.palettes[variant].chroma, 10).toInt(),
      ),
    },
    light: {
      light: getAccentColor(theme.schemes.light[variant]),
      primary: getAccentColor(
        Hct.from(theme.palettes[variant].hue, theme.palettes[variant].chroma, 20).toInt(),
      ),
      shade: getAccentColor(
        Hct.from(theme.palettes[variant].hue, theme.palettes[variant].chroma, 80).toInt(),
      ),
      shadeTwo: getAccentColor(
        Hct.from(theme.palettes[variant].hue, theme.palettes[variant].chroma, 90).toInt(),
      ),
      bg: getAccentColor(
        Hct.from(theme.palettes[variant].hue, theme.palettes[variant].chroma, 20).toInt(),
      ),
      mainBg: getAccentColor(
        Hct.from(theme.palettes[variant].hue, theme.palettes[variant].chroma, 100).toInt(),
      ),
    },
  };
  // 尝试更新主题色
  if (typeof $changeThemeColor !== "undefined" && settings.themeAutoCover) {
    $changeThemeColor(status.coverTheme, settings.themeAutoCover);
  }
};

/**
 * 使用灰色强调色更新页面主题
 */
const useGreyAccentColor = () => {
  // pinia
  const status = siteStatus();
  status.coverTheme = {
    dark: {
      dark: getAccentColor(rgb2Argb(120, 120, 120)),
      primary: getAccentColor(rgb2Argb(250, 250, 250)),
      shade: getAccentColor(rgb2Argb(40, 40, 40)),
      shadeTwo: getAccentColor(rgb2Argb(20, 20, 20)),
      bg: getAccentColor(rgb2Argb(190, 190, 190)),
      mainBg: getAccentColor(rgb2Argb(16, 16, 20)),
    },
    light: {
      light: getAccentColor(rgb2Argb(150, 150, 150)),
      primary: getAccentColor(rgb2Argb(10, 10, 10)),
      shade: getAccentColor(rgb2Argb(210, 210, 210)),
      shadeTwo: getAccentColor(rgb2Argb(255, 255, 255)),
      bg: getAccentColor(rgb2Argb(24, 24, 28)),
      mainBg: getAccentColor(rgb2Argb(11, 11, 11)),
    },
  };
};

/**
 * 主色以 RGB 格式返回
 * @param {number} argb - 表示颜色的 ARGB 格式整数
 */
const getAccentColor = (argb) => {
  // 将 ARGB 转换为 RGB
  const [r, g, b] = [...argb2Rgb(argb)];
  // 返回 rgb
  return `${r}, ${g}, ${b}`;
};
