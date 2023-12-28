<!-- 播放器 - 底栏 -->
<template>
  <n-card
    :class="{
      'main-player': true,
      'show-bar': music.getPlaySongData?.id && showPlayBar,
      'no-sider': !showSider,
    }"
    content-style="padding: 0"
    @dblclick.stop="openFullPlayer"
  >
    <!-- 进度条 -->
    <vue-slider
      v-model="playTimeData.bar"
      :use-keyboard="false"
      tooltip="active"
      width="100%"
      height="3px"
      class="slider"
      @drag-start="fadePlayOrPause('pause')"
      @drag-end="sliderDragEnd"
      @click.stop="songTimeSliderUpdate(playTimeData.bar)"
    >
      <template #tooltip>
        <div class="slider-tooltip">
          {{ sliderTooltip }}
        </div>
      </template>
    </vue-slider>
    <!-- 主播放器 -->
    <div class="player">
      <!-- 歌曲信息 -->
      <div class="info">
        <div class="cover" @click.stop="openFullPlayer">
          <Transition name="fade" mode="out-in">
            <n-image
              :key="music.getPlaySongData?.id"
              :src="
                music.getPlaySongData?.coverSize?.s ||
                music.getPlaySongData?.cover ||
                music.getPlaySongData?.localCover
              "
              class="cover-img"
              preview-disabled
              @load="
                (e) => {
                  e.target.style.opacity = 1;
                }
              "
            >
              <template #placeholder>
                <div class="cover-loading">
                  <img class="loading-img" src="/images/pic/song.jpg?assest" alt="loading-img" />
                </div>
              </template>
            </n-image>
          </Transition>
          <!-- 打开播放器 -->
          <n-icon class="open" size="30">
            <SvgIcon icon="pan-zoom-rounded" />
          </n-icon>
        </div>
        <div class="song-info">
          <div class="name">
            <n-text class="text">
              {{ music.getPlaySongData?.name || "未知曲目" }}
            </n-text>
            <!-- 喜欢歌曲 -->
            <n-icon
              v-if="playMode !== 'dj'"
              class="favorite"
              @click.stop="
                data.changeLikeList(
                  music.getPlaySongData?.id,
                  !data.getSongIsLike(music.getPlaySongData?.id),
                  music.getPlaySongData?.path,
                )
              "
              @dblclick.stop
            >
              <SvgIcon
                :icon="
                  data.getSongIsLike(music.getPlaySongData?.id)
                    ? 'favorite-rounded'
                    : 'favorite-outline-rounded'
                "
              />
            </n-icon>
            <!-- 更多操作 -->
            <n-dropdown
              v-if="playMode !== 'dj' && !music.getPlaySongData?.path"
              :options="songMoreOptions"
              :show-arrow="true"
              placement="top-start"
              trigger="click"
            >
              <n-icon depth="3" size="20" class="more" @click.stop @dblclick.stop>
                <SvgIcon icon="format-list-bulleted" />
              </n-icon>
            </n-dropdown>
          </div>
          <Transition name="fade" mode="out-in">
            <!-- 歌手 -->
            <div
              v-if="
                ((!playState || !bottomLyricShow || playMode === 'dj') &&
                  playSongLyric.lrc?.length) ||
                playSongLyricIndex === -1
              "
              class="artist"
            >
              <template
                v-if="
                  music.getPlaySongData?.artists && Array.isArray(music.getPlaySongData.artists)
                "
              >
                <n-text
                  v-for="ar in music.getPlaySongData.artists"
                  :key="ar.id"
                  class="ar"
                  @click.stop="router.push(`/artist?id=${ar.id}`)"
                >
                  {{ ar.name }}
                </n-text>
              </template>
              <div v-else-if="playMode === 'dj'" class="ar">电台节目</div>
              <n-text v-else class="ar">
                {{ music.getPlaySongData?.artists || "未知艺术家" }}
              </n-text>
            </div>
            <!-- 歌词 -->
            <div v-else :key="playSongLyricIndex" class="lrc">
              <!-- 逐字歌词 -->
              <template v-if="playSongLyric.hasYrc && showYrc">
                <n-text class="lrc-text" :depth="3">
                  <span
                    v-for="(item, index) in playSongLyric.yrc[playSongLyricIndex]?.content"
                    :key="index"
                    :class="{
                      space: item.endsWithSpace,
                    }"
                  >
                    {{ item.content }}
                  </span>
                </n-text>
              </template>
              <!-- 普通歌词 -->
              <n-text v-else class="lrc-text" :depth="3">
                {{ playSongLyric.lrc[playSongLyricIndex]?.content }}
              </n-text>
            </div>
          </Transition>
        </div>
      </div>
      <!-- 播放控制 -->
      <div class="control" @dblclick.stop>
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
          tag="div"
          type="primary"
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
      <!-- 功能区 -->
      <Transition name="fade" mode="out-in">
        <div :key="playMode" class="menu">
          <!-- 时间进度 -->
          <div class="time">
            <n-text class="played" depth="3">{{ playTimeData.played }}</n-text>
            <n-text depth="3">{{ playTimeData.durationTime }}</n-text>
          </div>
          <!-- 播放模式 -->
          <n-dropdown
            v-if="playMode !== 'fm'"
            :options="playModeOptions"
            :show-arrow="true"
            trigger="hover"
            @select="playModeChange"
          >
            <div class="mode" @click.stop @dblclick.stop>
              <n-icon size="22">
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
            </div>
          </n-dropdown>
          <!-- 倍速 -->
          <n-popover :show-arrow="false" trigger="hover" placement="top-end" raw>
            <template #trigger>
              <div class="speed" @click.stop="(playRate = 1), setRate(1)" @dblclick.stop>
                <n-icon v-if="playRate === 1" size="22">
                  <SvgIcon icon="speed-rounded" />
                </n-icon>
                <n-text v-else class="speed-text">{{ playRate }}x</n-text>
              </div>
            </template>
            <!-- 倍速调整 -->
            <div class="slider-content">
              <n-slider
                v-model:value="playRate"
                :tooltip="false"
                :min="0.1"
                :max="2"
                :step="0.1"
                :marks="{
                  0.1: '减速',
                  1: '正常',
                  2: '加速',
                }"
                style="width: 220px"
                @update:value="setRate"
              />
            </div>
          </n-popover>
          <!-- 音量 -->
          <n-popover trigger="hover" :show-arrow="false" raw>
            <template #trigger>
              <n-icon class="volume" size="22" @click.stop="setVolumeMute" @wheel="changeVolume">
                <SvgIcon v-if="playVolume === 0" icon="no-sound-rounded" />
                <SvgIcon
                  v-else-if="playVolume > 0 && playVolume < 0.4"
                  icon="volume-mute-rounded"
                />
                <SvgIcon
                  v-else-if="playVolume >= 0.4 && playVolume < 0.7"
                  icon="volume-down-rounded"
                />
                <SvgIcon v-else icon="volume-up-rounded" />
              </n-icon>
            </template>
            <!-- 音量调整 -->
            <div
              :style="{
                padding: '10px 0',
                width: '50px',
              }"
              class="slider-content"
              @wheel="changeVolume"
            >
              <n-slider
                v-model:value="playVolume"
                :tooltip="false"
                :min="0"
                :max="1"
                :step="0.01"
                vertical
                style="height: 120px"
                @update:value="setVolume"
              />
              <n-text class="slider-num" depth="3">{{ (playVolume * 100).toFixed(0) }}%</n-text>
            </div>
          </n-popover>
          <!-- 播放列表 -->
          <n-badge
            v-if="playMode !== 'fm'"
            :value="playList?.length ?? 0"
            :show="showPlaylistCount"
            :max="999"
            :style="{
              marginRight: showPlaylistCount ? '12px' : null,
            }"
            class="playlist"
          >
            <n-icon size="22" @click.stop="playListShow = !playListShow">
              <SvgIcon icon="queue-music-rounded" />
            </n-icon>
          </n-badge>
        </div>
      </Transition>
    </div>
    <!-- 添加到歌单 -->
    <AddPlaylist ref="addPlaylistRef" />
    <!-- 下载歌曲 -->
    <DownloadSong ref="downloadSongRef" />
  </n-card>
