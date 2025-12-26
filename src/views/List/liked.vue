<!-- 歌单列表 -->
<template>
  <div class="liked-list">
    <ListDetail
      :detail-data="detailData"
      :list-data="listData"
      :loading="showLoading"
      :list-scrolling="listScrolling"
      :search-value="searchValue"
      :config="listConfig"
      :title-text="t('menu.myLikeSongs')"
      :play-button-text="playButtonText"
      :more-options="moreOptions"
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
        :doubleClickAction="searchData?.length ? 'add' : 'all'"
        @scroll="handleListScroll"
        @removeSong="removeSong"
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
import type { DropdownOption, MessageReactive } from "naive-ui";
import { SongType } from "@/types/main";
import { songDetail } from "@/api/song";
import { playlistDetail, playlistAllSongs } from "@/api/playlist";
import { formatCoverList, formatSongsList } from "@/utils/format";
import { renderIcon, copyData } from "@/utils/helper";
import { isObject, uniqBy } from "lodash-es";
import { useDataStore } from "@/stores";
import { openBatchList, openUpdatePlaylist } from "@/utils/modal";
import { isLogin, updateUserLikePlaylist } from "@/utils/auth";
import { useListDetail } from "@/composables/List/useListDetail";
import { useListSearch } from "@/composables/List/useListSearch";
import { useListScroll } from "@/composables/List/useListScroll";
import { useListActions } from "@/composables/List/useListActions";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const router = useRouter();
const dataStore = useDataStore();

// 是否激活
const isActivated = ref<boolean>(false);

const { detailData, listData, loading, getSongListHeight, setDetailData, setListData, setLoading } =
  useListDetail();
const { searchValue, searchData, displayData, clearSearch, performSearch } =
  useListSearch(listData);
const { listScrolling, handleListScroll, resetScroll } = useListScroll();
const { playAllSongs: playAllSongsAction } = useListActions();

// 歌单 ID
const playlistId = computed<number>(() => dataStore.userLikeData.playlists?.[0]?.id);

// 当前正在请求的歌单 ID，用于防止竞态条件
const currentRequestId = ref<number>(0);

// 加载提示
const loadingMsg = ref<MessageReactive | null>(null);

// 列表高度
const songListHeight = computed(() => getSongListHeight(listScrolling.value));

// 是否处于我喜欢页面
const isLikedPage = computed(() => router.currentRoute.value.name === "like-songs");

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
    return `${t("general.list.loading")} (${loaded}/${detailData.value?.count || 0})`;
  }
  return t("video.player.play");
});

// 更多操作
const moreOptions = computed<DropdownOption[]>(() => [
  {
    label: t("modal.titles.update"),
    key: "edit",
    props: {
      onClick: () => {
        if (!detailData.value || !playlistId.value) return;
        openUpdatePlaylist(playlistId.value, detailData.value, () =>
          getPlaylistDetail(playlistId.value, { getList: false, refresh: false }),
        );
      },
    },
    icon: renderIcon("EditNote"),
  },
  {
    label: t("modal.titles.batch"),
    key: "batch",
    props: {
      onClick: () => openBatchList(displayData.value, false, playlistId.value),
    },
    icon: renderIcon("Batch"),
  },
  {
    label: t("general.copyShareLink"),
    key: "copy",
    props: {
      onClick: () =>
        copyData(
          `https://music.163.com/#/playlist?id=${playlistId.value}`,
          t("general.copyShareLinkSuccess"),
        ),
    },
    icon: renderIcon("Share"),
  },
  {
    label: t("general.openSource"),
    key: "open",
    props: {
      onClick: () => {
        window.open(`https://music.163.com/#/playlist?id=${playlistId.value}`);
      },
    },
    icon: renderIcon("Link"),
  },
]);

// 获取歌单基础信息
const getPlaylistDetail = async (
  id: number,
  options: {
    getList: boolean;
    refresh: boolean;
  } = {
    getList: true,
    refresh: false,
  },
) => {
  if (!id) return;
  // 设置当前请求的歌单 ID，用于防止竞态条件
  currentRequestId.value = id;
  // 设置加载状态
  setLoading(true);
  const { getList, refresh } = options;
  // 清空数据
  clearSearch();
  if (!refresh) resetPlaylistData(getList);
  // 获取歌单内容
  getPlaylistData(id, getList, refresh);
};

// 重置歌单数据
const resetPlaylistData = (getList: boolean) => {
  setDetailData(null);
  if (getList) {
    setListData([]);
    resetScroll();
  }
};

