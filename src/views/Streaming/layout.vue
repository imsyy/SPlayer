<template>
  <div class="streaming">
    <Transition name="fade" mode="out-in">
      <div :key="pageTitle" class="title">
        <n-text class="keyword">{{ pageTitle }}</n-text>
        <n-flex v-if="isConnected" class="status">
          <n-text class="item">
            <SvgIcon name="Music" :depth="3" />
            <n-number-animation :from="0" :to="songsCount" /> 首歌曲
          </n-text>
          <n-text class="item server-info">
            <SvgIcon name="Stream" :depth="3" />
            {{ serverType }}
          </n-text>
        </n-flex>
      </div>
    </Transition>
    <n-flex class="menu" justify="space-between">
      <n-flex class="left" align="flex-end">
        <n-button
          :focusable="false"
          :disabled="!streamingStore.isConnected || loading"
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
          :disabled="!streamingStore.isConnected || loading"
          :loading="loading"
          :focusable="false"
          class="more"
          strong
          secondary
          circle
          @click="handleRefresh"
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
        <!-- 服务器选择 -->
        <Transition name="fade" mode="out-in">
          <n-select
            v-if="streamingStore.servers.value.length > 0"
            v-model:value="currentServerId"
            :options="serverOptions"
            class="server-select"
            size="medium"
            style="width: 200px"
            placeholder="选择服务器"
          />
        </Transition>
      </n-flex>
      <n-flex class="right" justify="end">
        <!-- Tab 切换 -->
        <n-dropdown
          v-if="!isLargeDesktop"
          :options="tabDropdownOptions"
          :value="streamingType"
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
          v-model:value="streamingType"
          class="tabs"
          type="segment"
          @update:value="handleTabUpdate"
        >
          <n-tab :disabled="tabsDisabled" name="streaming-songs"> 单曲 </n-tab>
          <n-tab :disabled="tabsDisabled" name="streaming-artists"> 歌手 </n-tab>
          <n-tab :disabled="tabsDisabled" name="streaming-albums"> 专辑 </n-tab>
          <n-tab :disabled="tabsDisabled" name="streaming-playlists"> 歌单 </n-tab>
        </n-tabs>
      </n-flex>
    </n-flex>
    <!-- 路由 -->
    <RouterView v-if="!showEmptyState" v-slot="{ Component }">
      <Transition :name="`router-${routeAnimation}`" mode="out-in">
        <KeepAlive v-if="settingStore.useKeepAlive">
          <component :is="Component" :data="listData" :loading="loading" class="router-view" />
        </KeepAlive>
        <component v-else :is="Component" :data="listData" :loading="loading" class="router-view" />
      </Transition>
    </RouterView>
    <!-- 空状态 -->
    <n-flex v-else align="center" justify="center" vertical class="router-view">
      <n-empty size="large" :description="emptyDescription">
        <template #extra>
          <n-button type="primary" strong secondary @click="openServerConfig">
            <template #icon>
              <SvgIcon name="Stream" />
            </template>
            开始流媒体连接
          </n-button>
        </template>
      </n-empty>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import type { StreamingServerConfig } from "@/types/streaming";
import type { SongType } from "@/types/main";
import type { DropdownOption } from "naive-ui";
import { useStreamingStore, useSettingStore } from "@/stores";
import { useMobile } from "@/composables/useMobile";
import { useRouteAnimation } from "@/composables/useRouteAnimation";
import { renderIcon } from "@/utils/helper";
import { usePlayerController } from "@/core/player/PlayerController";
import { openStreamingServerConfig, openSetting } from "@/utils/modal";

const router = useRouter();
const streamingStore = useStreamingStore();
const settingStore = useSettingStore();
const routeAnimation = useRouteAnimation();
const player = usePlayerController();
const { isLargeDesktop } = useMobile();

const loading = ref<boolean>(false);

// 路由类型
const streamingType = ref<string>((router.currentRoute.value?.name as string) || "streaming-songs");

// 页面标题
const pageTitle = computed<string>(() => "流媒体");

// 连接状态（用于模板）
const isConnected = computed<boolean>(() => streamingStore.isConnected.value);

// 歌曲数量（用于模板）
const songsCount = computed<number>(() => streamingStore.songs.value?.length || 0);

// 服务器类型
const serverType = computed<string>(() => {
  const type = streamingStore.activeServer.value?.type;
  if (!type) return "";
  const typeMap: Record<string, string> = {
    jellyfin: "Jellyfin",
    navidrome: "Navidrome",
    opensubsonic: "Subsonic",
  };
  return typeMap[type] || type;
});

// Tab 状态
const tabsDisabled = computed<boolean>(() => !streamingStore.isConnected.value);

// 空状态描述
const emptyDescription = computed<string>(() => {
  if (!streamingStore.hasServer.value) {
    return "尚未配置流媒体服务";
  }
  if (!isConnected.value) {
    return "未连接到流媒体服务器";
  }
  return "当前没有歌曲";
});

// 是否显示空状态
const showEmptyState = computed<boolean>(() => {
  const routeName = router.currentRoute.value?.name as string;
  return (
    routeName === "streaming-songs" &&
    (!streamingStore.isConnected.value || streamingStore.songs.value.length === 0)
  );
});

