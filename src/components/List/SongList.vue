<!-- 歌曲列表 - 虚拟列表 -->
<!-- vue-virt-list https://github.com/keno-lee/vue-virt-list -->
<template>
  <Transition name="fade" mode="out-in">
    <div
      v-if="!isEmpty(listData)"
      ref="songListRef"
      :class="[
        'song-list',
        {
          'hidden-scrollbar': hiddenScrollbar,
        },
      ]"
    >
      <Transition name="fade" mode="out-in">
        <VirtList
          ref="listRef"
          :key="listData?.[0]?.id"
          :list="listData"
          :minSize="94"
          :buffer="2"
          :offset="offset"
          :style="{ height: height === 'auto' ? 'auto' : `${height || songListHeight}px` }"
          itemKey="id"
          @scroll="onScroll"
          @toBottom="onToBottom"
        >
          <!-- 悬浮顶栏 -->
          <template #stickyHeader>
            <div class="list-header song-card">
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
          <!-- 主内容 -->
          <template #default="{ itemData, index }">
            <SongCard
              :song="itemData"
              :index="index"
              :hiddenCover="hiddenCover"
              :hiddenAlbum="hiddenAlbum"
              :hiddenSize="hiddenSize"
              @dblclick.stop="player.updatePlayList(listData, itemData, playListId)"
              @contextmenu.stop="
                songListMenuRef?.openDropdown($event, listData, itemData, index, type, playListId)
              "
            />
          </template>
          <!-- 加载更多 -->
          <template #footer>
            <div class="load-more">
              <n-flex v-if="loadMore && loading">
                <n-spin size="small" />
                <n-text>{{ loadingText || "努力加载中" }}</n-text>
              </n-flex>
              <n-divider v-else dashed> 没有更多啦 ~ </n-divider>
            </div>
          </template>
        </VirtList>
      </Transition>
      <!-- 右键菜单 -->
      <SongListMenu ref="songListMenuRef" @removeSong="removeSong" />
      <!-- 列表操作 -->
      <Teleport to="body">
        <Transition name="fade" mode="out-in">
          <n-float-button-group v-if="floatToolShow" class="list-menu">
            <Transition name="fade" mode="out-in">
              <n-float-button v-if="scrollTop > 100" width="42" @click="listRef?.scrollToTop()">
                <SvgIcon :size="22" name="Up" />
              </n-float-button>
            </Transition>
            <n-float-button
              v-if="hasPlaySong >= 0"
              width="42"
              @click="listRef?.scrollToIndex(hasPlaySong)"
            >
              <SvgIcon :size="22" name="Location" />
            </n-float-button>
          </n-float-button-group>
        </Transition>
      </Teleport>
    </div>
    <!-- 列表加载 - 骨架屏 -->
    <div v-else-if="loading" class="song-list loading">
      <n-skeleton :repeat="10" text />
    </div>
    <!-- 空列表 -->
    <n-empty v-else description="列表光秃秃的，啥都没有哦" size="large" class="song-list empty" />
  </Transition>
</template>

<script setup lang="ts">
import type { DropdownOption } from "naive-ui";
import type { SongType, SortType } from "@/types/main";
import { useMusicStore, useStatusStore } from "@/stores";
import { VirtList } from "vue-virt-list";
import { cloneDeep, entries, isEmpty } from "lodash-es";
import { sortOptions } from "@/utils/meta";
import { renderIcon } from "@/utils/helper";
import SongListMenu from "@/components/Menu/SongListMenu.vue";
import player from "@/utils/player";

const props = withDefaults(
  defineProps<{
    // 列表数据
    data: SongType[];
    // 列表类型
    type?: "song" | "radio";
    // 列表高度
    height?: number | "auto"; // px
    // 是否加载
    loading?: boolean;
    // 加载更多
    loadMore?: boolean;
    loadingText?: string;
    // 隐藏元素
    hiddenAlbum?: boolean;
    hiddenCover?: boolean;
    hiddenSize?: boolean;
    // 隐藏滚动条
    hiddenScrollbar?: boolean;
    // 禁用排序
    disabledSort?: boolean;
    // 播放歌单 ID
    playListId?: number;
  }>(),
  {
    type: "song",
    loadingText: "努力加载中...",
    playListId: 0,
  },
);

