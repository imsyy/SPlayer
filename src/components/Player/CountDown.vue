<template>
  <Transition name="fade" mode="out-in">
    <div
      v-if="isShow"
      :id="isFirst ? 'lrc-1' : null"
      :style="{
        animationPlayState: status.playState ? 'running' : 'paused',
      }"
      class="count-down"
    >
      <div
        v-for="(item, index) in 3"
        :key="index"
        class="point"
        :style="{ opacity: pointOpacity(index) }"
      />
    </div>
  </Transition>
</template>

<script setup>
import { siteStatus } from "@/stores";

const status = siteStatus();
const props = defineProps({
  // 是否为第一个
  isFirst: {
    type: Boolean,
    default: false,
  },
  // 开始时间
  start: {
    type: Number,
    default: 0,
  },
  // 持续时间
  duration: {
    type: Number,
    default: 0,
  },
  // 实时时间
  seek: {
    type: Number,
    default: 0,
  },
});

// 是否显示
const isShow = computed(() => {
  if (props.isFirst) {
    // 计算实时时间 - 0.5是否小于开始 + 持续时间，小于则显示，否则不显示
    return props.seek + 0.5 < props.start + props.duration;
  }
  // 默认显示
  return true;
});

// 计算每个点的透明度
const pointOpacity = (index) => {
  if (props.isFirst) {
    // 总时长的三分之一
    const perPointTime = props.duration / 3;
    // 计算当前实时时间在哪个阶段
    const currentTime = props.seek - props.start;
    if (currentTime <= 0) {
      // 实时时间小于开始时间，不显示任何点
      return 0;
    } else if (currentTime < perPointTime * (index + 1)) {
      // 在当前阶段内，透明度逐渐减小，保持 0.1 不变
      const percentage = (currentTime - perPointTime * index) / perPointTime;
      // 0.1 + 0.7* (1-percentage) 让透明度最小为 0.1
      return 0.1 + 0.7 * (1 - percentage);
    }
  }
  // 默认透明度为 0.1
  return 0.1;
};
</script>

<style lang="scss" scoped>
.count-down {
  margin: 6px 0;
  padding: 10px 16px;
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  animation: breathe 4s ease-in-out infinite;
  .point {
    width: 28px;
    height: 28px;
    margin-right: 12px;
    border-radius: 50%;
    background-color: var(--cover-main-color);
    @media (max-width: 900px) {
      width: 24px;
      height: 24px;
    }
    @media (max-width: 700px) {
      width: 20px;
      height: 20px;
    }
  }
}
@keyframes breathe {
  0% {
    transform: scale(0.95);
  }

  50% {
    transform: scale(1.1);
  }

  100% {
    transform: scale(0.95);
  }
}
</style>
