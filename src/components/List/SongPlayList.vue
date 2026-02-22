<!-- 播放列表 -->
<template>
  <n-drawer
    v-model:show="statusStore.playListShow"
    :class="{ 'full-player': statusStore.showFullPlayer }"
    :auto-focus="false"
    id="main-playlist"
    style="width: 400px"
  >
    <n-drawer-content :native-scrollbar="false" closable>
      <template #header>
        <div class="playlist-header">
          <n-text class="name">播放队列</n-text>
          <n-text class="count" depth="3"> {{ dataStore.playList.length }} 首歌曲 </n-text>
        </div>
      </template>
      <Transition name="fade" mode="out-in">
        <!-- 播放列表 -->
        <VirtualScroll
          v-if="dataStore.playList.length"
          ref="playListRef"
          :item-height="80"
          :item-fixed="true"
          :items="playListData"
          :default-scroll-index="statusStore.playIndex"
          class="playlist-list"
          :class="{ 'is-dragging-global': isDragging }"
          style="max-height: calc(100vh - 142px)"
          :height="`calc(100vh - 142px)`"
        >
          <template #default="{ item: songData, index }">
            <div class="song-node">
              <div
                v-if="
                  isDragging && dropIndicator.index === index && dropIndicator.position === 'top'
                "
                class="drop-line line-top"
              ></div>
              <div
                v-if="
                  isDragging && dropIndicator.index === index && dropIndicator.position === 'bottom'
                "
                class="drop-line line-bottom"
              ></div>

              <div
                :key="songData.key"
                :class="[
                  'song-item',
                  { on: statusStore.playIndex === index },
                  { 'is-dragging': isDragging && draggedIndex === index },
                ]"
                v-debounce="
                  () => {
                    player.togglePlayIndex(index, true);
                    statusStore.playListShow = false;
                  }
                "
              >
                <!-- 拖拽手柄 -->
                <div
                  class="drag-handle"
                  @mousedown="handleDragStart($event, index, songData)"
                  @touchstart.passive="handleDragStart($event, index, songData)"
                  @click.stop
                >
                  <SvgIcon :size="20" name="Menu" />
                </div>

                <!-- 序号 -->
                <div class="index">
                  <n-text
                    v-if="statusStore.playIndex !== index"
                    :class="['num', { big: index + 1 > 9999 }]"
                    depth="3"
                  >
                    {{ index + 1 }}
                  </n-text>
                  <SvgIcon v-else :size="20" name="Music" />
                </div>
                <!-- 信息 -->
                <div class="data">
                  <n-text class="name text-hidden">{{ songData.name || "未知曲目" }}</n-text>
                  <div v-if="Array.isArray(songData?.artists)" class="artists">
                    <n-text v-for="ar in songData.artists" :key="ar.id" depth="3" class="ar">
                      {{ settingStore.hideBracketedContent ? removeBrackets(ar.name) : ar.name }}
                    </n-text>
                  </div>
                  <div v-else-if="songData.type === 'radio'" class="artists">
                    <n-text class="ar" depth="3"> 播客电台 </n-text>
                  </div>
                  <div v-else class="artists">
                    <n-text class="ar" depth="3">
                      {{
                        settingStore.hideBracketedContent
                          ? removeBrackets(songData?.artists)
                          : songData?.artists || "未知艺术家"
                      }}
                    </n-text>
                  </div>
                </div>
                <!-- 移除 -->
                <div class="remove" @click.stop="player.removeSongIndex(index)">
                  <SvgIcon :size="20" name="Delete" />
                </div>
              </div>
            </div>
          </template>
        </VirtualScroll>
        <n-empty
          v-else
          description="播放列表暂无歌曲，快去添加吧"
          class="tip"
          size="large"
          style="margin-top: 60px"
        />
      </Transition>
      <template #footer>
        <n-grid :cols="2" x-gap="16" class="playlist-menu">
          <n-gi>
            <n-button :focusable="false" size="large" strong secondary @click="cleanPlayList">
              <template #icon>
                <SvgIcon name="DeleteSweep" />
              </template>
              清空列表
            </n-button>
          </n-gi>
          <n-gi>
            <n-button
              :focusable="false"
              size="large"
              strong
              secondary
              @click="scrollToItem(statusStore.playIndex)"
            >
              <template #icon>
                <SvgIcon name="Location" />
              </template>
              当前播放
            </n-button>
          </n-gi>
        </n-grid>
      </template>

      <Teleport to="body">
        <Transition name="fade">
          <div
            v-if="isDragging && dragLabelData"
            class="drag-label"
            :class="{
              'full-player-drag-label': statusStore.showFullPlayer,
            }"
            :style="{
              top: `${dragLabelPosition.top}px`,
              left: `${dragLabelPosition.left}px`,
            }"
          >
            <n-text class="drag-label-name">{{ dragLabelData.name || "未知曲目" }}</n-text>
          </div>
        </Transition>
      </Teleport>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import VirtualScroll from "@/components/UI/VirtualScroll.vue";