const emit = defineEmits<{
  // 触底
  reachBottom: [e: Event];
  // 滚动
  scroll: [e: Event];
  // 删除歌曲
  removeSong: [id: number[]];
}>();

const musicStore = useMusicStore();
const statusStore = useStatusStore();

// 列表状态
const offset = ref<number>(0);
const scrollTop = ref<number>(0);

// 列表元素
const listRef = ref<InstanceType<typeof VirtList> | null>(null);
const songListRef = ref<HTMLElement | null>(null);

// 悬浮工具
const floatToolShow = ref<boolean>(true);

// 右键菜单
const songListMenuRef = ref<InstanceType<typeof SongListMenu> | null>(null);

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

// 列表是否具有播放歌曲
const hasPlaySong = computed(() => {
  return listData.value.findIndex((item) => item.id === musicStore.playSong.id);
});

// 列表元素高度
const { height: songListHeight, stop: stopCalcHeight } = useElementSize(songListRef);

// 列表排序菜单
const sortMenuOptions = computed<DropdownOption[]>(() =>
  entries(sortOptions).map(([key, { name, show, icon }]) => ({
    key,
    label: name,
    show: show === "all" ? true : show === props.type ? true : false,
    icon: renderIcon(icon),
  })),
);

// 列表滚动
const onScroll = (e: Event) => {
  emit("scroll", e);
  scrollTop.value = (e.target as HTMLElement).scrollTop;
};

// 列表触底
const onToBottom = (e: Event) => {
  if (props.loading) return;
  emit("reachBottom", e);
};

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
  // 滚动到顶部
  listRef.value?.scrollToIndex(hasPlaySong.value || 0);
};

// 删除指定索引
const removeSong = (id: number[]) => emit("removeSong", id);

// keep-alive 处理
onBeforeRouteLeave(() => {
  offset.value = listRef.value?.getOffset() || 0;
  floatToolShow.value = false;
});

onActivated(() => {
  floatToolShow.value = true;
  if (props.height === "auto") stopCalcHeight();
  if (offset.value > 0) listRef.value?.scrollToOffset(offset.value);
});

onBeforeUnmount(() => {
  stopCalcHeight();
  floatToolShow.value = false;
});
</script>

<style lang="scss" scoped>
.song-list {
  height: 100%;
  border-radius: 12px 0 0 12px;
  overflow: hidden;
  .song-card {
    padding-bottom: 12px;
    // padding-right: 4px;
  }
  // 悬浮顶栏
  .list-header {
    width: 100%;
    height: 40px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    // margin-right: 4px;
    border: 1px solid transparent;
    background-color: var(--background-hex);
    .n-text {
      opacity: 0.6;
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
    }
    .title {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
      padding: 4px 20px 4px 0;
      cursor: pointer;
      .sort {
        margin-left: 6px;
        &::after {
          content: " )";
        }
        &::before {
          content: "( ";
        }
      }
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
    .album {
      flex: 1;
      padding-right: 20px;
    }
    .actions {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
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
  }
  // 滚动条
  .virt-list__client {
    transition:
      height 0.3s,
      width 0.3s,
      opacity 0.3s;
    -webkit-overflow-scrolling: touch;
    &::-webkit-scrollbar {
      width: 6px;
      background-color: transparent;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background-color: rgba(var(--primary), 0.28);
      border-radius: 12px;
    }
  }
  &.hidden-scrollbar {
    .list-header {
      padding: 8px 12px;
    }
    .song-card {
      padding-right: 0;
    }
    .virt-list__client {
      &::-webkit-scrollbar {
        display: none;
      }
    }
  }
  // 加载更多
  .load-more {
    display: flex;
    flex-direction: row;
    justify-content: center;
    margin: 20px 0 40px;
    .n-spin-body {
      --n-size: 20px;
    }
    .n-divider {
      margin: 0;
      font-size: 14px;
      opacity: 0.6;
    }
  }
  // 加载
  &.loading {
    margin-top: 20px;
    :deep(.n-skeleton) {
      height: 72px;
      margin-bottom: 12px;
      border-radius: 12px;
    }
  }
  // 空列表
  &.empty {
    margin-top: 60px;
  }
}
.list-menu {
  position: fixed;
  right: 40px;
  bottom: 120px;
  .n-float-button {
    height: 42px;
    border: 1px solid rgba(var(--primary), 0.28);
  }
}
</style>
