<template>
  <div class="player-control">
    <Transition name="fade" mode="out-in">
      <div v-show="statusStore.playerMetaShow" class="control-content" @click.stop>
        <n-flex class="left" align="center">
          <!-- 喜欢歌曲 -->
          <div
            v-if="musicStore.playSong.type !== 'radio'"
            class="menu-icon"
            @click="toLikeSong(musicStore.playSong, !dataStore.isLikeSong(musicStore.playSong.id))"
          >
            <SvgIcon
              :name="dataStore.isLikeSong(musicStore.playSong.id) ? 'Favorite' : 'FavoriteBorder'"
            />
          </div>
          <!-- 添加到歌单 -->
          <div
            class="menu-icon"
            @click.stop="openPlaylistAdd([musicStore.playSong], !!musicStore.playSong.path)"
          >
            <SvgIcon name="AddList" />
          </div>
          <!-- 下载 -->
          <div class="menu-icon" @click.stop="openDownloadSong(musicStore.playSong)">
            <SvgIcon name="Download" />
          </div>
        </n-flex>
        <div class="center">
          <div class="btn">
            <!-- 不喜欢 -->
            <div
              v-if="statusStore.personalFmMode"
              class="btn-icon"
              v-debounce="() => player.personalFMTrash(musicStore.personalFMSong?.id)"
            >
              <SvgIcon class="icon" :size="18" name="ThumbDown" />
            </div>
            <!-- 上一曲 -->
            <div v-else class="btn-icon" v-debounce="() => player.nextOrPrev('prev')">
              <SvgIcon :size="26" name="SkipPrev" />
            </div>
            <!-- 播放暂停 -->
            <n-button
              :loading="statusStore.playLoading"
              :focusable="false"
              :keyboard="false"
              class="play-pause"
              type="primary"
              strong
              secondary
              circle
              @click.stop="player.playOrPause()"
            >
              <template #icon>
                <Transition name="fade" mode="out-in">
                  <SvgIcon
                    :key="statusStore.playStatus ? 'Pause' : 'Play'"
                    :name="statusStore.playStatus ? 'Pause' : 'Play'"
                    :size="28"
                  />
                </Transition>
              </template>
            </n-button>
            <!-- 下一曲 -->
            <div class="btn-icon" v-debounce="() => player.nextOrPrev('next')">
              <SvgIcon :size="26" name="SkipNext" />
            </div>
          </div>
          <!-- 进度条 -->
          <div class="slider">
            <span>{{ secondsToTime(statusStore.currentTime) }}</span>
            <n-slider
              v-model:value="statusStore.progress"
              :step="0.01"
              :min="0"
              :max="100"
              :tooltip="false"
              :keyboard="false"
              class="player-slider"
              @dragstart="player.pause(false)"
              @dragend="sliderDragend"
            />
            <span>{{ secondsToTime(statusStore.duration) }}</span>
          </div>
        </div>
        <n-flex class="right" align="center" justify="end">
          <!-- 显示评论 -->
          <div
            v-if="!musicStore.playSong.path && !statusStore.pureLyricMode"
            class="menu-icon"
            @click.stop="statusStore.showPlayerComment = !statusStore.showPlayerComment"
          >
            <SvgIcon :depth="statusStore.showPlayerComment ? 1 : 3" name="Message" />
          </div>
          <!-- 播放模式 -->
          <div class="menu-icon" @click.stop="player.togglePlayMode(false)">
            <SvgIcon :name="playModeIcon" />
          </div>
          <!-- 播放列表 -->
          <div
            v-if="!statusStore.personalFmMode"
            class="menu-icon"
            @click.stop="statusStore.playListShow = !statusStore.playListShow"
          >
            <SvgIcon name="PlayList" />
          </div>
        </n-flex>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useMusicStore, useStatusStore, useDataStore } from "@/stores";
import { secondsToTime, calculateCurrentTime } from "@/utils/time";
import { openDownloadSong, openPlaylistAdd } from "@/utils/modal";
import { toLikeSong } from "@/utils/auth";
import player from "@/utils/player";

const dataStore = useDataStore();
const musicStore = useMusicStore();
const statusStore = useStatusStore();

// 当前播放模式图标
const playModeIcon = computed(() => {
  const mode = statusStore.playSongMode;
  return statusStore.playHeartbeatMode
    ? "HeartBit"
    : mode === "repeat"
      ? "Repeat"
      : mode === "repeat-once"
        ? "RepeatSong"
        : "Shuffle";
});

// 进度条拖拽结束
const sliderDragend = () => {
  const seek = calculateCurrentTime(statusStore.progress, statusStore.duration);
  statusStore.playStatus = true;
  // 调整进度
  player.setSeek(seek);
  player.play();
};
</script>

<style lang="scss" scoped>
.player-control {
  width: 100%;
  height: 80px;
  overflow: hidden;
  cursor: pointer;
  .control-content {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-items: center;
  }
  .left,
  .right {
    opacity: 0;
    height: 100%;
    padding: 0 30px;
    transition: opacity 0.3s;
    .menu-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      border-radius: 8px;
      transition:
        background-color 0.3s,
        transform 0.3s;
      cursor: pointer;
      .n-icon {
        font-size: 24px;
        color: rgb(var(--main-color));
      }
      &:hover {
        transform: scale(1.1);
        background-color: rgba(var(--main-color), 0.14);
      }
      &:active {
        transform: scale(1);
      }
    }
  }
  .center {
    height: 100%;
    max-height: 80px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    .btn {
      display: flex;
      flex-direction: row;
      align-items: center;
      .btn-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        transition:
          backdrop-filter 0.3s,
          background-color 0.3s,
          transform 0.3s;
        cursor: pointer;
        .n-icon {
          color: rgb(var(--main-color));
        }
        &:hover {
          transform: scale(1.1);
          backdrop-filter: blur(10px);
          background-color: rgba(var(--main-color), 0.14);
        }
        &:active {
          transform: scale(1);
        }
      }
      .play-pause {
        --n-width: 44px;
        --n-height: 44px;
        --n-color: rgba(var(--main-color), 0.14);
        --n-color-hover: rgba(var(--main-color), 0.2);
        --n-color-focus: rgba(var(--main-color), 0.2);
        --n-color-pressed: rgba(var(--main-color), 0.12);
        backdrop-filter: blur(10px);
        margin: 0 12px;
        transition:
          background-color 0.3s,
          transform 0.3s;
        .n-icon {
          color: rgb(var(--main-color));
          transition: opacity 0.1s ease-in-out;
        }
        :deep(.n-base-loading) {
          color: rgb(var(--main-color));
        }
        &:hover {
          transform: scale(1.1);
        }
        &:active {
          transform: scale(1);
        }
      }
    }
    .slider {
      display: flex;
      flex-direction: row;
      align-items: center;
      width: 100%;
      max-width: 480px;
      font-size: 12px;
      cursor: pointer;
      .n-slider {
        margin: 6px 8px;
        --n-handle-size: 12px;
        --n-rail-height: 4px;
        --n-rail-color: rgba(var(--main-color), 0.14);
        --n-rail-color-hover: rgba(var(--main-color), 0.3);
        --n-fill-color: rgb(var(--main-color));
        --n-handle-color: rgb(var(--main-color));
        --n-fill-color-hover: rgb(var(--main-color));
      }
      span {
        opacity: 0.6;
      }
    }
  }
  &:hover {
    .left,
    .right {
      opacity: 1;
    }
  }
}
</style>
