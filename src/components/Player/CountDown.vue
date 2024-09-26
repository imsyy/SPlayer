<template>
  <Transition name="fade" mode="out-in">
    <div
      v-if="isShow"
      :style="{
        animationPlayState: playing ? 'running' : 'paused',
      }"
      class="count-down"
    >
      <div
        v-for="item in 3"
        :key="item"
        class="point"
        :style="{ opacity: pointOpacity(item - 1) }"
      />
    </div>
  </Transition>
</template>

<script setup lang="ts">
const props = defineProps<{
  // 开始时间
  start: number;
  // 持续时间
  duration: number;
  // 实时时间
  seek: number;
  // 播放状态
  playing: boolean;
}>();

// 是否显示
const isShow = computed(() => {
  // 计算实时时间 - 0.5是否小于开始 + 持续时间，小于则显示，否则不显示
  return props.seek + 0.5 < props.start + props.duration;
});

// 计算每个点的透明度
const pointOpacity = (index: number) => {
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
    background-color: rgb(var(--main-color));
    transition: opacity 0.5s;
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
</style>
