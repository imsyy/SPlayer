<!-- 全局播放列表 -->
<template>
  <n-drawer
    v-model:show="playListShow"
    :class="['main-playlist', { 'full-player': showFullPlayer }]"
    :style="{
      '--cover-main-color': `rgb(${coverTheme?.light?.shadeTwo})` || '#efefef',
      '--cover-second-color': `rgba(${coverTheme?.light?.shadeTwo}, 0.14)` || '#efefef14',
    }"
    :auto-focus="false"
    @after-enter="playlistOpen"
    @after-leave="playListShow = false"
    @mask-click="playListShow = false"
  >
    <n-drawer-content :native-scrollbar="false" closable>
      <template #header>
        <div class="pl-name">
          <n-text class="title">播放队列</n-text>
          <n-text v-if="playList?.length" class="count" depth="3">
            {{ playList?.length }} 首歌曲
          </n-text>
        </div>
      </template>
      <!-- 歌曲列表 -->
      <div class="list">
        <Transition name="fade" mode="out-in">
          <n-virtual-list
            v-if="playList?.length"
            ref="playListRef"
            :item-size="76"
            :items="playListData"
            :default-scroll-index="playIndex"
            style="max-height: calc(100vh - 158px)"
          >
            <template #default="{ item, index }">
              <div
                :id="`songs-${index}`"
                :key="item.id"
                :class="[
                  'songs-item',
                  { play: playSongData?.id === item?.id, player: showFullPlayer },
                ]"
                @click.stop="playSong(item, index)"
                @dblclick.stop="playSong(item, index)"
              >
                <!-- 序号 -->
                <n-text v-if="playSongData?.id !== item?.id" class="num" depth="3">
                  {{ index + 1 }}
                </n-text>
                <n-icon v-else class="play" size="18">
                  <SvgIcon icon="music-note" />
                </n-icon>
                <!-- 信息 -->
                <div class="info">
                  <!-- 歌曲名 -->
                  <n-text class="name" depth="2">{{ item?.name || "未知曲目" }}</n-text>
                  <!-- 歌手 -->
                  <div v-if="Array.isArray(item?.artists)" class="artist">
                    <n-text v-for="ar in item.artists" :key="ar.id" depth="3" class="ar">
                      {{ ar.name }}
                    </n-text>
                  </div>
                  <div v-else-if="playMode === 'dj'" class="artist">
                    <n-text class="ar"> 电台节目 </n-text>
                  </div>
                  <div v-else class="artist">
                    <n-text class="ar"> {{ item?.artists || "未知艺术家" }} </n-text>
                  </div>
                </div>
                <!-- 删除 -->
                <n-icon class="delete" size="18" @click.stop="removeSong(index)">
                  <SvgIcon icon="delete" />
                </n-icon>
              </div>
            </template>
          </n-virtual-list>
          <n-empty
            v-else
            description="播放列表暂无歌曲，快去添加吧"
            class="tip"
            style="margin-top: 60px"
            size="large"
          />
        </Transition>
      </div>
      <!-- 操作 -->
      <Transition name="fade" mode="out-in">
        <n-grid v-if="playList?.length" :cols="2" x-gap="16" class="controls">
          <n-gi>
            <!-- 定位歌曲 -->
            <n-button
              size="large"
              tag="div"
              strong
              secondary
              @click="playListRef?.scrollTo({ index: playIndex })"
            >
              <template #icon>
                <n-icon>
                  <SvgIcon icon="location" />
                </n-icon>
              </template>
              当前播放
            </n-button>
          </n-gi>
          <n-gi>
            <!-- 清空列表 -->
            <n-button size="large" tag="div" strong secondary @click="cleanPlaylists">
              <template #icon>
                <n-icon>
                  <SvgIcon icon="delete-sweep" />
                </n-icon>
              </template>
              清空列表
            </n-button>
          </n-gi>
        </n-grid>
      </Transition>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup>
import { NText, NIcon } from "naive-ui";
import { storeToRefs } from "pinia";
import { musicData, siteStatus, siteSettings } from "@/stores";
import { initPlayer, fadePlayOrPause, changePlayIndex, soundStop } from "@/utils/Player";
import SvgIcon from "@/components/Global/SvgIcon";
import debounce from "@/utils/debounce";

const music = musicData();
const status = siteStatus();
const settings = siteSettings();
const { useMusicCache } = storeToRefs(settings);
const { playSongData, playList } = storeToRefs(music);
const { coverTheme, showFullPlayer, playListShow, playIndex, playMode, playLoading } =
  storeToRefs(status);

const playListRef = ref(null);

// 播放列表数据
const playListData = computed(() => {
  return playList.value?.[0]
    ? playList.value.slice().map((v, i) => {
        v.key = `${i}`;
        return v;
      })
    : [];
});

