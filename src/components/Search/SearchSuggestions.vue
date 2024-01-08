<!-- 搜索建议 -->
<template>
  <Transition
    name="fadeDown"
    mode="out-in"
    @after-enter="changeSuggestionsHeights"
    @after-leave="changeSuggestionsHeights"
  >
    <n-card
      v-if="searchInputFocus && searchValue"
      class="search-suggestions"
      content-style="padding: 0"
      :style="{
        height: `${suggestionsHeights}px`,
        border: suggestionsHeights === 0 ? 'none' : null,
      }"
      @click="emit('closeSearch')"
    >
      <n-scrollbar class="scrollbar">
        <!-- 直接搜索 -->
        <div ref="directSearchRef" class="direct" @click="toSearch(searchValue)">
          <n-icon depth="3">
            <SvgIcon icon="search-rounded" />
          </n-icon>
          <n-text class="text">直接搜索：{{ searchValue }}</n-text>
        </div>
        <!-- 搜索建议 -->
        <Transition
          name="fade"
          mode="out-in"
          @after-enter="changeSuggestionsHeights"
          @after-leave="changeSuggestionsHeights"
        >
          <div
            v-if="Object.keys(suggestionsData)?.length && suggestionsData?.order"
            ref="searchSuggestionsRef"
            class="all-suggestions"
          >
            <div v-for="(item, index) in suggestionsData.order" :key="index" class="suggestions">
              <div class="suggestions-type">
                <n-icon class="type-icon">
                  <SvgIcon :icon="searchSuggestionsType[item].icon" />
                </n-icon>
                <n-text class="type-name">{{ searchSuggestionsType[item].name }}</n-text>
              </div>
              <div
                v-for="suggs in suggestionsData[item]"
                :key="suggs.id"
                class="suggestions-item"
                @click="toSearch(suggs.id, item)"
              >
                <n-text class="item-name">
                  {{ suggs.name }}
                </n-text>
              </div>
            </div>
          </div>
        </Transition>
      </n-scrollbar>
    </n-card>
  </Transition>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { siteStatus } from "@/stores";
import { getSearchSuggest } from "@/api/search";
import debounce from "@/utils/debounce";

const status = siteStatus();
const { searchInputFocus } = storeToRefs(status);
const emit = defineEmits(["toSearch", "closeSearch"]);

// 搜索内容
const props = defineProps({
  // 搜索关键字
  searchValue: {
    type: [String, null],
    required: true,
  },
});

// 搜索建议数据
const suggestionsData = ref({});
const suggestionsHeights = ref(0);
const directSearchRef = ref(null);
const searchSuggestionsRef = ref(null);
const searchSuggestionsType = {
  songs: {
    name: "单曲",
    icon: "music-note",
  },
  artists: {
    name: "歌手",
    icon: "account-music",
  },
  albums: {
    name: "专辑",
    icon: "album",
  },
  playlists: {
    name: "歌单",
    icon: "queue-music-rounded",
  },
};

// 获取搜索建议
const getSearchSuggestData = debounce((val) => {
  const searchValue = val?.trim();
  // 是否为空
  if (!searchValue || searchValue === "") {
    return;
  }
  getSearchSuggest(searchValue).then((res) => {
    console.log(res);
    // 写入结果
    suggestionsData.value = res.result;
    // 计算高度
    nextTick().then(() => {
      changeSuggestionsHeights();
    });
  });
}, 300);

// 计算元素高度并改变
const changeSuggestionsHeights = () => {
  try {
    const directSearchHeight = directSearchRef.value?.offsetHeight;
    const searchSuggestionsHeight = searchSuggestionsRef.value?.offsetHeight;
    const hasDirectSearchHeight = !!directSearchHeight;
    const hasSearchSuggestionsHeight = !!searchSuggestionsHeight;
    if (hasDirectSearchHeight || hasSearchSuggestionsHeight) {
      const totalHeight =
        (hasDirectSearchHeight ? directSearchHeight : 0) +
        (hasSearchSuggestionsHeight ? searchSuggestionsHeight : 0) +
        (hasSearchSuggestionsHeight ? 8 : 0) +
        20;
      suggestionsHeights.value = totalHeight;
    } else {
      suggestionsHeights.value = 0;
    }
  } catch (error) {
    console.error("计算高度时出现错误：" + error);
  }
};

// 触发父组件搜索事件
const toSearch = (val, type = "song") => {
  emit("toSearch", val, type);
};

// 监听搜索词
watch(
  () => props.searchValue,
  (val) => {
    if (val) {
      // 清空结果
      suggestionsData.value = {};
      // 调用搜索结果
      getSearchSuggestData(val);
    }
  },
);
</script>

<style lang="scss" scoped>
.search-suggestions {
  position: absolute;
  left: 0;
  top: 42px;
  width: 300px;
  max-height: calc(100vh - 160px);
  border-radius: 8px;
  overflow: hidden;
  z-index: 11;
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
  .all-suggestions {
    margin-top: 8px;
    .suggestions {
      margin-bottom: 8px;
      .suggestions-type {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        color: var(--n-color-target);
        .type-icon {
          font-size: 18px;
          margin-right: 4px;
        }
        .type-name {
          color: var(--n-color-target);
        }
      }
      .suggestions-item {
        padding: 14px 18px 14px 22px;
        margin-bottom: 8px;
        border-radius: 8px;
        transition: background-color 0.3s;
        cursor: pointer;
        .item-name {
          white-space: normal;
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
  @media (max-width: 512px) {
    position: fixed;
    top: 58px;
    border-radius: 0px;
    width: 100%;
    max-height: calc(100vh - 58px);
    min-height: calc(100vh - 58px);
    :deep(.scrollbar) {
      max-height: calc(100vh - 58px);
      min-height: calc(100vh - 58px);
    }
  }
}
</style>
