<template>
  <Transition name="fade" mode="out-in">
    <div
      v-if="data.length > 0"
      ref="songListRef"
      :style="{ height: disableVirtualList ? undefined : '100%' }"
      :class="['song-list', { 'no-padding': hiddenPadding }]"
    >
      <DynamicScroller
        ref="scrollerRef"
        :items="listData"
        :min-item-size="94"
        :emitUpdate="true"
        :style="{ height: disableVirtualList ? undefined : `${songListShowHeight}px` }"
        class="scroller"
        @scroll="onScroll"
      >
        <template #before>
          <slot name="header" />
          <div class="song-item header" :style="{ margin }">
            <n-text class="num">#</n-text>
            <n-dropdown
              v-if="!disabledSort"
              :options="sortMenuOptions"
              trigger="click"
              placement="bottom-start"
              @select="sortSelect"
            >
              <div class="title has-sort">
                <n-text>标题</n-text>
                <n-text v-if="statusStore.listSort !== 'default'" class="sort" depth="3">
                  {{ sortOptions[statusStore.listSort].name }}
                </n-text>
              </div>
            </n-dropdown>
            <n-text v-else class="title">标题</n-text>
            <n-text v-if="type !== 'radio' && !hiddenAlbum" class="album">专辑</n-text>
            <n-text v-if="type !== 'radio'" class="actions">操作</n-text>
            <n-text v-if="type === 'radio'" class="meta date">更新日期</n-text>
            <n-text v-if="type === 'radio'" class="meta">播放量</n-text>
            <n-text class="meta">时长</n-text>
            <n-text v-if="data?.[0].size && !hiddenSize" class="meta size">大小</n-text>
          </div>
        </template>
        <template v-slot="{ item, index, active }">
          <DynamicScrollerItem
            :item="item"
            :active="active"
            :data-index="index"
            :key="item.id"
            class="song-item-wrapper"
          >
            <div
              :class="['song-item', { play: musicStore.playSong.id === item.id }]"
              :style="{ margin }"
              @dblclick.stop="playSong(item)"
              @contextmenu="songListMenuRef?.openDropdown($event, data, item, index, type)"
            >
              <!-- 序号 -->
              <div class="num" @dblclick.stop>
                <n-text v-if="musicStore.playSong.id !== item.id" depth="3">
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
                <SvgIcon
                  :size="28"
                  name="Play"
                  class="play"
                  @click="player.addNextSong(item, true)"
                />
              </div>
              <!-- 标题 -->
              <div class="title">
                <!-- 封面 -->
                <n-image
                  v-if="!hiddenCover"
                  :key="item.cover"
                  :src="item.path ? item.cover : item.coverSize?.s || item.cover"
                  fallback-src="/images/song.jpg?assest"
                  class="cover"
                  preview-disabled
                  v-visible="(show: boolean) => localCover(show, item?.path, index)"
                  @load="coverLoaded"
                >
                  <template #placeholder>
                    <div class="cover-loading">
                      <img src="/images/song.jpg?assest" class="loading-img" alt="loading-img" />
                    </div>
                  </template>
                </n-image>
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
                      {{ item?.name || "未知曲目" }}
                    </n-ellipsis>
                    <!-- 音质 -->
                    <n-tag
                      v-if="item?.path && item?.quality"
                      :bordered="false"
                      :type="item.quality === 'Hi-Res' ? 'warning' : 'info'"
                      class="quality"
                      round
                    >
                      {{ item.quality }}
                    </n-tag>
                    <!-- 特权 -->
                    <n-tag v-if="item.originCoverType === 1" :bordered="false" type="primary" round>
                      原
                    </n-tag>
                    <n-tag v-if="item.free === 1" :bordered="false" type="error" round> VIP </n-tag>
                    <n-tag v-if="item.free === 4" :bordered="false" type="error" round> EP </n-tag>
                    <!-- 云盘 -->
                    <n-tag v-if="item?.pc" :bordered="false" class="cloud" type="info" round>
                      <template #icon>
                        <SvgIcon name="Cloud" />
                      </template>
                    </n-tag>
                    <!-- MV -->
                    <n-tag
                      v-if="item?.mv"
                      :bordered="false"
                      class="mv"
                      type="warning"
                      round
                      @click.stop="
                        router.push({
                          name: 'video',
                          query: { id: item.mv },
                        })
                      "
                    >
                      MV
                    </n-tag>
                  </div>
                  <!-- 歌手 -->
                  <div v-if="Array.isArray(item.artists)" class="artists text-hidden">
                    <n-text
                      v-for="ar in item.artists"
                      :key="ar.id"
                      class="ar"
                      @click="openJumpArtist(item.artists)"
                    >
                      {{ ar.name }}
                    </n-text>
                  </div>
                  <div v-else-if="type === 'radio'" class="artists">
                    <n-text class="ar"> 电台节目 </n-text>
                  </div>
                  <div v-else class="artists text-hidden" @click="openJumpArtist(item.artists)">
                    <n-text class="ar"> {{ item.artists || "未知艺术家" }} </n-text>
                  </div>
                  <!-- 别名 -->
                  <n-text v-if="item.alia" class="alia" depth="3">{{ item.alia }}</n-text>
                </div>
              </div>
              <!-- 专辑 -->
              <div v-if="type !== 'radio' && !hiddenAlbum" class="album text-hidden">
                <n-text
                  v-if="isObject(item.album)"
                  class="album-text"
                  @click="
                    router.push({
                      name: 'album',
                      query: { id: item.album?.id },
                    })
                  "
                >
                  {{ item.album?.name || "未知专辑" }}
                </n-text>
                <n-text v-else class="album-text">
                  {{ item.album || "未知专辑" }}
                </n-text>
              </div>
              <!-- 操作 -->
              <div v-if="type !== 'radio'" class="actions" @click.stop @dblclick.stop>
                <!-- 喜欢歌曲 -->
                <SvgIcon
                  :name="dataStore.isLikeSong(item.id) ? 'Favorite' : 'FavoriteBorder'"
                  :size="20"
                  @click.stop="toLikeSong(item, !dataStore.isLikeSong(item.id))"
                  @delclick.stop
                />
              </div>
              <!-- 更新日期 -->
              <n-text v-if="type === 'radio'" class="meta date" depth="3">
                {{ formatTimestamp(item.updateTime) }}
              </n-text>
              <!-- 播放量 -->
              <n-text v-if="type === 'radio'" class="meta" depth="3">
                {{ formatNumber(item.playCount) }}
              </n-text>
              <!-- 时长 -->
              <n-text class="meta" depth="3">{{ msToTime(item.duration) }}</n-text>
              <!-- 大小 -->
              <n-text v-if="item.path && item.size && !hiddenSize" class="meta size" depth="3">
                {{ item.size }}M
              </n-text>
            </div>
          </DynamicScrollerItem>
        </template>
        <template #after>
          <div class="list-after">
            <n-flex v-if="loadMore && loading">
              <n-spin size="small" />
              <n-text>{{ loadingText || "努力加载中" }}</n-text>
            </n-flex>
            <n-divider v-else dashed> 没有更多啦 ~ </n-divider>
          </div>
        </template>
      </DynamicScroller>
      <!-- 右键菜单 -->
      <SongListMenu ref="songListMenuRef" />
      <!-- 列表操作 -->
      <Teleport to="body">
        <Transition name="fade" mode="out-in">
          <n-float-button-group v-if="floatToolShow && !disableVirtualList" class="list-button">
            <Transition name="fade" mode="out-in">
              <n-float-button v-if="songListScrollTop > 100" width="42" @click="scrollTo(0)">
                <SvgIcon :size="22" name="Up" />
              </n-float-button>
            </Transition>
            <n-float-button v-if="hasPlaySong >= 0" width="42" @click="scrollTo(hasPlaySong)">
              <SvgIcon :size="22" name="Location" />
            </n-float-button>
          </n-float-button-group>
        </Transition>
      </Teleport>
    </div>
    <!-- 加载动画 -->
    <div v-else-if="loading" class="song-list loading">
      <n-skeleton :repeat="10" text />
    </div>
    <!-- 空列表 -->
    <n-empty v-else description="空空如也，怎么一首歌都没有啊" size="large" class="song-list" />
  </Transition>
