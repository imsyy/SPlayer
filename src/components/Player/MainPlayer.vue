<template>
  <div
    ref="playerRef"
    :class="[
      'main-player',
      {
        show: musicStore.isHasPlayer && statusStore.showPlayBar,
        player: statusStore.showFullPlayer,
      },
    ]"
  >
    <!-- 进度条 -->
    <PlayerSlider />
    <!-- 信息 -->
    <div :class="['play-data', { 'hidden-cover': settingStore.hiddenCovers.player }]">
      <!-- 封面 -->
      <Transition name="fade">
        <div
          v-if="!settingStore.hiddenCovers.player"
          :key="musicStore.playSong.cover"
          class="cover"
          @click.stop="statusStore.showFullPlayer = true"
        >
          <n-image
            :src="musicStore.songCover"
            :alt="musicStore.songCover"
            class="cover-img"
            preview-disabled
            @load="coverLoaded"
          >
            <template #placeholder>
              <div class="cover-loading">
                <img src="/images/song.jpg?asset" class="loading-img" alt="loading-img" />
              </div>
            </template>
          </n-image>
          <!-- 打开播放器 -->
          <SvgIcon name="Expand" :size="30" />
        </div>
      </Transition>
      <!-- 信息 -->
      <Transition name="left-sm" mode="out-in">
        <div :key="musicStore.playSong.id" class="info">
          <div class="data">
            <!-- 名称 -->
            <TextContainer
              :key="musicStore.playSong.name"
              :text="
                settingStore.hideBracketedContent
                  ? removeBrackets(musicStore.playSong.name)
                  : musicStore.playSong.name
              "
              :speed="0.2"
              class="name"
              style="cursor: pointer"
              @click.stop="settingStore.hiddenCovers.player && (statusStore.showFullPlayer = true)"
            />
            <!-- 倍速 -->
            <n-tag
              v-if="statusStore.playRate !== 1"
              type="primary"
              size="small"
              round
              @click="openChangeRate"
            >
              {{ statusStore.playRate }}x
            </n-tag>
            <!-- 喜欢 -->
            <SvgIcon
              v-if="musicStore.playSong.type !== 'radio'"
              :name="dataStore.isLikeSong(musicStore.playSong.id) ? 'Favorite' : 'FavoriteBorder'"
              :size="20"
              class="like"
              @click="
                toLikeSong(musicStore.playSong, !dataStore.isLikeSong(musicStore.playSong.id))
              "
            />
            <!-- 更多操作 -->
            <n-dropdown :options="songMoreOptions" trigger="click" placement="top-start">
              <SvgIcon name="FormatList" :size="20" :depth="2" class="more" />
            </n-dropdown>
          </div>
          <div class="lyric-container">
            <Transition
              :name="settingStore.lyricTransition === 'fade' ? 'fade' : 'lyric-slide'"
              :mode="settingStore.lyricTransition === 'fade' ? 'out-in' : undefined"
            >
              <!-- 歌词 -->
              <TextContainer
                v-if="isShowLyrics && instantLyrics"
                :key="instantLyrics"
                :text="instantLyrics"
                :speed="0.5"
                :delay="500"
                class="lyric"
              />
              <!-- 歌手 -->
              <div v-else class="artists">
                <TextContainer :speed="0.5" class="artists-container">
                  <n-text v-if="musicStore.playSong.type === 'radio'" class="ar-item">
                    播客电台
                  </n-text>
                  <template v-else-if="Array.isArray(musicStore.playSong.artists)">
                    <n-text
                      v-for="(item, index) in musicStore.playSong.artists"
                      :key="index"
                      class="ar-item"
                      @click="openJumpArtist(musicStore.playSong.artists, item.id)"
                    >
                      {{
                        settingStore.hideBracketedContent ? removeBrackets(item.name) : item.name
                      }}
                    </n-text>
                  </template>
                  <n-text
                    v-else
                    class="ar-item"
                    @click="openJumpArtist(musicStore.playSong.artists)"
                  >
                    {{
                      settingStore.hideBracketedContent
                        ? removeBrackets(musicStore.playSong.artists)
                        : musicStore.playSong.artists || "未知艺术家"
                    }}
                  </n-text>
                </TextContainer>
              </div>
            </Transition>
          </div>
        </div>
      </Transition>
    </div>
    <!-- 控制 -->
    <n-flex :size="8" align="center" justify="center" class="play-control">
      <!-- 随机按钮 -->
      <template v-if="musicStore.playSong.type !== 'radio' && !statusStore.personalFmMode">
        <div class="play-icon" @click.stop="player.toggleShuffle()">
          <SvgIcon
            :name="statusStore.shuffleIcon"
            :size="20"
            :depth="statusStore.shuffleMode === 'off' ? 3 : 1"
          />
        </div>
      </template>
      <!-- 不喜欢 -->
      <div
        v-if="statusStore.personalFmMode"
        class="play-icon"
        v-debounce="() => songManager.personalFMTrash(musicStore.personalFMSong?.id)"
      >
        <SvgIcon class="icon" :size="18" name="ThumbDown" />
      </div>
      <!-- 上一曲 -->
      <div v-else class="play-icon" v-debounce="() => player.nextOrPrev('prev')">
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
      <div class="play-icon" v-debounce="() => player.nextOrPrev('next')">
        <SvgIcon :size="26" name="SkipNext" />
      </div>
      <!-- 循环按钮 -->
      <template v-if="musicStore.playSong.type !== 'radio' && !statusStore.personalFmMode">
        <div class="play-icon" @click.stop="player.toggleRepeat()">
          <SvgIcon
            :name="statusStore.repeatIcon"
            :size="20"
            :depth="statusStore.repeatMode === 'off' ? 3 : 1"
          />
        </div>
      </template>
    </n-flex>
    <!-- 功能 -->
    <Transition name="fade" mode="out-in">
      <n-flex
        :key="statusStore.personalFmMode ? 'fm' : 'normal'"
        :size="[8, 0]"
        class="play-menu"
        justify="end"
      >
        <!-- 时间相关 -->
        <Transition name="fade" mode="out-in">
          <n-flex
            :key="statusStore.autoClose.enable ? 'autoClose' : 'time'"
            :size="4"
            justify="center"
            class="time-container"
            vertical
          >
            <div class="time" @click="toggleTimeFormat">
              <n-text depth="2">{{ timeDisplay[0] }}</n-text>
              <n-text depth="2">{{ timeDisplay[1] }}</n-text>
            </div>
            <!-- 定时关闭 -->
            <n-tag
              v-if="statusStore.autoClose.enable"
              size="small"
              type="primary"
              round
              @click="openAutoClose"
            >
              {{ convertSecondsToTime(statusStore.autoClose.remainTime) }}
              <template #icon>
                <SvgIcon name="TimeAuto" />
              </template>
            </n-tag>
          </n-flex>
        </Transition>
        <!-- 功能区 -->
        <PlayerRightMenu />
      </n-flex>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { usePlayerController } from "@/core/player/PlayerController";
