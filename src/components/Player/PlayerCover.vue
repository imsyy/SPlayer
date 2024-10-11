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
    <s-image
      :key="musicStore.getSongCover()"
      :src="musicStore.getSongCover('l')"
      class="cover-img"
    />
    <!-- 动态封面 -->
    <Transition name="fade" mode="out-in">
      <video
        v-if="dynamicCover && settingStore.dynamicCover && settingStore.playerType === 'cover'"
        ref="videoRef"
        :src="dynamicCover"
        :class="['dynamic-cover', { loaded: dynamicCoverLoaded }]"
        muted
        autoplay
        @loadeddata="dynamicCoverLoaded = true"
        @ended="dynamicCoverEnded"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { songDynamicCover } from "@/api/song";
import { useSettingStore, useStatusStore, useMusicStore } from "@/stores";
import { isEmpty } from "lodash-es";

const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();

// 动态封面
const dynamicCover = ref<string>("");
const dynamicCoverLoaded = ref<boolean>(false);

// 视频元素
const videoRef = ref<HTMLVideoElement | null>(null);

// 封面再放送
const { start: dynamicCoverStart, stop: dynamicCoverStop } = useTimeoutFn(
  () => {
    dynamicCoverLoaded.value = true;
    videoRef.value?.play();
  },
  2000,
  { immediate: false },
);

// 获取动态封面
const getDynamicCover = async () => {
  if (!musicStore.playSong.id || !settingStore.dynamicCover || settingStore.playerType !== "cover")
    return;
  dynamicCoverStop();
  dynamicCoverLoaded.value = false;
  const result = await songDynamicCover(musicStore.playSong.id);
  if (!isEmpty(result.data) && result?.data?.videoPlayUrl) {
    dynamicCover.value = result.data.videoPlayUrl;
  } else {
    dynamicCover.value = "";
  }
};

// 封面播放结束
const dynamicCoverEnded = () => {
  dynamicCoverLoaded.value = false;
  dynamicCoverStart();
};

watch(
  () => [musicStore.playSong.id, settingStore.dynamicCover, settingStore.playerType],
  () => getDynamicCover(),
);

onMounted(getDynamicCover);
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
    object-fit: cover;
    z-index: 1;
    box-shadow: 0 0 20px 10px rgba(0, 0, 0, 0.1);
    transition: opacity 0.1s ease-in-out;
  }
  .dynamic-cover {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 32px;
    overflow: hidden;
    z-index: 1;
    opacity: 0;
    transition: opacity 0.8s ease-in-out;
    backface-visibility: hidden;
    transform: translateZ(0);
    &.loaded {
      opacity: 1;
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
    border-radius: 32px;
    overflow: hidden;
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
