<!-- 全局播放列表 -->
<template>
  <n-drawer
    v-model:show="status.playListShow"
    :class="status.showFullPlayer ? 'main-playlist player' : 'main-playlist'"
    :style="{
      '--color': coverColor,
      '--color-bg': coverColor + '14',
    }"
    @after-enter="playlistOpen"
    @after-leave="status.playListShow = false"
    @mask-click="status.playListShow = false"
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
      <!-- 提示 -->
      <n-alert v-if="playList?.length >= 400" class="alert" :show-icon="false">
        因歌单数量过大，无法自动定位，请手动查找
      </n-alert>
      <Transition name="fade" mode="out-in">
        <n-data-table
          v-if="playList?.length"
          class="pl-list"
          :columns="columns"
          :data="playList"
          :bordered="false"
          :bottom-bordered="false"
          :max-height="playList?.length >= 400 ? 'calc(100vh - 162px)' : '100%'"
          virtual-scroll
        />
        <n-empty
          v-else
          description="播放列表暂无歌曲，快去添加吧"
          class="tip"
          style="margin-top: 60px"
          size="large"
        />
      </Transition>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup>
import { NText, NIcon } from "naive-ui";
import { storeToRefs } from "pinia";
import { musicData, siteStatus } from "@/stores";
import {
  initPlayer,
  fadePlayOrPause,
  changePlayIndex,
  soundStop,
  checkPlayer,
} from "@/utils/Player";
import SvgIcon from "@/components/Global/SvgIcon";

const music = musicData();
const status = siteStatus();
const { coverColor, playSongData, playList, playIndex, playMode } = storeToRefs(music);

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

// 表格数据
const columns = computed(() => [
  {
    key: "songs",
    className: "songs-item",
    render(song, index) {
      return createSongs(song, index);
    },
  },
]);

// 列表歌曲模块
const createSongs = (song, index) => {
  return h(
    "div",
    {
      id: `pl-song-${index}`,
      class: {
        songs: true,
        play: playSongData.value?.id === song?.id,
        player: status.showFullPlayer,
      },
      onClick: () => {
        playSong(song, index);
      },
    },
    [
      // 序号
      playSongData.value?.id !== song?.id
        ? h(NText, { class: "num", depth: "3" }, () => [index + 1])
        : h(NIcon, { class: "play", size: "18" }, () => [h(SvgIcon, { icon: "music-note" })]),
      // 信息
      h("div", { class: "info" }, [
        // 名称
        h(NText, { class: "name", depth: "2" }, () => [song?.name || "未知曲目"]),
        // 歌手
        Array.isArray(song.artists)
          ? h(
              "div",
              { class: "artist" },
              song.artists.map((ar) =>
                h(NText, { class: "ar", depth: "3", key: ar.id }, () => [ar.name]),
              ),
            )
          : h("div", { class: "artist" }, [
              h(NText, { class: "ar", depth: "3" }, () => [song.artists || "未知艺术家"]),
            ]),
      ]),
      // 移除
      h(
        NIcon,
        {
          class: "delete",
          size: "18",
          onClick: (e) => {
            e.stopPropagation();
            removeSong(index);
          },
        },
        () => [h(SvgIcon, { icon: "delete" })],
      ),
    ],
  );
};

// 播放歌曲
const playSong = async (song, index) => {
  // 更改模式
  playMode.value = "normal";
  // 更改播放索引
  playIndex.value = index;
  // 是否为当前播放歌曲
  if (playSongData.value?.id === song?.id) {
    // 继续播放
    fadePlayOrPause();
  } else {
    console.log("与当前播放歌曲不一致");
    playSongData.value = song;
    // 渐出音乐
    if (checkPlayer()) await fadePlayOrPause("pause");
    // 初始化播放器
    initPlayer(true);
  }
};

// 移除歌曲
const removeSong = async (index) => {
  if (index < playIndex.value) {
    playIndex.value--;
  } else if (index === playIndex.value) {
    // 如果删除的是当前播放歌曲，则下一曲
    changePlayIndex("next", true);
  }
  playList.value.splice(index, 1);
  // 检查当前播放歌曲的索引是否超出了列表范围
  if (playIndex.value >= playList.value.length) {
    playIndex.value = 0;
    playList.value = [];
    playSongData.value = {};
    soundStop();
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
.alert {
  height: 48px;
  border-radius: 8px;
  margin-bottom: 12px;
}
.pl-list {
  :deep(.n-data-table-thead) {
    display: none;
  }
  :deep(.n-data-table-tbody) {
    .songs-item {
      padding: 0;
      .songs {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        border-radius: 8px;
        margin-bottom: 12px;
        padding: 8px;
        border: 1px solid transparent;
        background-color: var(--n-border-color-modal);
        transition:
          transform 0.3s,
          border-color 0.3s,
          box-shadow 0.3s,
          background-color 0.3s;
        cursor: pointer;
        .num,
        .play {
          width: 30px;
          height: 30px;
          min-width: 30px;
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
          box-shadow:
            0 1px 2px -2px var(--main-boxshadow-color),
            0 3px 6px 0 var(--main-boxshadow-color),
            0 5px 12px 4px var(--main-boxshadow-hover-color);
        }
        &:active {
          transform: scale(0.995);
        }
      }
    }
    .n-data-table-tr {
      &:last-child {
        .songs {
          margin-bottom: 0;
        }
      }
    }
  }
}
.tip {
  border-radius: 8px;
}
</style>

<style lang="scss">
.n-drawer-mask {
  backdrop-filter: blur(20px);
}
.main-playlist {
  width: 400px !important;
  border-radius: 12px 0 0 12px;
  .n-drawer-header {
    height: 70px;
    box-sizing: border-box;
  }
  .n-scrollbar-content {
    padding: 16px !important;
  }
  &.player {
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
}
</style>