import { useSongManager } from "@/core/player/SongManager";
import { useDataStore, useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { toLikeSong } from "@/utils/auth";
import { useTimeFormat } from "@/composables/useTimeFormat";
import { useSwipe } from "@vueuse/core";
import { copyData, coverLoaded, renderIcon, getShareUrl } from "@/utils/helper";
import {
  openAutoClose,
  openChangeRate,
  openCopySongInfo,
  openDownloadSong,
  openJumpArtist,
  openPlaylistAdd,
} from "@/utils/modal";
import { convertSecondsToTime } from "@/utils/time";
import { removeBrackets } from "@/utils/format";
import type { DropdownOption } from "naive-ui";

const router = useRouter();
const dataStore = useDataStore();
const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();

const player = usePlayerController();
const songManager = useSongManager();

const { timeDisplay, toggleTimeFormat } = useTimeFormat();

const playerRef = ref<HTMLElement | null>(null);

// 触摸滑动切换歌曲
const { direction } = useSwipe(playerRef, {
  threshold: 50,
  onSwipeEnd: () => {
    if (direction.value === "left") {
      // 左滑
      player.nextOrPrev("next");
    } else if (direction.value === "right") {
      // 右滑
      player.nextOrPrev("prev");
    }
  },
});

// 歌曲更多操作
const songMoreOptions = computed<DropdownOption[]>(() => {
  // 当前状态
  const song = musicStore.playSong;
  const isHasMv = !!song?.mv && song.mv !== 0;
  const isSong = song.type === "song";
  const isLocal = !!song?.path;
  return [
    {
      key: "more",
      label: "更多操作",
      icon: renderIcon("Menu", { size: 18 }),
      children: [
        {
          key: "code-name",
          label: `复制${song.type === "song" ? "歌曲" : "节目"}名称`,
          props: {
            onClick: () => copyData(song.name),
          },
          icon: renderIcon("Copy", { size: 18 }),
        },
        {
          key: "code-id",
          label: `复制${song.type === "song" ? "歌曲" : "节目"} ID`,
          show: !isLocal,
          props: {
            onClick: () => copyData(song.id),
          },
          icon: renderIcon("Copy", { size: 18 }),
        },
        {
          key: "copy-song-info",
          label: "复制更多信息",
          show: !isLocal && isSong,
          props: {
            onClick: () => openCopySongInfo(song.id),
          },
          icon: renderIcon("FormatList", { size: 18 }),
        },
        {
          key: "share",
          label: `分享${song.type === "song" ? "歌曲" : "节目"}链接`,
          show: !isLocal,
          props: {
            onClick: () =>
              copyData(
                getShareUrl(song.type, song.id),
                "已复制分享链接到剪切板",
              ),
          },
          icon: renderIcon("Share", { size: 18 }),
        },
      ],
    },
    {
      key: "search",
      label: "同名搜索",
      show: settingStore.useOnlineService,
      props: {
        onClick: () => router.push({ name: "search", query: { keyword: song.name } }),
      },
      icon: renderIcon("Search"),
    },
    {
      key: "line",
      type: "divider",
    },
    {
      key: "playlist-add",
      label: "添加到歌单",
      props: {
        onClick: () => openPlaylistAdd([song], isLocal),
      },
      icon: renderIcon("AddList"),
    },
    {
      key: "mv",
      label: "观看 MV",
      show: isSong && isHasMv,
      props: {
        onClick: () =>
          router.push({ name: "video", query: { id: musicStore.playSong.mv, type: "mv" } }),
      },
      icon: renderIcon("Video", { size: 18 }),
    },
    {
      key: "download",
      label: "下载歌曲",
      show: statusStore.isDeveloperMode && !isLocal && isSong,
      props: { onClick: () => openDownloadSong(musicStore.playSong) },
      icon: renderIcon("Download"),
    },
    {
      key: "wiki",
      label: "音乐百科",
      show: !isLocal && isSong,
      props: {
        onClick: () => router.push({ name: "song-wiki", query: { id: musicStore.playSong.id } }),
      },
      icon: renderIcon("Info"),
    },
    {
      key: "comment",
      label: "查看评论",
      show: !isLocal,
      props: {
        onClick: () => {
          statusStore.$patch({
            showFullPlayer: true,
            showPlayerComment: true,
          });
        },
      },
      icon: renderIcon("Message"),
    },
  ];
});

// 是否展示歌词
const isShowLyrics = computed(() => {
  const isHasLrc = musicStore.isHasLrc;
  return (
    isHasLrc &&
    !statusStore.lyricLoading &&
    settingStore.barLyricShow &&
    musicStore.playSong.type !== "radio" &&
    statusStore.playStatus &&
    statusStore.lyricIndex !== -1
  );
});

// 当前实时歌词
const instantLyrics = computed(() => {
  const isYrc = musicStore.songLyric.yrcData?.length && settingStore.showYrc;
  const content = isYrc
    ? musicStore.songLyric.yrcData[statusStore.lyricIndex]
    : musicStore.songLyric.lrcData[statusStore.lyricIndex];
  const contentStr = content?.words?.map((v) => v.word).join("") || "";
  return content?.translatedLyric && settingStore.showTran
    ? `${contentStr}（ ${content?.translatedLyric} ）`
    : contentStr || "";
});
</script>

<style lang="scss" scoped>
.main-player {
  position: fixed;
  left: 0;
  bottom: -90px;
  height: 80px;
  padding: 0 15px;
  width: 100%;
  background-color: var(--surface-container-hex);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  transition: bottom 0.3s;
  z-index: 10;
  &.show {
    bottom: 0;
  }
  .player-slider {
    position: absolute;
    width: 100%;
    height: 16px;
    top: -8px;
    left: 0;
    margin: 0;
    --n-rail-height: 3px;
    --n-handle-size: 14px;
  }
  .play-data {
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    overflow: hidden;
    height: 100%;
    max-width: 640px;
    padding-left: 68px;
    .cover {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      left: 0;
      width: 56px;
      height: 56px;
      min-width: 56px;
      border-radius: 8px;
      overflow: hidden;
      margin-right: 12px;
      transition: opacity 0.2s;
      cursor: pointer;
      :deep(img) {
        width: 56px;
        height: 56px;
        opacity: 0;
        transition:
          transform 0.3s,
          opacity 0.3s,
          filter 0.3s;
      }
      .n-icon {
        position: absolute;
        color: #eee;
        opacity: 0;
        transform: scale(0.6);
        transition:
          opacity 0.3s,
          transform 0.3s;
      }
      &:hover {
        :deep(img) {
          transform: scale(1.2);
          filter: brightness(0.6) blur(2px);
        }
        .n-icon {
          opacity: 1;
          transform: scale(1);
        }
      }
      &:active {
        .n-icon {
          transform: scale(1.2);
        }
      }
    }
    .info {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
      .data {
        display: flex;
        align-items: center;
        .name {
          font-weight: bold;
          font-size: 16px;
          flex: 0 1 auto;
          width: auto;
          min-width: 0;
          transition: color 0.3s;
        }
        .n-tag {
          margin-left: 8px;
          flex-shrink: 0;
        }
        .like {
          color: var(--primary-hex);
          margin-left: 8px;
          transition: transform 0.3s;
          cursor: pointer;
          flex-shrink: 0;
          &:hover {
            transform: scale(1.15);
          }
          &:active {
            transform: scale(1);
          }
        }
        .more {
          margin-left: 8px;
          cursor: pointer;
          flex-shrink: 0;
        }
      }
      .lyric-container {
        position: relative;
        height: 22px;
        margin-top: 2px;
        overflow: hidden;
        .lyric,
        .artists {
          margin-top: 0;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
        }
      }
      .artists {
        width: 100%;
        overflow: hidden;

        .artists-container {
          .ar-item {
            display: inline-flex;
            transition: color 0.3s;
            cursor: pointer;
            white-space: nowrap;

            &::after {
              content: "/";
              margin: 0 6px;
              opacity: 0.6;
              transition: none;
            }
            &:last-child {
              &::after {
                display: none;
              }
            }
            &:hover {
              color: var(--primary-hex);
              &::after {
                color: var(--n-close-icon-color);
              }
            }
          }
        }
      }
    }
    &.hidden-cover {
      padding-left: 0;
    }
  }
  .play-control {
    margin: 0 60px;
    .play-pause {
      --n-width: 44px;
      --n-height: 44px;
      margin: 0 4px;
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
    .play-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      will-change: transform;
      transition:
        background-color 0.3s,
        transform 0.3s;
      cursor: pointer;
      margin: 0 2px;
      .n-icon {
        color: var(--primary-hex);
      }
      &:hover {
        transform: scale(1.1);
        background-color: rgba(var(--primary), 0.16);
      }
      &:active {
        transform: scale(1);
      }
    }
  }
  .play-menu {
    margin-left: auto;
    max-width: 640px;
    .time-container {
      margin-right: 8px;
      .n-tag {
        justify-content: center;
        font-size: 12px;
      }
    }
    .time {
      cursor: pointer;
      display: flex;
      align-items: center;
      font-size: 12px;
      .n-text {
        color: var(--primary-hex);
        opacity: 0.8;
        &:nth-of-type(1) {
          &::after {
            content: "/";
            margin: 0 4px;
          }
        }
      }
      &:hover {
        text-decoration: underline;
        text-decoration-color: var(--primary-hex);
      }
    }
  }
  @media (max-width: 1024px) {
    .play-menu {
      .time-container {
        display: none !important;
      }
    }
  }
  @media (max-width: 810px) {
    grid-template-columns: 1fr auto auto;
    .play-control {
      margin: 0 0 0 12px;
      .play-icon {
        display: none;
      }
    }
  }
}
</style>