</template>

<script setup lang="ts">
import type { SongType, SortType } from "@/types/main";
import type { DropdownOption } from "naive-ui";
import { useStatusStore, useMusicStore, useDataStore } from "@/stores";
import { isObject, entries, cloneDeep } from "lodash-es";
import { openJumpArtist } from "@/utils/modal";
import { formatNumber, isElectron } from "@/utils/helper";
import { sortOptions } from "@/utils/meta";
import { toLikeSong } from "@/utils/auth";
import { formatTimestamp, msToTime } from "@/utils/time";
import SongListMenu from "@/components/Menu/SongListMenu.vue";
import player from "@/utils/player";
import blob from "@/utils/blob";

const router = useRouter();
const dataStore = useDataStore();
const musicStore = useMusicStore();
const statusStore = useStatusStore();

interface Props {
  data: SongType[];
  type?: "song" | "radio";
  loadMore?: boolean;
  loading?: boolean;
  loadingText?: string;
  hiddenAlbum?: boolean;
  hiddenCover?: boolean;
  hiddenPadding?: boolean;
  hiddenSize?: boolean;
  margin?: string;
  height?: number;
  // 禁用排序
  disabledSort?: boolean;
  // 播放歌单 ID
  playListId?: number;
  // 禁用虚拟列表
  disableVirtualList?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: "song",
});

