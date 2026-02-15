/**
 * 列表滚动逻辑
 */
export const useListScroll = () => {
  const listScrolling = ref<boolean>(false);

  /**
   * 处理列表滚动
   */
  const handleListScroll = useThrottleFn(
    (e: Event) => {
      const target = e.target as HTMLElement;
      const { scrollTop, scrollHeight, clientHeight } = target;
      // 如果当前未处于滚动状态，且内容高度不足以支撑收缩后的布局，则不触发滚动状态
      if (!listScrolling.value && scrollHeight - clientHeight < 150) {
        return;
      }
      listScrolling.value = scrollTop > 10;
    },
    100,
    true,
  );

  /**
   * 重置滚动状态
   */
  const resetScroll = () => {
    listScrolling.value = false;
  };

  return {
    listScrolling,
    handleListScroll,
    resetScroll,
  };
};
