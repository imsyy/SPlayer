<template>
  <div class="local">
    <Transition name="fade" mode="out-in">
      <div :key="pageTitle" class="title">
        <n-text class="keyword">{{ pageTitle }}</n-text>
        <n-flex class="status">
          <n-text class="item">
            <SvgIcon name="Music" :depth="3" />
            <n-number-animation :from="0" :to="listData?.length || 0" /> 首歌曲
          </n-text>
          <n-text class="item">
            <SvgIcon name="Storage" :depth="3" />
            <n-number-animation :from="0" :to="allMusicSize" :precision="2" /> GB
          </n-text>
        </n-flex>
      </div>
    </Transition>
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
          v-debounce="handlePlay"
        >
          <template #icon>
            <SvgIcon name="Play" />
          </template>
          播放
        </n-button>
        <n-button
          v-if="localType === 'local-playlists'"
          :focusable="false"
          class="more"
          strong
          secondary
          circle
          @click="openCreatePlaylist(true)"
        >
          <template #icon>
            <SvgIcon name="Add" />
          </template>
        </n-button>
        <n-button
          v-else
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
        <!-- 文件夹选择 -->
        <Transition name="fade" mode="out-in">
          <n-select
            v-if="!isLocalFoldersRoute && settingStore.localFolderDisplayMode === 'dropdown'"
            v-model:value="selectedFolder"
            :options="folderOptions"
            class="folder-select"
            size="medium"
            style="width: 200px"
          />
        </Transition>
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
        <!-- Tab 切换 -->
        <template v-if="settingStore.useOnlineService">
          <n-dropdown
            v-if="!isLargeDesktop"
            :options="tabDropdownOptions"
            :value="localType"
            trigger="click"
            placement="bottom-end"
            @select="handleTabUpdate"
          >
            <n-button :disabled="tabsDisabled" :focusable="false" strong secondary round>
              {{ currentTabLabel }}
              <template #icon>
                <SvgIcon name="Down" />
              </template>
            </n-button>
          </n-dropdown>
          <n-tabs
            v-else
            v-model:value="localType"
            class="tabs"
            type="segment"
            @update:value="handleTabUpdate"
          >
            <n-tab :disabled="tabsDisabled" name="local-songs"> 单曲 </n-tab>
            <n-tab :disabled="tabsDisabled" name="local-artists"> 歌手 </n-tab>
            <n-tab :disabled="tabsDisabled" name="local-albums"> 专辑 </n-tab>
            <n-tab :disabled="tabsDisabled" name="local-playlists"> 歌单 </n-tab>
            <n-tab :disabled="tabsDisabled" name="local-folders"> 文件夹 </n-tab>
          </n-tabs>
        </template>
      </n-flex>
    </n-flex>
    <!-- 路由 -->
    <RouterView v-if="!showEmptyState" v-slot="{ Component }">
      <Transition :name="`router-${settingStore.routeAnimation}`" mode="out-in">
        <KeepAlive v-if="settingStore.useKeepAlive">
          <component
            :is="Component"
            :data="listData"
            :loading="loading"
            :list-version="listVersion"
            class="router-view"
          />
        </KeepAlive>
        <component v-else :is="Component" :data="listData" :loading="loading" class="router-view" />
      </Transition>
    </RouterView>
    <!-- 空状态 -->
    <n-flex v-else align="center" justify="center" vertical class="router-view">
      <n-empty size="large" description="当前本地歌曲为空">
        <template #extra>
          <n-button type="primary" strong secondary @click="openLocalMusicDirectoryModal">
            <template #icon>
              <SvgIcon name="FolderCog" />
            </template>
            本地目录管理
          </n-button>
        </template>
      </n-empty>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import { useMobile } from "@/composables/useMobile";
import { usePlayerController } from "@/core/player/PlayerController";
import { useLocalStore, useSettingStore } from "@/stores";
import type { SongType } from "@/types/main";
import { formatSongsList } from "@/utils/format";
import { fuzzySearch, renderIcon } from "@/utils/helper";
import { openBatchList, openCreatePlaylist, openLocalMusicDirectoryModal } from "@/utils/modal";
import { debounce } from "lodash-es";
import type { DropdownOption, MessageReactive } from "naive-ui";

