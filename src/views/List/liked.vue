<!-- 我喜欢的音乐 -->
<template>
  <div class="liked-list">
    <ListDetail
      :detail-data="detailData"
      :list-data="listData"
      :loading="showLoading"
      :list-scrolling="listScrolling"
      :search-value="searchValue"
      :config="listConfig"
      :play-button-text="playButtonText"
      :more-options="moreOptions"
      title-text="我喜欢的音乐"
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
        :playListId="playlistId"
        :draggable="canDragSort"
        :doubleClickAction="searchData?.length ? 'add' : 'all'"
        @scroll="handleListScroll"
        @removeSong="removeSong"
        @reorder="handleReorder"
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
import { SongType } from "@/types/main";
import { songDetail } from "@/api/song";
import { playlistDetail, playlistAllSongs, songOrderUpdate } from "@/api/playlist";
import { formatCoverList, formatSongsList } from "@/utils/format";
import { renderIcon, copyData, getShareUrl } from "@/utils/helper";
import { isObject } from "lodash-es";
import { useDataStore, useStatusStore } from "@/stores";
import { openBatchList, openUpdatePlaylist } from "@/utils/modal";
import { updateUserLikePlaylist } from "@/utils/auth";
import { useListDetail } from "@/composables/List/useListDetail";
import { useListSearch } from "@/composables/List/useListSearch";
import { useListScroll } from "@/composables/List/useListScroll";
import { useListActions } from "@/composables/List/useListActions";

const dataStore = useDataStore();
const statusStore = useStatusStore();

// 是否激活
const isActivated = ref<boolean>(false);

const {
  detailData,
  listData,
  loading,
  getSongListHeight,
  setDetailData,
  setListData,
  appendListData,
  setLoading,
} = useListDetail();
const { searchValue, searchData, displayData, clearSearch, performSearch } =
  useListSearch(listData);
const { listScrolling, handleListScroll, resetScroll } = useListScroll();
const { playAllSongs: playAllSongsAction } = useListActions();

// 歌单 ID
const playlistId = computed<number>(() => Number(dataStore.userLikeData.playlists?.[0]?.id) || 0);

// 是否可拖拽排序（默认排序 + 非搜索模式）
const canDragSort = computed(() => {
  return !searchValue.value && statusStore.listSortField === "default";
});

// 当前正在请求的歌单 ID，用于防止竞态条件
const currentRequestId = ref<number>(0);

// 列表高度
const songListHeight = computed(() => getSongListHeight(listScrolling.value));

// 列表配置
const listConfig = {
  titleType: "normal" as const,
  showCoverMask: true,
  showPlayCount: true,
  showArtist: false,
  showCreator: true,
  showCount: false,
  searchAlign: "center" as const,
};

// 是否显示加载状态
const showLoading = computed(() => listData.value.length === 0 && loading.value);

// 播放按钮文本
const playButtonText = computed(() => {
  if (showLoading.value) {
    const loaded =
      listData.value.length === (detailData.value?.count || 0) ? 0 : listData.value.length;
    return `正在更新... (${loaded}/${detailData.value?.count || 0})`;
  }
  return "播放";
});

// 更多操作
const moreOptions = computed<DropdownOption[]>(() => [
  {
    label: "刷新缓存",
    key: "refresh",
    props: {
      onClick: () => loadPlaylistData(playlistId.value, true),
    },
    icon: renderIcon("Refresh"),
  },
  {
    label: "编辑歌单",
    key: "edit",
    props: {
      onClick: () => {
        if (!detailData.value || !playlistId.value) return;
        openUpdatePlaylist(playlistId.value, detailData.value, () =>
          loadPlaylistData(playlistId.value, false),
        );
      },
    },
    icon: renderIcon("EditNote"),
  },
  {
    label: "批量操作",
    key: "batch",
    props: {
      onClick: () => openBatchList(displayData.value, false, playlistId.value),
    },
    icon: renderIcon("Batch"),
  },
  {
    label: "复制分享链接",
    key: "copy",
    props: {
      onClick: () => copyData(getShareUrl("playlist", playlistId.value), "已复制分享链接到剪贴板"),
    },
    icon: renderIcon("Share"),
  },
  {
    label: "打开源页面",
    key: "open",
    props: {
      onClick: () => {
        window.open(`https://music.163.com/#/playlist?id=${playlistId.value}`);
      },
    },
    icon: renderIcon("Link"),
  },
]);

