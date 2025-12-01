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
              searchSuggestData?.order &&
              searchSuggestData.order.length > 0 &&
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
                <!-- 封面 -->
                <img
                  v-if="suggestItem?.cover || suggestItem?.picUrl || suggestItem?.picture"
                  :src="suggestItem.cover || suggestItem.picUrl || suggestItem.picture"
                  :alt="suggestItem.name"
                  class="cover"
                />
                <!-- 内容 -->
                <div class="content">
                  <n-text class="name">{{ suggestItem.name }}</n-text>
                  <n-text v-if="suggestItem?.artist" class="artist" depth="3">
                    {{ suggestItem.artist.name }}
                  </n-text>
                  <n-text v-else-if="suggestItem?.artists" class="artist" depth="3">
                    {{ suggestItem.artists[0].name }}
                  </n-text>
                  <n-text v-else-if="suggestItem?.creator?.name" class="creator" depth="3">
                    {{ suggestItem.creator.name }}
                  </n-text>
                  <n-text v-else-if="suggestItem?.description" class="desc" depth="3">
                    {{ suggestItem.description }}
                  </n-text>
                </div>
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
import { songDetail } from "@/api/song";
import { playlistDetail } from "@/api/playlist";
import { albumDetail } from "@/api/album";
import { artistDetail } from "@/api/artist";
import { formatSongsList, formatCoverList } from "@/utils/format";

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

// 请求控制
let searchAbortController: AbortController | null = null;

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
};

