<template>
  <div ref="wrapperRef" class="virtual-scroll-wrapper" :style="{ height: containerHeightStyle }">
    <n-scrollbar
      ref="scrollbarRef"
      class="custom-virtual-list"
      style="height: 100%"
      @scroll="handleScroll"
    >
      <!-- 占位空间 -->
      <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
        <!-- 可见项目容器 -->
        <div
          :style="{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${offsetY}px)`,
          }"
        >
          <div
            v-for="(item, index) in visibleItems"
            :key="getItemKey(item, actualStartIndex + index)"
            ref="itemRefs"
            class="virtual-item"
            :data-index="actualStartIndex + index"
          >
            <slot :item="item" :index="actualStartIndex + index" />
          </div>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { NScrollbar } from "naive-ui";

interface Props {
  /** 列表项数据 */
  items: any[];
  /** 默认每项高度（用于估算） */
  itemHeight: number;
  /** 是否开启定高模式（开启后不进行 DOM 测量，性能更佳） */
  itemFixed?: boolean;
  /** 容器高度 */
  height: number | string;
  /** 底部内边距 */
  paddingBottom?: number;
  /** 缓冲区大小（上下额外渲染的项数） */
  bufferSize?: number;
  /** 默认滚动索引 */
  defaultScrollIndex?: number;
  /** 获取唯一键的函数 */
  getItemKey?: (item: any, index: number) => string | number;
}

const props = withDefaults(defineProps<Props>(), {
  itemFixed: false,
  bufferSize: 5,
  paddingBottom: 0,
  getItemKey: (item: any, index: number) => {
    return item?.key ?? item?.id ?? index;
  },
});

const emit = defineEmits<{
  (e: "scroll", event: Event): void;
  (e: "reachBottom"): void;
}>();

const wrapperRef = ref<HTMLElement | null>(null);
const scrollbarRef = ref<InstanceType<typeof NScrollbar> | null>(null);

// 测量外层容器高度
const { height: containerHeight } = useElementSize(wrapperRef);

// 项目元素引用
const itemRefs = ref<HTMLElement[]>([]);

// 滚动位置
const scrollTop = ref(0);

// 存储每个项目的实际高度
const itemHeights = shallowRef<number[]>([]);
// 存储每个项目的累积高度（用于定位）
const itemTops = shallowRef<number[]>([]);

// 当前可见的起始索引
const actualStartIndex = ref(0);
// 当前可见的结束索引
const actualEndIndex = ref(0);

// 容器高度样式
const containerHeightStyle = computed(() => {
  return typeof props.height === "number" ? `${props.height}px` : props.height;
});

// 实际使用的容器高度数值
const viewportHeight = computed(() => {
  if (typeof props.height === "number") return props.height;
  return containerHeight.value || 0;
});

// 初始化高度数组
const initializeHeights = () => {
  if (props.itemFixed) return;

  const length = props.items.length;
  // 如果之前已经有数据，尽量复用，否则重置
  if (itemHeights.value.length !== length) {
    const oldHeights = itemHeights.value;
    itemHeights.value = Array.from({ length }, (_, i) => oldHeights[i] || props.itemHeight);
  }
  updateTops();
};

// 更新累积高度
const updateTops = (fromIndex = 0) => {
  if (props.itemFixed) return;

  const heights = itemHeights.value;
  const tops =
    itemTops.value.length === heights.length ? itemTops.value : new Array(heights.length);

  // 从变更位置开始计算
  let top = fromIndex > 0 ? tops[fromIndex - 1] + heights[fromIndex - 1] : 0;
  for (let i = fromIndex; i < heights.length; i++) {
    tops[i] = top;
    top += heights[i];
  }

  itemTops.value = tops;
};

// 列表总高度
const totalHeight = computed(() => {
  if (props.itemFixed) {
    return props.items.length * props.itemHeight + props.paddingBottom;
  }
  if (itemTops.value.length === 0) return props.paddingBottom;
  const lastIndex = itemTops.value.length - 1;
  return itemTops.value[lastIndex] + itemHeights.value[lastIndex] + props.paddingBottom;
});

