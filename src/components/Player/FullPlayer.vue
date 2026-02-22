<template>
  <Teleport to="body">
    <Transition :name="settingStore.playerExpandAnimation" mode="out-in">
      <div
        v-if="statusStore.showFullPlayer"
        :style="{
          cursor: statusStore.playerMetaShow || isShowComment ? 'auto' : 'none',
        }"
        :class="['full-player', { 'show-comment': isShowComment && !statusStore.pureLyricMode }]"
        @mouseleave="playerLeave"
        @mousemove="playerMove"
        @click="playerMove"
      >
        <!-- 背景 -->
        <PlayerBackground />
        <!-- 移动端 -->
        <FullPlayerMobile v-if="isTablet" />
        <!-- 桌面端 -->
        <template v-else>
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
          <!-- 全屏封面 -->
          <PlayerCover v-if="showFullScreenCover" />
          <!-- 主内容 -->
          <Transition name="zoom" mode="out-in">
            <div
              :key="playerContentKey"
              :class="[
                'player-content',
                {
                  'no-lrc': noLrc,
                  'full-screen': settingStore.playerType === 'fullscreen',
                  pure: pureLyricMode && musicStore.isHasLrc,
                },
              ]"
              @mousemove="playerMove"
            >
              <Transition name="zoom">
                <div
                  v-if="!pureLyricMode && settingStore.playerType !== 'fullscreen'"
                  :key="musicStore.playSong.id"
                  class="content-left"
                  :style="layoutStyles.left"
                >
                  <!-- 封面 -->
                  <PlayerCover />
                  <!-- 数据 -->
                  <PlayerData :center="playerDataCenter" />
                </div>
              </Transition>
              <!-- 歌词 -->
              <div class="content-right" :style="layoutStyles.right">
                <!-- 数据 -->
                <PlayerData
                  v-if="
                    (pureLyricMode && musicStore.isHasLrc) ||
                    settingStore.playerType === 'fullscreen'
                  "
                  :center="pureLyricMode || noLrc"
                  :light="!(settingStore.playerType === 'fullscreen' && noLrc)"
                />
                <!-- 歌词 -->
                <PlayerLyric v-if="!noLrc" />
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
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useMobile } from "@/composables/useMobile";
import { useStatusStore, useMusicStore, useSettingStore } from "@/stores";
import { usePlayerController } from "@/core/player/PlayerController";
import { isElectron } from "@/utils/env";

const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();
const player = usePlayerController();

const { isTablet } = useMobile();

/** 封面主颜色 */
const mainCoverColor = useCssVar("--main-cover-color", document.documentElement);

// 是否显示评论
const isShowComment = computed<boolean>(
  () => !musicStore.playSong.path && statusStore.showPlayerComment && !isTablet.value,
);

/** 没有歌词 */
const noLrc = computed<boolean>(() => {
  const noNormalLrc = !musicStore.isHasLrc;
  const noYrcAvailable = !musicStore.isHasYrc || !settingStore.showYrc;
  return noNormalLrc && noYrcAvailable;
});

/** 是否处于纯净模式 */
const pureLyricMode = computed<boolean>(
  () => (statusStore.pureLyricMode && musicStore.isHasLrc) || musicStore.playSong.type === "radio",
);

/* 是否显示全屏封面 */
const showFullScreenCover = computed<boolean>(
  () => settingStore.playerType === "fullscreen" && !pureLyricMode.value && !isShowComment.value,
);

// 主内容 key
const playerContentKey = computed(() => `${musicStore.playSong.id}-${statusStore.pureLyricMode}`);

// 左右布局样式
const layoutStyles = computed(() => {
  const ratio = settingStore.playerType === "fullscreen" ? 50 : settingStore.playerStyleRatio;
  return {
    left: {
      width: `${ratio}%`,
      minWidth: `${ratio}%`,
    },
    right: {
      width: `${100 - ratio}%`,
      maxWidth: `${100 - ratio}%`,
    },
  };
});

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
  const contentStr = content?.words?.map((v) => v.word).join("") || "";
  return { content: contentStr, tran: settingStore.showTran && content?.translatedLyric };
});

// 隐藏播放元素
const {
  isPending,
  start: startShow,
  stop: stopShow,
} = useTimeoutFn(() => {
  if (settingStore.autoHidePlayerMeta) {
    statusStore.playerMetaShow = false;
  }
}, 3000);

// 鼠标移动
const playerMove = useThrottleFn(
  () => {
    statusStore.playerMetaShow = true;
    if (settingStore.autoHidePlayerMeta && !isPending.value) {
      startShow();
    }
  },
  300,
  false,
);

// 停用隐藏
const stopHide = () => {
  if (settingStore.autoHidePlayerMeta) {
    stopShow();
  }
  statusStore.playerMetaShow = true;
};

// 鼠标离开
const playerLeave = () => {
  if (settingStore.autoHidePlayerMeta) {
    statusStore.playerMetaShow = false;
    stopShow();
  }
};

// 封面主色变化
watch(
  () => statusStore.mainColor,
  (newVal) => {
    mainCoverColor.value = newVal;
  },
);

// 键盘控制
const onKeydown = (e: KeyboardEvent) => {
  if (e.code === "Space") {
    const activeElement = document.activeElement as HTMLElement;
    // 如果焦点在输入框、文本域或任何可编辑元素上，则不响应
    if (
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.isContentEditable)
    ) {
      return;
    }
    e.preventDefault();
    player.playOrPause();
  }
};

// 监听全屏状态
watchEffect((onCleanup) => {
  if (statusStore.showFullPlayer) {
    window.addEventListener("keydown", onKeydown);
    onCleanup(() => {
      window.removeEventListener("keydown", onKeydown);
    });
  }
});

onMounted(() => {
  mainCoverColor.value = statusStore.mainColor;
  // 阻止息屏
  if (isElectron && settingStore.preventSleep) {
    window.electron.ipcRenderer.send("prevent-sleep", true);
  }
});

onBeforeUnmount(() => {
  stopShow();
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
  color: rgb(var(--main-cover-color));
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
    position: absolute;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: calc(100vh - 160px);
    transition:
      opacity 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
      transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    .content-left {
      position: absolute;
      left: 0;
      flex: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition:
        width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
        opacity 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
        transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .content-right {
      position: absolute;
      right: 0;
      flex: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
      mix-blend-mode: plus-lighter;
      transition:
        width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
        opacity 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      transition-delay: 0.5s;
      .player-data {
        margin-top: 0;
        margin-bottom: 26px;
      }
    }
    &.pure {
      .content-right {
        align-items: center;
        width: 100% !important;
        max-width: 100% !important;
      }
    }
    // 无歌词
    &.no-lrc {
      &:not(.full-screen) {
        .content-left {
          width: 50% !important;
          transform: translateX(50%);
        }
        .content-right {
          opacity: 0;
          pointer-events: none;
        }
      }
      &.full-screen {
        .content-right {
          .player-data {
            width: 100%;
            max-width: 100%;
            transform: translateY(30vh);
          }
        }
      }
    }
  }
  &.show-comment {
    .player-content {
      &:not(.pure) {
        transform: scale(0.95);
        opacity: 0;
      }
    }
  }
}
</style>
