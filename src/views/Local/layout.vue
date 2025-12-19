<template>
  <div class="local">
    <div class="title">
      <n-text class="keyword">本地歌曲</n-text>
      <n-flex class="status">
        <n-text class="item">
          <SvgIcon name="Music" :depth="3" />
          <n-number-animation :from="0" :to="localStore.localSongs?.length || 0" /> 首歌曲
        </n-text>
        <n-text class="item">
          <SvgIcon name="Storage" :depth="3" />
          <n-number-animation :from="0" :to="allMusicSize" :precision="2" /> GB
        </n-text>
      </n-flex>
    </div>
    <n-flex class="menu" justify="space-between">
      <n-flex class="left" align="flex-end">
        <n-button
          :focusable="false"
          :disabled="loading && !localStore.localSongs?.length"
          :loading="loading"
          type="primary"
          strong
          secondary
          round
          v-debounce="() => player.updatePlayList(listData)"
        >
          <template #icon>
            <SvgIcon name="Play" />
          </template>
          播放
        </n-button>
        <n-button
          :disabled="loading"
          :loading="loading"
          :focusable="false"
          class="more"
          strong
          secondary
          circle
          @click="getAllLocalMusic(true)"
        >
          <template #icon>
            <SvgIcon name="Refresh" />
          </template>
        </n-button>
        <!-- 更多 -->
        <n-dropdown :options="moreOptions" trigger="click" placement="bottom-start">
          <n-button :focusable="false" class="more" circle strong secondary>
            <template #icon>
              <SvgIcon name="List" />
            </template>
          </n-button>
        </n-dropdown>
      </n-flex>
      <n-flex class="right" justify="end">
        <!-- 模糊搜索 -->
        <n-input
          v-if="localStore.localSongs?.length"
          v-model:value="searchValue"
          :input-props="{ autocomplete: 'off' }"
          class="search"
          placeholder="模糊搜索"
          clearable
          round
          @input="listSearch"
        >
          <template #prefix>
            <SvgIcon name="Search" />
          </template>
        </n-input>
        <n-tabs
          v-model:value="localType"
          class="tabs"
          type="segment"
          @update:value="handleTabUpdate"
        >
          <n-tab :disabled="tabsDisabled" name="local-songs"> 单曲 </n-tab>
          <n-tab :disabled="tabsDisabled" name="local-artists"> 歌手 </n-tab>
          <n-tab :disabled="tabsDisabled" name="local-albums"> 专辑 </n-tab>
          <n-tab :disabled="tabsDisabled" name="local-folders"> 文件夹 </n-tab>
        </n-tabs>
      </n-flex>
    </n-flex>
    <!-- 路由 -->
    <RouterView v-if="!showEmptyState" v-slot="{ Component }">
      <Transition :name="`router-${settingStore.routeAnimation}`" mode="out-in">
        <KeepAlive v-if="settingStore.useKeepAlive">
          <component :is="Component" :data="listData" :loading="loading" class="router-view" />
        </KeepAlive>
        <component v-else :is="Component" :data="listData" :loading="loading" class="router-view" />
      </Transition>
    </RouterView>
    <!-- 空状态 -->
    <n-flex v-else align="center" justify="center" vertical class="router-view">
      <n-empty size="large" description="当前本地歌曲为空">
        <template #extra>
          <n-button type="primary" strong secondary @click="localPathShow = true">
            <template #icon>
              <SvgIcon name="FolderCog" />
            </template>
            本地目录管理
          </n-button>
        </template>
      </n-empty>
    </n-flex>
    <!-- 目录管理 -->
    <n-modal
      v-model:show="localPathShow"
      :close-on-esc="false"
      :mask-closable="false"
      preset="card"
      title="目录管理"
      transform-origin="center"
      style="width: 600px"
    >
      <n-list class="local-list" hoverable clickable bordered>
        <template #header>
          <n-text>请选择本地音乐文件夹，将自动扫描您添加的目录，歌曲增删实时同步</n-text>
        </template>
        <n-list-item v-for="(item, index) in settingStore.localFilesPath" :key="index">
          <template #prefix>
            <SvgIcon :size="20" name="Folder" />
          </template>
          <template #suffix>
            <n-button quaternary @click="changeLocalMusicPath(index)">
              <template #icon>
                <SvgIcon :size="20" name="Delete" />
              </template>
            </n-button>
          </template>
          <n-thing :title="item" />
        </n-list-item>
      </n-list>
      <template #footer>
        <n-flex justify="center">
          <n-button class="add-path" strong secondary @click="changeLocalMusicPath()">
            <template #icon>
              <SvgIcon name="FolderPlus" />
            </template>
            添加文件夹
          </n-button>
        </n-flex>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import type { DropdownOption, MessageReactive } from "naive-ui";
