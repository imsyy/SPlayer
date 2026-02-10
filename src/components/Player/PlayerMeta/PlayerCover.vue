<template>
  <!-- 全屏封面 -->
  <div
    v-if="settingStore.playerType === 'fullscreen' && !isTablet"
    class="full-screen"
    :style="{ '--gradient-percent': settingStore.playerFullscreenGradient + '%' }"
  >
    <s-image
      :src="getCoverUrl('xl')"
      :alt="musicStore.playSong.name"
      :title="musicStore.playSong.name"
      :lazy="false"
      :width="'100%'"
      :height="'100%'"
    />
  </div>
  <!-- 普通封面 -->
  <div
    v-else
    :class="['player-cover', settingStore.playerType, { playing: statusStore.playStatus }]"
  >
    <!-- 指针 -->
    <img
      v-if="settingStore.playerType === 'record'"
      class="pointer"
      src="/images/pointer.png?asset"
      alt="pointer"
    />
    <!-- 专辑图片 -->
    <s-image
      :key="getCoverUrl('l')"
      :src="getCoverUrl('l')"
      :observe-visibility="false"
      object-fit="cover"
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
import { useMobile } from "@/composables/useMobile";
import { useBlobURLManager } from "@/core/resource/BlobURLManager";
import { useSettingStore, useStatusStore, useMusicStore } from "@/stores";
import { isLogin } from "@/utils/auth";
import { isElectron } from "@/utils/env";
import { isEmpty } from "lodash-es";

const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();

const { isTablet } = useMobile();

// 本地歌曲高清封面（Data URL）
const localCoverDataUrl = ref<string>("");

// 动态封面
const dynamicCover = ref<string>("");
const dynamicCoverLoaded = ref<boolean>(false);

// 视频元素
const videoRef = ref<HTMLVideoElement | null>(null);

// 清理本地封面资源
const cleanupLocalCover = () => {
  localCoverDataUrl.value = "";
};

// 清理动态封面资源
const cleanupDynamicCover = () => {
  if (videoRef.value) {
    videoRef.value.pause();
    videoRef.value.src = "";
    videoRef.value.load();
  }
  dynamicCover.value = "";
  dynamicCoverLoaded.value = false;
};

// 封面再放送
const { start: dynamicCoverStart, stop: dynamicCoverStop } = useTimeoutFn(
  () => {
    dynamicCoverLoaded.value = true;
    videoRef.value?.play();
  },
  2000,
  { immediate: false },
);

// 获取本地歌曲高清封面
const getLocalCover = async () => {
  if (!isElectron || !musicStore.playSong.path || musicStore.playSong.type === "streaming") {
    cleanupLocalCover();
    return;
  }
  // 先检查blob中是否存在
  const blobURLManager = useBlobURLManager();
  const blobURL = blobURLManager.getBlobURL(musicStore.playSong.path);
  if (blobURL) {
    localCoverDataUrl.value = blobURL;
    return;
  }
  try {
    const coverData = await window.electron.ipcRenderer.invoke(
      "get-music-cover",
      musicStore.playSong.path,
    );
    if (coverData) {
      // 使用 Data URL，确保跨窗口可用
      const blob = new Blob([coverData.data], { type: coverData.format });
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.onabort = reject;
        reader.readAsDataURL(blob);
      });
      localCoverDataUrl.value = dataUrl;
    } else {
      localCoverDataUrl.value = "";
    }
  } catch (error) {
    console.error("获取本地封面失败:", error);
    localCoverDataUrl.value = "";
  }
};

// 获取动态封面
const getDynamicCover = async () => {
  if (
    isLogin() !== 1 ||
    musicStore.playSong.path ||
    !musicStore.playSong.id ||
    !settingStore.dynamicCover ||
    settingStore.playerType !== "cover"
  )
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

// 获取封面 URL
const getCoverUrl = (size: "s" | "m" | "l" | "xl" = "l") => {
  if (localCoverDataUrl.value) {
    return localCoverDataUrl.value;
  }
  return musicStore.getSongCover(size);
};

watch(
  () => [musicStore.playSong.id, settingStore.dynamicCover, settingStore.playerType],
  () => getDynamicCover(),
);

// 监听歌曲切换，获取/清理本地封面
watch(
  () => musicStore.playSong.path,
  () => getLocalCover(),
  { immediate: true },
);

onMounted(() => {
  getDynamicCover();
  getLocalCover();
});

onBeforeUnmount(() => {
  // 停止定时器
  dynamicCoverStop();
  // 清理动态封面资源
  cleanupDynamicCover();
  // 清理本地封面资源
  cleanupLocalCover();
});
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
    max-width: 46vh;
    margin-bottom: 4%;
    .pointer {
      position: absolute;
      width: 30%;
      left: 46%;
      top: -22%;
      transform: rotate(-20deg);
      transform-origin: 10% 10%;
      z-index: 2;
      transition: transform 0.3s;
    }
    .cover-img {
      animation: playerCoverRotate 30s linear infinite;
      animation-play-state: paused;
      border-radius: 50%;
      border: 1vh solid #ffffff30;
      background:
        linear-gradient(black 0%, transparent, black 98%),
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
      // width: 46vh;
      // height: 46vh;
      // min-width: 46vh;
      width: 100%;
      height: 100%;
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
      transform: rotate(-8deg);
    }
    .cover-img {
      animation-play-state: running;
    }
  }
}
.full-screen {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 60vw;
  z-index: 0;
  mask-image: linear-gradient(to right, #000 var(--gradient-percent), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, #000 var(--gradient-percent), transparent 100%);
  :deep(img) {
    object-fit: cover;
    width: 100%;
    height: 100%;
  }
}
</style>