// 获取歌单
const getPlaylistData = async (id: number, getList: boolean, refresh: boolean) => {
  // 加载缓存
  loadLikedCache();
  // 获取歌单详情
  const detail = await playlistDetail(id);
  // 检查是否仍然是当前请求的歌单
  if (currentRequestId.value !== id) return;
  setDetailData(formatCoverList(detail.playlist)[0]);
  // 不需要获取列表或无歌曲
  if (!getList || detailData.value?.count === 0) {
    setLoading(false);
    return;
  }
  // 如果已登录且歌曲数量少于 800，直接加载所有歌曲
  if (isLogin() === 1 && (detailData.value?.count as number) < 800) {
    const ids: number[] = detail.privileges.map((song: any) => song.id as number);
    const result = await songDetail(ids);
    // 检查是否仍然是当前请求的歌单
    if (currentRequestId.value !== id) return;
    // 直接批量详情返回时也进行一次按 id 去重
    setListData(uniqBy(formatSongsList(result.songs), "id"));
  } else {
    await getPlaylistAllSongs(id, detailData.value?.count || 0, refresh);
  }
  // 检查是否仍然是当前请求的歌单
  if (currentRequestId.value !== id) return;
  // 更新我喜欢
  if (detailData.value) {
    dataStore.setLikeSongsList(detailData.value, listData.value);
  }
  setLoading(false);
};

// 加载缓存
const loadLikedCache = () => {
  if (isObject(dataStore.likeSongsList.detail)) {
    setDetailData(dataStore.likeSongsList.detail);
  }
  if (dataStore.likeSongsList.data.length) {
    // 去重缓存中的歌曲，避免重复展示与后续重复拼接
    setListData(uniqBy(dataStore.likeSongsList.data, "id"));
  }
};

// 获取歌单全部歌曲
const getPlaylistAllSongs = async (
  id: number,
  count: number,
  // 是否为刷新列表
  refresh: boolean = false,
) => {
  setLoading(true);
  // 加载提示
  loadingMsgShow(!refresh);
  // 循环获取
  let offset: number = 0;
  const limit: number = 500;
  const listDataArray: SongType[] = [];
  do {
    // 检查是否仍然是当前请求的歌单
    if (currentRequestId.value !== id) {
      loadingMsgShow(false);
      return;
    }
    const result = await playlistAllSongs(id, limit, offset);
    // 再次检查是否仍然是当前请求的歌单（请求完成后）
    if (currentRequestId.value !== id) {
      loadingMsgShow(false);
      return;
    }
    const songData = formatSongsList(result.songs);
    listDataArray.push(...songData);
    // 非刷新模式下，增量拼接时进行去重，避免与缓存或上一页数据重复
    if (!refresh) {
      const currentList = listData.value;
      setListData(uniqBy([...currentList, ...songData], "id"));
    }
    // 更新数据
    offset += limit;
  } while (offset < count && isLikedPage.value && currentRequestId.value === id);
  // 最终检查是否仍然是当前请求的歌单
  if (currentRequestId.value !== id) {
    loadingMsgShow(false);
    return;
  }
  // 刷新模式下，统一以最终聚合数据为准，并进行去重
  if (refresh) setListData(uniqBy(listDataArray, "id"));
  // 关闭加载
  loadingMsgShow(false);
};

// 处理搜索更新
const handleSearchUpdate = (val: string) => {
  searchValue.value = val;
  performSearch(val);
};

// 播放全部歌曲
const playAllSongs = useDebounceFn(() => {
  if (!detailData.value || !listData.value?.length) return;
  playAllSongsAction(listData.value, playlistId.value);
}, 300);

// 加载提示
const loadingMsgShow = (show: boolean = true) => {
  if (show) {
    loadingMsg.value?.destroy();
    loadingMsg.value = window.$message.loading("该歌单歌曲数量过多，请稍等", {
      duration: 0,
      closable: true,
    });
  } else {
    setLoading(false);
    loadingMsg.value?.destroy();
    loadingMsg.value = null;
  }
};

// 删除指定索引歌曲
const removeSong = (ids: number[]) => {
  if (!listData.value) return;
  setListData(listData.value.filter((song) => !ids.includes(song.id)));
};

onActivated(() => {
  if (!isActivated.value) {
    isActivated.value = true;
  } else {
    getPlaylistDetail(playlistId.value, { getList: true, refresh: true });
  }
});

onDeactivated(() => loadingMsgShow(false));
onUnmounted(() => loadingMsgShow(false));

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

  // 获取我喜欢的音乐歌单ID
  const likedPlaylistId = dataStore.userLikeData.playlists?.[0]?.id;
  if (likedPlaylistId) {
    getPlaylistDetail(likedPlaylistId);
  } else {
    // 如果没有找到我喜欢的音乐歌单，尝试从缓存获取
    const data: any = await dataStore.getUserLikePlaylist();
    const id = data?.detail?.id;
    if (id) {
      getPlaylistDetail(id);
    } else {
      setLoading(false);
      window.$message.error("无法获取我喜欢的音乐歌单");
    }
  }
});
</script>
