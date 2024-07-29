<!-- 播放器 - 音乐频谱 -->
<template>
  <div :style="{ opacity: show ? '0.6' : '0.1' }" class="spectrum">
    <canvas ref="canvasRef" :style="{ height: height + 'px' }" class="spectrum-line" />
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { siteStatus } from "@/stores";

const props = defineProps({
  show: {
    type: Boolean,
    default: true,
  },
  height: {
    type: Number,
    default: 80,
  },
  barWidth: {
    type: Number,
    default: 4,
  },
  radius: {
    type: Number,
    default: 2.5,
  },
});
const status = siteStatus();
const { spectrumsData } = storeToRefs(status);

// canvas
const canvasRef = ref(null);
const isKeepDrawing = ref(true);

/**
 * 绘制音乐频谱图
 * @param {Array} data - 包含音频频谱数据的数组
 */
const drawSpectrum = (data) => {
  if (!data) return;
  if (!isKeepDrawing.value) return;
  // 去除频谱前5项
  data = data.slice(5);
  // 设置画布宽度，最大为 1600
  canvasRef.value.width = document.body.clientWidth >= 1600 ? 1600 : document.body.clientWidth;
  // 设置画布高度
  canvasRef.value.height = props.height;
  // 获取2D上下文
  const ctx = canvasRef.value.getContext("2d");
  // 画布宽高
  const canvasWidth = canvasRef.value.width;
  const canvasHeight = canvasRef.value.height;
  // 频谱数量
  const numBars = spectrumsData.value.length / 2.5;
  // 圆角半径
  const cornerRadius = props.radius;
  // 柱形宽度
  const barWidth = canvasWidth / numBars / 2;
  // 清除画布
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  // 遍历音频频谱数据
  for (let i = 0; i < numBars; i++) {
    // 计算柱形高度
    const barHeight = (data[i] / 255) * canvasHeight;
    // 计算柱形的 x 和 y 坐标
    const x1 = i * barWidth + canvasWidth / 2;
    const x2 = canvasWidth / 2 - (i + 1) * barWidth;
    const y = canvasHeight - barHeight;
    // 设置柱形颜色，如果未设置则使用默认颜色
    ctx.fillStyle = `rgb(${status.coverTheme?.light?.shadeTwo})` || "#efefef";
    // 检查柱形高度是否大于0，避免绘制高度为0的柱形
    if (barHeight > 0) {
      // 调用绘制圆角矩形的函数
      roundRect(ctx, x1, y, barWidth - 3, barHeight, cornerRadius);
      roundRect(ctx, x2, y, barWidth - 3, barHeight, cornerRadius);
    }
  }
  // 请求下一帧
  requestAnimationFrame(() => {
    drawSpectrum(spectrumsData.value);
  });
};

/**
 * 绘制圆角矩形
 * @param {CanvasRenderingContext2D} ctx - 2D上下文
 * @param {number} x - 矩形左上角 x 坐标
 * @param {number} y - 矩形左上角 y 坐标
 * @param {number} width - 矩形宽度
 * @param {number} height - 矩形高度
 * @param {number} radius - 圆角半径
 */
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

onMounted(() => {
  drawSpectrum(spectrumsData.value);
});

onBeforeUnmount(() => {
  isKeepDrawing.value = false;
});
</script>

<style lang="scss" scoped>
.spectrum {
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: center;
  opacity: 0.6;
  z-index: -1;
  pointer-events: none;
  transition: opacity 0.3s;
  mask: linear-gradient(
    90deg,
    hsla(0, 0%, 100%, 0) 0,
    hsla(0, 0%, 100%, 0.6) 10%,
    #fff 15%,
    #fff 85%,
    hsla(0, 0%, 100%, 0.6) 90%,
    hsla(0, 0%, 100%, 0)
  );
  -webkit-mask: linear-gradient(
    90deg,
    hsla(0, 0%, 100%, 0) 0,
    hsla(0, 0%, 100%, 0.6) 10%,
    #fff 15%,
    #fff 85%,
    hsla(0, 0%, 100%, 0.6) 90%,
    hsla(0, 0%, 100%, 0)
  );
  .spectrum-line {
    mask: linear-gradient(
      90deg,
      hsla(0, 0%, 100%, 0) 0,
      hsla(0, 0%, 100%, 0.6) 5%,
      #fff 10%,
      #fff 90%,
      hsla(0, 0%, 100%, 0.6) 95%,
      hsla(0, 0%, 100%, 0)
    );
    -webkit-mask: linear-gradient(
      90deg,
      hsla(0, 0%, 100%, 0) 0,
      hsla(0, 0%, 100%, 0.6) 5%,
      #fff 10%,
      #fff 90%,
      hsla(0, 0%, 100%, 0.6) 95%,
      hsla(0, 0%, 100%, 0)
    );
  }
}
</style>
