<!-- 播放器背景 -->
<template>
  <div ref="wrapperRef" class="player-background" />
</template>

<script setup lang="ts">
import type { BackgroundRenderProps, BackgroundRenderRef } from "@applemusic-like-lyrics/vue";
import {
  AbstractBaseRenderer,
  BackgroundRender,
  EplorRenderer,
} from "@applemusic-like-lyrics/core";

const props = defineProps<BackgroundRenderProps>();
const wrapperRef = ref<HTMLDivElement>();
const bgRenderRef = ref<AbstractBaseRenderer>();

// 初始化组件
const initBackgroundRender = () => {
  if (!wrapperRef.value) return;
  bgRenderRef.value = BackgroundRender.new(props.renderer ?? EplorRenderer);
  const canvasEl = bgRenderRef.value.getElement();
  canvasEl.style.width = "100%";
  canvasEl.style.height = "100%";
  wrapperRef.value.appendChild(canvasEl);
};

// 配置更改
watchEffect(() => {
  if (props.album) bgRenderRef.value?.setAlbum(props.album, props.albumIsVideo);
});

watchEffect(() => {
  if (props.fps) bgRenderRef.value?.setFPS(props.fps);
});

watchEffect(() => {
  if (props.playing) bgRenderRef.value?.pause();
  else bgRenderRef.value?.resume();
});

watchEffect(() => {
  if (props.flowSpeed) bgRenderRef.value?.setFlowSpeed(props.flowSpeed);
});

watchEffect(() => {
  if (props.renderScale) bgRenderRef.value?.setRenderScale(props.renderScale);
});

watchEffect(() => {
  if (props.lowFreqVolume) bgRenderRef.value?.setLowFreqVolume(props.lowFreqVolume);
});

watchEffect(() => {
  if (props.hasLyric !== undefined) bgRenderRef.value?.setHasLyric(props.hasLyric ?? true);
});

// 导出渲染器
defineExpose<BackgroundRenderRef>({
  bgRender: bgRenderRef,
  wrapperEl: wrapperRef,
});

onMounted(() => {
  initBackgroundRender();
});

onUnmounted(() => {
  if (bgRenderRef.value) bgRenderRef.value.dispose();
});
</script>
