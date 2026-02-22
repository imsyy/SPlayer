<!-- 播客列表 -->
<template>
  <div class="radio-list">
    <ListDetail
      :detail-data="detailData?.id === radioId ? detailData : null"
      :list-data="detailData?.id === radioId ? listData : []"
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
          @click="toSubRadio(radioId, !isLikeRadio)"
        >
          <template #icon>
            <SvgIcon :name="isLikeRadio ? 'Favorite' : 'FavoriteBorder'" />
          </template>
          {{ isLikeRadio ? "取消订阅" : "订阅播客" }}
        </n-button>
      </template>
    </ListDetail>
    <Transition name="fade" mode="out-in">
      <!-- 歌曲列表 -->
      <template v-if="currentTab === 'songs'">
        <SongList
          v-if="!searchValue || searchData?.length"
          :data="detailData?.id === radioId ? displayData : []"
          :loading="loading"
          :height="songListHeight"
          :radioId="radioId"
          :doubleClickAction="searchData?.length ? 'add' : 'all'"
          type="radio"
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
        <ListComment :id="radioId" :type="7" :height="songListHeight" />
      </template>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { DropdownOption, MessageReactive } from "naive-ui";
import { formatCoverList, formatSongsList } from "@/utils/format";
import { renderIcon, copyData, getShareUrl } from "@/utils/helper";
import { useDataStore } from "@/stores";
import { radioAllProgram, radioDetail } from "@/api/radio";
import { useListDetail } from "@/composables/List/useListDetail";
import { useListSearch } from "@/composables/List/useListSearch";
import { useListScroll } from "@/composables/List/useListScroll";
import { useListActions } from "@/composables/List/useListActions";
import { toSubRadio } from "@/utils/auth";
import { useListDataCache, type ListCacheData } from "@/composables/List/useListDataCache";
import ListComment from "@/components/List/ListComment.vue";

const router = useRouter();
const dataStore = useDataStore();

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
const { listScrolling, handleListScroll } = useListScroll();
const { playAllSongs: playAllSongsAction } = useListActions();
const { saveCache, loadCache, checkNeedsUpdate } = useListDataCache();

// 电台 ID
const oldRadioId = ref<number>(0);
const radioId = computed<number>(() => Number(router.currentRoute.value.query.id as string));

// 当前正在请求的播客 ID，用于防止竞态条件
const currentRequestId = ref<number>(0);

// 加载提示
const loadingMsg = ref<MessageReactive | null>(null);

// 列表高度
const songListHeight = computed(() => getSongListHeight(listScrolling.value));

// 当前 tab
const currentTab = ref<"songs" | "comments">("songs");

// 是否处于收藏播客
const isLikeRadio = computed(() => {
  return dataStore.userLikeData.djs.some((radio) => radio.id === detailData.value?.id);
});

// 是否处于播客页面
const isPlaylistPage = computed<boolean>(() => router.currentRoute.value.name === "radio");

// 是否为相同播客
const isSamePlaylist = computed<boolean>(() => oldRadioId.value === radioId.value);

// 列表配置
const listConfig = {
  titleType: "normal" as const,
  showCoverMask: false,
  showPlayCount: false,
  showArtist: false,
  showCreator: true,
  showCount: true,
};

// 是否显示加载状态
const showLoading = computed(() => listData.value.length === 0 && loading.value);

// 播放按钮文本
const playButtonText = computed(() => {
  if (showLoading.value) {
    if (isSamePlaylist.value) {
      return "更新中...";
    }
    const loaded =
      listData.value.length === (detailData.value?.count || 0) ? 0 : listData.value.length;
    return `加载中... (${loaded}/${detailData.value?.count || 0})`;
  }
  return "播放";
});

