<template>
  <div class="song-card">
    <div :class="['song-content', { play: musicStore.playSong.id === song.id }]">
      <!-- 序号 -->
      <div class="num" @dblclick.stop>
        <n-text v-if="musicStore.playSong.id !== song.id" depth="3">
          {{ index + 1 }}
        </n-text>
        <SvgIcon v-else :size="22" name="Music" />
        <!-- 播放暂停 -->
        <SvgIcon
          :size="28"
          :name="statusStore.playStatus ? 'Pause' : 'Play'"
          class="status"
          @click="player.playOrPause()"
        />
        <!-- 播放 -->
        <SvgIcon :size="28" name="Play" class="play" @click="player.addNextSong(song, true)" />
      </div>
      <!-- 标题 -->
      <div class="title">
        <!-- 封面 -->
        <s-image
          v-if="!hiddenCover"
          :key="song.cover"
          :src="song.path ? song.cover : song.coverSize?.s || song.cover"
          class="cover"
          @update:show="localCover"
        />
        <!-- 信息 -->
        <div class="info">
          <!-- 名称 -->
          <div class="name">
            <n-ellipsis
              :line-clamp="1"
              :tooltip="{
                placement: 'top',
                width: 'trigger',
              }"
              class="name-text"
            >
              {{ song?.name || "未知曲目" }}
            </n-ellipsis>
            <!-- 音质 -->
            <n-tag
              v-if="song?.path && song?.quality"
              :bordered="false"
              :type="song.quality === 'Hi-Res' ? 'warning' : 'info'"
              class="quality"
              round
            >
              {{ song.quality }}
            </n-tag>
            <!-- 特权 -->
            <n-tag v-if="song.originCoverType === 1" :bordered="false" type="primary" round>
              原
            </n-tag>
            <n-tag v-if="song.free === 1" :bordered="false" type="error" round> VIP </n-tag>
            <n-tag v-if="song.free === 4" :bordered="false" type="error" round> EP </n-tag>
            <!-- 云盘 -->
            <n-tag v-if="song?.pc" :bordered="false" class="cloud" type="info" round>
              <template #icon>
                <SvgIcon name="Cloud" />
              </template>
            </n-tag>
            <!-- MV -->
            <n-tag
              v-if="song?.mv"
              :bordered="false"
              class="mv"
              type="warning"
              round
              @click.stop="
                router.push({
                  name: 'video',
                  query: { id: song.mv },
                })
              "
            >
              MV
            </n-tag>
          </div>
          <!-- 歌手 -->
          <div v-if="Array.isArray(song.artists)" class="artists text-hidden">
            <n-text
              v-for="ar in song.artists"
              :key="ar.id"
              class="ar"
              @click="openJumpArtist(song.artists)"
            >
              {{ ar.name }}
            </n-text>
          </div>
          <div v-else-if="song.type === 'radio'" class="artists">
            <n-text class="ar"> 电台节目 </n-text>
          </div>
          <div v-else class="artists text-hidden" @click="openJumpArtist(song.artists)">
            <n-text class="ar"> {{ song.artists || "未知艺术家" }} </n-text>
          </div>
          <!-- 别名 -->
          <n-text v-if="song.alia" class="alia text-hidden" depth="3">{{ song.alia }}</n-text>
        </div>
      </div>
      <!-- 专辑 -->
      <div v-if="song.type !== 'radio' && !hiddenAlbum" class="album text-hidden">
        <n-text
          v-if="isObject(song.album)"
          class="album-text"
          @click="
            router.push({
              name: 'album',
              query: { id: song.album?.id },
            })
          "
        >
          {{ song.album?.name || "未知专辑" }}
        </n-text>
        <n-text v-else class="album-text">
          {{ song.album || "未知专辑" }}
        </n-text>
      </div>
      <!-- 操作 -->
      <div v-if="song.type !== 'radio'" class="actions" @click.stop @dblclick.stop>
        <!-- 喜欢歌曲 -->
        <SvgIcon
          :name="dataStore.isLikeSong(song.id) ? 'Favorite' : 'FavoriteBorder'"
          :size="20"
          @click.stop="toLikeSong(song, !dataStore.isLikeSong(song.id))"
          @delclick.stop
        />
      </div>
      <!-- 更新日期 -->
      <n-text v-if="song.type === 'radio'" class="meta date" depth="3">
        {{ formatTimestamp(song.updateTime) }}
      </n-text>
      <!-- 播放量 -->
      <n-text v-if="song.type === 'radio'" class="meta" depth="3">
        {{ formatNumber(song.playCount || 0) }}
      </n-text>
      <!-- 时长 -->
      <n-text class="meta" depth="3">{{ msToTime(song.duration) }}</n-text>
      <!-- 大小 -->
      <n-text v-if="song.path && song.size && !hiddenSize" class="meta size" depth="3">
        {{ song.size }}M
      </n-text>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import { useStatusStore, useMusicStore, useDataStore } from "@/stores";
import { formatNumber, isElectron } from "@/utils/helper";
import { openJumpArtist } from "@/utils/modal";
import { toLikeSong } from "@/utils/auth";
import { isObject } from "lodash-es";
import { formatTimestamp, msToTime } from "@/utils/time";
import player from "@/utils/player";
import blob from "@/utils/blob";