/**
 * 加载歌单数据
 * @param id 歌单 ID
 * @param forceRefresh 是否强制刷新（忽略缓存）
 */
const loadPlaylistData = async (id: number, forceRefresh: boolean = false) => {
  if (!id) return;
  // 设置当前请求 ID，防止竞态条件
  currentRequestId.value = id;
  setLoading(true);
  clearSearch();
  if (!forceRefresh) {
    loadLikedCache();
  } else {
    setDetailData(null);
    setListData([]);
    resetScroll();
  }
  try {
    const detail = await playlistDetail(id);
    if (currentRequestId.value !== id) return;
    // 更新歌单详情
    setDetailData(formatCoverList(detail.playlist)[0]);
    // 获取全部 ID 顺序
    const serverIds: number[] = detail.privileges?.map((p: any) => p.id) || [];
    const trackCount = detail.playlist?.trackCount || 0;

    // 如果 privileges 数量少于 trackCount，说明数据不完整，需要全量获取
    if (serverIds.length < trackCount && trackCount > 0) {
      console.log(`🔄 Liked songs incomplete (${serverIds.length}/${trackCount}), fetching all...`);
      await fetchAllSongs(id, trackCount);
    } else {
      if (serverIds.length === 0) {
        setLoading(false);
        return;
      }
      // 同步歌曲列表
      await syncSongList(serverIds, id);
    }

    // 更新缓存
    if (currentRequestId.value === id && detailData.value) {
      dataStore.setLikeSongsList(detailData.value, listData.value);
    }
  } catch (error) {
    console.error("Failed to load playlist data:", error);
  } finally {
    if (currentRequestId.value === id) {
      setLoading(false);
    }
  }
};

/**
 * 全量获取歌曲列表
 * 当 privileges 数据不完整时调用
 */
const fetchAllSongs = async (id: number, total: number) => {
  const limit = 500;
  let offset = 0;
  const allSongs: SongType[] = [];

  while (offset < total) {
    if (currentRequestId.value !== id) return;
    try {
      const result = await playlistAllSongs(id, limit, offset);
      if (currentRequestId.value !== id) return;
      const songs = formatSongsList(result.songs);
      allSongs.push(...songs);
      // 实时更新列表展示
      if (offset === 0) {
        setListData(songs);
      } else {
        appendListData(songs);
      }
      offset += limit;
    } catch (error) {
      console.error("Failed to fetch all songs:", error);
      break;
    }
  }

  if (currentRequestId.value !== id) return;
  // 确保最终列表完整性
  setListData(allSongs);
  console.log(`✅ Fetched all ${allSongs.length} liked songs`);
};

/**
 * 加载缓存
 */
const loadLikedCache = () => {
  if (isObject(dataStore.likeSongsList.detail)) {
    setDetailData(dataStore.likeSongsList.detail);
  }
  if (dataStore.likeSongsList.data.length) {
    setListData(dataStore.likeSongsList.data);
  }
};

/**
 * 同步歌曲列表
 * 根据服务器返回的 ID 顺序，增量获取缺失的歌曲详情
 * @param serverIds 服务器返回的 ID 列表（官方顺序）
 * @param requestId 当前请求 ID
 */
