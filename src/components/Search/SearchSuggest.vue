<template>
  <Transition
    name="fadeDown"
    mode="out-in"
    @after-enter="calcSearchSuggestHeights"
    @after-leave="calcSearchSuggestHeights"
  >
    <n-card
      v-if="statusStore.searchFocus && statusStore.searchInputValue"
      class="search-suggest"
      content-style="padding: 0"
      :style="{
        height: `${searchSuggestHeights}px`,
        border: searchSuggestHeights === 0 ? 'none' : null,
      }"
    >
      <n-scrollbar class="scrollbar">
        <!-- 直接搜索 -->
        <div
          ref="directSearchRef"
          class="direct"
          @click="emit('toSearch', statusStore.searchInputValue, 'keyword')"
        >
          <SvgIcon name="Search" :depth="3" />
          <n-text class="text text-hidden">直接搜索：{{ statusStore.searchInputValue }}</n-text>
        </div>
        <!-- 搜索建议 -->
        <Transition name="fade" mode="out-in" @after-leave="calcSearchSuggestHeights">
          <div
            v-if="
              Object.keys(searchSuggestData)?.length &&
              searchSuggestData?.order &&
              settingStore.useOnlineService
            "
            ref="searchSuggestRef"
            class="all-suggest"
          >
            <div v-for="(item, index) in searchSuggestData.order" :key="index" class="suggest">
              <div class="suggest-type">
                <SvgIcon :name="searchSuggestionsType[item].icon" />
                <n-text>{{ searchSuggestionsType[item].name }}</n-text>
              </div>
              <div
                v-for="(suggestItem, suggestIndex) in searchSuggestData[item]"
                :key="suggestIndex"
                class="suggest-item"
                @click="emit('toSearch', suggestItem, item)"
              >
                <n-text class="name">{{ suggestItem.name }}</n-text>
                <n-text v-if="suggestItem?.artist" class="artist" depth="3">
                  {{ suggestItem.artist.name }}
                </n-text>
                <n-text v-else-if="suggestItem?.artists" class="artist" depth="3">
                  {{ suggestItem.artists[0].name }}
                </n-text>
              </div>
            </div>
          </div>
        </Transition>
      </n-scrollbar>
    </n-card>
  </Transition>
</template>

<script setup lang="ts">
import { searchSuggest } from "@/api/search";
import { useStatusStore, useSettingStore } from "@/stores";

const emit = defineEmits<{
  toSearch: [key: number | string, type: string];
}>();

const statusStore = useStatusStore();
const settingStore = useSettingStore();

// 搜索建议数据
const searchSuggestData = ref<any>({});
const searchSuggestHeights = ref<number>(0);

// 搜索建议元素
const directSearchRef = ref<HTMLElement | null>(null);
const searchSuggestRef = ref<HTMLElement | null>(null);

// 搜索建议分类
const searchSuggestionsType = {
  songs: {
    name: "单曲",
    icon: "Music",
  },
  artists: {
    name: "歌手",
    icon: "Artist",
  },
  albums: {
    name: "专辑",
    icon: "Album",
  },
  playlists: {
    name: "歌单",
    icon: "MusicList",
  },
  share: {
    name: "分享的内容",
    icon: "Link",
  },
};

// 获取搜索建议
const getSearchSuggest = async (keywords: string) => {
  searchSuggestData.value = {};
  const result = await searchSuggest(keywords);
  searchSuggestData.value = result.result;
  // 计算高度
  nextTick(calcSearchSuggestHeights);
};

// 计算高度
const calcSearchSuggestHeights = () => {
  const directSearchHeight = directSearchRef.value?.offsetHeight;
  const searchSuggestionsHeight = searchSuggestRef.value?.offsetHeight;
  if (directSearchHeight || searchSuggestionsHeight) {
    const totalHeight =
      (directSearchHeight || 0) +
      (searchSuggestionsHeight || 0) +
      (searchSuggestionsHeight ? 8 : 0) +
      20;
    searchSuggestHeights.value = totalHeight;
  } else {
    searchSuggestHeights.value = 0;
  }
};

/**
 * 识别链接类型
 * @param val 分享的内容
 */
