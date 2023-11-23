<!-- 全局图标 -->
<template>
  <template v-if="showSlot">
    <slot />
  </template>
  <template v-else>
    <svg
      v-if="!isSpecial"
      class="svg-icon"
      xmlns="http://www.w3.org/2000/svg"
      :width="width"
      :height="height"
      :style="size ? `font-size:${size}px` : null"
      viewBox="0 0 24 24"
    >
      <path fill="currentColor" :d="iconData[icon]" />
    </svg>
    <!-- 特殊图标处理 -->
    <template v-else>
      <!-- 随机播放 -->
      <svg
        v-if="icon === 'shuffle'"
        class="svg-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
      >
        <path
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 17h2.735a4 4 0 0 0 3.43-1.942l3.67-6.116A4 4 0 0 1 16.265 7H21m0 0l-2-2m2 2l-2 2M3 7h2.735a4 4 0 0 1 2.871 1.215M21 17h-4.735a4 4 0 0 1-2.871-1.215M21 17l-2 2m2-2l-2-2"
        />
      </svg>
      <!-- 列表循环 -->
      <svg
        v-if="icon === 'repeat-list'"
        class="svg-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
      >
        <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2">
          <path stroke-linejoin="round" d="m19 5l2 2m0 0l-2 2m2-2H7M5 19l-2-2m0 0l2-2m-2 2h14" />
          <path d="M3 11a4 4 0 0 1 4-4m14 6a4 4 0 0 1-4 4" />
        </g>
      </svg>
      <!-- 单曲循环 -->
      <svg
        v-if="icon === 'repeat-song'"
        class="svg-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
      >
        <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2">
          <path stroke-linejoin="round" d="M21 9V4l-2 1m-4 2H7M5 19l-2-2m0 0l2-2m-2 2h14" />
          <path d="M3 11a4 4 0 0 1 4-4m14 6a4 4 0 0 1-4 4" />
        </g>
      </svg>
      <!-- 心动模式 -->
      <svg
        v-if="icon === 'heartbit'"
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 48 48"
      >
        <g
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="4"
        >
          <path stroke-miterlimit="2" d="m11 32l7-9l6 9l6-9l5 8h9" />
          <path
            d="M44 19c0-6.075-4.925-11-11-11c-3.72 0-7.01 1.847-9 4.674A10.987 10.987 0 0 0 15 8C8.925 8 4 12.925 4 19c0 11 13 21 20 23.326c1.194-.397 2.562-1.016 4.01-1.826"
          />
        </g>
      </svg>
    </template>
  </template>
</template>

<script setup>
import iconData from "@/assets/icon.json";

// eslint-disable-next-line no-unused-vars
const props = defineProps({
  icon: {
    type: String,
    required: true,
  },
  width: {
    type: String,
    default: "32",
  },
  height: {
    type: String,
    default: "32",
  },
  size: {
    type: String,
  },
  showSlot: {
    type: Boolean,
    default: false,
  },
  // 是否为特殊图标
  isSpecial: {
    type: Boolean,
    default: false,
  },
});
</script>
