<template>
  <div class="search">
    <!-- 搜索框 -->
    <n-input
      ref="searchInputRef"
      v-model:value="statusStore.searchInputValue"
      :class="['search-input', { focus: statusStore.searchFocus }]"
      :input-props="{ autocomplete: 'off' }"
      :placeholder="searchPlaceholder"
      :allow-input="noSideSpace"
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
      <div
        v-show="statusStore.searchFocus"
        class="search-mask"
        @click.stop="statusStore.searchFocus = false"
      />
    </Transition>
    <!-- 默认内容 -->
    <SearchDefault @to-search="toSearch" />
    <!-- 搜索结果 -->
    <SearchSuggest @to-search="toSearch" />
    <!-- 右键菜单 -->
    <SearchInpMenu ref="searchInpMenuRef" @to-search="toSearch" />
  </div>
</template>

<script setup lang="ts">
import { useStatusStore, useDataStore } from "@/stores";
import { searchDefault } from "@/api/search";
import SearchInpMenu from "@/components/Menu/SearchInpMenu.vue";
import player from "@/utils/player";
import { songDetail } from "@/api/song";
import { formatSongsList } from "@/utils/format";

const router = useRouter();
const dataStore = useDataStore();
const statusStore = useStatusStore();

// 右键菜单
const searchInpMenuRef = ref<InstanceType<typeof SearchInpMenu> | null>(null);

// 搜索框数据
const searchInputRef = ref<HTMLInputElement | null>(null);
const searchPlaceholder = ref<string>("搜索音乐 / 视频");
const searchRealkeyword = ref<string>("");

// 搜索框输入限制
const noSideSpace = (value: string) => !value.startsWith(" ");

// 搜索框 focus
const searchInputToFocus = () => {
  // searchInpRef.value?.focus();
  statusStore.searchFocus = true;
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
  // 未输入内容且不存在推荐
  if (!key && searchPlaceholder.value === "搜索音乐 / 视频") return;
  if (!key && searchPlaceholder.value !== "搜索音乐 / 视频" && searchRealkeyword.value) {
    key = searchRealkeyword.value?.trim();
  }
  // 关闭搜索框
  statusStore.searchFocus = false;
  searchInputRef.value?.blur();
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
    default:
      break;
  }
};

onMounted(() => {
  updatePlaceholder();
  // 每分钟更新
  useIntervalFn(updatePlaceholder, 60 * 1000);
});
</script>

<style lang="scss" scoped>
.search {
  position: relative;
  -webkit-app-region: no-drag;
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
    &.focus {
      width: 300px;
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
