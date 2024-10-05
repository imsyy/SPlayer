<template>
  <Transition name="fade" mode="out-in">
    <div v-if="data.length > 0" :class="['cover-list', type]">
      <n-grid :cols="cols" x-gap="20" y-gap="20">
        <n-gi v-for="(item, index) in data" :key="index">
          <div
            class="cover-item"
            @click="goDetail(item)"
            @contextmenu="coverMenuRef?.openDropdown($event, item, type)"
          >
            <!-- 封面 -->
            <div class="cover">
              <s-image
                :key="item.cover"
                :src="
                  type === 'video' ? `${item.cover}?param=464y260` : item.coverSize?.m || item.cover
                "
                :default-src="
                  type !== 'video' ? '/images/album.jpg?assest' : '/images/video.jpg?assest'
                "
                class="cover-img"
                once
              />
              <template v-if="item.playCount">
                <!-- 遮罩 -->
                <div v-if="type !== 'album'" class="cover-mask" />
                <!-- 播放量 -->
                <div v-if="type !== 'album'" class="play-count">
                  <SvgIcon name="Play" />
                  <span class="num">{{ formatNumber(item.playCount || 0) }}</span>
                </div>
              </template>
              <!-- 简介 -->
              <div v-if="item.description" class="description">
                <n-text class="text-hidden"> {{ item.description }}</n-text>
              </div>
              <!-- 播放按钮 -->
              <div class="play-btn" @click.stop>
                <n-button
                  :focusable="false"
                  :loading="item.loading"
                  secondary
                  circle
                  class="play"
                  @click.stop="playList(item)"
                >
                  <template #icon>
                    <SvgIcon :size="32" :name="isPlaying(item.id) ? 'Pause' : 'Play'" />
                  </template>
                </n-button>
              </div>
            </div>
            <!-- 信息 -->
            <div class="cover-data">
              <n-text class="name text-hidden">{{ item.name }}</n-text>
              <!-- 创建者 -->
              <n-text
                v-if="(type === 'playlist' || type === 'radio') && item?.creator?.id"
                class="creator"
                depth="3"
              >
                {{ item.creator?.name || item.creator || "未知" }}
              </n-text>
              <!-- 更新提示 -->
              <n-text v-if="item.updateTip" class="tip" depth="3">{{ item.updateTip }}</n-text>
              <!-- 专辑信息 -->
              <div v-if="type === 'album'" class="meta">
                <n-text class="count" depth="3">{{ item.count || 0 }}首</n-text>
                <n-text class="date" depth="3">{{ formatTimestamp(item.createTime) }}</n-text>
              </div>
              <!-- 歌手 -->
              <template v-if="type === 'video' && item.artists">
                <div v-if="Array.isArray(item.artists)" class="artists text-hidden">
                  <n-text v-for="(ar, arIndex) in item.artists" :key="arIndex" class="ar">
                    {{ ar.name || "未知艺术家" }}
                  </n-text>
                </div>
                <div v-else class="artists text-hidden">
                  <n-text class="ar"> {{ item.artists || "未知艺术家" }} </n-text>
                </div>
              </template>
            </div>
          </div>
        </n-gi>
      </n-grid>
      <!-- 加载更多 -->
      <n-flex v-if="loadMore" class="load-more" justify="center">
        <n-button :loading="loading" size="large" strong secondary round @click="emit('loadMore')">
          加载更多
        </n-button>
      </n-flex>
      <!-- 右键菜单 -->
      <CoverMenu ref="coverMenuRef" @toPlay="playList" />
    </div>
    <div v-else-if="loading" :class="['cover-list', 'loading', type]">
      <n-grid :cols="cols" x-gap="20" y-gap="20">
        <n-gi v-for="item in loadingNum || 50" :key="item">
          <div class="cover-item">
            <div class="cover">
              <n-skeleton class="cover-img" />
            </div>
            <div class="cover-data">
              <n-skeleton text round :repeat="2" />
            </div>
          </div>
        </n-gi>
      </n-grid>
    </div>
    <!-- 空列表 -->
    <n-empty v-else description="空空如也，怎么什么都没有啊" size="large" />
  </Transition>
</template>

<script setup lang="ts">
import type { CoverType, SongType } from "@/types/main";
import { albumDetail } from "@/api/album";
import { formatNumber } from "@/utils/helper";
import { useMusicStore, useStatusStore } from "@/stores";
import { debounce } from "lodash-es";
import { formatSongsList } from "@/utils/format";
import { songDetail } from "@/api/song";
import { playlistAllSongs } from "@/api/playlist";
import { radioAllProgram } from "@/api/radio";
import CoverMenu from "@/components/Menu/CoverMenu.vue";
import player from "@/utils/player";
import { formatTimestamp } from "@/utils/time";

interface Props {
  data: CoverType[];
  type: "playlist" | "album" | "video" | "radio";
  cols?: string;
  loadMore?: boolean;
  loading?: boolean;
  loadingNum?: number;
  loadingText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  cols: "3 600:3 800:4 900:5 1200:6 1400:7",
});

