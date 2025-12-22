<template>
  <div
    ref="wrapperRef"
    class="virtual-scroll-wrapper"
    :style="{ height: containerHeightStyle }"
  >
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
            willChange: 'transform',
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
import { computed, ref, watch, onMounted, onUpdated, nextTick } from "vue";
import { NScrollbar } from "naive-ui";
import { useElementSize } from "@vueuse/core";

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

// 容器引用（现在指向外层div）
const wrapperRef = ref<HTMLElement | null>(null);
// 滚动条引用
const scrollbarRef = ref<InstanceType<typeof NScrollbar> | null>(null);

// 使用 VueUse 测量外层容器高度，而不是尝试测量 NScrollbar 的实例
const { height: containerHeight } = useElementSize(wrapperRef);

// 项目元素引用
const itemRefs = ref<HTMLElement[]>([]);

// 滚动位置
const scrollTop = ref(0);

// 存储每个项目的实际高度
const itemHeights = ref<number[]>([]);
// 存储每个项目的累积高度（用于定位）
const itemTops = ref<number[]>([]);

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
  if (props.itemFixed) return; // 定高模式无需初始化数组

  const length = props.items.length;
  // 如果之前已经有数据，尽量复用，否则重置
  if (itemHeights.value.length !== length) {
    const oldHeights = itemHeights.value;
    itemHeights.value = Array.from(
      { length },
      (_, i) => oldHeights[i] || props.itemHeight,
    );
  }
  updateTops();
};

// 更新累积高度
const updateTops = () => {
  if (props.itemFixed) return; // 定高模式无需更新累积高度数组

  itemTops.value = [];
  let top = 0;
  for (let i = 0; i < itemHeights.value.length; i++) {
    itemTops.value[i] = top;
    top += itemHeights.value[i];
  }
};

// 列表总高度
const totalHeight = computed(() => {
  if (props.itemFixed) {
    return props.items.length * props.itemHeight + props.paddingBottom;
  }
  if (itemTops.value.length === 0) return props.paddingBottom;
  const lastIndex = itemTops.value.length - 1;
  return (
    itemTops.value[lastIndex] +
    itemHeights.value[lastIndex] +
    props.paddingBottom
  );
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
    // 定高模式：直接数学计算
    startIndex = Math.floor(currentScrollTop / props.itemHeight);
    const visibleCount = Math.ceil(vHeight / props.itemHeight);
    endIndex = startIndex + visibleCount;
  } else {
    // 动态高度模式：二分查找
    let start = 0;
    let end = itemTops.value.length - 1;

    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      const top = itemTops.value[mid];
      const bottom = top + itemHeights.value[mid];

      if (bottom > currentScrollTop) {
        startIndex = mid;
        end = mid - 1;
      } else {
        start = mid + 1;
      }
    }

    // 查找结束索引
    const viewportBottom = currentScrollTop + vHeight;
    endIndex = startIndex;

    // 从 startIndex 开始向后查找
    for (let i = startIndex; i < itemTops.value.length; i++) {
      if (itemTops.value[i] > viewportBottom) {
        break;
      }
      endIndex = i;
    }
  }

  // 应用缓冲区
  actualStartIndex.value = Math.max(0, startIndex - props.bufferSize);
  actualEndIndex.value = Math.min(
    props.items.length - 1,
    endIndex + props.bufferSize,
  );
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
  return itemTops.value[actualStartIndex.value];
});

// 测量项目高度（保留动态高度支持）
const measureItemHeights = () => {
  if (props.itemFixed) return; // 定高模式无需测量
  if (!itemRefs.value.length || props.items.length === 0) return;

  let hasChanges = false;
  itemRefs.value.forEach((el, index) => {
    if (!el) return;

    const actualIndex = actualStartIndex.value + index;
    if (actualIndex < 0 || actualIndex >= props.items.length) return;

    try {
      const height = el.getBoundingClientRect().height; // 使用 getBoundingClientRect 更精确

      // 允许 1px 误差，避免频繁更新
      if (
        height > 0 &&
        Math.abs(height - itemHeights.value[actualIndex]) > 0.5
      ) {
        itemHeights.value[actualIndex] = height;
        hasChanges = true;
      }
    } catch (error) {
      console.warn("测量项目高度时出错:", error);
    }
  });

  if (hasChanges) {
    updateTops();
  }
};

// 处理滚动事件
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  if (target) {
    const { scrollTop: st, scrollHeight, clientHeight } = target;
    scrollTop.value = st;
    calculateVisibleRange(st);
    emit("scroll", event);

    // 触底检测
    if (scrollHeight - st - clientHeight < 50) {
      emit("reachBottom");
    }
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

// 监听数据变化
watch(
  () => props.items,
  () => {
    initializeHeights();
    calculateVisibleRange(scrollTop.value);
  },
  { deep: false },
); // items 引用变化时触发

// 监听数据长度变化（针对数组变更）
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

// 组件挂载后初始化
onMounted(() => {
  initializeHeights();
  // 等待 DOM 渲染和容器尺寸确定
  nextTick(() => {
    calculateVisibleRange(0);
    if (props.defaultScrollIndex) {
      scrollToIndex(props.defaultScrollIndex);
    }
  });
});

// 组件更新后测量高度
onUpdated(() => {
  nextTick(() => {
    measureItemHeights();
  });
});
</script>

<style scoped>
.virtual-scroll-wrapper {
  width: 100%;
}
.custom-virtual-list {
  will-change: transform; /* 优化滚动性能 */
  width: 100%;
}
.virtual-item {
  box-sizing: border-box;
}
</style>
