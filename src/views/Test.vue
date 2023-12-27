<template>
  <div class="test">
    <n-h1>测试页面</n-h1>
    <n-card title="频谱数据" style="margin-bottom: 20px">
      <n-scrollbar style="max-height: 120px">
        {{ status.spectrumsData }}
      </n-scrollbar>
    </n-card>
    <n-card title="频谱图">
      <canvas ref="canvasRef" class="avBars" style="width: 100%" />
    </n-card>
  </div>
</template>

<script setup>
import { siteStatus } from "@/stores";

const status = siteStatus();

const canvasRef = ref(null);

const drawSpectrum = (data) => {
  canvasRef.value.width = document.body.clientWidth >= 1600 ? 1600 : document.body.clientWidth;
  canvasRef.value.height = 80;
  const ctx = canvasRef.value.getContext("2d");
  const barWidth = 6;
  const cornerRadius = 3; // 圆角半径
  // 清除画布
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
  for (let i = 0; i < 360; i++) {
    const barHeight = (data[i] / 255) * canvasRef.value.height;
    const x = i * (barWidth * 2);
    const y = canvasRef.value.height - barHeight;
    ctx.fillStyle = `rgb(${status.coverTheme?.light?.shadeTwo})` || "#efefef";
    // ctx.fillRect(x, y, barWidth, barHeight);
    // 检查柱形高度是否大于0
    if (barHeight > 0) {
      roundRect(ctx, x, y, barWidth, barHeight, cornerRadius);
    }
  }
  requestAnimationFrame(() => {
    drawSpectrum(status.spectrumsData);
  });
};

// 辅助函数：绘制圆角矩形
const roundRect = (ctx, x, y, width, height, radius) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
};

// watch(
//   () => status.spectrumsData,
//   (val) => drawSpectrum(val),
// );
onMounted(() => {
  drawSpectrum(status.spectrumsData);
});
</script>

<style lang="scss" scoped>
.avBars {
  mask: linear-gradient(
    90deg,
    hsla(0, 0%, 100%, 0) 0,
    hsla(0, 0%, 100%, 0.6) 5%,
    #fff 10%,
    #fff 75%,
    hsla(0, 0%, 100%, 0.6) 85%,
    hsla(0, 0%, 100%, 0)
  );
  -webkit-mask: linear-gradient(
    90deg,
    hsla(0, 0%, 100%, 0) 0,
    hsla(0, 0%, 100%, 0.6) 5%,
    #fff 10%,
    #fff 75%,
    hsla(0, 0%, 100%, 0.6) 85%,
    hsla(0, 0%, 100%, 0)
  );
}
</style>