const emit = defineEmits<{
  // 加载更多
  loadMore: [];
}>();

const router = useRouter();
const musicStore = useMusicStore();
const statusStore = useStatusStore();

// 右键菜单
const coverMenuRef = ref<InstanceType<typeof CoverMenu> | null>(null);

// 是否处于当前播放列表
const isPlaying = (id: number) => musicStore.playPlaylistId === id && statusStore.playStatus;

// 查看详情
const goDetail = (item: CoverType) => {
  router.push({
    name: props.type,
    query: { id: item.id },
  });
};

// 播放歌单
const playList = debounce(
  async (item: CoverType) => {
    try {
      // 视频直接跳转
      if (props.type === "video") {
        return router.push({ name: "video", query: { id: item.id } });
      }
      // 是否为当前列表
      if (musicStore.playPlaylistId === item.id) return player.playOrPause();
      // 开始加载
      item.loading = true;
      // 获取播放列表
      const list = await getListData(item.id);
      player.updatePlayList(list, undefined, item.id);
    } catch (error) {
      console.log("Error to play: ", error);
    } finally {
      item.loading = false;
    }
  },
  300,
  { leading: true, trailing: false },
);

// 获取列表数据
const getListData = async (id: number): Promise<SongType[]> => {
  switch (props.type) {
    case "album": {
      const result = await albumDetail(id);
      const ids: number[] = result.songs.map((song: any) => song.id as number);
      const songRes = await songDetail(ids);
      return formatSongsList(songRes.songs);
    }
    case "playlist": {
      // 仅请求 100 首
      const result = await playlistAllSongs(id, 100);
      return formatSongsList(result.songs);
    }
    case "radio": {
      const result = await radioAllProgram(id, 100);
      return formatSongsList(result.programs);
    }
    default:
      return [];
  }
};
</script>

<style lang="scss" scoped>
.cover-list {
  width: 100%;
  padding: 20px 4px;
  .cover-item {
    position: relative;
    height: auto;
    border-radius: 16px;
    z-index: 0;
    transition:
      background-color 0.3s,
      transform 0.3s;
    cursor: pointer;
    .cover {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      aspect-ratio: 1 / 1;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0px 0px 4px 2px rgba(0, 0, 0, 0.1);
      transition:
        border-radius 0.3s,
        box-shadow 0.3s;
      :deep(img) {
        width: 100%;
        height: 100%;
        // opacity: 0;
        transition: opacity 0.35s ease-in-out;
      }
      .cover-img {
        transition:
          filter 0.3s,
          transform 0.3s;
      }
      .cover-mask {
        position: absolute;
        top: 0;
        left: 0;
        height: 30%;
        width: 100%;
        background: linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0));
      }
      .play-count {
        position: absolute;
        display: flex;
        align-items: center;
        top: 10px;
        right: 12px;
        color: #fff;
        font-weight: bold;
        z-index: 2;
        .n-icon {
          color: #fff;
          font-size: 16px;
          margin-right: 4px;
        }
      }
      .description {
        position: absolute;
        left: 0;
        bottom: 0;
        width: 100%;
        padding: 40px 60px 12px 12px;
        background: linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.6));
        transform: translateY(100%);
        transition: transform 0.3s;
        .n-text {
          color: #fff;
          line-clamp: 3;
          -webkit-line-clamp: 3;
        }
      }
      .play {
        position: absolute;
        right: 10px;
        bottom: 10px;
        transform: translateY(8px);
        opacity: 0;
        transition: all 0.3s;
        background-color: #ffffff66;
        backdrop-filter: blur(6px);
        --n-width: 42px;
        --n-height: 42px;
        .n-icon {
          color: #fff;
        }
        :deep(.n-base-loading) {
          color: #fff;
        }
        &:active {
          background-color: #ffffff33;
        }
      }
      .n-skeleton {
        height: 100%;
      }
    }
    .cover-data {
      display: flex;
      flex-direction: column;
      padding: 12px;
      .name {
        font-size: 16px;
        line-clamp: 2;
        -webkit-line-clamp: 2;
      }
      .tip {
        font-size: 13px;
      }
      .meta {
        font-size: 13px;
        .count {
          &::after {
            content: "·";
            margin: 0 2px;
          }
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
      :deep(.n-skeleton) {
        &:first-child {
          margin-bottom: 12px;
        }
      }
    }
    &:hover {
      background-color: rgba(var(--primary), 0.12);
      .cover {
        border-radius: 16px 16px 0 0;
        .cover-img {
          transform: scale(1.1);
          filter: brightness(0.8);
        }
        .description {
          transform: translateY(0);
        }
        .play {
          transform: translateY(0);
          opacity: 1;
        }
      }
    }
  }
  .load-more {
    margin: 20px 0;
  }
  &.video {
    .cover-item {
      .cover {
        aspect-ratio: 16/9;
      }
    }
  }
  &.loading {
    .cover {
      box-shadow: none;
    }
  }
}
.n-empty {
  margin-top: 60px;
}
</style>
