<template>
  <div class="download-downloading">
    <Transition name="fade" mode="out-in">
      <div v-if="dataStore.downloadingSongs.length > 0" class="download-list">
        <!-- 列表头 -->
        <div class="list-header sticky-header">
          <n-text class="num">#</n-text>
          <n-text class="title">标题</n-text>
          <n-text class="status">下载状态</n-text>
          <n-text class="actions">操作</n-text>
        </div>

        <!-- 列表内容 -->
        <n-scrollbar class="virtual-list">
          <div
            v-for="(item, index) in sortedDownloadingSongs"
            :key="item.song.id"
            class="download-item"
          >
            <!-- 序号 -->
            <div class="num">
              <n-text depth="3">{{ index + 1 }}</n-text>
            </div>
            <!-- 标题 (封面 + 信息) -->
            <div class="title">
              <s-image :src="item.song.coverSize?.s || item.song.cover" class="cover" />
              <div class="info">
                <div class="name">
                  <n-text class="name-text" ellipsis>{{ item.song.name }}</n-text>
                </div>
                <div class="artists text-hidden">
                  <n-text depth="3">
                    {{
                      Array.isArray(item.song.artists)
                        ? item.song.artists.map((a) => a.name).join(" / ")
                        : item.song.artists
                    }}
                  </n-text>
                </div>
              </div>
            </div>
            <!-- 状态 -->
            <div class="status">
              <n-flex vertical :size="6" style="width: 100%">
                <n-flex justify="space-between">
                  <n-text
                    :type="item.status === 'failed' ? 'error' : undefined"
                    :depth="item.status === 'failed' ? undefined : '3'"
                    style="font-size: 12px"
                  >
                    {{
                      item.status === "downloading"
                        ? `${item.progress}%`
                        : item.status === "waiting"
                          ? "等待下载..."
                          : "下载失败"
                    }}
                  </n-text>
                  <n-text v-if="item.status === 'downloading'" depth="3" style="font-size: 12px">
                    {{ item.transferred }} / {{ item.totalSize }}
                  </n-text>
                </n-flex>
                <n-progress
                  type="line"
                  :percentage="item.status === 'downloading' ? item.progress : 0"
                  :show-indicator="false"
                  :status="item.status === 'failed' ? 'error' : undefined"
                  :class="item.status === 'downloading' ? 'downloading-progress' : ''"
                  style="height: 4px"
                />
              </n-flex>
            </div>
            <!-- 操作 -->
            <n-flex align="center" justify="center" class="actions">
              <n-button
                v-if="item.status === 'failed'"
                type="primary"
                secondary
                strong
                @click="downloadManager.retryDownload(item.song.id)"
              >
                <template #icon>
                  <SvgIcon name="Refresh" />
                </template>
              </n-button>
              <n-button type="error" secondary strong @click="handleRemoveDownload(item.song.id)">
                <template #icon>
                  <SvgIcon name="Close" />
                </template>
              </n-button>
            </n-flex>
          </div>
        </n-scrollbar>
      </div>
      <n-empty v-else description="暂无正在下载的任务" class="empty" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useDataStore } from "@/stores";
import { useDownloadManager } from "@/core/resource/DownloadManager";

const dataStore = useDataStore();
const downloadManager = useDownloadManager();
const sortedDownloadingSongs = computed(() => {
  return [...dataStore.downloadingSongs].sort((a, b) => {
    // 优先级: 下载中 (1) > 等待中 (2) > 失败 (3)
    const getPriority = (status: string) => {
      if (status === "downloading") return 1;
      if (status === "waiting") return 2;
      return 3;
    };
    return getPriority(a.status) - getPriority(b.status);
  });
});

const handleRemoveDownload = (id: number) => {
  downloadManager.removeDownload(id);
  window.$message.success("已删除下载任务");
};
</script>

<style lang="scss" scoped>
.download-downloading {
  height: 100%;

  .download-list {
    height: 100%;
    display: flex;
    flex-direction: column;

    .list-header {
      display: flex;
      align-items: center;
      padding: 0 12px;
      height: 40px;
      // background-color: var(--background-hex);
      font-weight: normal;

      .n-text {
        opacity: 0.6;
      }

      &.sticky-header {
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .num {
        width: 60px;
        text-align: center;
      }
      .title {
        flex: 1;
        padding-left: 12px;
      }
      .status {
        flex: 1;
        padding-left: 12px;
      }
      .actions {
        width: 120px;
        text-align: center;
      }
    }

    .virtual-list {
      height: calc(100% - 40px) !important;

      .download-item {
        display: flex;
        align-items: center;
        padding: 12px;
        border-radius: 12px;
        border: 2px solid rgba(var(--primary), 0.12);
        background-color: var(--surface-container-hex);
        margin-bottom: 12px;
        transition: border-color 0.3s;

        &:hover {
          border-color: rgba(var(--primary), 0.58);
        }

        .num {
          width: 60px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-width: 60px;
        }

        .title {
          flex: 1;
          display: flex;
          align-items: center;
          overflow: hidden;
          padding-right: 20px;
          padding-left: 12px;

          .cover {
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            width: 50px;
            height: 50px;
            border-radius: 8px;
            margin-right: 12px;
            min-width: 50px;
          }

          .info {
            display: flex;
            flex-direction: column;
            overflow: hidden;
            flex: 1;

            .name {
              display: flex;
              align-items: center;
              margin-bottom: 4px;
              overflow: hidden;

              .name-text {
                font-size: 16px;
                margin-right: 8px;
              }
            }

            .artists {
              font-size: 12px;
            }
          }
        }

        .status {
          flex: 1;
          padding-right: 20px;
          padding-left: 12px;

          .downloading-progress {
            --n-fill-color: rgb(var(--primary));
          }
        }

        .actions {
          width: 120px;
          display: flex;
          justify-content: center;
          min-width: 120px;
          .n-button {
            border-radius: 8px;
          }
        }
      }
    }
  }

  .empty {
    margin-top: 60px;
  }
}
</style>
