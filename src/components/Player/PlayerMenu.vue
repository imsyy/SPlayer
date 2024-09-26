<template>
  <div class="player-menu">
    <Transition name="fade" mode="out-in">
      <div v-show="statusStore.playerMetaShow" class="menu-content">
        <n-flex class="left">
          <div
            v-if="musicStore.isHasLrc && musicStore.playSong.type !== 'radio'"
            :class="['menu-icon', { open: statusStore.pureLyricMode }]"
            @click="statusStore.pureLyricMode = !statusStore.pureLyricMode"
          >
            <SvgIcon name="TextPlay" />
          </div>
        </n-flex>
        <div class="drag-dom" />
        <n-flex class="right" justify="end">
          <div class="menu-icon" @click="toggleFullscreen">
            <SvgIcon :name="isFullscreen ? 'FullscreenExit' : 'Fullscreen'" />
          </div>
          <div v-if="!isFullscreen" class="menu-icon" @click="statusStore.showFullPlayer = false">
            <SvgIcon name="Down" />
          </div>
        </n-flex>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useStatusStore, useMusicStore } from "@/stores";

const musicStore = useMusicStore();
const statusStore = useStatusStore();

// Fullscreen
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
</script>

<style lang="scss" scoped>
.player-menu {
  width: 100%;
  height: 80px;
  overflow: hidden;
  z-index: 100;
  cursor: pointer;
  .menu-content {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: 100%;
  }
  .drag-dom {
    height: 80px;
    margin: 0 100px;
    flex: 1;
    -webkit-app-region: drag;
  }
  .left,
  .right {
    padding: 0 20px;
    transition: opacity 0.3s;
    .menu-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      transition:
        opacity 0.3s,
        background-color 0.3s,
        transform 0.3s;
      cursor: pointer;
      .n-icon {
        font-size: 28px;
        color: rgb(var(--main-color));
      }
      &:hover {
        transform: scale(1.05);
        background-color: rgba(var(--main-color), 0.14);
        opacity: 1;
      }
      &:active {
        transform: scale(1);
      }
    }
  }
  .left {
    .menu-icon {
      opacity: 0.6;
      &.open {
        opacity: 1;
        &:hover {
          opacity: 1;
        }
      }
      &:hover {
        opacity: 0.6;
      }
    }
  }
}
</style>
