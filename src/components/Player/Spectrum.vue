<template>
  <div class="spectrum">
    <canvas class="avBars" ref="canvasRef" />
  </div>
</template>

<script setup>
import { musicStore } from "@/store";

const music = musicStore();
const canvasRef = ref(null);

const drawSpectrum = (data) => {
  canvasRef.value.width =
    document.body.clientWidth >= 1600 ? 1600 : document.body.clientWidth;
  canvasRef.value.height = 80;
  const ctx = canvasRef.value.getContext("2d");
  const barWidth = 2;
  // 清除画布
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
  for (let i = 0; i < 360; i++) {
    const barHeight = (data[i] / 255) * canvasRef.value.height;
    const x = i * (barWidth * 2);
    const y = canvasRef.value.height - barHeight;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, barWidth, barHeight);
  }
};

watch(
  () => music.spectrumsData.data,
  (val) => drawSpectrum(val)
);
</script>

<style lang="scss" scoped>
.spectrum {
  position: absolute;
}
</style>