import { useLocalStore, useSettingStore } from "@/stores";
import { formatSongsList } from "@/utils/format";
import { debounce } from "lodash-es";
import { changeLocalMusicPath, fuzzySearch, renderIcon } from "@/utils/helper";
import { openBatchList } from "@/utils/modal";
import { usePlayerController } from "@/core/player/PlayerController";

const router = useRouter();
const localStore = useLocalStore();
const settingStore = useSettingStore();
const player = usePlayerController();

const loading = ref<boolean>(false);
const loadingMsg = ref<MessageReactive | null>(null);
const syncProgress = ref<{ current: number; total: number }>({ current: 0, total: 0 });

// 本地歌曲总线
const localEventBus = useEventBus("local");

// 本地歌曲路由
const localType = ref<string>((router.currentRoute.value?.name as string) || "local-songs");

// 模糊搜索数据
const searchValue = ref<string>("");
const searchData = ref<SongType[]>([]);

// 目录管理
const localPathShow = ref<boolean>(false);

// 列表数据
const listData = computed<SongType[]>(() => {
  if (searchValue.value && searchData.value.length) return searchData.value;
  return localStore.localSongs;
});

// 是否存在配置目录与歌曲
const hasConfig = computed<boolean>(() => settingStore.localFilesPath.length > 0);
const hasSong = computed<boolean>(() => localStore.localSongs.length > 0);
const tabsDisabled = computed<boolean>(() => !hasConfig.value || !hasSong.value);

// 当前是否在本地单曲路由
const isLocalSongsRoute = computed<boolean>(
  () => (router.currentRoute.value?.name as string) === "local-songs",
);

// 是否展示空状态
const showEmptyState = computed<boolean>(() => isLocalSongsRoute.value && !hasSong.value);

// 获取音乐文件夹（仅使用配置的本地文件夹）
const getMusicFolder = async (): Promise<string[]> => {
  const paths = [...settingStore.localFilesPath];
  // 过滤空路径
  return paths.filter((p) => p && p.trim() !== "");
};

// 全部音乐大小
const allMusicSize = computed<number>(() => {
  const total = localStore.localSongs.reduce((total, song) => (total += song?.size || 0), 0);
  return Number((total / 1024).toFixed(2));
});

// 更多操作
const moreOptions = computed<DropdownOption[]>(() => [
  {
    label: "本地目录管理",
    key: "folder",
    props: {
      onClick: () => (localPathShow.value = true),
    },
    icon: renderIcon("FolderCog"),
  },
  {
    label: "批量操作",
    key: "batch",
    props: {
      onClick: () => openBatchList(listData.value, true),
    },
    icon: renderIcon("Batch"),
  },
]);

/** 主进程发送的Track数据类型 */
interface MusicTrackData {
  id: string;
  path: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  cover?: string;
  mtime: number;
  size: number;
  bitrate?: number;
}

/** 同步完成事件类型 */
interface SyncCompleteData {
  success: boolean;
  message?: string;
}

