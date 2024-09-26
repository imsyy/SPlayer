<template>
  <div
    v-show="statusStore.showFullPlayer"
    :style="{
      '--main-color': mainColor,
      cursor: statusStore.playerMetaShow ? 'auto' : 'none',
    }"
    class="full-player"
    @mouseleave="playerLeave"
  >
    <!-- 遮罩 -->
    <Transition name="fade" mode="out-in">
      <div
        :key="musicStore.playSong?.id ?? 0"
        :class="['overlay', settingStore.playerBackgroundType]"
      >
        <!-- 背景模糊 -->
        <img
          v-if="settingStore.playerBackgroundType === 'blur'"
          :src="musicStore.songCover"
          class="overlay-img"
          alt="cover"
        />
        <!-- 流体背景 -->
        <PlayerBackground
          v-else-if="settingStore.playerBackgroundType === 'animation'"
          :album="musicStore.songCover"
          :fps="60"
        />
      </div>
    </Transition>
    <!-- 菜单 -->
    <PlayerMenu @mouseenter.stop="stopHide" @mouseleave.stop="playerMove" />
    <!-- 主内容 -->
    <Transition name="fade" mode="out-in">
      <div
        :key="playerContentKey"
        :class="[
          'player-content',
          {
            pure: statusStore.pureLyricMode,
            'show-comment': isShowComment,
            // 'no-lrc': !musicStore.isHasLrc,
          },
        ]"
        @mousemove="playerMove"
      >
        <div
          v-if="
            !(statusStore.pureLyricMode && musicStore.isHasLrc) ||
            musicStore.playSong.type === 'radio'
          "
          class="content-left"
        >
          <!-- 封面 -->
          <PlayerCover />
          <!-- 数据 -->
          <PlayerData
            v-if="settingStore.playerType === 'cover' || !musicStore.isHasLrc || isShowComment"
            :center="
              statusStore.pureLyricMode ||
              musicStore.playSong.type === 'radio' ||
              !musicStore.isHasLrc ||
              isShowComment
            "
            :theme="mainColor"
          />
        </div>
        <Transition name="fade" mode="out-in">
          <!-- 评论 -->
          <PlayerComment v-if="isShowComment && !statusStore.pureLyricMode" />
          <!-- 歌词 -->
          <div v-else-if="musicStore.isHasLrc" class="content-right">
            <!-- 数据 -->
            <PlayerData
              v-if="
                (statusStore.pureLyricMode && musicStore.isHasLrc) ||
                (settingStore.playerType === 'record' && musicStore.isHasLrc)
              "
              :center="statusStore.pureLyricMode"
              :theme="mainColor"
            />
            <!-- 歌词 -->
            <MainAMLyric v-if="settingStore.useAMLyrics" />
            <MainLyric v-else />
          </div>
        </Transition>
      </div>
    </Transition>
    <!-- 控制中心 -->
    <PlayerControl @mouseenter.stop="stopHide" @mouseleave.stop="playerMove" />
    <!-- 音乐频谱 -->
    <PlayerSpectrum
      v-if="settingStore.showSpectrums"
      :color="mainColor ? `rgb(${mainColor})` : 'rgb(239 239 239)'"
      :show="!statusStore.playerMetaShow"
      :height="60"
    />
  </div>
</template>

<script setup lang="ts">
import { useStatusStore, useMusicStore, useSettingStore } from "@/stores";
import { isElectron } from "@/utils/helper";
import { throttle } from "lodash-es";
import player from "@/utils/player";

const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();

// 主内容 key
const playerContentKey = computed(() => {
  return `
  ${musicStore.playSong?.id ?? 0}-
  ${musicStore.isHasLrc}-
  ${statusStore.pureLyricMode}-
  ${isShowComment.value}`;
});

// 是否显示评论
const isShowComment = computed(() => !musicStore.playSong.path && statusStore.showPlayerComment);

// 播放器主色
const mainColor = computed(() => {
  const mainColor = statusStore.songCoverTheme?.main;
  if (!mainColor) return "239, 239, 239";
  return `${mainColor.r}, ${mainColor.g}, ${mainColor.b}`;
});

// 隐藏播放元素
const {
  isPending,
  start: startShow,
  stop: stopShow,
} = useTimeoutFn(() => {
  statusStore.playerMetaShow = false;
}, 3000);

// 鼠标移动
const playerMove = throttle(
  () => {
    statusStore.playerMetaShow = true;
    if (!isPending.value) startShow();
  },
  300,
  { trailing: false },
);

// 停用隐藏
const stopHide = () => {
  stopShow();
  statusStore.playerMetaShow = true;
};

// 鼠标离开
const playerLeave = () => {
  statusStore.playerMetaShow = false;
  stopShow();
};

onMounted(() => {
  console.log("播放器开启");
  statusStore.fullPlayerActive = true;
  // 音乐频谱
  if (settingStore.showSpectrums) player.initSpectrumData();
  // 阻止息屏
  if (isElectron && settingStore.preventSleep) {
    window.electron.ipcRenderer.send("prevent-sleep", true);
  }
});

onBeforeUnmount(() => {
  console.log("离开播放器");
  if (isElectron) window.electron.ipcRenderer.send("prevent-sleep", false);
});
</script>

<style lang="scss" scoped>
.full-player {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgb(var(--main-color));
  background-color: #00000060;
  backdrop-filter: blur(80px);
  overflow: hidden;
  z-index: 1000;
  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    z-index: -1;
    &::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(20px);
    }
    &.blur {
      display: flex;
      align-items: center;
      justify-content: center;
      .overlay-img {
        width: 100%;
        height: auto;
        transform: scale(1.5);
        filter: blur(80px) contrast(1.2);
      }
    }
  }
  .player-content {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    height: calc(100vh - 160px);
    z-index: 0;
    .content-left {
      flex: 1;
      min-width: 50%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition: width 0.3s;
    }
    .content-right {
      flex: 1;
      height: 100%;
      max-width: 50%;
      display: flex;
      flex-direction: column;
      .player-data {
        margin-top: 0;
        margin-bottom: 26px;
      }
    }
    &.pure {
      .content-right {
        align-items: center;
        max-width: 100%;
      }
    }
    &.show-comment {
      .content-left {
        min-width: 40vw;
        max-width: 50vh;
        padding: 0 60px;
        .player-cover,
        .player-data {
          width: 100%;
        }
        .player-cover {
          &.record {
            :deep(.cover-img) {
              width: 100%;
              height: 100%;
              min-width: auto;
            }
            :deep(.pointer) {
              top: -13.5vh;
            }
          }
        }
      }
    }
  }
}
</style>
