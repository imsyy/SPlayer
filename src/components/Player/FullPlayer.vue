<template>
  <div
    v-show="statusStore.showFullPlayer"
    :style="{
      '--main-color': statusStore.mainColor,
      cursor: statusStore.playerMetaShow || isShowComment ? 'auto' : 'none',
    }"
    :class="['full-player', { 'show-comment': isShowComment }]"
    @mouseleave="playerLeave"
  >
    <!-- 背景 -->
    <PlayerBackground />
    <!-- 独立歌词 -->
    <Transition name="fade" mode="out-in">
      <div
        v-if="isShowComment && !statusStore.pureLyricMode"
        :key="instantLyrics.content"
        class="lrc-instant"
      >
        <span class="lrc">{{ instantLyrics.content }}</span>
        <span v-if="instantLyrics.tran" class="lrc-tran">{{ instantLyrics.tran }}</span>
      </div>
    </Transition>
    <!-- 菜单 -->
    <PlayerMenu @mouseenter.stop="stopHide" @mouseleave.stop="playerMove" />
    <!-- 主内容 -->
    <Transition name="zoom" mode="out-in">
      <div
        :key="playerContentKey"
        :class="[
          'player-content',
          {
            pure: statusStore.pureLyricMode && musicStore.isHasLrc,
            'no-lrc': settingStore.showYrc ? !musicStore.isHasYrc : !musicStore.isHasLrc,
          },
        ]"
        @mousemove="playerMove"
      >
        <Transition name="zoom">
          <div
            v-if="
              !(statusStore.pureLyricMode && musicStore.isHasLrc) ||
              musicStore.playSong.type === 'radio'
            "
            :key="musicStore.playSong.id"
            class="content-left"
          >
            <!-- 封面 -->
            <PlayerCover />
            <!-- 数据 -->
            <PlayerData :center="playerDataCenter" :theme="statusStore.mainColor" />
          </div>
        </Transition>
        <!-- 歌词 -->
        <div class="content-right">
          <!-- 数据 -->
          <PlayerData
            v-if="statusStore.pureLyricMode && musicStore.isHasLrc"
            :center="statusStore.pureLyricMode"
            :theme="statusStore.mainColor"
          />
          <!-- 歌词 -->
          <MainAMLyric v-if="settingStore.useAMLyrics" />
          <MainLyric v-else />
        </div>
      </div>
    </Transition>
    <!-- 评论 -->
    <Transition name="zoom" mode="out-in">
      <PlayerComment v-show="isShowComment && !statusStore.pureLyricMode" />
    </Transition>
    <!-- 控制中心 -->
    <PlayerControl @mouseenter.stop="stopHide" @mouseleave.stop="playerMove" />
    <!-- 音乐频谱 -->
    <PlayerSpectrum
      v-if="settingStore.showSpectrums"
      :color="statusStore.mainColor ? `rgb(${statusStore.mainColor})` : 'rgb(239 239 239)'"
      :show="!statusStore.playerMetaShow"
      :height="60"
    />
  </div>
</template>

<script setup lang="ts">
import { useStatusStore, useMusicStore, useSettingStore } from "@/stores";
import { isElectron } from "@/utils/env";
import { throttle } from "lodash-es";
import player from "@/utils/player";

const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();

// 是否显示评论
const isShowComment = computed<boolean>(
  () => !musicStore.playSong.path && statusStore.showPlayerComment,
);

// 主内容 key
const playerContentKey = computed(() => `${statusStore.pureLyricMode}`);

// 数据是否居中
const playerDataCenter = computed<boolean>(
  () =>
    !musicStore.isHasLrc ||
    statusStore.pureLyricMode ||
    settingStore.playerType === "record" ||
    musicStore.playSong.type === "radio",
);

// 当前实时歌词
const instantLyrics = computed(() => {
  const isYrc = musicStore.songLyric.yrcData?.length && settingStore.showYrc;
  const content = isYrc
    ? musicStore.songLyric.yrcData[statusStore.lyricIndex]
    : musicStore.songLyric.lrcData[statusStore.lyricIndex];
  return { content: content?.content, tran: settingStore.showTran && content?.tran };
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
  .lrc-instant {
    position: absolute;
    top: 0;
    height: 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    pointer-events: none;
    .lrc {
      font-size: 18px;
    }
    .lrc-tran {
      font-size: 14px;
      opacity: 0.6;
    }
  }
  .player-content {
    position: relative;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: calc(100vh - 160px);
    z-index: 0;
    transition:
      opacity 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
      transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    .content-left {
      position: absolute;
      left: 0;
      flex: 1;
      min-width: 50%;
      width: 50%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition:
        opacity 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
        transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .content-right {
      position: absolute;
      right: 0;
      flex: 1;
      height: 100%;
      width: 50%;
      max-width: 50%;
      display: flex;
      flex-direction: column;
      transition: opacity 0.3s;
      transition-delay: 0.5s;
      .player-data {
        margin-top: 0;
        margin-bottom: 26px;
      }
    }
    &.pure {
      .content-right {
        align-items: center;
        width: 100%;
        max-width: 100%;
      }
    }
    // 无歌词
    &.no-lrc {
      .content-left {
        transform: translateX(50%);
      }
      .content-right {
        opacity: 0;
        pointer-events: none;
      }
    }
  }
  &.show-comment {
    .player-content {
      &:not(.pure) {
        transform: scale(0.8);
        opacity: 0;
      }
    }
  }
}
</style>