// 获取全部路径歌曲（流式接收）
const getAllLocalMusic = debounce(
  async (showTip: boolean = false) => {
    // 获取路径
    const allPath = await getMusicFolder();
    if (!allPath || !allPath.length) {
      // 目录列表为空，以目录为准，清空本地歌曲
      localStore.updateLocalSong([]);
      searchData.value = [];
      loading.value = false;
      if (showTip) {
        window.$message.info("当前未配置本地目录");
      }
      return;
    }

    // 加载提示
    if (showTip) {
      loadingMsg.value = window.$message.loading("正在获取本地歌曲", {
        duration: 0,
      });
      syncProgress.value = { current: 0, total: 0 };
    }
    loading.value = true;
    // 记录初始歌曲数量，用于计算新增数量
    const initialSongCount = localStore.localSongs.length;
    // 累积接收到的tracks
    const receivedTracks: MusicTrackData[] = [];
    let isCompleted = false;
    // 清理之前的监听器
    window.electron.ipcRenderer.removeAllListeners("music-sync-tracks-batch");
    window.electron.ipcRenderer.removeAllListeners("music-sync-complete");
    // 监听批量track数据
    const tracksBatchHandler = (_event: unknown, tracks: MusicTrackData[]) => {
      if (!loading.value || isCompleted) return;
      // 批量添加tracks
      receivedTracks.push(...tracks);
    };
    // 监听完成事件
    const completeHandler = (_event: unknown, data: SyncCompleteData) => {
      if (isCompleted) return;
      isCompleted = true;
      if (!data.success) {
        const errorMsg = data.message || "本地音乐同步失败";
        console.error("获取本地音乐失败:", errorMsg);
        window.$message.error(errorMsg);
        loading.value = false;
        loadingMsg.value?.destroy();
        loadingMsg.value = null;
        // 清理监听器
        window.electron.ipcRenderer.removeAllListeners("music-sync-tracks-batch");
        window.electron.ipcRenderer.removeAllListeners("music-sync-complete");
        return;
      }
      const adaptedDataList = receivedTracks.map((track) => {
        // 将字节转换为 MB，保留两位小数
        const sizeMB =
          track.size && track.size > 0 ? Number((track.size / (1024 * 1024)).toFixed(2)) : 0;
        return {
          id: track.id,
          name: track.title,
          artists: track.artist,
          cover: track.cover,
          album: track.album,
          duration: track.duration,
          size: sizeMB,
          path: track.path,
          quality: track.bitrate ?? 0,
        };
      });
      // 批量格式化
      const finalSongs = formatSongsList(adaptedDataList);
      localStore.updateLocalSong(finalSongs);
      // 更新搜索数据
      if (searchValue.value) {
        searchData.value = fuzzySearch(searchValue.value, finalSongs);
      }
      // 变化统计
      const addedCount = finalSongs.length - initialSongCount;
      if (showTip) {
        if (addedCount > 0) {
          window.$message.success(`新增 ${addedCount} 首歌曲`);
        } else if (finalSongs.length > 0) {
          window.$message.success(`已发现 ${finalSongs.length} 首歌曲`);
        }
      } else {
        if (addedCount > 0) {
          window.$message.success(`新增 ${addedCount} 首歌曲`);
        }
      }
      loading.value = false;
      loadingMsg.value?.destroy();
      loadingMsg.value = null;
      // 清理监听器
      window.electron.ipcRenderer.removeAllListeners("music-sync-tracks-batch");
      window.electron.ipcRenderer.removeAllListeners("music-sync-complete");
    };
    // 注册监听器
    window.electron.ipcRenderer.on("music-sync-tracks-batch", tracksBatchHandler);
    window.electron.ipcRenderer.on("music-sync-complete", completeHandler);
    // 触发同步
    try {
      // 触发同步
      const res = await window.electron.ipcRenderer.invoke("local-music-sync", allPath);
      // 检查返回值，如果是扫描正在进行中
      if (res && !res.success) {
        isCompleted = true;
        loading.value = false;
        loadingMsg.value?.destroy();
        loadingMsg.value = null;
        if (res.message && res.message.includes("扫描正在进行中")) {
          window.$message.info(res.message);
        } else {
          window.$message.error(res.message || "本地音乐同步失败");
        }
        window.electron.ipcRenderer.removeAllListeners("music-sync-tracks-batch");
        window.electron.ipcRenderer.removeAllListeners("music-sync-complete");
      }
    } catch (error) {
      isCompleted = true;
      console.error("获取本地音乐失败:", error);
      window.$message.error("获取本地音乐失败，请重试");
      loading.value = false;
      loadingMsg.value?.destroy();
      loadingMsg.value = null;
      // 清理监听器
      window.electron.ipcRenderer.removeAllListeners("music-sync-tracks-batch");
      window.electron.ipcRenderer.removeAllListeners("music-sync-complete");
    }
  },
  300,
  { leading: true, trailing: false },
);