const emit = defineEmits<{
  // 触底
  reachBottom: [];
  // 滚动
  scroll: [e: Event];
}>();

// 右键菜单
const songListMenuRef = ref<InstanceType<typeof SongListMenu> | null>(null);

// 列表元素
const scrollerRef = ref<any | null>(null);
const songListRef = ref<HTMLElement | null>(null);
const songListScrollTop = ref<number>(0);

// 悬浮工具
const floatToolShow = ref<boolean>(false);

// 列表数据
const listData = computed<SongType[]>(() => {
  const data = cloneDeep(props.data);
  if (props.disabledSort) return data;
  // 排序
  switch (statusStore.listSort) {
    case "titleAZ":
      return data.sort((a, b) => a.name.localeCompare(b.name));
    case "titleZA":
      return data.sort((a, b) => b.name.localeCompare(a.name));
    case "arAZ":
      return data.sort((a, b) => {
        const artistA = Array.isArray(a.artists) ? a.artists[0].name : a.artists;
        const artistB = Array.isArray(b.artists) ? b.artists[0].name : b.artists;
        return artistA.localeCompare(artistB);
      });
    case "arZA":
      return data.sort((a, b) => {
        const artistA = Array.isArray(a.artists) ? a.artists[0].name : a.artists;
        const artistB = Array.isArray(b.artists) ? b.artists[0].name : b.artists;
        return artistB.localeCompare(artistA);
      });
    case "timeDown":
      return data.sort((a, b) => b.duration - a.duration);
    case "timeUp":
      return data.sort((a, b) => a.duration - b.duration);
    case "dateDown":
      return data.sort((a, b) => (b.updateTime || 0) - (a.updateTime || 0));
    case "dateUp":
      return data.sort((a, b) => (a.updateTime || 0) - (b.updateTime || 0));
    default:
      return data;
  }
});

// 列表元素高度
const { height: songListHeight, stop: stopHeight } = useElementSize(songListRef);

// 应该展示的列表高度
const songListShowHeight = computed(() => props.height ?? songListHeight.value);

// 列表是否具有播放歌曲
const hasPlaySong = computed(() => {
  return listData.value.findIndex((item) => item.id === musicStore.playSong.id);
});

// 列表排序菜单
const sortMenuOptions = computed<DropdownOption[]>(() =>
  entries(sortOptions).map(([key, { name, show, icon }]) => ({
    key,
    label: name,
    show: show === "all" ? true : show === props.type ? true : false,
    icon,
  })),
);

