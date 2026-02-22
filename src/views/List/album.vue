<!-- 专辑列表 -->
<template>
  <div class="album-list">
    <ListDetail
      :detail-data="detailData?.id === albumId ? detailData : null"
      :list-data="detailData?.id === albumId ? listData : []"
      :loading="showLoading"
      :list-scrolling="listScrolling"
      :search-value="searchValue"
      :config="listConfig"
      :play-button-text="playButtonText"
      :more-options="moreOptions"
      @update:search-value="handleSearchUpdate"
      @play-all="playAllSongs"
      @tab-change="handleTabChange"
    >
      <template #action-buttons>
        <n-button
          :focusable="false"
          strong
          secondary
          round
          @click="toLikeAlbum(albumId, !isLikeAlbum)"
        >
          <template #icon>
            <SvgIcon :name="isLikeAlbum ? 'Favorite' : 'FavoriteBorder'" />
          </template>
          {{ isLikeAlbum ? "取消收藏" : "收藏专辑" }}
        </n-button>
      </template>
    </ListDetail>
    <Transition name="fade" mode="out-in">
      <!-- 歌曲列表 -->
      <template v-if="currentTab === 'songs'">
        <SongList
          v-if="!searchValue || searchData?.length"
          :data="detailData?.id === albumId ? displayData : []"
          :loading="loading"
          :height="songListHeight"
          :doubleClickAction="searchData?.length ? 'add' : 'all'"
          hidden-album
          @scroll="handleListScroll"
        />
        <n-empty
          v-else
          :description="`搜不到关于 ${searchValue} 的任何歌曲呀`"
          style="margin-top: 60px"
          size="large"
        >
          <template #icon>
            <SvgIcon name="SearchOff" />
          </template>
        </n-empty>
      </template>
      <!-- 评论 -->
      <template v-else>
        <ListComment :id="albumId" :type="3" :height="songListHeight" />
      </template>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { DropdownOption } from "naive-ui";
import { songDetail } from "@/api/song";
import { albumDetail } from "@/api/album";
import { formatCoverList, formatSongsList } from "@/utils/format";
import { renderIcon, copyData, getShareUrl } from "@/utils/helper";
import { openBatchList } from "@/utils/modal";
import { useDataStore } from "@/stores";
import { toLikeAlbum } from "@/utils/auth";
import { useListDetail } from "@/composables/List/useListDetail";
import { useListSearch } from "@/composables/List/useListSearch";
import { useListScroll } from "@/composables/List/useListScroll";
import { useListActions } from "@/composables/List/useListActions";
import { useListDataCache, type ListCacheData } from "@/composables/List/useListDataCache";
import ListComment from "@/components/List/ListComment.vue";

const router = useRouter();
const dataStore = useDataStore();

const { saveCache, loadCache, checkNeedsUpdate } = useListDataCache();

// 是否激活
const isActivated = ref<boolean>(false);

const {
  detailData,
  listData,
  loading,
  getSongListHeight,
  resetData,
  setDetailData,
  setListData,
  setLoading,
} = useListDetail();
const { searchValue, searchData, displayData, clearSearch, performSearch } =
  useListSearch(listData);
const { listScrolling, handleListScroll, resetScroll } = useListScroll();
const { playAllSongs: playAllSongsAction } = useListActions();

// 专辑 ID
const oldAlbumId = ref<number>(0);
const albumId = computed<number>(() => Number(router.currentRoute.value.query.id as string));

// 当前正在请求的专辑 ID，用于防止竞态条件
const currentRequestId = ref<number>(0);

// 是否处于收藏专辑
const isLikeAlbum = computed(() =>
  dataStore.userLikeData.albums.some((album) => album.id === detailData.value?.id),
);

// 列表高度
const songListHeight = computed(() => getSongListHeight(listScrolling.value));

// 当前 tab
const currentTab = ref<"songs" | "comments">("songs");

// 列表配置
const listConfig = {
  titleType: "ellipsis" as const,
  showCoverMask: false,
  showPlayCount: false,
  showArtist: true,
  showCreator: false,
  showCount: true,
};

