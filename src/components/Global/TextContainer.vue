<template>
  <div ref="textContainerRef" class="text-container">
    <div ref="scrollWrapperRef" class="scroll-wrapper">
      <div ref="textRef" class="text">
        <slot>{{ text }}</slot>
      </div>
      <div v-if="isTextOverflowing" class="text clone">
        <slot>{{ text }}</slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  text?: string;
  // 滚动速度 (px/frame)
  speed?: number;
  // 延迟时间
  delay?: number;
  // 两个内容之间的间距 (px)
  gap?: number;
}>();

const gap = props.gap ?? 50;

const textRef = ref<HTMLElement | null>(null);
const textContainerRef = ref<HTMLElement | null>(null);
const scrollWrapperRef = ref<HTMLElement | null>(null);

// 是否超出宽度
const isTextOverflowing = ref(false);

const { width: textContainerWidth } = useElementSize(textContainerRef);
const { width: textWidth } = useElementSize(textRef);

// 检查文本是否超出宽度
const checkTextWidth = () => {
  if (textWidth.value && textContainerWidth.value) {
    isTextOverflowing.value = textWidth.value > textContainerWidth.value;
  }
  updateScroll();
  // 触发一次重绘，解决某些情况下宽度计算不准确的问题
  if (scrollWrapperRef.value) {
    scrollWrapperRef.value.style.display = "none";
    scrollWrapperRef.value.offsetHeight;
    scrollWrapperRef.value.style.display = "";
  }
};

// 更新滚动状态
const updateScroll = () => {
  if (isTextOverflowing.value) {
    startScrolling();
  } else {
    stopScrolling();
  }
};

let animationId: number | null = null;
let scrollTimeoutId: ReturnType<typeof setTimeout> | null = null;

// 开始滚动
const startScrolling = () => {
  stopScrolling();
  if (!textRef.value || !textContainerRef.value || !scrollWrapperRef.value) return;
  const scrollSpeed = props.speed || 0.5;

  let currentPos = 0;
  const scroll = () => {
    if (!textRef.value || !textContainerRef.value || !scrollWrapperRef.value) return;
    // 当滚动到足以显示完整克隆内容时重置
    if (currentPos <= -textRef.value.scrollWidth - gap) {
      currentPos = 0;
    } else {
      currentPos -= scrollSpeed;
    }
    scrollWrapperRef.value.style.transform = `translateX(${currentPos}px)`;
    animationId = requestAnimationFrame(scroll);
  };
  // 延迟启动滚动
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
  () => [props.text, textContainerWidth.value, textWidth.value],
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
  display: block;
  overflow: hidden;
  width: 100%;
  .scroll-wrapper {
    position: relative;
    display: flex;
    width: fit-content;
    white-space: nowrap;
    will-change: transform;
    min-width: 100%;
    .text {
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
      &.clone {
        padding-left: v-bind("gap + 'px'");
      }
    }
  }
}
</style>
