/**
 * 将 RGB 颜色值转换为 HSL（色调、饱和度、亮度）颜色值
 * @param {number[]} rgb - 一个包含红色、绿色和蓝色通道值的数组（范围：0-255）
 * @returns {number[]} - 一个包含色调（H）、饱和度（S）和亮度（L）的数组，值的范围分别为 [0, 1]、[0, 1] 和 [0, 1]
 */
export const rgb2Hsl = ([r, g, b]) => {
  // 将 RGB 值转换为范围 [0, 1] 的值
  r /= 255;
  g /= 255;
  b /= 255;
  // 查找最大和最小的颜色通道值
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // 初始化色调（H）、饱和度（S）、亮度（L）
  let h,
    s,
    l = (max + min) / 2;
  if (max === min) {
    // 如果最大和最小通道值相等，颜色为灰色
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    // 计算色调（H）
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  // 返回 HSL 颜色值的数组
  return [h, s, l];
};

/**
 * 将HSL（色相、饱和度、亮度）颜色值转换为RGB颜色值
 *
 * @param {number[]} hsl - 包含色相（0-1）、饱和度（0-1）和亮度（0-1）的数组
 * @returns {number[]} - 包含红色、绿色和蓝色分量的RGB颜色值数组（0-255）
 */
export const hsl2Rgb = ([h, s, l]) => {
  let r, g, b;
  if (s == 0) {
    // 如果饱和度为0，将RGB三个分量都设置为亮度
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  // 将RGB分量值从0-1映射到0-255，并返回RGB颜色值数组
  return [r * 255, g * 255, b * 255];
};

/**
 * 根据输入的RGB颜色值，对颜色进行规范化处理（暂时无用）
 *
 * @param {number[]} rgb - 包含红色、绿色和蓝色分量的RGB颜色值数组（0-255）
 * @returns {number[]} - 规范化后的RGB颜色值数组（0-255）
 */
export const normalizeColor = ([r, g, b]) => {
  // 如果RGB三个分量之间的差值小于5，返回灰色
  if (Math.max(r, g, b) - Math.min(r, g, b) < 5) {
    return [150, 150, 150];
  }
  // 辅助函数，用于混合两个值
  const mix = (a, b, p) => Math.round(a * (1 - p) + b * p);
  // 计算颜色的亮度
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // 根据亮度调整颜色
  if (luminance < 60) {
    [r, g, b] = [r, g, b].map((c) => mix(c, 255, 0.3 * (1 - luminance / 60)));
  } else if (luminance > 180) {
    [r, g, b] = [r, g, b].map((c) => mix(c, 0, 0.5 * ((luminance - 180) / 76)));
  }
  // 将RGB颜色值转换为HSL颜色值
  let [h, s, l] = rgb2Hsl([r, g, b]);
  // 限制饱和度和亮度的范围
  s = Math.max(0.3, Math.min(0.8, s));
  l = Math.max(0.5, Math.min(0.8, l));
  // 将HSL颜色值转换回RGB颜色值
  [r, g, b] = hsl2Rgb([h, s, l]);
  // 返回规范化后的RGB颜色值数组
  return [r, g, b];
};

/**
 * 计算输入颜色的白色调色板版本，通过混合颜色和白色来改变亮度（暂时无用）
 *
 * @param {number[]} rgb - 包含红色、绿色和蓝色分量的RGB颜色值数组（0-255）
 * @param {number} [p=0.5] - 混合颜色和白色的比例，范围为0到1，默认为0.5
 * @returns {number[]} - 新的RGB颜色值数组，表示经过白色调色板处理后的颜色
 */
export const calcWhiteShadeColor = ([r, g, b], p = 0.5) => {
  /**
   * 辅助函数，用于混合两个值
   * @param {number} a - 第一个值
   * @param {number} b - 第二个值
   * @param {number} p - 混合比例，范围为0到1
   * @returns {number} - 混合后的值
   */
  const mix = (a, b, p) => Math.round(a * (1 - p) + b * p);
  // 将输入颜色的每个分量与255进行混合，改变亮度
  return [r, g, b].map((c) => mix(c, 255, p));
};

/**
 * 计算给定颜色的亮度
 *
 * @param {number[]} color - 包含红色、绿色和蓝色分量的颜色值数组（0-255）
 * @returns {number} - 颜色的亮度值，范围从0到1
 */
export const calcLuminance = (color) => {
  // 将颜色值从0-255映射到0-1范围
  let [r, g, b] = color.map((c) => c / 255);
  // 对每个分量进行 gamma 校正
  [r, g, b] = [r, g, b].map((c) => {
    if (c <= 0.03928) {
      return c / 12.92;
    }
    return Math.pow((c + 0.055) / 1.055, 2.4);
  });
  // 计算颜色的亮度值
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * 将RGB颜色值转换为CIELAB颜色空间中的LAB颜色值
 *
 * @param {number[]} color - 包含红色、绿色和蓝色分量的RGB颜色值数组（0-255）
 * @returns {number[]} - LAB颜色值数组，包含亮度（L）和色度（A、B）分量
 */
export const rgb2Lab = (color) => {
  if (!color) return [0, 0, 0];
  // 将颜色值从0-255映射到0-1范围
  let [r, g, b] = color.map((c) => c / 255);
  // 对每个分量进行 gamma 校正
  [r, g, b] = [r, g, b].map((c) => {
    if (c <= 0.03928) {
      return c / 12.92;
    }
    return Math.pow((c + 0.055) / 1.055, 2.4);
  });
  // 将RGB颜色值映射到0-100范围
  [r, g, b] = [r, g, b].map((c) => c * 100);
  // 计算XYZ颜色值
  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
  // 辅助函数，用于将XYZ分量映射到LAB分量
  const xyz2Lab = (c) => {
    if (c > 0.008856) {
      return Math.pow(c, 1 / 3);
    }
    return 7.787 * c + 16 / 116;
  };
  // 计算LAB颜色值的亮度（L）和色度（A、B）分量
  const L = 116 * xyz2Lab(y / 100) - 16;
  const A = 500 * (xyz2Lab(x / 95.047) - xyz2Lab(y / 100));
  const B = 200 * (xyz2Lab(y / 100) - xyz2Lab(z / 108.883));
  // 返回LAB颜色值数组
  return [L, A, B];
};

/**
 * 计算两个颜色之间的颜色差异，使用CIELAB颜色空间中的欧氏距离
 *
 * @param {number[]} color1 - 包含红色、绿色和蓝色分量的RGB颜色值数组（0-255）
 * @param {number[]} color2 - 包含红色、绿色和蓝色分量的RGB颜色值数组（0-255）
 * @returns {number} - 两个颜色之间的颜色差异值
 */
export const calcColorDifference = (color1, color2) => {
  // 将颜色值转换为LAB颜色值
  const [L1, A1, B1] = rgb2Lab(color1);
  const [L2, A2, B2] = rgb2Lab(color2);
  // 计算LAB颜色值之间的欧氏距离
  const deltaL = L1 - L2;
  const deltaA = A1 - A2;
  const deltaB = B1 - B2;
  // 返回颜色差异值
  return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
};

/**
 * 从给定调色板中生成渐变背景颜色
 *
 * @param {number[][]} palette - 包含多个颜色的调色板，每个颜色由红色、绿色和蓝色分量组成的数组（0-255）
 * @returns {string} - 表示渐变背景颜色的CSS线性渐变字符串
 */
export const getGradientFromPalette = (palette) => {
  // 根据亮度对调色板进行排序
  palette = palette.sort((a, b) => {
    return calcLuminance(a) - calcLuminance(b);
  });
  // 选择亮度中间的8个颜色
  palette = palette.slice(palette.length / 2 - 4, palette.length / 2 + 4);
  // 根据饱和度对颜色进行排序
  palette = palette.sort((a, b) => {
    return rgb2Hsl(b)[1] - rgb2Hsl(a)[1];
  });
  // 选择最饱和的6个颜色
  palette = palette.slice(0, 6);
  // 计算颜色之间的差异
  let differences = new Array(6);
  for (let i = 0; i < differences.length; i++) {
    differences[i] = new Array(6).fill(0);
  }
  for (let i = 0; i < palette.length; i++) {
    for (let j = i + 1; j < palette.length; j++) {
      differences[i][j] = calcColorDifference(palette[i], palette[j]);
      differences[j][i] = differences[i][j];
    }
  }
  // 使用深度优先搜索找到最佳颜色序列
  let used = new Array(6).fill(false);
  let min = 10000000,
    ansSeq = [];
  const dfs = (depth, seq = [], currentMax = -1) => {
    if (depth === 6) {
      if (currentMax < min) {
        min = currentMax;
        ansSeq = seq;
      }
      return;
    }
    for (let i = 0; i < 6; i++) {
      if (used[i]) continue;
      used[i] = true;
      dfs(depth + 1, seq.concat(i), Math.max(currentMax, differences[seq[depth - 1]][i]));
      used[i] = false;
    }
  };
  for (let i = 0; i < 6; i++) {
    used[i] = true;
    dfs(1, [i]);
    used[i] = false;
  }
  // 根据最佳颜色序列构建渐变字符串
  let colors = [];
  for (let i of ansSeq) {
    colors.push(palette[i]);
  }
  let ans = "linear-gradient(-45deg,";
  for (let i = 0; i < colors.length; i++) {
    ans += `rgb(${colors[i][0]}, ${colors[i][1]}, ${colors[i][2]})`;
    if (i !== colors.length - 1) {
      ans += ",";
    }
  }
  ans += ")";
  return ans;
};

/**
 * 将32位ARGB颜色值转换为24位RGB颜色值
 *
 * @param {number} x - 32位ARGB颜色值
 * @returns {number[]} - 包含红色、绿色和蓝色分量的24位RGB颜色值数组（0-255）
 */
export const argb2Rgb = (x) => {
  // 提取红色、绿色和蓝色分量
  const r = (x >> 16) & 0xff;
  const g = (x >> 8) & 0xff;
  const b = x & 0xff;
  // 返回24位RGB颜色值数组
  return [r, g, b];
};

/**
 * 将24位RGB颜色值转换为32位ARGB颜色值
 *
 * @param {number} r - 红色分量（0-255）
 * @param {number} g - 绿色分量（0-255）
 * @param {number} b - 蓝色分量（0-255）
 * @returns {number} - 32位ARGB颜色值
 */
export const rgb2Argb = (r, g, b) => {
  // 使用位运算将RGB分量组合成32位ARGB颜色值
  return (0xff << 24) | (r << 16) | (g << 8) | b;
};

/**
 * 将24位RGB颜色值转换为16进制表示的颜色字符串
 *
 * @param {number} r - 红色分量（0-255）
 * @param {number} g - 绿色分量（0-255）
 * @param {number} b - 蓝色分量（0-255）
 * @returns {string} - 16进制表示的颜色字符串，以"#"开头
 */
export const Rgb2Hex = (r, g, b) => {
  // 将每个分量转换为16进制，并确保每个分量都有两位
  const hexR = (r < 16 ? "0" : "") + r.toString(16);
  const hexG = (g < 16 ? "0" : "") + g.toString(16);
  const hexB = (b < 16 ? "0" : "") + b.toString(16);
  // 使用"#"开头并拼接红色、绿色和蓝色的16进制值
  return `#${hexR}${hexG}${hexB}`;
};
