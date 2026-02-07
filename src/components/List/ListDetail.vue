<!-- 通用列表详情 -->
<template>
  <div :class="['list-detail', { small: listScrolling }]">
    <Transition name="fade" mode="out-in">
      <div v-if="detailData" class="detail">
        <div class="cover" v-if="!settingStore.hiddenCovers.list">
          <n-image
            :src="detailData.coverSize?.m || detailData.cover"
            :previewed-img-props="{ style: { borderRadius: '8px' } }"
            :preview-src="detailData.cover"
            :renderToolbar="renderToolbar"
            show-toolbar-tooltip
            class="cover-img"
            @load="coverLoaded"
          >
            <template #placeholder>
              <div class="cover-loading">
                <img src="/images/album.jpg?asset" class="loading-img" alt="loading-img" />
              </div>
            </template>
          </n-image>
          <!-- 封面背板 -->
          <n-image
            class="cover-shadow"
            preview-disabled
            :src="detailData.coverSize?.m || detailData.cover"
          />
          <!-- 遮罩 -->
          <div v-if="config.showCoverMask" class="cover-mask" />
          <!-- 播放量 -->
          <div v-if="config.showPlayCount && detailData.playCount" class="play-count">
            <SvgIcon name="Play" />
            <span class="num">{{ formatNumber(detailData.playCount || 0) }}</span>
          </div>
        </div>
        <div class="data">
          <n-h2 class="name text-hidden">
            <n-ellipsis
              v-if="config.titleType === 'ellipsis'"
              :line-clamp="1"
              :tooltip="{ placement: 'bottom' }"
            >
              {{ titleText }}
            </n-ellipsis>
            <template v-else>
              {{ titleText }}
              <!-- 隐私歌单 -->
              <n-popover v-if="detailData?.privacy === 10" :show-arrow="false" placement="right">
                <template #trigger>
                  <SvgIcon :depth="3" name="EyeLock" size="22" />
                </template>
                <n-text>隐私歌单</n-text>
              </n-popover>
            </template>
          </n-h2>
          <n-collapse-transition :show="!listScrolling" class="collapse">
            <!-- 简介 -->
            <n-text
              v-if="detailData.description && settingStore.playlistPageElements.description"
              class="description text-hidden"
              @click="handleDescriptionClick"
            >
              {{ detailData.description }}
            </n-text>
            <!-- 信息 -->
            <n-flex class="meta">
              <!-- 艺术家/创建者 -->
              <div
                v-if="
                  (config.showArtist || config.showCreator) &&
                  settingStore.playlistPageElements.creator
                "
                class="item"
              >
                <SvgIcon name="Person" :depth="3" />
                <div
                  v-if="config.showArtist && Array.isArray(detailData.artists)"
                  class="artists text-hidden"
                >
                  <n-text
                    v-for="(ar, arIndex) in detailData.artists"
                    :key="arIndex"
                    class="ar"
                    @click="openJumpArtist(detailData.artists, ar.id)"
                  >
                    {{
                      settingStore.hideBracketedContent
                        ? removeBrackets(ar.name)
                        : ar.name || "未知艺术家"
                    }}
                  </n-text>
                </div>
                <div
                  v-else-if="config.showArtist"
                  class="artists text-hidden"
                  @click="openJumpArtist(detailData.artists || '')"
                >
                  <n-text class="ar">
                    {{
                      settingStore.hideBracketedContent
                        ? removeBrackets(
                            typeof detailData.artists === "string" ? detailData.artists : undefined,
                          )
                        : detailData.artists || "未知艺术家"
                    }}
                  </n-text>
                </div>
                <n-text v-else-if="config.showCreator">
                  {{ detailData.creator?.name || "未知用户名" }}
                </n-text>
              </div>
              <!-- 歌曲数量 -->
              <div v-if="config.showCount" class="item">
                <SvgIcon name="Music" :depth="3" />
                <n-text>{{ detailData.count }}</n-text>
              </div>
              <!-- 更新时间 -->
              <div
                v-if="detailData.updateTime && settingStore.playlistPageElements.time"
                class="item"
              >
                <SvgIcon name="Update" :depth="3" />
                <n-text>{{ formatTimestamp(detailData.updateTime) }}</n-text>
              </div>
              <!-- 创建时间 -->
              <div
                v-else-if="detailData.createTime && settingStore.playlistPageElements.time"
                class="item"
              >
                <SvgIcon name="Time" :depth="3" />
                <n-text>{{ formatTimestamp(detailData.createTime) }}</n-text>
              </div>
              <!-- 标签 -->
              <div
                v-if="detailData.tags?.length && settingStore.playlistPageElements.tags"
                class="item hidden"
              >
                <SvgIcon name="Tag" :depth="3" />
                <n-flex class="tags">
                  <n-tag
                    v-for="(item, index) in detailData.tags"
                    :key="index"
                    :bordered="false"
                    round
                    @click="handleTagClick(item)"
                  >
                    {{ item }}
                  </n-tag>
                </n-flex>
              </div>
            </n-flex>
          </n-collapse-transition>
          <n-flex class="menu" justify="space-between">
            <n-flex class="left" align="flex-end">
              <!-- 播放按钮 -->
              <n-button
                :focusable="false"
                :disabled="loading"
                :loading="loading"
                type="primary"
                strong
                secondary
                round
                @click="handlePlayAll"
              >
                <template #icon>
                  <SvgIcon name="Play" />
                </template>
                {{ playButtonText }}
              </n-button>
              <!-- 自定义按钮插槽 -->
              <slot name="action-buttons" :detail-data="detailData" />
              <!-- 更多操作 -->
              <n-dropdown
                v-if="moreOptions?.length"
                :options="moreOptions"
                trigger="click"
                placement="bottom-start"
              >
                <n-button :focusable="false" class="more" circle strong secondary>
                  <template #icon>
                    <SvgIcon name="List" />
                  </template>
                </n-button>
              </n-dropdown>
            </n-flex>
            <n-flex class="right" :align="config.searchAlign || 'center'">
              <!-- 模糊搜索 -->
              <n-input
                v-if="showSearch && listData?.length"
                :value="searchValue"
                :input-props="{ autocomplete: 'off' }"
                class="search"
                placeholder="模糊搜索"
                clearable
                round
                @update:value="handleSearch"
              >
                <template #prefix>
                  <SvgIcon name="Search" />
                </template>
              </n-input>
              <!-- 查看评论 -->
              <n-tabs
                v-if="!hideCommentTab"
                v-model:value="currentTab"
                class="tabs"
                type="segment"
                @update:value="handleTabChange"
              >
                <n-tab name="songs">
                  歌曲
                  <n-text v-if="detailData?.count" class="count" depth="3">
                    {{ detailData?.count }}
                  </n-text>
                </n-tab>
                <n-tab name="comments"> 评论 </n-tab>
              </n-tabs>
            </n-flex>
          </n-flex>
        </div>
      </div>
      <div v-else class="detail">
        <n-skeleton class="cover" />
        <div class="data">
          <n-skeleton :repeat="4" text />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { CoverType, SongType } from "@/types/main";
