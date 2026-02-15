<!-- 流媒体歌单详情 -->
<template>
  <div class="playlist-list">
    <ListDetail
      :detail-data="detailData"
      :list-data="listData"
      :loading="showLoading"
      :list-scrolling="listScrolling"
      :search-value="searchValue"
      :config="listConfig"
      :play-button-text="playButtonText"
      :more-options="moreOptions"
      hide-comment-tab
      @update:search-value="handleSearchUpdate"
      @play-all="playAllSongs"
    />
    <Transition name="fade" mode="out-in">
      <SongList
        v-if="!searchValue || searchData?.length"
        :data="displayData"
        :loading="loading"
        :height="songListHeight"
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
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { DropdownOption } from "naive-ui";
import type { CoverType } from "@/types/main";
import { useStreamingStore } from "@/stores";
import { renderIcon } from "@/utils/helper";
import { useListDetail } from "@/composables/List/useListDetail";
import { useListSearch } from "@/composables/List/useListSearch";
import { useListScroll } from "@/composables/List/useListScroll";
import { useListActions } from "@/composables/List/useListActions";

const router = useRouter();
const streamingStore = useStreamingStore();

const { detailData, listData, loading, getSongListHeight, setDetailData, setListData, setLoading } =
  useListDetail();
const { searchValue, searchData, displayData, clearSearch, performSearch } =
  useListSearch(listData);
const { listScrolling, handleListScroll, resetScroll } = useListScroll();
const { playAllSongs: playAllSongsAction } = useListActions();

// 歌单 ID
const playlistId = computed<string>(() => router.currentRoute.value.query.id as string);

// 列表高度
const songListHeight = computed(() => getSongListHeight(listScrolling.value));

// 列表配置
const listConfig = {
  titleType: "normal" as const,
  showCoverMask: false,
  showPlayCount: false,
  showArtist: false,
  showCreator: false,
  showCount: true,
  searchAlign: "center" as const,
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
    label: "刷新",
    key: "refresh",
    props: {
      onClick: () => getPlaylistDetail(playlistId.value),
    },
    icon: renderIcon("Refresh"),
  },
]);

// 获取歌单详情
const getPlaylistDetail = async (id: string) => {
  if (!id) return;

  if (!streamingStore.isConnected.value) {
    window.$message.error("流媒体服务器未连接");
    return;
  }

  setLoading(true);
  clearSearch();
  resetScroll();

  try {
    // 从缓存的歌单列表中查找歌单信息
    const playlist = streamingStore.playlists.value.find((p) => p.id === id);
    if (playlist) {
      setDetailData({
        id: Number(playlist.id) || 0,
        name: playlist.name,
        cover: playlist.cover || "/images/album.jpg?asset",
        description: playlist.description,
        count: playlist.songCount || 0,
      } as CoverType);
    }

    // 获取歌单歌曲
    const songs = await streamingStore.fetchPlaylistSongs(id);
    setListData(songs);

    // 如果之前没有获取到歌单信息，更新歌曲数量
    if (detailData.value && detailData.value.count === 0) {
      detailData.value.count = songs.length;
    }
  } catch (error) {
    console.error("Failed to fetch streaming playlist:", error);
    window.$message.error("获取歌单详情失败");
  } finally {
    setLoading(false);
  }
};

// 处理搜索更新
const handleSearchUpdate = (val: string) => {
  searchValue.value = val;
  performSearch(val);
};

// 播放全部歌曲
const playAllSongs = useDebounceFn(() => {
  if (!detailData.value || !displayData.value?.length) return;
  playAllSongsAction(displayData.value);
}, 300);

onBeforeRouteUpdate((to) => {
  const id = to.query.id as string;
  if (id) {
    getPlaylistDetail(id);
  }
});

onMounted(() => {
  if (playlistId.value) {
    getPlaylistDetail(playlistId.value);
  }
});
</script>

<style lang="scss" scoped>
.playlist-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
</style>