</template>

<script setup>
import { NIcon } from "naive-ui";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { musicData, siteStatus, siteData, siteSettings } from "@/stores";
import {
  playOrPause,
  fadePlayOrPause,
  setSeek,
  changePlayIndex,
  setVolume,
  setVolumeMute,
  setRate,
  processSpectrum,
} from "@/utils/Player";
import { getSongPlayTime } from "@/utils/timeTools";
import debounce from "@/utils/debounce";
import SvgIcon from "@/components/Global/SvgIcon";
import VueSlider from "vue-slider-component";
import "vue-slider-component/theme/default.css";

const router = useRouter();
const data = siteData();
const music = musicData();
const status = siteStatus();
const settings = siteSettings();
const { playList, playListOld, playSongLyric } = storeToRefs(music);
const {
  playLoading,
  playState,
  playListShow,
  showPlayBar,
  showFullPlayer,
  playSongLyricIndex,
  playTimeData,
  playRate,
  playVolume,
  playIndex,
  playMode,
  playSongMode,
  playHeartbeatMode,
} = storeToRefs(status);
const { showYrc, bottomLyricShow, showSider, showPlaylistCount, showSpectrums } =
  storeToRefs(settings);

// 子组件
const addPlaylistRef = ref(null);
const downloadSongRef = ref(null);