const router = useRouter();
const localStore = useLocalStore();
const settingStore = useSettingStore();
const player = usePlayerController();
const { isLargeDesktop } = useMobile();

const loading = ref<boolean>(false);
const loadingMsg = ref<MessageReactive | null>(null);
const syncProgress = ref<{ current: number; total: number }>({ current: 0, total: 0 });

// 本地歌曲总线
const localEventBus = useEventBus("local");

// 本地歌曲路由
const localType = ref<string>((router.currentRoute.value?.name as string) || "local-songs");

// 选中的文件夹
const selectedFolder = ref<string>("all");

// 列表版本（用于触发滚动到顶部）
const listVersion = ref<number>(0);

// 文件夹选项（基于配置的目录列表）
const folderOptions = computed(() => {
  const options: { label: string; value: string }[] = [{ label: "全部文件夹", value: "all" }];

  // 基于配置的目录列表生成选项
  settingStore.localFilesPath.forEach((folderPath) => {
    if (!folderPath) return;
    const isWindows = folderPath.includes("\\");
    const sep = isWindows ? "\\" : "/";
    const folderName = folderPath.split(sep).pop() || folderPath;
    options.push({ label: folderName, value: folderPath });
  });

  return options;
});

// 模糊搜索数据
const searchValue = ref<string>("");
const filteredSearchResult = ref<SongType[]>([]);

// 获取基于文件夹过滤后的数据
const getFilteredData = (): SongType[] => {
  let data = localStore.localSongs;
  if (selectedFolder.value !== "all" && settingStore.localFolderDisplayMode === "dropdown") {
    // 标准化选中的文件夹路径（统一使用反斜杠）
    const folderPath = selectedFolder.value.replace(/\//g, "\\");
    data = data.filter((song) => {
      if (!song.path) return false;
      // 标准化歌曲路径
      const songPath = song.path.replace(/\//g, "\\");
      // 检查歌曲路径是否在选中的目录下
      if (songPath === folderPath) return true;
      if (songPath.startsWith(folderPath + "\\")) {
        return true;
      }
      return false;
    });
  }
  return data;
};

// 列表数据
const listData = computed<SongType[]>(() => {
  // 如果有搜索值且有搜索结果
  if (searchValue.value && filteredSearchResult.value.length) {
    return filteredSearchResult.value;
  }
  return getFilteredData();
});

// 播放事件总线
const localPlayEventBus = useEventBus("local-play");

// 如果在单曲/文件夹页面，直接播放 listData
// 否则通知子组件播放
const handlePlay = () => {
  const routeName = router.currentRoute.value?.name as string;
  if (routeName === "local-songs" || routeName === "local-folders" || routeName === "local") {
    player.updatePlayList(listData.value);
  } else {
    // 通知子组件播放其当前列表
    localPlayEventBus.emit();
  }
};

// 是否存在配置目录与歌曲
const hasConfig = computed<boolean>(() => settingStore.localFilesPath.length > 0);
const hasSong = computed<boolean>(() => localStore.localSongs.length > 0);
const tabsDisabled = computed<boolean>(() => !hasConfig.value || !hasSong.value);

// 当前是否在本地单曲路由
const isLocalSongsRoute = computed<boolean>(
  () => (router.currentRoute.value?.name as string) === "local-songs",
);

// 当前是否在本地文件夹路由
const isLocalFoldersRoute = computed<boolean>(
  () => (router.currentRoute.value?.name as string) === "local-folders",
);

// 页面标题
const pageTitle = computed<string>(() => {
  if (settingStore.useOnlineService) return "本地歌曲";
  // 本地模式
  const routeName = router.currentRoute.value?.name as string;
  switch (routeName) {
    case "local-songs":
    case "local":
      return "音乐库";
    case "local-playlists":
      return "歌单";
    case "local-albums":
      return "专辑";
    case "local-artists":
      return "艺术家";
    case "local-folders":
      return "文件夹";
    default:
      return "音乐库";
  }
});

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
  const totalBytes = listData.value.reduce((total, song) => (total += song?.size || 0), 0);
  return Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2));
});

