<template>
  <n-card class="set-item" id="server-list-choose" content-style="flex-direction: column">
    <n-flex justify="space-between">
      <div class="label">
        <n-text class="name">{{ item?.label || "服务器列表" }}</n-text>
        <n-text class="tip" :depth="3" v-if="item?.description" v-html="item.description" />
        <n-text class="tip" :depth="3" v-else>在此添加和管理您的流媒体服务器</n-text>
      </div>
      <n-button strong secondary @click="handleAdd">
        <template #icon>
          <SvgIcon name="Add" />
        </template>
        添加
      </n-button>
    </n-flex>
    <n-collapse-transition :show="servers.length > 0">
      <n-card
        v-for="server in servers"
        :key="server.id"
        class="set-item sub-item"
        content-style="padding: 12px 16px"
      >
        <div class="label">
          <n-flex align="center" :size="8">
            <n-text class="name">{{ server.name }}</n-text>
            <n-tag size="small" type="primary" round>
              {{ getServerTypeLabel(server.type) }}
            </n-tag>
            <n-tag v-if="isServerActive(server.id)" size="small" type="success" round>
              已连接
            </n-tag>
          </n-flex>
          <n-text class="tip" :depth="3">{{ server.url }}</n-text>
        </div>
        <n-flex class="set" justify="end" :size="8">
          <!-- 连接 -->
          <n-button
            v-if="!isServerActive(server.id)"
            strong
            secondary
            :loading="connectingServerId === server.id"
            @click="handleConnect(server)"
          >
            <template #icon>
              <SvgIcon name="Link" />
            </template>
          </n-button>
          <!-- 编辑 -->
          <n-button strong secondary @click="handleEdit(server)">
            <template #icon>
              <SvgIcon name="Edit" />
            </template>
          </n-button>
          <!-- 删除 -->
          <n-popconfirm @positive-click="handleDelete(server.id)" placement="top-end">
            <template #trigger>
              <n-button strong secondary type="error">
                <template #icon>
                  <SvgIcon name="Delete" />
                </template>
              </n-button>
            </template>
            确定要删除服务器"{{ server.name }}"吗？
          </n-popconfirm>
        </n-flex>
      </n-card>
    </n-collapse-transition>
  </n-card>
</template>

<script setup lang="ts">
import type { StreamingServerConfig, StreamingServerType } from "@/types/streaming";
import { useStreamingStore } from "@/stores";
import { openStreamingServerConfig } from "@/utils/modal";
import { SettingItem } from "@/types/settings";

defineProps<{ item?: SettingItem }>();

const streamingStore = useStreamingStore();

// 连接状态
const connectingServerId = ref<string | null>(null);

// 服务器列表
const servers = computed(() => streamingStore.servers.value);

// 判断服务器是否为当前激活的服务器
const isServerActive = (serverId: string): boolean => {
  return streamingStore.activeServer.value?.id === serverId && streamingStore.isConnected.value;
};

// 获取服务器类型标签
const getServerTypeLabel = (type: StreamingServerType): string => {
  const labels: Record<StreamingServerType, string> = {
    navidrome: "Navidrome",
    jellyfin: "Jellyfin",
    emby: "Emby",
    subsonic: "Subsonic", // 兼容
    opensubsonic: "OpenSubsonic",
  };
  return labels[type] || type;
};

// 添加服务器
const handleAdd = () => {
  openStreamingServerConfig(null, async (config) => {
    try {
      await streamingStore.addServer(config);
      window.$message.success("服务器已添加");
    } catch (error) {
      window.$message.error("添加失败：" + (error instanceof Error ? error.message : "未知错误"));
    }
  });
};

// 编辑服务器
const handleEdit = (server: StreamingServerConfig) => {
  openStreamingServerConfig(server, async (config) => {
    try {
      await streamingStore.updateServer(server.id, config);
      window.$message.success("服务器已更新");
    } catch (error) {
      window.$message.error("更新失败：" + (error instanceof Error ? error.message : "未知错误"));
    }
  });
};

// 删除服务器
const handleDelete = async (serverId: string) => {
  try {
    await streamingStore.removeServer(serverId);
    window.$message.success("服务器已删除");
  } catch (error) {
    window.$message.error("删除失败：" + (error instanceof Error ? error.message : "未知错误"));
  }
};

// 连接服务器
const handleConnect = async (server: StreamingServerConfig) => {
  connectingServerId.value = server.id;
  try {
    const success = await streamingStore.connectToServer(server.id);
    if (success) {
      window.$message.success(`已连接到 ${server.name}`);
    } else {
      window.$message.error(streamingStore.connectionStatus.value.error || "连接失败");
    }
  } catch (error) {
    window.$message.error("连接失败：" + (error instanceof Error ? error.message : "未知错误"));
  } finally {
    connectingServerId.value = null;
  }
};
</script>

<style lang="scss" scoped>
#server-list-choose {
  .sub-item {
    margin-top: 12px;
    background-color: rgba(var(--primary), 0.05);
  }
  .n-flex {
    width: 100%;
  }
  .n-collapse-transition {
    margin-top: 12px;
  }
  .set {
    width: 200px;
  }
}
</style>