// 是否显示加载状态
const showLoading = computed(() => listData.value.length === 0 && loading.value);

// 播放按钮文本
const playButtonText = computed(() => {
  if (showLoading.value) {
    return "加载中...";
  }
  return "播放";
});

// 更多操作
const moreOptions = computed<DropdownOption[]>(() => [
  {
    label: "刷新缓存",
    key: "refresh",
    props: {
      onClick: () => getAlbumDetail(albumId.value, true),
    },
    icon: renderIcon("Refresh"),
  },
  {
    label: "批量操作",
    key: "batch",
    props: {
      onClick: () => {
        openBatchList(displayData.value, false, isLikeAlbum.value ? albumId.value : undefined);
      },
    },
    icon: renderIcon("Batch"),
  },
  {
    label: "复制分享链接",
    key: "copy",
    props: {
      onClick: () => copyData(getShareUrl("album", albumId.value), "已复制分享链接到剪贴板"),
    },
    icon: renderIcon("Share"),
  },
  {
    label: "打开源页面",
    key: "open",
    props: {
      onClick: () => {
        window.open(`https://music.163.com/#/album?id=${albumId.value}`);
      },
    },
    icon: renderIcon("Link"),
  },
]);

// 获取专辑基础信息
const getAlbumDetail = async (id: number, refresh: boolean = false) => {
  if (!id) return;
  // 设置当前请求的专辑 ID，用于防止竞态条件
  currentRequestId.value = id;
  setLoading(true);
  clearSearch();

  // 1. 尝试读取缓存
  if (!refresh) {
    const cached = await loadCache("album", id);
    if (cached) {
      setDetailData(cached.detail);
      setListData(cached.songs);
      setLoading(false);

      // 后台检查更新
      backgroundCheck(id, cached);
      return;
    }
  }

  if (!refresh && detailData.value?.id !== id) {
    resetData(true);
  }
  // 获取专辑详情
  const detail = await albumDetail(id);
  // 检查是否仍然是当前请求的专辑
  if (currentRequestId.value !== id) return;
  setDetailData(formatCoverList(detail.album)[0]);
  // 获取专辑歌曲
  const ids: number[] = detail.songs.map((song: any) => song.id as number);
  const result = await songDetail(ids);
  // 再次检查是否仍然是当前请求的专辑
  if (currentRequestId.value !== id) return;
  const songs = formatSongsList(result.songs);
  setListData(songs);

  // 保存缓存
  saveCache("album", id, detailData.value!, songs);

  setLoading(false);
};

// 后台检查更新
const backgroundCheck = async (id: number, cached: ListCacheData) => {
  try {
    const detail = await albumDetail(id);
    // 检查是否仍然是当前请求的专辑
    if (currentRequestId.value !== id) return;

    const latestDetail = formatCoverList(detail.album)[0];

    if (checkNeedsUpdate(cached, latestDetail)) {
      console.log("Album cache expired, refreshing...");
      getAlbumDetail(id, true);
    }
  } catch (e) {
    console.error("Album background check failed", e);
  }
};

// 处理搜索更新
const handleSearchUpdate = (val: string) => {
  searchValue.value = val;
  performSearch(val);
};

// 处理 tab 切换
const handleTabChange = (value: "songs" | "comments") => {
  currentTab.value = value;
};

// 播放全部歌曲
const playAllSongs = useDebounceFn(() => {
  if (!detailData.value || !displayData.value?.length) return;
  playAllSongsAction(displayData.value);
}, 300);

onBeforeRouteUpdate((to) => {
  clearSearch();
  const id = Number(to.query.id as string);
  if (id) getAlbumDetail(id);
});

onActivated(() => {
  if (!isActivated.value) {
    isActivated.value = true;
  } else {
    oldAlbumId.value = albumId.value;
    getAlbumDetail(albumId.value, false);
  }
});

onDeactivated(() => {
  resetScroll();
});

onMounted(() => {
  getAlbumDetail(albumId.value);
});
</script>
