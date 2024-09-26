<template>
  <div :class="['player-cover', settingStore.playerType, { playing: statusStore.playStatus }]">
    <!-- 指针 -->
    <img
      v-if="settingStore.playerType === 'record'"
      class="pointer"
      src="/images/pointer.png?assest"
      alt="pointer"
    />
    <!-- 专辑图片 -->
    <n-image
      :key="musicStore.getSongCover()"
      :src="musicStore.getSongCover('l')"
      class="cover-img"
      preview-disabled
      @load="coverLoaded"
    >
      <template #placeholder>
        <div class="cover-loading">
          <img src="/images/song.jpg?assest" class="loading-img" alt="loading-img" />
        </div>
      </template>
    </n-image>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore, useStatusStore, useMusicStore } from "@/stores";

const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();

// 封面加载完成
const coverLoaded = (e: Event) => {
  const target = e.target as HTMLElement | null;
  if (target && target.nodeType === Node.ELEMENT_NODE) {
    target.style.opacity = "1";
  }
};
</script>

<style lang="scss" scoped>
.player-cover {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70%;
  max-width: 50vh;
  height: auto;
  aspect-ratio: 1 / 1;
  transition:
    transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
    width 0.3s;
  .cover-img {
    width: 100%;
    height: 100%;
    border-radius: 32px;
    overflow: hidden;
    z-index: 1;
    box-shadow: 0 0 20px 10px rgba(0, 0, 0, 0.1);
    transition: opacity 0.1s ease-in-out;
    :deep(img) {
      width: 100%;
      height: 100%;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    }
  }
  &.record {
    position: relative;
    width: 50vh;
    .pointer {
      position: absolute;
      width: 14vh;
      left: calc(50% - 1.8vh);
      top: -11.5vh;
      transform: rotate(-20deg);
      transform-origin: 1.8vh 1.8vh;
      z-index: 2;
      transition: transform 0.3s;
    }
    .cover-img {
      animation: playerCoverRotate 30s linear infinite;
      animation-play-state: paused;
      border-radius: 50%;
      border: 1vh solid #ffffff30;
      background: linear-gradient(black 0%, transparent, black 98%),
        radial-gradient(
          #000 52%,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555,
          #000,
          #555
        );
      background-clip: content-box;
      width: 46vh;
      height: 46vh;
      min-width: 46vh;
      display: flex;
      justify-content: center;
      align-items: center;
      :deep(img) {
        border: 1vh solid #ffffff40;
        border-radius: 50%;
        width: 70%;
        height: 70%;
        object-fit: cover;
      }
      .cover-loading {
        position: absolute;
        height: 100%;
        padding-bottom: 0;
        .loading-img {
          top: auto;
          left: auto;
        }
      }
    }
  }
  &.cover {
    transform: scale(0.9);
    &.playing {
      transform: scale(1);
    }
  }
  &.playing {
    .pointer {
      transform: rotate(0);
    }
    .cover-img {
      animation-play-state: running;
    }
  }
}
</style>
