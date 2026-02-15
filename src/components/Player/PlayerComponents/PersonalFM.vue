<template>
  <n-card class="personal-fm">
    <!-- 封面 -->
    <Transition name="fade" mode="out-in">
      <n-image
        v-if="!settingStore.hiddenCovers.personalFM"
        :key="musicStore.personalFMSong?.id"
        :src="musicStore.personalFMSong?.coverSize?.m"
        class="cover"
        preview-disabled
        lazy
        @load="coverLoaded"
      >
        <template #placeholder>
          <div class="cover-loading">
            <img src="/images/song.jpg?asset" class="loading-img" alt="loading-img" />
          </div>
        </template>
      </n-image>
    </Transition>
    <!-- 信息 -->
    <Transition name="fade" mode="out-in">
      <div
        :key="musicStore.personalFMSong?.id"
        :class="['info', { 'no-cover': settingStore.hiddenCovers.personalFM }]"
      >
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
        <n-flex :wrap="false" class="menu" align="center">
          <!-- 不喜欢 -->
          <div
            class="menu-icon"
            v-debounce="() => songManager.personalFMTrash(musicStore.personalFMSong?.id)"
          >
            <SvgIcon class="icon" size="18" name="ThumbDown" />
          </div>
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
import { usePlayerController } from "@/core/player/PlayerController";
import { useSongManager } from "@/core/player/SongManager";
import { useMusicStore, useStatusStore, useSettingStore } from "@/stores";
import { coverLoaded } from "@/utils/helper";
import { debounce, isObject } from "lodash-es";

const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();

const player = usePlayerController();
const songManager = useSongManager();

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
    statusStore.shuffleMode = "off";
    player.playSong();
  }
};

// 下一曲
const fmPlayNext = debounce(() => {
  statusStore.personalFmMode = true;
  statusStore.shuffleMode = "off";
  player.nextOrPrev("next");
}, 300);

onMounted(() => songManager.initPersonalFM());
</script>

<style lang="scss" scoped>
.personal-fm {
  position: relative;
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  :deep(.n-card__content) {
    display: flex;
    align-items: center;
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
    height: 100%;
    display: flex;
    flex-direction: column;
    .n-text {
      line-height: normal;
    }
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
        width: 46px;
        height: 46px;
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
    &.no-cover {
      width: 100%;
      align-items: center;
      justify-content: center;
      text-align: center;
      .name {
        font-size: 24px;
        margin-bottom: 6px;
      }
      .artists {
        margin-top: 0;
        font-size: 15px;
        opacity: 0.8;
      }
      .menu {
        margin-top: 28px;
        justify-content: center;
        gap: 8px;
        .menu-icon {
          width: 42px;
          height: 42px;
          background-color: rgba(var(--primary), 0.06);
          &:hover {
            background-color: rgba(var(--primary), 0.12);
          }
        }
        .play {
          width: 52px;
          height: 52px;
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
  @media (max-width: 1200px) and (min-width: 769px) {
    .radio {
      display: none;
    }
  }
  @media (max-width: 768px) {
    height: 120px;
    .cover {
      min-width: 80px;
      height: 80px;
      width: 80px;
    }
    .info {
      .name {
        font-size: 16px;
      }
      .album {
        display: none;
      }
      .menu {
        margin-top: 8px;
        .play {
          width: 36px;
          height: 36px;
          .n-icon {
            font-size: 28px !important;
          }
        }
        .menu-icon {
          width: 26px;
          height: 26px;
        }
      }
    }
  }
}
</style>
