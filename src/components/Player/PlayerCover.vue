<!-- 播放器 - 专辑封面 -->
<template>
  <div :class="['mian-cover', playCoverType, { playing: playState }]">
    <!-- 指针 -->
    <img
      v-if="playCoverType === 'record'"
      :class="{ pointer: true, play: playState }"
      src="/imgs/pic/pointer.png?assest"
      alt="pointer"
    />
    <!-- 专辑图片 -->
    <n-image
      :src="
        music.getPlaySongData?.coverSize?.l ||
        music.getPlaySongData?.cover ||
        music.getPlaySongData?.localCover
      "
      :style="{
        animationPlayState: playState ? 'running' : 'paused',
      }"
      class="cover-img"
      preview-disabled
      @load="
        (e) => {
          e.target.style.opacity = 1;
        }
      "
    >
      <template #placeholder>
        <div class="cover-loading">
          <img class="loading-img" src="/imgs/pic/song.jpg?assest" alt="loading-img" />
        </div>
      </template>
    </n-image>
    <!-- 封面背板 -->
    <n-image
      class="cover-shadow"
      preview-disabled
      :src="
        music.getPlaySongData?.coverSize?.l ||
        music.getPlaySongData?.cover ||
        music.getPlaySongData?.localCover
      "
    />
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { musicData, siteStatus, siteSettings } from "@/stores";

const music = musicData();
const status = siteStatus();
const settings = siteSettings();
const { playCoverType } = storeToRefs(settings);
const { playState } = storeToRefs(status);
</script>

<style lang="scss" scoped>
.mian-cover {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70%;
  max-width: 55vh;
  height: auto;
  aspect-ratio: 1 / 1;
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  .cover-img {
    width: 100%;
    height: 100%;
    border-radius: 32px;
    overflow: hidden;
    z-index: 1;
    box-shadow: 0 0 20px 10px rgb(0 0 0 / 10%);
    transition: opacity 0.1s ease-in-out;
    :deep(img) {
      width: 100%;
      height: 100%;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    }
  }
  .cover-shadow {
    position: absolute;
    top: 12px;
    height: 100%;
    width: 100%;
    filter: blur(20px) opacity(0.6);
    transform: scale(0.95);
    z-index: 0;
    :deep(img) {
      width: 100%;
      height: 100%;
    }
  }
  &.record {
    position: relative;
    width: 55vh;
    .pointer {
      position: absolute;
      width: 14vh;
      left: calc(50% - 1.8vh);
      top: -11vh;
      transform: rotate(-20deg);
      transform-origin: 1.8vh 1.8vh;
      z-index: 2;
      transition: transform 0.3s;
      &.play {
        transform: rotate(0);
      }
    }
    .cover-img {
      animation: playerCoverRotate 18s linear infinite;
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
        }
      }
    }
    .cover-shadow {
      display: none;
    }
  }
  &.cover {
    transform: scale(0.9);
    &.playing {
      transform: scale(1);
    }
  }

  @media (max-width: 700px) {
    &.record {
      .pointer {
        width: 12vh;
        top: -6vh;
      }
      .cover-img {
        width: 40vh;
        height: 40vh;
        min-width: 40vh;
      }
    }
  }
}
</style>