// 更多操作
const moreOptions = computed<DropdownOption[]>(() => [
  {
    label: "刷新缓存",
    key: "refresh-cache",
    props: {
      onClick: () => getRadioDetail(radioId.value, true),
    },
    icon: renderIcon("Refresh"),
  },
  {
    label: "刷新播客",
    key: "refresh",
    props: {
      onClick: () => getRadioDetail(radioId.value),
    },
    icon: renderIcon("Refresh"),
  },
  {
    label: "复制分享链接",
    key: "copy",
    props: {
      onClick: () => copyData(getShareUrl("djradio", radioId.value), "已复制分享链接到剪贴板"),
    },
    icon: renderIcon("Share"),
  },
  {
    label: "打开源页面",
    key: "open",
    props: {
      onClick: () => {
        window.open(`https://music.163.com/#/djradio?id=${radioId.value}`);
      },
    },
    icon: renderIcon("Link"),
  },
]);

// 获取播客基础信息
const getRadioDetail = async (id: number, refresh: boolean = false) => {
  if (!id) return;
  // 设置当前请求的播客 ID，用于防止竞态条件
  currentRequestId.value = id;
  // 设置加载状态
  setLoading(true);
  // 清空数据
  clearSearch();

  // 1. 尝试读取缓存
  if (!refresh) {
    const cached = await loadCache("radio", id);
    if (cached) {
      setDetailData(cached.detail);
      setListData(cached.songs);
      setLoading(false);

      // 后台检查更新
      backgroundCheck(id, cached);
      return;
    }
  }

  // 获取播客详情
  if (detailData.value?.id !== id || refresh) {
    setDetailData(null);
    setListData([]);
  }
  const detail = await radioDetail(id);
  if (currentRequestId.value !== id) return;
  setDetailData(formatCoverList(detail.data)[0]);
  // 获取全部节目
  await getRadioAllProgram(id, detailData.value?.count as number);
};

// 后台检查更新
const backgroundCheck = async (id: number, cached: ListCacheData) => {
  try {
    const detail = await radioDetail(id);
    if (currentRequestId.value !== id) return;

    const latestDetail = formatCoverList(detail.data)[0];

    if (checkNeedsUpdate(cached, latestDetail)) {
      console.log("Radio cache expired, refreshing...");
      getRadioDetail(id, true);
    }
  } catch (e) {
    console.error("Radio background check failed", e);
  }
};

// 获取播客全部歌曲
const getRadioAllProgram = async (id: number, count: number) => {
  if (!id || !count) return;
  setLoading(true);
  // 加载提示
  if (count > 500) loadingMsgShow();
  // 强制清空列表，防止重复
  setListData([]);
  // 循环获取
  let offset: number = 0;
  const limit: number = 500;
  do {
    if (currentRequestId.value !== id) {
      loadingMsgShow(false);
      return;
    }
    const result = await radioAllProgram(id, limit, offset);
    if (currentRequestId.value !== id) {
      loadingMsgShow(false);
      return;
    }
    const songData = formatSongsList(result.programs);
    appendListData(songData);
    // 更新数据
    offset += limit;
  } while (offset < count && isPlaylistPage.value && currentRequestId.value === id);
  if (currentRequestId.value !== id) {
    loadingMsgShow(false);
    return;
  }
  // 保存缓存
  if (detailData.value && listData.value.length > 0) {
    saveCache("radio", id, detailData.value, listData.value);
  }

  // 关闭加载
  loadingMsgShow(false);
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
  if (!detailData.value || !listData.value?.length) return;
  playAllSongsAction(listData.value, radioId.value);
}, 300);

// 加载提示
const loadingMsgShow = (show: boolean = true) => {
  if (show) {
    loadingMsg.value?.destroy();
    loadingMsg.value = window.$message.loading("该播客节目数量过多，请稍等", {
      duration: 0,
      closable: true,
    });
  } else {
    setLoading(false);
    loadingMsg.value?.destroy();
    loadingMsg.value = null;
  }
};

onBeforeRouteUpdate((to) => {
  const id = Number(to.query.id as string);
  if (id) {
    oldRadioId.value = id;
    getRadioDetail(id);
  }
});

onActivated(() => {
  // 是否为首次进入
  if (oldRadioId.value === 0) {
    oldRadioId.value = radioId.value;
  } else {
    oldRadioId.value = radioId.value;
    getRadioDetail(radioId.value, false);
  }
});

onDeactivated(() => loadingMsgShow(false));
onUnmounted(() => loadingMsgShow(false));
onMounted(() => getRadioDetail(radioId.value));
</script>