// 获取搜索建议
const getSearchSuggest = async (keywords: string) => {
  searchSuggestData.value = {
    order: [],
    songs: [],
    playlists: [],
    albums: [],
    artists: [],
  };
  const result = await searchSuggest(keywords);
  const apiResult = result.result || {};

  // 格式化处理函数
  const processData = (type: string, data: any[]): any[] | null => {
    if (!data?.length) return null;

    switch (type) {
      case "songs": {
        try {
          return formatSongsList(data);
        } catch (e) {
          return null;
        }
      }
      case "playlists":
      case "albums": {
        const formatted = formatCoverList(data);
        const resourceType = type === "albums" ? "album" : "playlist";
        const filtered = filterValidPlaylists(formatted, resourceType);
        return filtered.length > 0 ? filtered : null;
      }
      case "artists": {
        // 单独处理
        return null;
      }
      default:
        return null;
    }
  };

  // 处理各个类型的数据
  const processedSongs = processData("songs", apiResult.songs);
  if (processedSongs) {
    searchSuggestData.value.songs = processedSongs;
    searchSuggestData.value.order.push("songs");
  }

  const processedPlaylists = processData("playlists", apiResult.playlists);
  if (processedPlaylists) {
    searchSuggestData.value.playlists = processedPlaylists;
    searchSuggestData.value.order.push("playlists");
  }

  const processedAlbums = processData("albums", apiResult.albums);
  if (processedAlbums) {
    searchSuggestData.value.albums = processedAlbums;
    searchSuggestData.value.order.push("albums");
  }

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

// 识别链接类型
const getLinkType = (val: string) => {
  const regex = /music\.163\.com\/(?:#\/)?(song|playlist|album|artist)\?id=(\d+)/;
  const match = val.match(regex);
  if (match) {
    const typeMap: Record<string, string> = {
      song: "songs",
      playlist: "playlists",
      album: "albums",
      artist: "artists",
    };
    return {
      type: typeMap[match[1]],
      urlType: match[1],
      id: match[2],
    };
  }
  return null;
};

// 检查是否为ID
const isNumericId = (val: string): string | null => {
  val = val.trim();
  if (/^\d+$/.test(val) && val.length >= 4 && val.length <= 20) {
    return val;
  }
  return null;
};

// 过滤无效的歌单/专辑结果
const filterValidPlaylists = (data: any[], type: "playlist" | "album" = "playlist"): any[] => {
  return data.filter((item) => {
    // 歌单需要检查创建者信息
    if (type === "playlist") {
      const creatorName = item?.creator?.name || "";
      if (creatorName === "未知用户名" || creatorName === "") {
        return false;
      }
    }
    // 歌单和专辑都需要检查有效的歌曲数量
    const trackCount = item?.count ?? item?.trackCount ?? 0;
    if (trackCount <= 0) {
      return false;
    }
    return true;
  });
};

// 根据ID遍历所有类型
const fetchIdResourceData = async (id: string) => {
  try {
    // 创建新的 AbortController 用于这次搜索
    searchAbortController = new AbortController();
    const currentController = searchAbortController;

    // 清除旧数据
    searchSuggestData.value = {
      order: [],
      songs: [],
      playlists: [],
      albums: [],
      artists: [],
    };

    const numId = parseInt(id, 10);

    // 并发请求所有类型
    const requests = [
      { type: "songs", promise: songDetail(numId) },
      { type: "playlists", promise: playlistDetail(numId) },
      { type: "albums", promise: albumDetail(numId) },
      { type: "artists", promise: artistDetail(numId) },
    ];

    // 为每个请求添加标识，以便追踪结果
    const trackedRequests = requests.map(({ type, promise }) =>
      promise
        .then((result) => ({ type, result, status: "fulfilled" }))
        .catch((error) => ({ type, error, status: "rejected" }))
    );

    // 并发所有请求
    const allPromises = Promise.all(trackedRequests);

    // 处理格式化和过滤的统一函数
    const formatAndProcess = (type: string, result: any): any[] | null => {
      switch (type) {
        case "songs": {
          if (result?.songs?.length > 0) {
            return formatSongsList(result.songs);
          }
          break;
        }
        case "playlists": {
          if (result?.playlist?.id) {
            const formatted = formatCoverList([result.playlist]);
            const filtered = filterValidPlaylists(formatted, "playlist");
            return filtered.length > 0 ? filtered : null;
          }
          break;
        }
        case "albums": {
          if (result?.album?.id) {
            const formatted = formatCoverList([result.album]);
            const filtered = filterValidPlaylists(formatted, "album");
            return filtered.length > 0 ? filtered : null;
          }
          break;
        }
        case "artists": {
          const artistData = result?.artist || result?.data?.artist || result;
          if (artistData?.id) {
            return [
              {
                ...artistData,
                description: artistData.description || artistData.briefDesc || "",
              },
            ];
          }
          break;
        }
      }
      return null;
    };

    // 为每个请求单独处理，动态显示结果
    trackedRequests.forEach((promise) => {
      promise.then((res) => {
        // 检查用户是否关闭了搜索框
        if (currentController !== searchAbortController) {
          return;
        }

        if (res.status === "fulfilled") {
          const { type } = res;
          const result = (res as any).result;
          const formattedData = formatAndProcess(type, result);

          // 立即更新 UI 显示这个结果
          if (formattedData && formattedData.length > 0) {
            if (!searchSuggestData.value.order.includes(type)) {
              searchSuggestData.value.order.push(type);
              searchSuggestData.value[type] = formattedData;
              nextTick(calcSearchSuggestHeights);
            }
          }
        }
      });
    });

    // 等待所有请求完成
    await allPromises;
  } catch (error) {
    console.error("Error fetching ID resource data:", error);
  }
};

// 根据链接获取详情数据，支持取消
const fetchLinkResourceData = async (linkData: any) => {
  try {
    // 创建新的 AbortController 用于这次搜索
    searchAbortController = new AbortController();
    const currentController = searchAbortController;

    // 清除旧数据
    searchSuggestData.value = {};

    const { type, id } = linkData;
    const numId = parseInt(id, 10);

    let resourceData: any = null;

    // 统一的格式化和处理逻辑
    switch (type) {
      case "songs": {
        const result = await songDetail(numId);
        const songs = formatSongsList(result.songs);
        resourceData = songs[0];
        break;
      }
      case "playlists": {
        const result = await playlistDetail(numId);
        const formatted = formatCoverList([result.playlist]);
        const filtered = filterValidPlaylists(formatted, "playlist");
        resourceData = filtered[0] || null;
        break;
      }
      case "albums": {
        const result = await albumDetail(numId);
        const formatted = formatCoverList([result.album]);
        const filtered = filterValidPlaylists(formatted, "album");
        resourceData = filtered[0] || null;
        break;
      }
      case "artists": {
        try {
          const result = await artistDetail(numId);
          // artistDetail 可能返回多种格式，统一处理
          const artistData = result?.artist || result?.data?.artist || result;
          if (artistData?.id) {
            // 确保 description 字段存在（UI 使用它）
            resourceData = {
              ...artistData,
              description: artistData.description || artistData.briefDesc || "",
            };
          }
        } catch (err) {
          // API 调用失败，resourceData 保持为 null
          console.error("Failed to fetch artist detail:", err);
        }
        break;
      }
    }

    // 检查搜索是否已被取消（用户关闭了搜索框）
    if (currentController !== searchAbortController) {
      return;
    }

    if (resourceData) {
      searchSuggestData.value = {
        order: [type],
        [type]: [resourceData],
      };
      nextTick(calcSearchSuggestHeights);
    }
  } catch (error) {
    console.error("Error fetching link resource data:", error);
  }
};

// 搜索框改变
watchDebounced(
  () => statusStore.searchInputValue,
  (val) => {
    // 清空输入时，清除搜索结果
    if (!val || val === "") {
      searchSuggestData.value = {};
      return;
    }

    // 不在线时不搜索
    if (!settingStore.useOnlineService) return;

    // 1. 尝试识别链接
    const linkData = getLinkType(val);
    if (linkData) {
      fetchLinkResourceData(linkData);
      return;
    }

    // 2. 尝试识别纯数字ID
    const numericId = isNumericId(val);
    if (numericId) {
      fetchIdResourceData(numericId);
      return;
    }

    // 3. 普通关键词搜索
    getSearchSuggest(val);
  },
  { debounce: 300 },
);

// 监听搜索框关闭，取消未完成的请求
watch(
  () => statusStore.searchFocus,
  (focused) => {
    if (!focused) {
      // 用户关闭搜索框，设置为 null 阻止后续请求完成时的 UI 更新
      searchAbortController = null;
    }
  },
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
        padding: 8px 10px;
        margin-bottom: 8px;
        border-radius: 8px;
        transition: background-color 0.3s;
        cursor: pointer;
        display: flex;
        gap: 10px;
        align-items: flex-start;
        .cover {
          width: 48px;
          height: 48px;
          border-radius: 4px;
          object-fit: cover;
          flex-shrink: 0;
        }
        .content {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          min-width: 0;
          .name {
            white-space: normal;
            word-break: break-word;
            font-weight: 500;
          }
          .artist {
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            &::before {
              content: " - ";
            }
          }
          .creator {
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            &::before {
              content: "创建者: ";
            }
          }
          .desc {
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
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
