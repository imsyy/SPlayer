<template>
  <div ref="textContainerRef" :key="text.length" class="text-container">
    <!-- 空白占位符 -->
    <span class="empty">{{ text }}</span>
    <div ref="scrollWrapperRef" class="scroll-wrapper">
      <span ref="textRef" class="text">{{ text }}</span>
      <span v-if="isTextOverflowing" ref="textCloneRef" class="text">{{ text }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  text: string;
  // 滚动速度
  speed?: number;
  // 延迟时间
  delay?: number;
}>();

const textRef = ref<HTMLElement | null>(null);
const textCloneRef = ref<HTMLElement | null>(null);
const textContainerRef = ref<HTMLElement | null>(null);
const scrollWrapperRef = ref<HTMLElement | null>(null);

// 是否超出宽度
const isTextOverflowing = ref(false);

// 容器宽度
const { width: textContainerWidth } = useElementSize(textContainerRef);

// 检查文本是否超出宽度
const checkTextWidth = () => {
  if (textRef.value && textContainerRef.value) {
    const textWidth = textRef.value.offsetWidth;
    const containerWidth = textContainerWidth.value;
    // 判断阈值
    isTextOverflowing.value = textWidth > containerWidth + 2;
  }
  // 更新状态
  updateScroll();
};

// 文本宽度变化时更新滚动状态
const updateScroll = () => {
  if (isTextOverflowing.value) {
    startScrolling();
  } else {
    stopScrolling();
  }
};

// 滚动动画定时器
let animationId: number | null = null;
let scrollTimeoutId: ReturnType<typeof setTimeout> | null = null;

// 开始滚动
const startScrolling = () => {
  if (!textRef.value || !textContainerRef.value || !scrollWrapperRef.value || !textCloneRef.value)
    return;
  // 设置滚动速度（ 单位：像素/帧 ）
  const scrollSpeed = props.speed || 0.5;

  let currentPos = 0;
  // 滚动动画
  const scroll = () => {
    if (!textRef.value || !textContainerRef.value || !scrollWrapperRef.value || !textCloneRef.value)
      return;
    if (currentPos <= -textRef.value.scrollWidth - 120) {
      currentPos = 0;
    } else {
      currentPos -= scrollSpeed;
    }
    // 设置滚动位置
    scrollWrapperRef.value.style.transform = `translateX(${currentPos}px)`;
    animationId = requestAnimationFrame(scroll);
  };
  // 延迟滚动
  scrollTimeoutId = setTimeout(() => {
    scroll();
  }, props.delay || 3000);
};

// 停止滚动
const stopScrolling = () => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  if (scrollTimeoutId !== null) {
    clearTimeout(scrollTimeoutId);
    scrollTimeoutId = null;
  }
  if (scrollWrapperRef.value) {
    scrollWrapperRef.value.style.transform = "translateX(0)";
  }
};

watch(
  () => [props.text, textContainerWidth.value, textCloneRef.value],
  () => {
    nextTick(checkTextWidth);
  },
);

watch(isTextOverflowing, () => {
  updateScroll();
});

onMounted(() => {
  nextTick(checkTextWidth);
});

onUnmounted(() => {
  stopScrolling();
});
</script>

<style lang="scss" scoped>
.text-container {
  position: relative;
  display: inline-block;
  overflow: hidden;
  width: 100%;
  .empty {
    opacity: 0;
    white-space: nowrap;
  }
  .scroll-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    display: inline-flex;
    white-space: nowrap;
    will-change: transform;
    .text {
      display: inline-block;
      white-space: nowrap;
      &:nth-of-type(2) {
        margin-left: 120px;
      }
    }
  }
}
</style>
