<!-- 每日推荐 -->
<template>
  <div class="daily-songs">
    <div class="title">
      <n-text class="name">每日推荐</n-text>
      <n-text class="tip" depth="3">根据你的音乐口味 · 每日 6:00 更新</n-text>
    </div>
    <!-- 列表 -->
    <SongList :data="dailySongsData.data" />
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { siteData } from "@/stores";

const data = siteData();
const { dailySongsData } = storeToRefs(data);
</script>

<style lang="scss" scoped>
.daily-songs {
  .title {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    height: 26vh;
    margin-bottom: 20px;
    .name {
      font-size: 55px;
      font-weight: bold;
      animation: fade-spacing 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    .tip {
      font-size: 16px;
      margin-top: 6px;
      opacity: 0;
      animation: fade-down 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      animation-delay: 0.5s;
    }
  }
  @keyframes fade-spacing {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
      letter-spacing: 12px;
    }
  }
  @keyframes fade-down {
    0% {
      opacity: 0;
      transform: translateY(10px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
</style>