// 图标渲染
const renderIcon = (icon, isSpecial = false) => {
  return () => h(NIcon, null, { default: () => h(SvgIcon, { icon, isSpecial }) });
};

// 播放模式数据
const playModeOptions = ref([
  {
    label: "列表循环",
    key: "normal",
    icon: renderIcon("repeat-list", true),
  },
  {
    label: "单曲循环",
    key: "repeat",
    icon: renderIcon("repeat-song", true),
  },
  {
    label: "随机播放",
    key: "random",
    icon: renderIcon("shuffle", true),
  },
]);

// 歌曲更多操作
const songMoreOptions = computed(() => [
  {
    key: "add-pl",
    label: "添加到歌单",
    props: {
      onClick: () => {
        addPlaylistRef.value?.openAddToPlaylist(music.getPlaySongData?.id);
      },
    },
    icon: renderIcon("playlist-add"),
  },
  {
    key: "comment",
    label: "查看评论",
    props: {
      onClick: () => {
        router.push({
          path: "/comment",
          query: {
            id: music.getPlaySongData?.id,
          },
        });
      },
    },
    icon: renderIcon("comment-text"),
  },
  {
    key: "mv",
    label: "观看 MV",
    show: music.getPlaySongData?.mv && music.getPlaySongData?.mv !== 0 ? true : false,
    props: {
      onClick: () => {
        router.push({
          path: "/videos-player",
          query: {
            id: music.getPlaySongData?.mv,
          },
        });
      },
    },
    icon: renderIcon("video"),
  },
  {
    key: "download",
    label: "下载歌曲",
    show: music.getPlaySongData?.path ? false : true,
    props: {
      onClick: () => {
        downloadSongRef.value?.openDownloadModal(music.getPlaySongData);
      },
    },
    icon: renderIcon("download"),
  },
]);

// 进度条浮窗
const sliderTooltip = computed(() => {
  return getSongPlayTime((playTimeData.value.duration / 100) * playTimeData.value.bar);
});

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

