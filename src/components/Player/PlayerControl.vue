<!-- 播放器 - 控制面板 -->
<template>
  <Transition name="fade" mode="out-in">
    <div class="control" @mousemove="controlMove" @mouseenter="controlEnter">
      <div class="left">
        <!-- 喜欢歌曲 -->
        <n-icon
          v-if="!music.getPlaySongData.path"
          class="favorite"
          size="24"
          @click.stop="
            data.changeLikeList(
              music.getPlaySongData.id,
              !data.getSongIsLike(music.getPlaySongData.id),
              music.getPlaySongData?.path,
            )
          "
        >
          <SvgIcon
            :icon="
              data.getSongIsLike(music.getPlaySongData.id)
                ? 'favorite-rounded'
                : 'favorite-outline-rounded'
            "
          />
        </n-icon>
        <!-- 添加到歌单 -->
        <n-icon
          v-if="!music.getPlaySongData.path"
          class="favorite"
          size="24"
          @click.stop="addPlaylistRef?.openAddToPlaylist(music.getPlaySongData?.id)"
        >
          <SvgIcon icon="playlist-add" />
        </n-icon>
        <!-- 下载 -->
        <n-icon
          v-if="!music.getPlaySongData.path"
          class="favorite"
          size="24"
          @click.stop="downloadSongRef?.openDownloadModal(music.getPlaySongData)"
        >
          <SvgIcon icon="download" />
        </n-icon>
      </div>
      <div class="center">
        <div class="btn">
          <Transition name="fade" mode="out-in">
            <!-- 上一曲 -->
            <n-icon
              v-if="playMode !== 'fm'"
              class="play-prev"
              size="24"
              @click.stop="changePlayIndexDebounce('prev')"
            >
              <SvgIcon icon="skip-previous-rounded" />
            </n-icon>
            <!-- 垃圾桶 -->
            <n-icon
              v-else
              class="play-prev"
              size="24"
              @click.stop="changePlayIndexDebounce('fmTrash', music.getPlaySongData.id)"
            >
              <SvgIcon size="18" icon="thumb-down" />
            </n-icon>
          </Transition>
          <!-- 播放暂停 -->
          <n-button
            :loading="playLoading"
            :keyboard="false"
            class="play-control"
            strong
            secondary
            circle
            @click.stop="playOrPause"
          >
            <template #icon>
              <Transition name="fade" mode="out-in">
                <n-icon :key="playState" size="28">
                  <SvgIcon :icon="playState ? 'pause-rounded' : 'play-arrow-rounded'" />
                </n-icon>
              </Transition>
            </template>
          </n-button>
          <!-- 下一曲 -->
          <n-icon class="play-next" size="24" @click.stop="changePlayIndexDebounce('next')">
            <SvgIcon icon="skip-next-rounded" />
          </n-icon>
        </div>
        <!-- 进度条 -->
        <div class="slider">
          <span>{{ playTimeData.played }}</span>
          <vue-slider
            v-model="playTimeData.bar"
            :use-keyboard="false"
            tooltip="none"
            width="100%"
            @drag-start="fadePlayOrPause('pause')"
            @drag-end="sliderDragEnd"
            @click.stop="songTimeSliderUpdate(playTimeData.bar)"
          />
          <span>{{ playTimeData.durationTime }}</span>
        </div>
      </div>
      <div class="right">
        <!-- MV -->
        <n-icon
          v-if="music.getPlaySongData.mv"
          class="favorite"
          size="22"
          @click.stop="
            (showFullPlayer = false), router.push(`/videos-player?id=${music.getPlaySongData.mv}`)
          "
        >
          <SvgIcon icon="video" />
        </n-icon>
        <!-- 评论 -->
        <n-icon
          v-if="!music.getPlaySongData?.path"
          size="22"
          @click.stop="
            (showFullPlayer = false), router.push(`/comment?id=${music.getPlaySongData?.id}`)
          "
        >
          <SvgIcon icon="comment-text" />
        </n-icon>
        <!-- 播放模式 -->
        <n-icon v-if="playMode === 'normal'" size="22" @click.stop="togglePlayMode">
          <SvgIcon
            :icon="
              playHeartbeatMode
                ? 'heartbit'
                : playSongMode === 'normal'
                ? 'repeat-list'
                : playSongMode === 'random'
                ? 'shuffle'
                : 'repeat-song'
            "
            isSpecial
          />
        </n-icon>
        <!-- 播放列表 -->
        <n-icon v-if="playMode === 'normal'" size="22" @click.stop="playListShow = !playListShow">
          <SvgIcon icon="queue-music-rounded" />
        </n-icon>
      </div>
      <!-- 添加到歌单 -->
      <AddPlaylist ref="addPlaylistRef" />
      <!-- 下载歌曲 -->
      <DownloadSong ref="downloadSongRef" />
    </div>
  </Transition>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { musicData, siteStatus, siteData } from "@/stores";