// 更多操作
const moreOptions = computed<DropdownOption[]>(() => [
  {
    label: "本地目录管理",
    key: "folder",
    props: {
      onClick: () => openLocalMusicDirectoryModal(),
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

// Tab 标签映射
const tabLabels: Record<string, string> = {
  "local-songs": "单曲",
  "local-artists": "歌手",
  "local-albums": "专辑",
  "local-playlists": "歌单",
  "local-folders": "文件夹",
};

// Tab 下拉选项
const tabDropdownOptions = computed<DropdownOption[]>(() => [
  { label: "单曲", key: "local-songs", icon: renderIcon("Music") },
  { label: "歌手", key: "local-artists", icon: renderIcon("Artist") },
  { label: "专辑", key: "local-albums", icon: renderIcon("Album") },
  { label: "歌单", key: "local-playlists", icon: renderIcon("MusicList") },
  { label: "文件夹", key: "local-folders", icon: renderIcon("Folder") },
]);

// 当前 Tab 标签
const currentTabLabel = computed(() => tabLabels[localType.value] || "单曲");

/** 同步完成事件类型 */
interface SyncCompleteData {
  success: boolean;
  message?: string;
  tracks?: Record<string, unknown>[];
}

// 获取全部路径歌曲（流式接收）
const getAllLocalMusic = debounce(
  async (showTip: boolean = false) => {
    // 获取路径
    const allPath = await getMusicFolder();
    if (!allPath || !allPath.length) {
      // 目录列表为空，以目录为准，清空本地歌曲
      localStore.updateLocalSong([]);
      filteredSearchResult.value = [];
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
    const receivedTracks: Record<string, unknown>[] = [];
    let isCompleted = false;
    // 清理之前的监听器
    window.electron.ipcRenderer.removeAllListeners("music-sync-tracks-batch");
    window.electron.ipcRenderer.removeAllListeners("music-sync-complete");
    // 监听批量track数据
    const tracksBatchHandler = (_event: unknown, tracks: Record<string, unknown>[]) => {
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
      const sourceTracks = data.tracks && data.tracks.length > 0 ? data.tracks : receivedTracks;
      // 直接格式化
      const finalSongs = formatSongsList(sourceTracks);
      localStore.updateLocalSong(finalSongs);
      // 更新搜索数据
      if (searchValue.value) {
        filteredSearchResult.value = fuzzySearch(searchValue.value, finalSongs);
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
  { leading: false, trailing: true },
);

// 模糊搜索（防抖处理）
const listSearch = debounce((val: string) => {
  val = val.trim();
  if (!val) {
    filteredSearchResult.value = [];
    return;
  }
  // 基于文件夹过滤后的数据进行搜索
  filteredSearchResult.value = fuzzySearch(val, getFilteredData());
}, 300);

localEventBus.on(() => getAllLocalMusic());

// 本地目录变化
watch(
  () => settingStore.localFilesPath,
  async () => await getAllLocalMusic(),
  { deep: true },
);

// 选中文件夹变化时更新列表版本（触发滚动到顶部）
watch(selectedFolder, () => {
  listVersion.value++;
});

// 处理 Tab 切换
const handleTabUpdate = (name: string) => {
  if (tabsDisabled.value) return;
  router.push({ name });
};

// 监听路由变化
watch(
  () => router.currentRoute.value.name,
  (name) => {
    if (name && typeof name === "string" && name.startsWith("local")) {
      localType.value = name;
    }
  },
  { immediate: true },
);

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
    .folder-select {
      height: 40px;
      :deep(.n-base-selection) {
        height: 40px;
        border-radius: 25px;
        .n-base-selection-label {
          height: 40px;
          line-height: 40px;
        }
      }
    }
    .n-tabs {
      width: 320px;
      --n-tab-border-radius: 25px !important;
      :deep(.n-tabs-rail) {
        outline: 1px solid var(--n-tab-color-segment);
      }
    }
    @media (max-width: 678px) {
      .search {
        display: none;
      }
    }
  }
  .router-view {
    flex: 1;
    overflow: hidden;
    max-height: calc((var(--layout-height) - 132) * 1px);
  }
  @media (max-width: 512px) {
    .status {
      display: none !important;
    }
  }
}
.local-list-tip {
  display: block;
  margin-bottom: 12px;
  opacity: 0.8;
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
