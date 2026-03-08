import type { ComputedRef, Ref } from "vue";
import type VirtualScroll from "@/components/UI/VirtualScroll.vue";

export interface DragSortOptions {
  /** VirtualScroll 组件实例引用 */
  virtualScrollRef: Ref<InstanceType<typeof VirtualScroll> | null>;
  /** 列表项总数 */
  itemCount: ComputedRef<number>;
  /** 排序完成回调 */
  onReorder: (fromIndex: number, toIndex: number) => void;
  /** 滚动区域顶部内边距 */
  paddingTop?: number;
  /** 触发模式: handle（手柄点击立即触发）| longpress（长按触发） */
  triggerMode?: "handle" | "longpress";
  /** 长按延迟毫秒数，默认 300 */
  longPressDelay?: number;
}

export const useDragSort = (options: DragSortOptions) => {
  const {
    virtualScrollRef,
    itemCount,
    onReorder,
    paddingTop = 0,
    triggerMode = "handle",
    longPressDelay = 300,
  } = options;

  const isDragging = ref(false);
  const draggedIndex = ref(-1);
  const targetIndex = ref(-1);
  const dropIndicator = reactive({ index: -1, position: "none" });

  const dragLabelData = ref<{ name: string } | null>(null);
  const dragLabelPosition = reactive({ top: 0, left: 0 });

  let listRect: DOMRect | null = null;
  let autoScrollRafId: number | null = null;

  // 长按相关
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingIndex = -1;
  let pendingLabelText = "";
  let pointerStartX = 0;
  let pointerStartY = 0;
  const MOVE_THRESHOLD = 5;

  // ---- 核心拖拽逻辑 ----

  const getPointerPos = (e: MouseEvent | TouchEvent) => {
    if ("touches" in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  };

  const activateDrag = (e: MouseEvent | TouchEvent, index: number, labelText: string) => {
    if (e.cancelable) {
      e.preventDefault();
    }

    isDragging.value = true;
    draggedIndex.value = index;
    targetIndex.value = index;
    dragLabelData.value = { name: labelText };

    const wrapper = virtualScrollRef.value?.wrapperRef;
    if (wrapper) {
      listRect = wrapper.getBoundingClientRect();
    }

    updateDragLabelPosition(e);

    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("touchmove", handleDragMove, { passive: false });
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchend", handleDragEnd);
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging.value) return;
    if (e.cancelable) e.preventDefault();

    updateDragLabelPosition(e);

    // 每次移动时刷新 listRect，避免因布局变化导致位置偏差
    const wrapper = virtualScrollRef.value?.wrapperRef;
    if (wrapper) {
      listRect = wrapper.getBoundingClientRect();
    }

    if (!listRect) return;
    const { y: clientY } = getPointerPos(e);

    handleAutoScroll(clientY, listRect);
    calculateTargetIndex(clientY);
  };

  const handleDragEnd = () => {
    if (draggedIndex.value !== targetIndex.value && targetIndex.value !== -1) {
      onReorder(draggedIndex.value, targetIndex.value);
    }

    cleanupDragState();
  };

  const cleanupDragState = () => {
    stopAutoScroll();
    cancelLongPress();

    isDragging.value = false;
    draggedIndex.value = -1;
    targetIndex.value = -1;
    dropIndicator.index = -1;
    dropIndicator.position = "none";
    dragLabelData.value = null;

    window.removeEventListener("mousemove", handleDragMove);
    window.removeEventListener("touchmove", handleDragMove);
    window.removeEventListener("mouseup", handleDragEnd);
    window.removeEventListener("touchend", handleDragEnd);
    window.removeEventListener("mousemove", handleLongPressMove);
    window.removeEventListener("touchmove", handleLongPressMove);
    window.removeEventListener("mouseup", handleLongPressCancel);
    window.removeEventListener("touchend", handleLongPressCancel);
  };

  const calculateTargetIndex = (clientY: number, overrideScrollTop?: number) => {
    if (!listRect || !virtualScrollRef.value) return;

    const currentScrollTop = overrideScrollTop ?? (virtualScrollRef.value.getScrollTop() || 0);
    const relativeY = clientY - listRect.top + currentScrollTop - paddingTop;
    const dropInfo = virtualScrollRef.value.getDropInfoByOffset(relativeY);

    let gapIndex = dropInfo.index;
    if (dropInfo.position === "bottom") {
      gapIndex += 1;
    }

    const maxGap = itemCount.value;
    gapIndex = Math.max(0, Math.min(gapIndex, maxGap));

    if (gapIndex === maxGap) {
      dropIndicator.index = maxGap - 1;
      dropIndicator.position = "bottom";
    } else {
      dropIndicator.index = gapIndex;
      dropIndicator.position = "top";
    }

    let insertIndex = draggedIndex.value;

    if (draggedIndex.value < gapIndex) {
      insertIndex = gapIndex - 1;
    } else if (draggedIndex.value > gapIndex) {
      insertIndex = gapIndex;
    }

    targetIndex.value = Math.max(0, Math.min(insertIndex, maxGap - 1));
  };

  const updateDragLabelPosition = (e: MouseEvent | TouchEvent) => {
    const { x, y } = getPointerPos(e);
    dragLabelPosition.left = x;
    dragLabelPosition.top = y;
  };

  // ---- 自动滚动 ----

  const handleAutoScroll = (clientY: number, rect: DOMRect) => {
    const edgeThreshold = 40;
    const scrollSpeed = 12;

    if (clientY < rect.top + edgeThreshold) {
      startAutoScroll(-scrollSpeed);
    } else if (clientY > rect.bottom - edgeThreshold) {
      startAutoScroll(scrollSpeed);
    } else {
      stopAutoScroll();
    }
  };

  const startAutoScroll = (amount: number) => {
    if (autoScrollRafId !== null) return;

    let expectedScroll = virtualScrollRef.value?.getScrollTop() || 0;

    const scrollStep = () => {
      if (!isDragging.value) return stopAutoScroll();

      const actualScroll = virtualScrollRef.value?.getScrollTop() || 0;
      if (Math.abs(actualScroll - expectedScroll) > Math.abs(amount) * 3) {
        expectedScroll = actualScroll;
      }

      expectedScroll = Math.max(0, expectedScroll + amount);
      virtualScrollRef.value?.scrollTo(expectedScroll, "auto");

      // 刷新 listRect 并使用实际的滚动位置计算目标索引
      const wrapper = virtualScrollRef.value?.wrapperRef;
      if (wrapper) {
        listRect = wrapper.getBoundingClientRect();
      }
      calculateTargetIndex(dragLabelPosition.top, expectedScroll);

      autoScrollRafId = requestAnimationFrame(scrollStep);
    };
    autoScrollRafId = requestAnimationFrame(scrollStep);
  };

  const stopAutoScroll = () => {
    if (autoScrollRafId !== null) {
      cancelAnimationFrame(autoScrollRafId);
      autoScrollRafId = null;
    }
  };

  // ---- 长按逻辑 ----

  const cancelLongPress = () => {
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  const handleLongPressMove = (e: MouseEvent | TouchEvent) => {
    const { x, y } = getPointerPos(e);
    const dx = x - pointerStartX;
    const dy = y - pointerStartY;

    if (Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD) {
      cancelLongPress();
      window.removeEventListener("mousemove", handleLongPressMove);
      window.removeEventListener("touchmove", handleLongPressMove);
      window.removeEventListener("mouseup", handleLongPressCancel);
      window.removeEventListener("touchend", handleLongPressCancel);
    }
  };

  const handleLongPressCancel = () => {
    cancelLongPress();
    window.removeEventListener("mousemove", handleLongPressMove);
    window.removeEventListener("touchmove", handleLongPressMove);
    window.removeEventListener("mouseup", handleLongPressCancel);
    window.removeEventListener("touchend", handleLongPressCancel);
  };

  // ---- 统一入口 ----

  const handlePointerDown = (e: MouseEvent | TouchEvent, index: number, labelText: string) => {
    if (triggerMode === "handle") {
      activateDrag(e, index, labelText);
      return;
    }

    // 长按模式
    const { x, y } = getPointerPos(e);
    pointerStartX = x;
    pointerStartY = y;
    pendingIndex = index;
    pendingLabelText = labelText;

    cancelLongPress();
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      // 震动反馈
      navigator.vibrate?.(50);
      // 构造一个具有正确坐标的伪事件用于 activateDrag
      activateDrag(e, pendingIndex, pendingLabelText);

      // 移除长按阶段的监听，拖拽阶段的监听已在 activateDrag 中绑定
      window.removeEventListener("mousemove", handleLongPressMove);
      window.removeEventListener("touchmove", handleLongPressMove);
      window.removeEventListener("mouseup", handleLongPressCancel);
      window.removeEventListener("touchend", handleLongPressCancel);
    }, longPressDelay);

    window.addEventListener("mousemove", handleLongPressMove);
    window.addEventListener("touchmove", handleLongPressMove, { passive: false });
    window.addEventListener("mouseup", handleLongPressCancel);
    window.addEventListener("touchend", handleLongPressCancel);
  };

  onUnmounted(() => {
    cleanupDragState();
  });

  return {
    isDragging,
    draggedIndex,
    dropIndicator,
    dragLabelData,
    dragLabelPosition,
    handlePointerDown,
    cleanupDragState,
  };
};