import type { DropdownOption } from "naive-ui";
import { coverLoaded, formatNumber } from "@/utils/helper";
import { removeBrackets } from "@/utils/format";
import { renderToolbar } from "@/utils/meta";
import { formatTimestamp } from "@/utils/time";
import { openDescModal, openJumpArtist } from "@/utils/modal";
import { useSettingStore } from "@/stores";

interface ListDetailConfig {
  // 标题类型
  titleType?: "ellipsis" | "normal";
  // 显示项
  showCoverMask?: boolean;
  showPlayCount?: boolean;
  showArtist?: boolean;
  showCreator?: boolean;
  showCount?: boolean;
  // 搜索框对齐方式
  searchAlign?: "center" | "flex-end";
}

interface Props {
  detailData: CoverType | null;
  listData: SongType[];
  loading: boolean;
  listScrolling: boolean;
  searchValue: string;
  showSearch?: boolean;
  hideCommentTab?: boolean;
  config: ListDetailConfig;
  titleText?: string;
  playButtonText?: string;
  moreOptions?: DropdownOption[];
}

const props = withDefaults(defineProps<Props>(), {
  showSearch: true,
  hideCommentTab: false,
  titleText: "",
  playButtonText: "播放",
  moreOptions: () => [],
});

const emit = defineEmits<{
  "update:searchValue": [value: string];
  "play-all": [];
  "tab-change": [value: "songs" | "comments"];
}>();

const router = useRouter();
const settingStore = useSettingStore();

// 当前 tab
const currentTab = ref<"songs" | "comments">("songs");

// 标题文本
const titleText = computed(() => {
  if (props.titleText) return props.titleText;
  return props.detailData?.name || "未知";
});

// 处理播放全部
const handlePlayAll = () => {
  emit("play-all");
};

// 处理搜索
const handleSearch = (val: string) => {
  if ((!val || !val.trim()) && !props.searchValue) return;
  emit("update:searchValue", val);
};

// 处理标签点击
const handleTagClick = (tag: string) => {
  router.push({
    name: "discover-playlists",
    query: { cat: tag },
  });
};

// 处理描述点击
const handleDescriptionClick = () => {
  if (props.detailData?.description) {
    const title =
      props.titleText || (props.config.titleType === "ellipsis" ? "专辑简介" : "节目简介");
    openDescModal(props.detailData.description, title);
  }
};

// 处理 tab 切换
const handleTabChange = (value: "songs" | "comments") => {
  currentTab.value = value;
  emit("tab-change", value);
};
</script>