// 开启播放器
const openFullPlayer = () => {
  if (playMode.value === "dj") {
    $message.warning("当前为电台模式，无法开启播放器");
    return false;
  }
  if (showSpectrums.value && typeof $player !== "undefined") processSpectrum($player);
  showFullPlayer.value = true;
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

// 播放模式切换
const playModeChange = (mode) => {
  // 关闭心动模式
  if (playHeartbeatMode.value) {
    playHeartbeatMode.value = false;
    // 回复原列表
    playIndex.value = 0;
    playList.value = playListOld.value;
    playListOld.value = [];
  }
  // 切换模式
  playSongMode.value = mode;
};

// 音量条鼠标滚动
const changeVolume = (e) => {
  const deltaY = e.deltaY;
  if (deltaY > 0) {
    // 向下滚动
    if (playVolume.value >= 0) {
      playVolume.value = Math.max(playVolume.value - 0.05, 0);
    }
  } else if (deltaY < 0) {
    // 向上滚动
    if (playVolume.value < 1) {
      playVolume.value = Math.min(playVolume.value + 0.05, 1);
    }
  }
  // 更新音量
  setVolume(playVolume.value);
};

// 监听心动模式
watch(
  () => playHeartbeatMode.value,
  (val) => $message.success(`已${val ? "开启" : "退出"}心动模式`),
);
</script>

<style lang="scss" scoped>
.main-player {
  position: fixed;
  height: 80px;
  left: 0;
  bottom: -90px;
  width: 100%;
  padding: 0 15px;
  z-index: 2;
  transition: bottom 0.3s;
  .slider {
    position: absolute;
    top: -11px;
    left: 0;
    height: 22px;
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    .slider-tooltip {
      font-size: 12px;
      white-space: nowrap;
      background-color: var(--n-color);
      outline: 1px solid var(--n-border-color);
      padding: 2px 8px;
      border-radius: 25px;
    }
    :deep(.vue-slider-rail) {
      background-color: var(--main-boxshadow-color);
      border-radius: 25px;
      .vue-slider-process {
        background-color: var(--main-color);
        // transition: none !important;
      }
      .vue-slider-dot {
        width: 12px !important;
        height: 12px !important;
        // transition: none !important;
      }
      .vue-slider-dot-handle {
        transition: box-shadow 0.3s;
        background-color: var(--main-color);
      }
      .vue-slider-dot-handle-focus {
        box-shadow: 0px 0px 1px 2px var(--main-color);
      }
    }
  }
  .player {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-items: center;
    .info {
      display: flex;
      flex-direction: row;
      align-items: center;
      .cover {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 55px;
        height: 55px;
        min-width: 55px;
        border-radius: 8px;
        overflow: hidden;
        margin-right: 12px;
        cursor: pointer;
        .cover-img {
          width: 100%;
          height: 100%;
          transition: opacity 0.1s ease-in-out;
          :deep(img) {
            width: 100%;
            opacity: 0;
            transition:
              opacity 0.3s,
              transform 0.3s,
              filter 0.3s;
          }
        }
        .open {
          position: absolute;
          opacity: 0;
          color: #efefef;
          transform: scale(0.6);
          transition:
            opacity 0.3s,
            transform 0.3s;
        }
        &:hover {
          :deep(img) {
            transform: scale(1.1);
            filter: blur(6px) brightness(0.8);
          }
          .open {
            position: absolute;
            opacity: 1;
            transform: scale(1);
            transition: opacity 0.3s ease-in-out;
          }
        }
      }
      .name {
        display: flex;
        flex-direction: row;
        align-items: center;
        .text {
          font-weight: bold;
          font-size: 16px;
          transition: color 0.3s;
          cursor: pointer;
          &:hover {
            color: var(--main-color);
          }
        }
        .favorite {
          margin-left: 8px;
          font-size: 20px;
          color: var(--main-color);
          transition: transform 0.3s;
          cursor: pointer;
          &:hover {
            transform: scale(1.15);
          }
          &:active {
            transform: scale(1);
          }
        }
        .more {
          margin-left: 8px;
          color: var(--main-color);
          cursor: pointer;
        }
      }
      .artist {
        font-size: 13px;
        margin-top: 2px;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
        overflow: hidden;
        word-break: break-all;
        .ar {
          display: inline-flex;
          transition: color 0.3s;
          cursor: pointer;
          &::after {
            content: "/";
            margin: 0 4px;
            transition: none;
          }
          &:last-child {
            &::after {
              display: none;
            }
          }
          &:hover {
            color: var(--main-color);
            &::after {
              color: var(--n-close-icon-color);
            }
          }
        }
      }
      .lrc-text {
        margin-top: 2px;
        font-size: 13px;
        transition: opacity 0.1s ease-in-out;
        .space {
          margin-right: 4px;
        }
      }
    }
    .control {
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
      .play-control {
        --n-width: 44px;
        --n-height: 44px;
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
        color: var(--main-color);
        transition:
          background-color 0.3s,
          transform 0.3s;
        cursor: pointer;
        &:hover {
          transform: scale(1.1);
          background-color: var(--main-second-color);
        }
        &:active {
          transform: scale(1);
        }
      }
    }
    .menu {
      display: flex;
      flex-direction: row;
      justify-content: flex-end;
      transition: opacity 0.1s;
      .n-icon {
        margin-left: 8px;
        padding: 8px;
        border-radius: 8px;
        color: var(--main-color);
        transition:
          background-color 0.3s,
          transform 0.3s,
          opacity 0.1s ease-in-out;
        cursor: pointer;
        :deep(.iconify) {
          transition: opacity 0.1s;
        }
        &:hover {
          transform: scale(1.1);
          background-color: var(--main-second-color);
        }
        &:active {
          transform: scale(1);
        }
      }
      .time {
        display: flex;
        align-items: center;
        font-size: 12px;
        margin-right: 4px;
        .played {
          &::after {
            content: "/";
            margin: 0 4px;
          }
        }
      }
      .speed {
        margin-left: 8px;
        display: flex;
        justify-content: center;
        flex-direction: column;
        align-items: center;
        .n-icon {
          margin-left: 0;
        }
        .speed-text {
          width: 38px;
          height: 38px;
          color: var(--main-color);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.1s ease-in-out;
          transform: translateY(-1px);
          cursor: pointer;
        }
      }
      .playlist {
        transition: margin 0.3s;
        &.count {
          margin-right: 12px;
        }
      }
      :deep(.n-badge-sup) {
        background: var(--main-boxshadow-color);
        backdrop-filter: blur(20px);
        .n-base-slot-machine {
          color: var(--main-color);
        }
      }
    }
  }
  &.show-bar {
    bottom: 0;
  }
  &.no-sider {
    padding: 0;
    .player {
      width: auto;
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 10vw;
      @media (max-width: 1200px) {
        padding: 0 5vw;
      }
    }
  }
}
// 音量控制
.slider-content {
  background-color: var(--n-color);
  padding: 12px 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  .slider-num {
    margin-top: 4px;
    font-size: 12px;
  }
}
</style>