const props = defineProps<{
  // 歌曲
  song: SongType;
  // 索引
  index: number;
  // 隐藏信息
  hiddenCover?: boolean;
  hiddenAlbum?: boolean;
  hiddenSize?: boolean;
}>();

const router = useRouter();
const dataStore = useDataStore();
const musicStore = useMusicStore();
const statusStore = useStatusStore();

// 歌曲数据
const song = toRef(props, "song");

// 加载本地歌曲封面
const localCover = async (show: boolean) => {
  if (!isElectron || !show || !song.value.path) return;
  if (song.value.cover || song.value.cover === "/images/song.jpg?assest") return;
  // 获取封面
  const coverData = await window.electron.ipcRenderer.invoke("get-music-cover", song.value.path);
  if (!coverData) return;
  const { data, format } = coverData;
  const blobURL = blob.createBlobURL(data, format, song.value.path);
  if (blobURL) song.value.cover = blobURL;
};
</script>

<style lang="scss" scoped>
.song-card {
  height: 100%;
  cursor: pointer;
  .song-content {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    flex: 1;
    border-radius: 12px;
    border: 2px solid rgba(var(--primary), 0.12);
    background-color: var(--surface-container-hex);
    // transition:
    //   transform 0.1s,
    //   background-color 0.3s var(--n-bezier),
    //   border-color 0.3s var(--n-bezier);
    &.play {
      border-color: rgba(var(--primary), 0.58);
      background-color: rgba(var(--primary), 0.28);
    }
    // &:active {
    //   transform: scale(0.99);
    // }
    &:hover {
      border-color: rgba(var(--primary), 0.58);
      .num {
        .n-text,
        .n-icon {
          opacity: 0;
        }
        .play {
          opacity: 1;
          transform: scale(1);
        }
      }
      &.play {
        .num {
          .play {
            display: none;
          }
          .status {
            opacity: 1;
            transform: scale(1);
          }
        }
      }
    }
  }
  .num {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 40px;
    min-width: 40px;
    font-weight: bold;
    margin-right: 12px;
    .n-icon {
      transition:
        opacity 0.3s,
        transform 0.3s;
      :deep(.svg-container) {
        color: var(--primary-hex);
      }
    }
    .status,
    .play {
      position: absolute;
      opacity: 0;
      transform: scale(0.8);
      transition:
        opacity 0.3s,
        transform 0.3s;
      &:active {
        opacity: 0.6 !important;
      }
    }
  }
  .title {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 4px 20px 4px 0;
    .cover {
      width: 50px;
      height: 50px;
      min-width: 50px;
      border-radius: 8px;
      margin-right: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .info {
      display: flex;
      flex-direction: column;
      .name {
        display: flex;
        flex-direction: row;
        align-items: center;
        font-size: 16px;
        :deep(.name-text) {
          margin-right: 6px;
        }
        .n-tag {
          --n-height: 20px;
          font-size: 12px;
          cursor: pointer;
          margin-right: 6px;
          pointer-events: none;
          &:last-child {
            margin-right: 0;
          }
        }
        .quality {
          font-size: 10px;
        }
        .cloud {
          padding: 0 10px;
          align-items: center;
          justify-content: center;
          :deep(.n-tag__icon) {
            margin-right: 0;
            width: 100%;
          }
          .n-icon {
            font-size: 12px;
            color: var(--n-text-color);
          }
        }
        .mv {
          pointer-events: auto;
        }
      }
      .artists {
        margin-top: 2px;
        font-size: 13px;
        .ar {
          display: inline-flex;
          transition: opacity 0.3s;
          opacity: 0.6;
          cursor: pointer;
          &::after {
            content: "/";
            margin: 0 4px;
          }
          &:last-child {
            &::after {
              display: none;
            }
          }
          &:hover {
            opacity: 0.8;
          }
        }
      }
      .alia {
        margin-top: 2px;
        font-size: 12px;
        opacity: 0.8;
      }
    }
    .sort {
      margin-left: 6px;
      &::after {
        content: " )";
      }
      &::before {
        content: "( ";
      }
    }
  }
  .album {
    flex: 1;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    padding-right: 20px;
    &:hover {
      .album-text {
        color: var(--primary-hex);
      }
    }
  }
  .actions {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    .n-icon {
      transition: transform 0.3s;
      cursor: pointer;
      &:hover {
        transform: scale(1.15);
      }
      &:active {
        transform: scale(1);
      }
    }
  }
  .meta {
    width: 50px;
    font-size: 13px;
    text-align: center;
    &.size {
      width: 60px;
    }
    &.date {
      width: 80px;
    }
  }
  &.header {
    border: none;
    background-color: transparent;
    .n-text {
      opacity: 0.6;
    }
    .title {
      position: relative;
      padding: 0 20px 0 0;
      &.has-sort {
        &::after {
          content: "";
          position: absolute;
          opacity: 0;
          top: 0;
          left: -8px;
          width: 100%;
          height: 100%;
          border-radius: 8px;
          background-color: rgba(var(--primary), 0.08);
          transition: opacity 0.3s;
        }
        &:hover {
          &::after {
            opacity: 1;
          }
        }
      }
    }
  }
}
</style>