// 排序更改
const sortSelect = (key: SortType) => {
  statusStore.listSort = key;
  // 更新列表
  if (musicStore.playPlaylistId === props.playListId) {
    player.updatePlayList(listData.value, musicStore.playSong, props.playListId, {
      showTip: false,
      play: false,
      scrobble: false,
    });
  }
};

// 滚动至播放歌曲
const scrollTo = (index: number) => {
  if (index === 0) songListScrollTop.value = 0;
  scrollerRef.value?.scrollToItem(index);
};

// 封面加载完成
const coverLoaded = (e: Event) => {
  const target = e.target as HTMLElement | null;
  if (target && target.nodeType === Node.ELEMENT_NODE) {
    target.style.opacity = "1";
  }
};

// 加载本地歌曲封面
const localCover = async (show: boolean, path: string, index: number) => {
  if (!isElectron || !show || !path) return;
  if (listData.value[index].cover || listData.value[index].cover === "/images/song.jpg?assest")
    return;
  // 获取封面
  const coverData = await window.electron.ipcRenderer.invoke("get-music-cover", path);
  if (!coverData) return;
  const { data, format } = coverData;
  const blobURL = blob.createBlobURL(data, format, path);
  if (blobURL) listData.value[index].cover = blobURL;
};

// 播放列表歌曲
const playSong = (song: SongType) => {
  console.log(song);
  // 更改播放列表
  player.updatePlayList(listData.value, song, props.playListId);
};

// 列表滚动
const onScroll = (e: Event) => {
  const target = e.target as HTMLElement | null;
  // 获取高度
  if (target && target.scrollTop) {
    songListScrollTop.value = target.scrollTop;
  }
  // 是否触底
  const offset: number = 300;
  if (target && target.scrollTop + target.clientHeight >= target.scrollHeight - offset) {
    if (props.loadMore && !props.loading) emit("reachBottom");
  }
  // 滚动事件
  emit("scroll", e);
};

onDeactivated(() => {
  floatToolShow.value = false;
});

onActivated(() => {
  floatToolShow.value = true;
  if (props.disableVirtualList) stopHeight();
});
</script>

<style lang="scss" scoped>
.song-list {
  .scroller {
    padding-bottom: 14px;
    transition: height 0.3s;
    -webkit-overflow-scrolling: touch;
    &::-webkit-scrollbar {
      width: 5px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background-color: rgba(var(--primary), 0.28);
      border-radius: 12px;
    }
  }
  .song-item-wrapper {
    display: flex;
    flex-direction: column;
    min-height: 94px;
    padding-bottom: 12px;
  }
  .song-item {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    // min-height: 70px;
    height: 100%;
    flex: 1;
    border-radius: 12px;
    padding: 8px 12px;
    border: 2px solid rgba(var(--primary), 0.12);
    background-color: var(--surface-container-hex);
    transition:
      background-color 0.3s var(--n-bezier),
      border-color 0.3s var(--n-bezier);
    cursor: pointer;
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
      }
      .status,
      .play {
        position: absolute;
        opacity: 0;
        transform: scale(0.8);
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
    &.play {
      border-color: rgba(var(--primary), 0.58);
      background-color: rgba(var(--primary), 0.28);
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
  :deep(.vue-recycle-scroller__item-view) {
    &.hover {
      .song-item {
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
  }
  .list-after {
    display: flex;
    flex-direction: row;
    justify-content: center;
    margin: 20px 0;
    .n-spin-body {
      --n-size: 20px;
    }
    .n-divider {
      margin: 0;
      font-size: 14px;
      opacity: 0.6;
    }
  }
  &.no-padding {
    margin: 0 -24px;
    .song-item {
      margin: 0px 21px 0px 26px;
    }
  }
}
.list-button {
  position: fixed;
  right: 40px;
  bottom: 120px;
  .n-float-button {
    height: 42px;
    border: 1px solid rgba(var(--primary), 0.28);
  }
}
.loading {
  margin-top: 20px !important;
  :deep(.n-skeleton) {
    height: 72px;
    margin-bottom: 12px;
    border-radius: 12px;
  }
}
.n-empty {
  margin-top: 60px;
}
</style>