const getLinkType = (val: string) => {
  // 通用正则表达式提取任意URL
  const urlRegex = /(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?/;
  const urlMatch = val.match(urlRegex);
  if (!urlMatch) return null;
  // 补全协议
  let fullUrl = urlMatch[0];
  if (!fullUrl.startsWith("http")) {
    fullUrl = "https://" + fullUrl;
  }
  try {
    // 使用URL API解析
    const url = new URL(fullUrl);
    let pathname = url.pathname;
    let searchParams = url.searchParams;
    // 处理hash路由格式: /#/song?id=123
    if (url.hash) {
      const hashPath = url.hash.slice(1); // 移除 #
      if (hashPath.includes("?")) {
        const [hashPathname, hashSearch] = hashPath.split("?");
        pathname = hashPathname;
        // 解析hash中的查询参数
        const hashParams = new URLSearchParams(hashSearch);
        // 合并参数，hash参数优先级更高
        for (const [key, value] of hashParams) {
          if (!searchParams.has(key)) {
            searchParams.set(key, value);
          }
        }
      } else {
        pathname = hashPath;
      }
    }
    // 从路径中提取类型：/song /playlist /album /artist
    const pathMatch = pathname.match(/\/(song|playlist|album|artist)(?:\/|$)/);
    const type = pathMatch?.[1];
    // 提取ID参数
    const id = searchParams.get("id") || searchParams.get("hash");
    if (!type || !id) {
      return null;
    }
    const typeMap: Record<string, string> = {
      song: "songs",
      playlist: "playlists",
      album: "albums",
      artist: "artists",
    };
    const nameMap: Record<string, string> = {
      song: "歌曲",
      playlist: "歌单",
      album: "专辑",
      artist: "歌手",
    };
    return {
      type: typeMap[type],
      typeName: nameMap[type],
      id: id,
    };
  } catch (error) {
    console.warn("解析链接失败:", error);
    return null;
  }
};

// 搜索框改变
watchDebounced(
  () => statusStore.searchInputValue,
  (val) => {
    if (!val || val === "" || !settingStore.useOnlineService) return;
    // 识别链接
    const linkData = getLinkType(val);
    if (linkData) {
      searchSuggestData.value = {
        order: ["share"],
        share: [
          {
            name: `前往分享的${linkData.typeName}`,
            id: linkData.id,
            realType: linkData.type,
          },
        ],
      };
      nextTick(calcSearchSuggestHeights);
      return;
    }
    getSearchSuggest(val);
  },
  { debounce: 300 },
);
</script>

<style lang="scss" scoped>
.search-suggest {
  position: absolute;
  left: 0;
  top: 50px;
  width: 300px;
  border-radius: 8px;
  overflow: hidden;
  max-height: calc(100vh - 160px);
  z-index: 101;
  transition:
    height 0.3s ease,
    opacity 0.3s ease,
    transform 0.3s ease;
  :deep(.scrollbar) {
    max-height: calc(100vh - 160px);
    .n-scrollbar-content {
      padding: 10px;
    }
  }
  @media (max-width: 768px) {
    width: 100%;
  }
  .direct {
    display: flex;
    align-items: center;
    padding: 6px;
    border-radius: 8px;
    transition: background-color 0.3s;
    cursor: pointer;
    .n-icon {
      font-size: 16px;
      margin-right: 6px;
    }
    &:hover {
      background-color: var(--n-border-color);
    }
  }
  .all-suggest {
    margin-top: 8px;
    .suggest {
      margin-bottom: 8px;
      .suggest-type {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        color: var(--n-color-target);
        .n-icon {
          font-size: 18px;
          margin-right: 4px;
        }
        .n-text {
          color: var(--n-color-target);
        }
      }
      .suggest-item {
        padding: 14px 18px 14px 22px;
        margin-bottom: 8px;
        border-radius: 8px;
        transition: background-color 0.3s;
        cursor: pointer;
        .name {
          white-space: normal;
        }
        .artist {
          &::before {
            content: " - ";
          }
        }
        &:last-child {
          margin-bottom: 0;
        }
        &:hover {
          background-color: var(--n-border-color);
        }
      }
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}
</style>