// 列表数据
const listData = computed<SongType[]>(() => {
  return streamingStore.songs.value;
});

// Tab 标签映射
const tabLabels: Record<string, string> = {
  "streaming-songs": "单曲",
  "streaming-artists": "歌手",
  "streaming-albums": "专辑",
  "streaming-playlists": "歌单",
};

// Tab 下拉选项
const tabDropdownOptions = computed<DropdownOption[]>(() => [
  { label: "单曲", key: "streaming-songs", icon: renderIcon("Music") },
  { label: "歌手", key: "streaming-artists", icon: renderIcon("Artist") },
  { label: "专辑", key: "streaming-albums", icon: renderIcon("Album") },
  { label: "歌单", key: "streaming-playlists", icon: renderIcon("MusicList") },
]);

// 当前 Tab 标签
const currentTabLabel = computed(() => tabLabels[streamingType.value] || "单曲");

// 当前选中的服务器ID
const currentServerId = computed({
  get: () => streamingStore.activeServer.value?.id || null,
  set: (val) => {
    if (val) handleServerChange(val);
  },
});

// 服务器选项
const serverOptions = computed(() => {
  return streamingStore.servers.value.map((server) => ({
    label: server.name,
    value: server.id,
  }));
});

// 切换服务器
const handleServerChange = async (serverId: string) => {
  if (serverId === streamingStore.activeServer.value?.id) return;

  loading.value = true;
  try {
    const success = await streamingStore.connectToServer(serverId);
    if (success) {
      window.$message.success("已切换服务器");
      await loadData();
    } else {
      window.$message.error(streamingStore.connectionStatus.value.error || "切换失败");
    }
  } catch (error) {
    window.$message.error("切换失败：" + (error instanceof Error ? error.message : "未知错误"));
  } finally {
    loading.value = false;
  }
};

// 更多操作
const moreOptions = computed<DropdownOption[]>(() => [
  {
    label: "修改当前配置",
    key: "config",
    show: streamingStore.isConnected.value,
    props: {
      onClick: () => openServerConfig(),
    },
    icon: renderIcon("Cloud"),
  },
  {
    label: "流媒体设置",
    key: "setting",
    props: {
      onClick: () => openSetting("streaming"),
    },
    icon: renderIcon("Settings"),
  },
  {
    label: "断开连接",
    key: "disconnect",
    show: streamingStore.isConnected.value,
    props: { onClick: () => handleDisconnect() },
    icon: renderIcon("Disconnect"),
  },
]);

// 打开服务器配置
const openServerConfig = () => {
  // 如果已有服务器，传入活动服务器或第一个服务器
  let editingServer: StreamingServerConfig | null = null;
  if (streamingStore.activeServer.value) {
    editingServer = streamingStore.activeServer.value;
  } else if (streamingStore.servers.value.length > 0) {
    editingServer = streamingStore.servers.value[0];
  }
  openStreamingServerConfig(editingServer, async (config) => {
    try {
      let serverId: string;
      if (editingServer) {
        await streamingStore.updateServer(editingServer.id, config);
        serverId = editingServer.id;
      } else {
        const newServer = await streamingStore.addServer(config);
        serverId = newServer.id;
      }
      const success = await streamingStore.connectToServer(serverId);
      if (success) {
        window.$message.success("连接成功");
        await loadData();
      } else {
        window.$message.error(streamingStore.connectionStatus.value.error || "连接失败");
      }
    } catch (error) {
      window.$message.error("连接失败：" + (error instanceof Error ? error.message : "未知错误"));
    }
  });
};

// 断开连接
const handleDisconnect = () => {
  window.$dialog.warning({
    title: "断开连接",
    content: "确定要断开与流媒体服务器的连接吗？",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: () => {
      streamingStore.disconnect();
      window.$message.info("已断开连接");
    },
  });
};

// 加载数据
const loadData = async () => {
  loading.value = true;
  try {
    await streamingStore.fetchSongs(0, 500);
  } catch (error) {
    console.error("Failed to load data:", error);
    window.$message.error("加载流媒体数据失败");
  } finally {
    loading.value = false;
  }
};

// 刷新
const handleRefresh = async () => {
  if (!streamingStore.isConnected.value) return;
  await loadData();
};

// 播放
const handlePlay = () => {
  if (!listData.value.length) return;
  // 将流媒体歌曲转换为播放器可用的格式
  const songs = listData.value.map((song) => ({
    ...song,
    id: song.id,
  }));
  player.updatePlayList(songs);
};

// 处理 Tab 切换
const handleTabUpdate = (name: string) => {
  if (tabsDisabled.value) return;
  router.push({ name });
};

// 监听路由变化
watch(
  () => router.currentRoute.value.name,
  (name) => {
    if (name && typeof name === "string" && name.startsWith("streaming")) {
      streamingType.value = name;
    }
  },
  { immediate: true },
);

// 初始化
onMounted(async () => {
  if (streamingStore.isConnected.value) {
    await loadData();
  }
});
</script>

<style lang="scss" scoped>
.streaming {
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
      .server-info {
        color: var(--n-text-color-3);
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
      width: 260px;
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
    .server-select {
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
</style>