<style lang="scss" scoped>
.list-detail {
  display: flex;
  flex-direction: column;
  .detail {
    position: absolute;
    display: flex;
    height: 240px;
    width: 100%;
    padding: 12px 0 24px 0;
    will-change: height, opacity;
    z-index: 1;
    transition:
      height 0.3s,
      opacity 0.3s;
    .cover {
      position: relative;
      display: flex;
      width: auto;
      height: 100%;
      aspect-ratio: 1/1;
      margin-right: 20px;
      border-radius: 8px;
      transition:
        opacity 0.3s,
        margin 0.3s,
        transform 0.3s;
      :deep(img) {
        width: 100%;
        height: 100%;
        opacity: 0;
        transition: opacity 0.35s ease-in-out;
      }
      .cover-img {
        border-radius: 8px;
        overflow: hidden;
        z-index: 1;
        transition:
          opacity 0.3s,
          filter 0.3s,
          transform 0.3s;
      }
      .cover-shadow {
        position: absolute;
        top: 6px;
        height: 100%;
        width: 100%;
        filter: blur(12px) opacity(0.6);
        transform: scale(0.92, 0.96);
        z-index: 0;
        background-size: cover;
        aspect-ratio: 1/1;
        :deep(img) {
          opacity: 1;
        }
      }
      .cover-mask {
        position: absolute;
        top: 0;
        left: 0;
        height: 30%;
        width: 100%;
        border-radius: 8px;
        overflow: hidden;
        z-index: 1;
        background: linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0));
        transition: opacity 0.3s;
      }
      .play-count {
        position: absolute;
        display: flex;
        align-items: center;
        top: 10px;
        right: 12px;
        color: #fff;
        font-weight: bold;
        z-index: 2;
        transition: opacity 0.3s;
        .n-icon {
          color: #fff;
          font-size: 16px;
          margin-right: 4px;
        }
      }
      &:active {
        transform: scale(0.98);
      }
    }
    .data {
      position: relative;
      display: flex;
      flex-direction: column;
      flex: 1;
      padding-right: 60px;
      :deep(.n-skeleton) {
        margin-bottom: 12px;
        border-radius: 8px;
        height: 32px;
      }
      .description {
        margin-bottom: 8px;
        cursor: pointer;
      }
      .name {
        font-size: 30px;
        font-weight: bold;
        margin-bottom: 12px;
        transition:
          font-size 0.3s var(--n-bezier),
          color 0.3s var(--n-bezier);
        .n-icon {
          cursor: pointer;
          transform: translateY(2px);
        }
      }
      .collapse {
        position: absolute;
        left: 0;
        top: 60px;
        margin-bottom: 12px;
      }
      .meta {
        .item {
          display: flex;
          align-items: center;
          .n-icon {
            font-size: 20px;
            margin-right: 4px;
          }
          .ar {
            display: inline-flex;
            cursor: pointer;
            &::after {
              content: "/";
              margin: 0 4px;
            }
            &:last-child {
              &::after {
                display: none;
              }
            }
          }
          .tags {
            margin-left: 4px;
            .n-tag {
              font-size: 13px;
              padding: 0 16px;
              line-height: 0;
              cursor: pointer;
              transition:
                transform 0.3s,
                background-color 0.3s,
                color 0.3s;
              &:hover {
                background-color: rgba(var(--primary), 0.14);
              }
              &:active {
                transform: scale(0.95);
              }
            }
          }
        }
      }
      .menu {
        position: absolute;
        left: 0;
        bottom: 0;
        width: 100%;
        :deep(.n-button) {
          height: 40px;
          transition: all 0.3s var(--n-bezier);
        }
        .more {
          width: 40px;
        }
        .search {
          height: 40px;
          width: 130px;
          display: flex;
          align-items: center;
          border-radius: 25px;
          transition: all 0.3s var(--n-bezier);
          &.n-input--focus {
            width: 200px;
          }
        }
        .tabs {
          width: 200px;
          --n-tab-border-radius: 25px !important;
          :deep(.n-tabs-rail) {
            outline: 1px solid var(--n-tab-color-segment);
          }
          .count {
            line-height: normal;
            font-size: 12px;
            margin-left: 2px;
            transform: translateY(-4px);
          }
        }
      }
      @media (max-width: 1200px) {
        .right {
          display: none !important;
        }
      }
      @media (max-width: 768px) {
        .hidden {
          display: none !important;
        }
      }
    }
    @media (max-width: 768px) {
      height: 180px;
      .cover {
        margin-right: 12px;
      }
      .data {
        padding-right: 20px;
        .name {
          font-size: 22px;
          margin-bottom: 8px;
        }
        .collapse {
          top: 42px;
        }
        .menu {
          :deep(.n-button) {
            height: 34px;
            --n-font-size: 13px;
            --n-padding: 0 14px;
            --n-icon-size: 16px;
          }
        }
      }
    }
  }
  &.small {
    .detail {
      height: 120px;
      .cover {
        margin-right: 12px;
        .cover-mask,
        .play-count {
          opacity: 0;
        }
      }
      .data {
        .name {
          font-size: 22px;
        }
        .menu {
          :deep(.n-button),
          .search,
          .tabs {
            height: 32px;
            --n-font-size: 13px;
            --n-padding: 0 14px;
            --n-icon-size: 16px;
            --n-tab-font-size: 13px;
            --n-tab-padding: 2px 0;
          }
        }
      }
    }
  }
}
</style>
