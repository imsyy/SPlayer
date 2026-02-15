import { useBreakpoints, breakpointsTailwind } from "@vueuse/core";

/**
 * 移动端适配 composable
 * 基于 Tailwind 断点判断当前是否为移动端
 */
export const useMobile = () => {
  const breakpoints = useBreakpoints(breakpointsTailwind);

  // 小于 lg (512px) 为小屏
  const isSmall = useMediaQuery("(max-width: 511.98px)");

  // 小于 sm (640px) 为移动端
  const isMobile = breakpoints.smaller("sm");

  // 小于 md (768px) 为小屏设备
  const isSmallScreen = breakpoints.smaller("md");

  // 小于 lg (990px) 为中等屏幕
  const isTablet = useMediaQuery("(max-width: 989.98px)");

  // 大于等于 lg (1024px) 为桌面端
  const isDesktop = breakpoints.greaterOrEqual("lg");

  // 大于等于 xl (1280px) 为大桌面端
  const isLargeDesktop = breakpoints.greaterOrEqual("xl");

  return {
    /** 是否为小屏 (< 512px) */
    isSmall,
    /** 是否为移动端 (< 640px) */
    isMobile,
    /** 是否为小屏设备 (< 768px) */
    isSmallScreen,
    /** 是否为中等屏幕 (< 990px) */
    isTablet,
    /** 是否为桌面端 (>= 1024px) */
    isDesktop,
    /** 是否为大桌面端 (>= 1280px) */
    isLargeDesktop,
    /** 断点实例 */
    breakpoints,
  };
};
