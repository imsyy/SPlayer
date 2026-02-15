<template>
  <div class="scroll-wrapper" ref="wrapperRef">
    <div
      class="scroll-content"
      ref="contentRef"
      :style="contentStyle"
      :class="{
        'animate-scroll': mode === 'line' && isActive && isOverflow,
      }"
    >
      {{ text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { type CSSProperties } from "vue";

const props = defineProps<{
  text: string;
  isActive: boolean;
  mode: "line" | "word";
  progress?: number;
}>();

const emit = defineEmits<{
  (e: "resize-width", width: number): void;
}>();

const wrapperRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);

const wrapperWidth = ref(0);
const contentWidth = ref(0);

const maxOffset = computed(() => {
  const diff = contentWidth.value - wrapperWidth.value;
  return diff > 0 ? diff + 10 : 0;
});

const isOverflow = computed(() => maxOffset.value > 0);

const contentStyle = computed<CSSProperties>(() => {
  if (!isOverflow.value) {
    return { transform: "translateX(0)" };
  }

  if (props.mode === "word") {
    const p = Math.max(0, Math.min(props.progress || 0, 1));
    return {
      transform: `translateX(-${maxOffset.value * p}px)`,
    };
  }

  if (props.mode === "line") {
    const duration = 2 + maxOffset.value / 30;
    return {
      "--target-offset": `-${maxOffset.value}px`,
      "--scroll-duration": `${duration}s`,
    } as CSSProperties;
  }

  return { transform: "translateX(0)" };
});

let resizeObserver: ResizeObserver | null = null;
const updateMetrics = () => {
  if (wrapperRef.value) wrapperWidth.value = wrapperRef.value.clientWidth;
  if (contentRef.value) {
    const scrollWidth = contentRef.value.scrollWidth;
    contentWidth.value = scrollWidth;
    emit("resize-width", scrollWidth);
  }
};

onMounted(() => {
  resizeObserver = new ResizeObserver(() => updateMetrics());
  if (wrapperRef.value) resizeObserver.observe(wrapperRef.value);
  if (contentRef.value) resizeObserver.observe(contentRef.value);
  updateMetrics();
});

onUnmounted(() => resizeObserver?.disconnect());
watch(
  () => props.text,
  () => nextTick(updateMetrics),
);
</script>

<style scoped>
.scroll-wrapper {
  width: 100%;
  white-space: nowrap;
}

.scroll-content {
  display: inline-block;
  will-change: transform;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  -webkit-font-smoothing: subpixel-antialiased;
}

.animate-scroll {
  animation: scroll-pingpong var(--scroll-duration) linear infinite alternate;
  animation-delay: 1.5s;
}

@keyframes scroll-pingpong {
  0%,
  15% {
    transform: translateX(0);
  }
  85%,
  100% {
    transform: translateX(var(--target-offset));
  }
}
</style>