const syncSongList = async (serverIds: number[], requestId: number) => {
  // 当前缓存的歌曲 Map
  const cachedMap = new Map(listData.value.map((s) => [s.id, s]));
  // 找出缺失的 ID
  const missingIds = serverIds.filter((id) => !cachedMap.has(id));
  // 获取缺失的歌曲详情
  if (missingIds.length > 0) {
    console.log(`🔄 Syncing liked songs: found ${missingIds.length} missing songs`);
    const limit = 500;
    let offset = 0;
    while (offset < missingIds.length) {
      if (currentRequestId.value !== requestId) return;
      const chunk = missingIds.slice(offset, offset + limit);
      try {
        const result = await songDetail(chunk);
        const songs = formatSongsList(result.songs);
        songs.forEach((song) => cachedMap.set(song.id, song));
      } catch (error) {
        console.error("Failed to fetch song details:", error);
      }
      offset += limit;
    }
  }
  // 重建列表
  const newList = serverIds.map((id) => cachedMap.get(id)).filter((s): s is SongType => !!s);
  if (currentRequestId.value !== requestId) return;
  setListData(newList);
  // 更新详情
  const detail = await playlistDetail(playlistId.value);
  if (currentRequestId.value === requestId) {
    setDetailData(formatCoverList(detail.playlist)[0]);
  }
  console.log("✅ 我喜欢的音乐已同步到服务器顺序");
};

/**
 * 检查缓存是否需要更新
 * 通过比较 userLikeData.songs 的数量与缓存数量来判断
 */
const checkNeedsUpdate = (): boolean => {
  const likedCount = dataStore.userLikeData.songs.length;
  const cachedCount = dataStore.likeSongsList.data.length;
  if (likedCount !== cachedCount) {
    console.log(`🔄 我喜欢的音乐缓存需要更新: count changed (${cachedCount} -> ${likedCount})`);
    return true;
  }
  console.log("✅ 我喜欢的音乐缓存已更新");
  return false;
};

// 处理搜索更新
const handleSearchUpdate = (val: string) => {
  searchValue.value = val;
  performSearch(val);
};

// 播放全部歌曲
const playAllSongs = useDebounceFn(() => {
  if (!detailData.value || !displayData.value?.length) return;
  playAllSongsAction(displayData.value, playlistId.value);
}, 300);

// 删除指定索引歌曲
const removeSong = (ids: number[]) => {
  if (!listData.value) return;
  setListData(listData.value.filter((song) => !ids.includes(song.id)));
};

// 拖拽重排序
const handleReorder = async (fromIndex: number, toIndex: number) => {
  if (fromIndex === toIndex) return;

  // 乐观更新视图
  const newList = [...listData.value];
  const [moved] = newList.splice(fromIndex, 1);
  newList.splice(toIndex, 0, moved);
  setListData(newList);

  // 持久化到服务端
  try {
    const ids = newList.map((s) => s.id);
    const result = await songOrderUpdate(playlistId.value, ids);
    if (result.code !== 200) {
      window.$message.error("保存排序失败");
      loadPlaylistData(playlistId.value, true);
    } else {
      // 更新缓存
      if (detailData.value) {
        dataStore.setLikeSongsList(detailData.value, newList);
      }
    }
  } catch (error) {
    console.error("Failed to update song order:", error);
    window.$message.error("保存排序失败，请重试");
    loadPlaylistData(playlistId.value, true);
  }
};

onActivated(async () => {
  if (!isActivated.value) {
    isActivated.value = true;
  } else {
    // 检查是否需要更新缓存
    if (checkNeedsUpdate()) {
      await loadPlaylistData(playlistId.value, false);
    }
  }
});

onMounted(async () => {
  // 首先确保用户歌单数据已加载
  if (!dataStore.userLikeData.playlists?.length) {
    try {
      await updateUserLikePlaylist();
    } catch (error) {
      console.error("Failed to update user playlist data:", error);
      setLoading(false);
      return;
    }
  }

  // 获取我喜欢的音乐歌单 ID
  const likedPlaylistId = dataStore.userLikeData.playlists?.[0]?.id;
  if (likedPlaylistId) {
    loadPlaylistData(Number(likedPlaylistId));
  } else {
    // 如果没有找到我喜欢的音乐歌单，尝试从缓存获取
    const data: any = await dataStore.getUserLikePlaylist();
    const id = data?.detail?.id;
    if (id) {
      loadPlaylistData(id);
    } else {
      setLoading(false);
      window.$message.error("无法获取我喜欢的音乐歌单");
    }
  }
});
</script>