// 抽屉开启
const playlistOpen = () => {
  nextTick().then(() => {
    const el = document.getElementById(`pl-song-${playIndex.value}`);
    el?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  });
};

// 播放歌曲
const playSong = debounce(async (song, index) => {
  // 若开启了缓存且正在加载
  if (useMusicCache.value && playLoading.value) {
    $message.warning("歌曲正在缓冲中，请稍后");
    return false;
  }
  // 更改模式
  if (playMode.value !== "dj") playMode.value = "normal";
  // 更改播放索引
  playIndex.value = index;
  // 是否为当前播放歌曲
  if (playSongData.value?.id === song?.id) {
    // 继续播放
    fadePlayOrPause();
  } else {
    console.log("与当前播放歌曲不一致");
    playSongData.value = song;
    // 初始化播放器
    await initPlayer(true);
  }
}, 300);

// 清空列表
const cleanPlaylists = () => {
  soundStop();
  playIndex.value = 0;
  playList.value = [];
  playSongData.value = {};
  playListShow.value = false;
  showFullPlayer.value = false;
  $message.success("已清空播放列表");
};

// 移除歌曲
const removeSong = async (index) => {
  // 若删除时仅剩一首
  if (playList.value.length === 1) {
    cleanPlaylists();
    return false;
  }
  // 若为当前播放
  if (index === playIndex.value) {
    playList.value.splice(index, 1);
    changePlayIndex("next", true);
  }
  // 若为当前播放之前
  else if (index < playIndex.value) {
    playIndex.value--;
    playList.value.splice(index, 1);
  }
  // 若大于当前播放
  else if (index > playIndex.value) {
    playList.value.splice(index, 1);
  }
};
</script>

<style lang="scss" scoped>
.pl-name {
  .count {
    margin-top: 8px;
    font-size: 12px;
  }
}
.list {
  border-radius: 8px;
  overflow: hidden;
  .songs-item {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    height: 64px;
    border-radius: 8px;
    margin-bottom: 12px;
    padding: 8px;
    border: 1px solid transparent;
    box-sizing: border-box;
    background-color: var(--n-close-color-hover);
    transition:
      transform 0.3s,
      border-color 0.3s,
      box-shadow 0.3s,
      background-color 0.3s;
    cursor: pointer;
    .num,
    .play {
      width: 34px;
      height: 34px;
      min-width: 34px;
      border-radius: 8px;
      margin-right: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .info {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      .artist {
        margin-top: 2px;
        font-size: 13px;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
        overflow: hidden;
        word-break: break-all;
        .ar {
          font-size: 12px;
          display: inline-flex;
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
    }
    .delete {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
      margin-right: 6px;
      border-radius: 8px;
      transition: background-color 0.3s;
      cursor: pointer;
      &:hover {
        background-color: var(--n-close-color-hover);
      }
    }
    &.play {
      background-color: var(--main-second-color);
      border-color: var(--main-color);
      a,
      span,
      .n-icon {
        color: var(--main-color) !important;
      }
      .artist {
        .ar {
          opacity: 0.8;
        }
      }
    }
    &.player {
      background-color: var(--cover-second-color);
      a,
      span,
      .n-icon {
        color: var(--cover-main-color) !important;
        opacity: 0.8;
      }
      &.play {
        background-color: var(--cover-second-color);
        border-color: var(--cover-main-color);
        a,
        span,
        .n-icon {
          color: var(--cover-main-color) !important;
          opacity: 1;
        }
      }
      &:hover {
        border-color: var(--cover-main-color);
        box-shadow: none;
      }
    }
    &:hover {
      border-color: var(--main-color);
    }
    &:active {
      transform: scale(0.995);
    }
  }
}
.controls {
  height: 40px;
  margin-top: 16px;
  .n-button {
    width: 100%;
    border-radius: 8px;
    box-sizing: border-box;
  }
}
</style>

<style lang="scss">
.n-drawer-mask {
  backdrop-filter: blur(20px);
}
.main-playlist {
  width: 400px !important;
  border-radius: 12px 0 0 12px;
  transition: width 0.3s;
  .n-drawer-header {
    height: 70px;
    box-sizing: border-box;
  }
  .n-scrollbar-content {
    padding: 16px !important;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  &.full-player {
    background-color: transparent;
    box-shadow: none;
    .n-drawer-header {
      border-bottom: none;
      .pl-name {
        a,
        span,
        .n-icon {
          color: var(--cover-main-color) !important;
        }
      }
      .n-base-icon {
        color: var(--cover-main-color);
      }
    }
  }
  @media (max-width: 700px) {
    width: 100% !important;
    border-radius: 0;
  }
}
</style>