// 计算可见区域
const calculateVisibleRange = (currentScrollTop: number) => {
  if (props.items.length === 0) {
    actualStartIndex.value = 0;
    actualEndIndex.value = -1;
    return;
  }

  const vHeight = viewportHeight.value;
  if (!vHeight) return; // 容器高度未就绪

  let startIndex = 0;
  let endIndex = 0;

  if (props.itemFixed) {
    // 定高模式
    startIndex = Math.floor(currentScrollTop / props.itemHeight);
    const visibleCount = Math.ceil(vHeight / props.itemHeight);
    endIndex = startIndex + visibleCount;
  } else {
    // 动态高度模式 - 使用二分查找优化
    const tops = itemTops.value;
    const heights = itemHeights.value;
    const len = tops.length;

    // 二分查找起始索引
    let lo = 0;
    let hi = len - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const bottom = tops[mid] + heights[mid];
      if (bottom > currentScrollTop) {
        startIndex = mid;
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }

    // 二分查找结束索引
    const viewportBottom = currentScrollTop + vHeight;
    lo = startIndex;
    hi = len - 1;
    endIndex = startIndex;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (tops[mid] <= viewportBottom) {
        endIndex = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
  }

  // 应用缓冲区
  const newStart = Math.max(0, startIndex - props.bufferSize);
  const newEnd = Math.min(props.items.length - 1, endIndex + props.bufferSize);

  if (newStart !== actualStartIndex.value || newEnd !== actualEndIndex.value) {
    actualStartIndex.value = newStart;
    actualEndIndex.value = newEnd;
  }
};

// 可见项
const visibleItems = computed(() => {
  if (actualStartIndex.value > actualEndIndex.value) return [];
  return props.items.slice(actualStartIndex.value, actualEndIndex.value + 1);
});

// Y 轴偏移量
const offsetY = computed(() => {
  if (actualStartIndex.value === 0) return 0;
  if (props.itemFixed) {
    return actualStartIndex.value * props.itemHeight;
  }
  if (itemTops.value.length === 0) return 0;
  return Math.round(itemTops.value[actualStartIndex.value]);
});

// 测量项目高度
const measureItemHeights = () => {
  if (props.itemFixed) return;
  if (!itemRefs.value.length || props.items.length === 0) return;

  let hasChanges = false;
  itemRefs.value.forEach((el, index) => {
    if (!el) return;

    const actualIndex = actualStartIndex.value + index;
    if (actualIndex < 0 || actualIndex >= props.items.length) return;

    try {
      const height = el.getBoundingClientRect().height;

      // 允许 1px 误差，避免频繁更新
      if (height > 0 && Math.abs(height - itemHeights.value[actualIndex]) > 0.5) {
        itemHeights.value[actualIndex] = height;
        hasChanges = true;
      }
    } catch (error) {
      console.warn("测量项目高度时出错:", error);
    }
  });

  if (hasChanges) {
    triggerRef(itemHeights);
    updateTops();
  }
};

let rafId: number | null = null;
let pendingScrollTarget: HTMLElement | null = null;

const processScroll = () => {
  rafId = null;
  const target = pendingScrollTarget;
  if (!target) return;

  const { scrollTop: st, scrollHeight, clientHeight } = target;
  scrollTop.value = st;
  calculateVisibleRange(st);

  // 触底检测
  if (scrollHeight - st - clientHeight < 50) {
    emit("reachBottom");
  }
};

// 处理滚动事件
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  if (!target) return;

  // 触发外部事件
  emit("scroll", event);

  // 合并多次滚动到一个 rAF
  pendingScrollTarget = target;
  if (rafId === null) {
    rafId = requestAnimationFrame(processScroll);
  }
};

// 滚动到指定索引
const scrollToIndex = (index: number, behavior: ScrollBehavior = "auto") => {
  if (props.items.length === 0) return;

  // 确保索引在有效范围内
  const targetIndex = Math.max(0, Math.min(index, props.items.length - 1));

  let top = 0;
  if (props.itemFixed) {
    top = targetIndex * props.itemHeight;
  } else {
    // 确保有高度数据
    if (itemTops.value.length <= targetIndex) {
      initializeHeights();
    }
    top = itemTops.value[targetIndex] || 0;
  }

  scrollToPosition(top, behavior);
};

// 滚动到指定位置
const scrollToPosition = (top: number, behavior: ScrollBehavior = "auto") => {
  scrollbarRef.value?.scrollTo({
    top,
    behavior,
  });
};

// 获取当前滚动位置
const getScrollTop = () => {
  return scrollTop.value;
};

// 暴露方法给父组件
defineExpose({
  scrollTo: scrollToPosition,
  scrollToIndex,
  getScrollTop,
});

// 防抖高度测量
const debouncedMeasure = useDebounceFn(measureItemHeights, 50);

// 监听数据变化
watch(
  () => props.items,
  () => {
    initializeHeights();
    calculateVisibleRange(scrollTop.value);
    // 重新测量高度
    nextTick(debouncedMeasure);
  },
  { deep: false },
);

// 监听数据长度变化
watch(
  () => props.items.length,
  () => {
    initializeHeights();
    calculateVisibleRange(scrollTop.value);
  },
);

// 监听视口高度变化
watch(viewportHeight, () => {
  calculateVisibleRange(scrollTop.value);
});

// 监听可见区域变化，仅在非定高模式下触发测量
watch(
  () => [actualStartIndex.value, actualEndIndex.value],
  () => {
    if (!props.itemFixed) {
      nextTick(debouncedMeasure);
    }
  },
  { flush: "post" },
);

onMounted(() => {
  initializeHeights();
  // 等待 DOM 渲染和容器尺寸确定
  nextTick(() => {
    calculateVisibleRange(0);
    if (props.defaultScrollIndex) {
      scrollToIndex(props.defaultScrollIndex);
    }
    // 初始测量
    if (!props.itemFixed) measureItemHeights();
  });
});

onUnmounted(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
});
</script>

<style scoped>
.virtual-scroll-wrapper {
  width: 100%;
  contain: layout paint;
  overflow-anchor: none;
}
.custom-virtual-list {
  /* will-change: transform; */
  width: 100%;
}
.virtual-item {
  contain: layout paint;
}
</style>
