<template>
  <n-card class="personal-fm">
    <!-- 封面 -->
    <Transition name="fade" mode="out-in">
      <n-image
        :key="musicStore.personalFMSong?.id"
        :src="musicStore.personalFMSong?.coverSize?.m"
        class="cover"
        preview-disabled
        lazy
        @load="coverLoaded"
      >
        <template #placeholder>
          <div class="cover-loading">
            <img src="/images/song.jpg?assest" class="loading-img" alt="loading-img" />
          </div>
        </template>
      </n-image>
    </Transition>
    <!-- 信息 -->
    <Transition name="fade" mode="out-in">
      <div :key="musicStore.personalFMSong?.id" class="info">
        <n-text class="name text-hidden">
          {{ musicStore.personalFMSong?.name || "未知曲目" }}
        </n-text>
        <div v-if="Array.isArray(musicStore.personalFMSong?.artists)" class="artists text-hidden">
          <SvgIcon name="Artist" :depth="3" />
          <n-text v-for="ar in musicStore.personalFMSong.artists" :key="ar.id" class="ar">
            {{ ar.name }}
          </n-text>
        </div>
        <div v-if="isObject(musicStore.personalFMSong.album)" class="album text-hidden">
          <SvgIcon name="Album" :depth="3" />
          <n-text class="album-text">
            {{ musicStore.personalFMSong.album?.name || "未知专辑" }}
          </n-text>
        </div>
        <!-- 功能 -->
        <n-flex class="menu" align="center">
          <!-- 播放暂停 -->
          <n-button
            :loading="statusStore.personalFmMode && statusStore.playLoading"
            :focusable="false"
            class="play"
            strong
            secondary
            circle
            @click.stop="fmPlayOrPause"
          >
            <template #icon>
              <Transition name="fade" mode="out-in">
                <SvgIcon :key="playIcon" :name="playIcon" :size="32" />
              </Transition>
            </template>
          </n-button>
          <!-- 下一曲 -->
          <div class="menu-icon" @click.stop="fmPlayNext">
            <SvgIcon size="26" name="SkipNext" />
          </div>
          <!-- 不喜欢 -->
          <div
            class="menu-icon"
            v-debounce="() => player.personalFMTrash(musicStore.personalFMSong?.id)"
          >
            <SvgIcon class="icon" size="18" name="ThumbDown" />
          </div>
        </n-flex>
        <!-- 图标 -->
        <div class="radio">
          <SvgIcon :depth="3" name="Radio" />
          <n-text :depth="3">私人FM</n-text>
        </div>
      </div>
    </Transition>
  </n-card>
</template>

<script setup lang="ts">
import { useMusicStore, useStatusStore } from "@/stores";
import { coverLoaded } from "@/utils/helper";
import { debounce, isObject } from "lodash-es";
import player from "@/utils/player";

const musicStore = useMusicStore();
const statusStore = useStatusStore();

// 播放图标
const playIcon = computed(() =>
  statusStore.personalFmMode ? (statusStore.playStatus ? "Pause" : "Play") : "Play",
);

// 播放暂停
const fmPlayOrPause = () => {
  if (statusStore.personalFmMode) {
    player.playOrPause();
  } else {
    // 更改播放模式
    statusStore.personalFmMode = true;
    statusStore.playHeartbeatMode = false;
    player.resetStatus();
    player.initPlayer();
  }
};

// 下一曲
const fmPlayNext = debounce(() => {
  statusStore.personalFmMode = true;
  statusStore.playHeartbeatMode = false;
  player.nextOrPrev("next");
}, 300);

onMounted(player.initPersonalFM);
</script>

<style lang="scss" scoped>
.personal-fm {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  overflow: hidden;
  height: 200px;
  cursor: pointer;
  :deep(.n-card__content) {
    display: flex;
    padding: 20px;
    width: 100%;
  }
  .cover {
    width: 160px;
    height: 160px;
    min-width: 160px;
    border-radius: 8px;
    margin-right: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    box-shadow: 0 0 10px 6px #00000008;
    :deep(img) {
      width: 100%;
      height: 100%;
      opacity: 0;
      transition: opacity 0.35s ease-in-out;
    }
  }
  .info {
    display: flex;
    flex-direction: column;
    .name {
      font-size: 22px;
      font-weight: bold;
    }
    .artists {
      margin-top: 2px;
      font-size: 14px;
      .n-icon {
        font-size: 18px;
        margin-right: 4px;
        transform: translateY(3px);
      }
      .ar {
        display: inline-flex;
        transition: opacity 0.3s;
        opacity: 0.6;
        &::after {
          content: "/";
          margin: 0 4px;
        }
        &:last-child {
          &::after {
            display: none;
          }
        }
      }
    }
    .album {
      font-size: 14px;
      .n-icon {
        font-size: 18px;
        margin-right: 4px;
        transform: translateY(3px);
      }
      .album-text {
        transition: opacity 0.3s;
        opacity: 0.6;
      }
    }
    .menu {
      margin-top: auto;
      .play {
        --n-width: 46px;
        --n-height: 46px;
        .n-icon {
          color: var(--primary-hex);
          transition: opacity 0.1s ease-in-out;
        }
      }
      .menu-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        color: var(--primary-hex);
        transition:
          background-color 0.3s,
          transform 0.3s;
        cursor: pointer;
        &:hover {
          transform: scale(1.1);
          background-color: rgba(var(--primary), 0.08);
        }
        &:active {
          transform: scale(1);
        }
      }
    }
  }
  .radio {
    position: absolute;
    right: 20px;
    bottom: 14px;
    display: flex;
    align-items: center;
    .n-icon {
      margin-right: 4px;
      transform: translateY(-1px);
    }
  }
  &:hover {
    border-color: rgba(var(--primary), 0.6);
  }
}
</style>