import { useRouter } from "vue-router";
import { playOrPause, fadePlayOrPause, setSeek, changePlayIndex } from "@/utils/Player";
import debounce from "@/utils/debounce";
import VueSlider from "vue-slider-component";
import "vue-slider-component/theme/default.css";

const router = useRouter();
const data = siteData();
const music = musicData();
const status = siteStatus();
const { playList, playListOld } = storeToRefs(music);
const {
  playIndex,
  playerControlShow,
  controlTimeOut,
  playLoading,
  playState,
  showFullPlayer,
  playListShow,
  playTimeData,
  playMode,
  playSongMode,
  playHeartbeatMode,
} = storeToRefs(status);

// 子组件
const addPlaylistRef = ref(null);
const downloadSongRef = ref(null);

// 进度条拖拽结束
const sliderDragEnd = () => {
  songTimeSliderUpdate(playTimeData.value?.bar);
  playOrPause();
};

// 进度条更新
const songTimeSliderUpdate = (val) => {
  if (playTimeData.value?.duration) {
    const currentTime = (playTimeData.value.duration / 100) * val;
    setSeek(currentTime);
  }
};

// 上下曲切换
const changePlayIndexDebounce = debounce(async (type, id) => {
  // 垃圾桶
  if (type === "fmTrash") {
    await music.setPersonalFmToTrash(id);
    return true;
  }
  changePlayIndex(type, true);
}, 300);

// 切换播放模式
const togglePlayMode = () => {
  const modeMap = {
    normal: "random",
    random: "shuffle",
    shuffle: "normal",
  };
  // 关闭心动模式
  if (playHeartbeatMode.value) {
    playHeartbeatMode.value = false;
    // 回复原列表
    playIndex.value = 0;
    playList.value = playListOld.value;
    playListOld.value = [];
  }
  // 切换模式
  playSongMode.value = modeMap[playSongMode.value] || "normal";
};

// 控制面板移入
const controlEnter = () => {
  if (controlTimeOut.value) clearTimeout(controlTimeOut.value);
  playerControlShow.value = true;
};

// 控制面板移动
const controlMove = (e) => {
  if (!e.target.closest(".slider")) e.stopPropagation();
};
</script>

<style lang="scss" scoped>
.control {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 80px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: center;
  cursor: pointer;
  .left,
  .right {
    opacity: 0;
    height: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    padding: 0 30px;
    transition: opacity 0.3s;
    .n-icon {
      padding: 8px;
      border-radius: 8px;
      margin-right: 12px;
      color: var(--cover-main-color);
      display: flex;
      align-items: center;
      justify-content: center;
      transition:
        background-color 0.3s,
        transform 0.3s;
      cursor: pointer;
      &:hover {
        transform: scale(1.1);
        background-color: var(--cover-second-color);
      }
      &:active {
        transform: scale(1);
      }
    }
  }
  .right {
    justify-content: flex-end;
    .n-icon {
      margin-left: 12px;
      margin-right: 0;
    }
  }
  .center {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    .btn {
      display: flex;
      flex-direction: row;
      align-items: center;
      .play-control {
        --n-width: 44px;
        --n-height: 44px;
        color: var(--cover-main-color);
        margin: 0 12px;
        transition:
          background-color 0.3s,
          transform 0.3s;
        .n-icon {
          transition: opacity 0.1s ease-in-out;
        }
        &:hover {
          transform: scale(1.1);
        }
        &:active {
          transform: scale(1);
        }
      }
      .play-prev,
      .play-next {
        padding: 6px;
        border-radius: 50%;
        color: var(--cover-main-color);
        transition:
          background-color 0.3s,
          transform 0.3s;
        cursor: pointer;
        &:hover {
          transform: scale(1.1);
          background-color: var(--cover-second-color);
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
      .vue-slider {
        margin: 6px 8px;
        :deep(.vue-slider-rail) {
          background-color: var(--cover-second-color);
          .vue-slider-process {
            background-color: var(--cover-main-color);
            // transition: none !important;
          }
          .vue-slider-dot {
            width: 10px !important;
            height: 10px !important;
            // transition: none !important;
            .vue-slider-dot-handle {
              background-color: var(--cover-main-color);
            }
          }
          .vue-slider-dot-handle-focus {
            box-shadow: 0px 0px 1px 2px var(--cover-second-color);
          }
        }
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
