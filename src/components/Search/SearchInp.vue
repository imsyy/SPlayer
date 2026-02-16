<template>
  <div :class="['search', { focus: statusStore.searchFocus }]">
    <!-- 搜索框 -->
    <n-input
      ref="searchInputRef"
      v-model:value="statusStore.searchInputValue"
      :input-props="{ autocomplete: 'off' }"
      :placeholder="searchPlaceholder"
      :allow-input="noSideSpace"
      class="search-input"
      round
      clearable
      @focus="searchInputToFocus"
      @keyup.enter="toSearch(statusStore.searchInputValue)"
      @contextmenu.stop="searchInpMenuRef?.openDropdown($event)"
      @click.stop
    >
      <template #prefix>
        <SvgIcon :size="18" name="Search" />
      </template>
    </n-input>
    <!-- 搜索框遮罩 -->
    <Transition name="fade" mode="out-in">
      <div v-show="statusStore.searchFocus" class="search-mask" @click.stop="closeSearchFocus" />
    </Transition>
    <!-- 默认内容 -->
    <SearchDefault v-if="settingStore.useOnlineService" @to-search="toSearch" />
    <!-- 搜索结果 -->
    <SearchSuggest @to-search="toSearch" />
    <!-- 右键菜单 -->
    <SearchInpMenu ref="searchInpMenuRef" @to-search="toSearch" />
  </div>
</template>

<script setup lang="ts">
import { useStatusStore, useDataStore, useSettingStore } from "@/stores";
import { searchDefault } from "@/api/search";
import { usePlayerController } from "@/core/player/PlayerController";
import { songDetail } from "@/api/song";
import { formatSongsList } from "@/utils/format";
import SearchInpMenu from "@/components/Menu/SearchInpMenu.vue";

const router = useRouter();
const route = useRoute();
const dataStore = useDataStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();
const player = usePlayerController();

// 右键菜单
const searchInpMenuRef = ref<InstanceType<typeof SearchInpMenu> | null>(null);

// 搜索框数据
const searchInputRef = ref<HTMLInputElement | null>(null);
const searchPlaceholder = ref<string>(
  settingStore.useOnlineService ? "搜索音乐 / 视频" : "搜索本地音乐",
);
const searchRealkeyword = ref<string>("");

// 搜索框输入限制
const noSideSpace = (value: string) => !value.startsWith(" ");

// 搜索框 focus
const searchInputToFocus = () => {
  // searchInpRef.value?.focus();
  statusStore.searchFocus = true;
};

// 根据路由更新搜索框内容
const syncSearchInput = () => {
  // 如果当前是搜索页，则同步搜索页的搜索词到搜索框，如果是其他页面，则清空搜索框
  if (String(route.name).startsWith("search") && route.query.keyword) {
    statusStore.searchInputValue = String(route.query.keyword);
  } else {
    statusStore.searchInputValue = "";
  }
};

// 关闭搜索焦点（点击遮罩时）
const closeSearchFocus = () => {
  statusStore.searchFocus = false;

  const mode = settingStore.searchInputBehavior;
  switch (mode) {
    case "clear":
      statusStore.searchInputValue = "";
      break;
    case "sync":
      syncSearchInput();
      break;
    default:
      break;
  }
};

// 添加搜索历史
const setSearchHistory = (keyword: string) => {
  // 去除空格
  keyword = keyword.trim();
  if (!keyword) return;
  const index = dataStore.searchHistory.indexOf(keyword);
  if (index !== -1) {
    dataStore.searchHistory.splice(index, 1);
  }
  dataStore.searchHistory.unshift(keyword);
  if (dataStore.searchHistory.length > 30) {
    dataStore.searchHistory.length = 30;
  }
};

// 更换搜索框关键词
const updatePlaceholder = async () => {
  if (!settingStore.enableSearchKeyword) {
    searchPlaceholder.value = "搜索音乐 / 视频";
    return;
  }
  try {
    const result = await searchDefault();
    searchPlaceholder.value = result.data.showKeyword;
    searchRealkeyword.value = result.data.realkeyword;
  } catch (error) {
    console.error("搜索关键词获取失败：", error);
    searchPlaceholder.value = "搜索音乐 / 视频";
  }
};

// 前往搜索
const toSearch = async (key: any, type: string = "keyword") => {
  // 关闭搜索框
  statusStore.searchFocus = false;
  searchInputRef.value?.blur();
  // 如果搜索框行为设置是清空模式，则搜索后清空搜索框
  if (settingStore.searchInputBehavior === "clear") {
    statusStore.searchInputValue = "";
  }
  // 未输入内容且不存在推荐
  if (!key && searchPlaceholder.value === "搜索音乐 / 视频") return;
  if (!key && searchPlaceholder.value !== "搜索音乐 / 视频" && searchRealkeyword.value) {
    key = searchRealkeyword.value?.trim();
  }
  // 本地搜索
  if (!settingStore.useOnlineService) {
    // 跳转本地搜索页面
    router.push({
      name: "search",
      query: { keyword: key },
    });
    return;
  }
  // 更新推荐
  updatePlaceholder();
  // 前往搜索
  switch (type) {
    case "keyword":
      router.push({
        name: "search",
        query: { keyword: key },
      });
      setSearchHistory(key);
      break;
    case "songs": {
      const result = await songDetail(key?.id);
      const song = formatSongsList(result.songs)[0];
      player.addNextSong(song, true);
      break;
    }
    case "playlists":
      router.push({
        name: "playlist",
        query: { id: key?.id },
      });
      break;
    case "artists":
      router.push({
        name: "artist",
        query: { id: key?.id },
      });
      break;
    case "albums":
      router.push({
        name: "album",
        query: { id: key?.id },
      });
      break;
    case "share":
      if (key?.realType && key?.id) {
        toSearch({ id: key.id }, key.realType);
      }
      break;
    default:
      break;
  }
};

// 监听设置变化
watch([() => settingStore.enableSearchKeyword, () => settingStore.useOnlineService], () => {
  updatePlaceholder();
});

// 监听路由变化，同步搜索词
watch(
  [() => route.fullPath, () => settingStore.searchInputBehavior],
  () => {
    if (settingStore.searchInputBehavior === "sync") syncSearchInput();
  },
  { immediate: true },
);

onMounted(() => {
  // 确保在线服务开启
  if (settingStore.useOnlineService) {
    // 立即更新一次
    updatePlaceholder();
    // 开启定时器
    useIntervalFn(updatePlaceholder, 60 * 1000, { immediate: true });
  }
});
</script>

<style lang="scss" scoped>
.search {
  position: absolute;
  left: 0;
  -webkit-app-region: no-drag;
  transition:
    left 0.3s,
    width 0.3s;
  .search-input {
    width: 200px;
    height: 40px;
    border-radius: 50px;
    transition:
      background-color 0.3s var(--n-bezier),
      width 0.3s var(--n-bezier);
    z-index: 101;
    :deep(input) {
      height: 100%;
      width: 100%;
    }
  }
  &.focus {
    .search-input {
      width: 300px;
    }
  }
  @media (max-width: 768px) {
    width: calc(100% - 150px);
    .search-input {
      width: 100%;
    }
    &.focus {
      left: -52px;
      width: calc(100% + 52px);
      .search-input {
        width: 100%;
      }
    }
  }
  .search-mask {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 100;
    background-color: #00000040;
    backdrop-filter: blur(20px);
    -webkit-app-region: no-drag;
  }
}
</style>