import { usePlayerController } from "@/core/player/PlayerController";
import { useDataStore, useSettingStore, useStatusStore } from "@/stores";
import type { SongType } from "@/types/main";
import { removeBrackets } from "@/utils/format";

const dataStore = useDataStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();
const player = usePlayerController();

const playListRef = ref<InstanceType<typeof VirtualScroll> | null>(null);

// 播放列表数据
const playListData = computed(() => {
  return dataStore.playList.map((item) => {
    return {
      ...item,
      key: item.id,
    };
  });
});

// 滚动至指定元素
const scrollToItem = (index: number) => {
  playListRef.value?.scrollToIndex(index);
};

// 清空播放列表
const cleanPlayList = () => {
  window.$dialog.warning({
    title: "清空播放列表",
    content: "确认清空全部播放列表吗？",
    positiveText: "确认",
    negativeText: "取消",
    onPositiveClick: () => {
      player.cleanPlayList();
      window.$message.success("播放列表已清空");
    },
  });
};

const isDragging = ref(false);
const draggedIndex = ref(-1);
const targetIndex = ref(-1);
const dropIndicator = reactive({ index: -1, position: "none" });

const dragLabelData = ref<SongType | null>(null);
const dragLabelPosition = reactive({ top: 0, left: 0 });

let listRect: DOMRect | null = null;
let autoScrollRafId: number | null = null;

const handleDragStart = (e: MouseEvent | TouchEvent, index: number, item: SongType) => {
  if (e.type === "mousedown") {
    e.preventDefault();
  }

  isDragging.value = true;
  draggedIndex.value = index;
  targetIndex.value = index;
  dragLabelData.value = item;

  const wrapper = playListRef.value?.wrapperRef;
  if (wrapper) {
    listRect = wrapper.getBoundingClientRect();
  }

  updateDragLabelPosition(e);

  window.addEventListener("mousemove", handleDragMove);
  window.addEventListener("touchmove", handleDragMove, { passive: false });
  window.addEventListener("mouseup", handleDragEnd);
  window.addEventListener("touchend", handleDragEnd);
};

const handleDragMove = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return;
  if (e.cancelable) e.preventDefault();

  updateDragLabelPosition(e);

  if (!listRect) return;
  const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

  handleAutoScroll(clientY, listRect);

  calculateTargetIndex(clientY);
};

const handleDragEnd = () => {
  if (draggedIndex.value !== targetIndex.value && targetIndex.value !== -1) {
    player.moveSong(draggedIndex.value, targetIndex.value);
  }

  cleanupDragState();
};

const cleanupDragState = () => {
  stopAutoScroll();

  isDragging.value = false;
  draggedIndex.value = -1;
  targetIndex.value = -1;
  dropIndicator.index = -1;
  dropIndicator.position = "none";
  dragLabelData.value = null;

  window.removeEventListener("mousemove", handleDragMove);
  window.removeEventListener("touchmove", handleDragMove);
  window.removeEventListener("mouseup", handleDragEnd);
  window.removeEventListener("touchend", handleDragEnd);
};

const calculateTargetIndex = (clientY: number) => {
  if (!listRect || !playListRef.value) return;

  const currentScrollTop = playListRef.value.getScrollTop() || 0;
  const paddingTop = 16;
  const relativeY = clientY - listRect.top + currentScrollTop - paddingTop;
  const dropInfo = playListRef.value.getDropInfoByOffset(relativeY);

  let gapIndex = dropInfo.index;
  if (dropInfo.position === "bottom") {
    gapIndex += 1;
  }

  const maxGap = dataStore.playList.length;
  gapIndex = Math.max(0, Math.min(gapIndex, maxGap));

  if (gapIndex === maxGap) {
    dropIndicator.index = maxGap - 1;
    dropIndicator.position = "bottom";
  } else {
    dropIndicator.index = gapIndex;
    dropIndicator.position = "top";
  }

  let insertIndex = draggedIndex.value;

  if (draggedIndex.value < gapIndex) {
    insertIndex = gapIndex - 1;
  } else if (draggedIndex.value > gapIndex) {
    insertIndex = gapIndex;
  }

  targetIndex.value = Math.max(0, Math.min(insertIndex, maxGap - 1));
};

const updateDragLabelPosition = (e: MouseEvent | TouchEvent) => {
  const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
  const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

  dragLabelPosition.left = clientX;
  dragLabelPosition.top = clientY;
};

const handleAutoScroll = (clientY: number, rect: DOMRect) => {
  const edgeThreshold = 40;
  const scrollSpeed = 12;

  if (clientY < rect.top + edgeThreshold) {
    startAutoScroll(-scrollSpeed);
  } else if (clientY > rect.bottom - edgeThreshold) {
    startAutoScroll(scrollSpeed);
  } else {
    stopAutoScroll();
  }
};

