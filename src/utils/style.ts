/**
 * 获取自适应或固定像素的字体大小
 * @param size 字体大小数值
 * @param mode 字体大小模式 ('adaptive' | 'fixed')
 * @returns CSS font-size 字符串
 */
export const getFontSize = (size: number, mode: string) => {
  if (mode === "adaptive") {
    return `calc(${size} / 1080 * 100vh)`;
  }
  return `${size}px`;
};