// 模糊搜索
const listSearch = debounce((val: string) => {
  val = val.trim();
  if (!val || val === "") return;
  // 获取搜索结果
  const result = fuzzySearch(val, localStore.localSongs);
  searchData.value = result;
}, 300);

localEventBus.on(() => getAllLocalMusic());

// 本地目录变化
watch(
  () => settingStore.localFilesPath,
  async () => await getAllLocalMusic(),
  { deep: true },
);

// 处理 Tab 切换
const handleTabUpdate = (name: string) => {
  if (tabsDisabled.value) return;
  router.push({ name });
};

onBeforeRouteUpdate((to) => {
  if (to.matched[0].name !== "local") return;
  localType.value = to.name as string;
});

onMounted(() => {
  // 监听本地音乐同步进度
  const progressHandler = (_event: unknown, payload: { current: number; total: number }) => {
    if (!loading.value) return;
    const { current, total } = payload || { current: 0, total: 0 };
    if (!total || total <= 0) return;
    syncProgress.value = { current, total };
    if (loadingMsg.value) {
      loadingMsg.value.content = `正在获取本地歌曲（${current}/${total}）`;
    }
  };
  // 监听进度
  window.electron.ipcRenderer.on("music-sync-progress", progressHandler);
  getAllLocalMusic();
});

onUnmounted(() => {
  // 清理所有相关监听器
  window.electron.ipcRenderer.removeAllListeners("music-sync-progress");
  window.electron.ipcRenderer.removeAllListeners("music-sync-tracks-batch");
  window.electron.ipcRenderer.removeAllListeners("music-sync-complete");
});
</script>

<style lang="scss" scoped>
.local {
  display: flex;
  flex-direction: column;
  .title {
    display: flex;
    align-items: flex-end;
    line-height: normal;
    margin-top: 12px;
    margin-bottom: 20px;
    height: 40px;
    .keyword {
      font-size: 30px;
      font-weight: bold;
      margin-right: 12px;
      line-height: normal;
    }
    .status {
      font-size: 15px;
      font-weight: normal;
      line-height: 30px;
      .item {
        display: flex;
        align-items: center;
        opacity: 0.9;
        .n-icon {
          margin-right: 4px;
        }
      }
    }
  }
  .menu {
    width: 100%;
    margin-bottom: 20px;
    height: 40px;
    .n-button {
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
    .n-tabs {
      width: 280px;
      --n-tab-border-radius: 25px !important;
      :deep(.n-tabs-rail) {
        outline: 1px solid var(--n-tab-color-segment);
      }
    }
  }
  .router-view {
    flex: 1;
    overflow: hidden;
    max-height: calc((var(--layout-height) - 132) * 1px);
  }
}
.local-list {
  :deep(.n-list-item__prefix) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  :deep(.n-list-item__main) {
    .n-thing-main__description {
      font-size: 13px;
      opacity: 0.6;
    }
  }
}
</style>