const startAutoScroll = (amount: number) => {
  if (autoScrollRafId !== null) return;

  let expectedScroll = playListRef.value?.getScrollTop() || 0;

  const scrollStep = () => {
    if (!isDragging.value) return stopAutoScroll();

    const actualScroll = playListRef.value?.getScrollTop() || 0;
    if (Math.abs(actualScroll - expectedScroll) > Math.abs(amount) * 3) {
      expectedScroll = actualScroll;
    }

    expectedScroll = Math.max(0, expectedScroll + amount);
    playListRef.value?.scrollTo(expectedScroll, "auto");

    calculateTargetIndex(dragLabelPosition.top);

    autoScrollRafId = requestAnimationFrame(scrollStep);
  };
  autoScrollRafId = requestAnimationFrame(scrollStep);
};

const stopAutoScroll = () => {
  if (autoScrollRafId !== null) {
    cancelAnimationFrame(autoScrollRafId);
    autoScrollRafId = null;
  }
};

onUnmounted(() => {
  cleanupDragState();
});
</script>

<style lang="scss" scoped>
.playlist-header {
  display: flex;
  flex-direction: column;
  .count {
    margin-top: 8px;
    font-size: 12px;
  }
}
.playlist-list {
  height: 100%;
  padding: 16px;

  &.is-dragging-global {
    cursor: grabbing;

    * {
      cursor: grabbing;
    }

    .song-item {
      pointer-events: none;
    }
  }

  .song-node {
    position: relative;
    padding: 8px 0;

    .drop-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background-color: var(--primary-hex);
      border-radius: 2px;
      z-index: 10;
      pointer-events: none;

      &.line-top {
        top: 0;
      }
      &.line-bottom {
        bottom: 0;
      }
    }
  }

  .song-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-direction: row;
    min-height: 64px;
    overflow: hidden;
    border-radius: 8px;
    margin-bottom: 0;
    padding: 0 12px;
    border: 1px solid transparent;
    background-color: rgba(var(--primary), 0.08);
    cursor: pointer;
    transition:
      transform 0.3s,
      border-color 0.3s,
      background-color 0.3s,
      opacity 0.2s;

    &.is-dragging {
      opacity: 0.3;
      transform: scale(0.95);
      border-color: rgba(var(--primary), 0.5);
    }

    .drag-handle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 100%;
      cursor: grab;
      color: rgba(var(--text-color), 0.3);
      transition: color 0.3s;
      margin-right: 4px;

      &:hover {
        color: rgba(var(--text-color), 0.8);
      }
      &:active {
        cursor: grabbing;
      }
    }
    .index {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      min-width: 36px;
      margin-right: 8px;
      .num {
        &.big {
          font-size: 12px;
        }
      }
    }
    .data {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      width: 100%;
      height: 100%;
      padding: 8px 0;
      .artists {
        display: -webkit-box;
        line-clamp: 1;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
        overflow: hidden;
        word-break: break-all;
        .ar {
          font-size: 12px;
          display: inline-flex;
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
      }
    }
    .remove {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      border-radius: 8px;
      transition: background-color 0.3s;
      cursor: pointer;
      &:hover {
        background-color: rgba(var(--primary), 0.29);
      }
    }
    &.on {
      border-color: var(--primary-hex);
      background-color: rgba(var(--primary), 0.29);
    }
    &:hover {
      border-color: var(--primary-hex);
    }
  }
}
.playlist-menu {
  height: 40px;
  .n-button {
    width: 100%;
    border-radius: 8px;
  }
}

.drag-label {
  position: fixed;
  z-index: 9999;
  padding: 8px 16px;
  border-radius: 20px;
  background-color: rgba(var(--primary), 0.15);
  backdrop-filter: blur(8px);
  pointer-events: none;
  transform: translate(12px, 12px);

  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 500;
  color: rgba(var(--text-color), 0.3);

  &.full-player-drag-label {
    background-color: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<style lang="scss">
#main-playlist {
  --n-border-radius: 12px;
  .n-drawer-header {
    height: 70px;
  }
  .n-scrollbar-content {
    padding: 0;
    height: 100%;
  }
  .custom-virtual-list {
    .n-scrollbar-content {
      height: auto;
    }
  }
  .n-drawer-footer {
    height: 72px;
    padding: 16px;
  }
  &.full-player {
    --n-color: rgb(var(--main-cover-color));
    --n-close-icon-color: rgba(var(--main-cover-color), 0.58);
    background-color: transparent;
    box-shadow: none;
    .n-drawer-header,
    .n-drawer-footer {
      border: none;
    }
    a,
    span,
    .n-icon {
      color: rgb(var(--main-cover-color));
    }
    .n-button {
      --n-color: rgba(var(--main-cover-color), 0.08);
      --n-color-hover: rgba(var(--main-cover-color), 0.12);
      --n-color-pressed: var(--n-color);
      --n-color-focus: var(--n-color-hover);
    }
    .playlist-list {
      .song-node {
        .drop-line {
          background-color: rgb(var(--main-cover-color));
          &::before {
            background-color: rgb(var(--main-cover-color));
          }
        }
      }
      .song-item {
        background-color: rgba(var(--main-cover-color), 0.08);
        &.on {
          border-color: rgb(var(--main-cover-color));
        }
        &:hover {
          border-color: rgb(var(--main-cover-color));
        }
        .num {
          color: rgba(var(--main-cover-color), 0.52);
        }
      }
    }
  }
}
</style>
