<!-- 热搜榜及搜索历史 -->
<template>
  <Transition name="fadeDown" mode="out-in" @before-enter="getSearchHotData">
    <n-card
      v-if="status.searchInputFocus && !searchValue && (data.searchHistory[0] || searchHotData[0])"
      class="search-suggestions"
      content-style="padding: 0"
    >
      <n-scrollbar class="scrollbar">
        <!-- 历史记录 -->
        <div v-if="settings.searchHistory && data.searchHistory[0]" class="history">
          <div class="title">
            <n-icon>
              <SvgIcon icon="history" />
            </n-icon>
            <n-text>搜索历史</n-text>
            <n-icon class="history-delete" depth="3" @click="delSearchHistory">
              <SvgIcon icon="delete" />
            </n-icon>
          </div>
          <n-space>
            <n-tag
              v-for="(item, index) in data.searchHistory"
              :key="index"
              :bordered="false"
              round
              @click="toSearch(item)"
            >
              {{ item }}
            </n-tag>
          </n-space>
        </div>
        <!-- 热搜榜 -->
        <div v-if="searchHotData[0]" class="hot-list">
          <div class="title">
            <n-icon>
              <SvgIcon icon="fire" />
            </n-icon>
            <n-text>热搜榜</n-text>
          </div>
          <div
            v-for="(item, index) in searchHotData"
            :key="index"
            class="hot-item"
            @click="toSearch(item.searchWord)"
          >
            <div :class="index < 3 ? 'num hot' : 'num'">{{ index + 1 }}</div>
            <div class="hot-desc">
              <div class="name">
                <n-text class="text">{{ item.searchWord }}</n-text>
                <n-tag
                  v-if="item.iconUrl"
                  :type="item.iconType == 1 ? 'error' : 'warning'"
                  :bordered="false"
                  class="tag"
                  size="small"
                  round
                >
                  {{ item.iconType === 1 ? "HOT" : "UP" }}
                </n-tag>
                <n-text class="hot-num" depth="3">{{ item.score }}</n-text>
              </div>
              <n-text class="tip" depth="3">{{ item.content }}</n-text>
            </div>
          </div>
        </div>
      </n-scrollbar>
    </n-card>
  </Transition>
</template>

<script setup>
import { siteData, siteStatus, siteSettings } from "@/stores";
import { getSearchHot } from "@/api/search";
import { getCacheData } from "@/utils/helper";

const data = siteData();
const status = siteStatus();
const settings = siteSettings();
const emit = defineEmits(["toSearch", "delSearchHistory"]);

// 搜索内容
// eslint-disable-next-line no-unused-vars
const props = defineProps({
  // 搜索关键字
  searchValue: {
    type: [String, null],
    required: true,
  },
});

// 热搜数据
const searchHotData = ref([]);

// 获取热搜数据
const getSearchHotData = () => {
  getCacheData("searchHot", 10, getSearchHot)
    .then((res) => {
      searchHotData.value = res.data;
    })
    .catch((error) => {
      console.error("热榜获取失败：", error);
    });
};

// 搜索事件
const toSearch = (val, type = "song") => {
  // 触发父组件
  emit("toSearch", val, type);
};

// 删除搜索历史
const delSearchHistory = () => {
  $dialog.warning({
    title: "删除历史",
    content: "确认删除全部的搜索历史？这将无法恢复！",
    positiveText: "确认",
    negativeText: "取消",
    onPositiveClick: () => {
      data.searchHistory = [];
    },
  });
};

onBeforeMount(() => {
  getSearchHotData();
});
</script>

<style lang="scss" scoped>
.search-suggestions {
  position: absolute;
  left: 0;
  top: 42px;
  width: 300px;
  z-index: 11;
  border-radius: 8px;
  transition:
    height 0.3s ease,
    opacity 0.3s ease,
    transform 0.3s ease;
  &.fadeDown-enter-to {
    transition-delay: 0.2s;
  }
  :deep(.scrollbar) {
    max-height: calc(100vh - 160px);
    .n-scrollbar-content {
      padding: 10px;
    }
  }
  .history {
    margin-bottom: 20px;
    .title {
      display: flex;
      align-items: center;
      color: var(--main-color);
      .n-icon {
        margin-right: 4px;
        font-size: 18px;
      }
      .n-text {
        color: var(--main-color);
      }
      .history-delete {
        margin-left: auto;
        border-radius: 25px;
        transition:
          color 0.3s,
          transform 0.3s;
        cursor: pointer;
        &:hover {
          color: var(--main-color);
        }
        &:active {
          transform: scale(0.95);
        }
      }
    }
    .n-space {
      margin-top: 8px;
      .n-tag {
        font-size: 13px;
        background-color: var(--n-action-color);
        transition:
          background-color 0.3s,
          transform 0.3s,
          color 0.3s;
        cursor: pointer;
        &:hover {
          background-color: var(--main-second-color);
          color: var(--main-color);
        }
        &:active {
          transform: scale(0.95);
        }
      }
    }
  }
  .hot-list {
    .title {
      display: flex;
      align-items: center;
      margin-bottom: 6px;
      color: var(--main-color);
      .n-icon {
        margin-right: 4px;
        font-size: 18px;
      }
      .n-text {
        color: var(--main-color);
      }
    }
    .hot-item {
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 6px;
      border-radius: 8px;
      margin-bottom: 8px;
      transition: background-color 0.3s;
      cursor: pointer;
      .num {
        width: 30px;
        height: 30px;
        min-width: 30px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        margin-right: 8px;
        &.hot {
          color: var(--n-color-target);
        }
      }
      .hot-desc {
        width: 100%;
        .name {
          font-size: 16px;
          display: flex;
          flex-direction: row;
          align-items: center;
          .text {
            padding-right: 8px;
          }
          .hot-num {
            margin-left: auto;
            margin-right: 4px;
            font-style: italic;
            font-size: 12px;
            overflow: visible;
            white-space: nowrap;
          }
        }
        .tip {
          margin-top: 2px;
          font-size: 12px;
          white-space: normal;
          -webkit-line-clamp: 2;
        }
      }
      &:last-child {
        margin-bottom: 0;
      }
      &:hover {
        background-color: var(--n-border-color);
      }
    }
  }
}
</style>
