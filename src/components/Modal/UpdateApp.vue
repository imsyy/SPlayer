<template>
  <div class="update-app">
    <n-flex :size="10" class="version" align="center">
      <n-tag type="primary">
        {{ packageJson?.version || "v0.0.0" }}
      </n-tag>
      <SvgIcon name="Right" />
      <n-tag type="warning">
        {{ data?.version || "v0.0.0" }}
      </n-tag>
      <n-tag v-if="isPrerelease" type="error"> 测试版 </n-tag>
    </n-flex>
    <!-- 测试版警告 -->
    <n-alert v-if="isPrerelease" type="warning" :bordered="false" class="prerelease-warning">
      当前更新为测试版本，可能包含未完成的功能或已知问题，请谨慎更新
    </n-alert>
    <n-scrollbar style="max-height: 500px">
      <div
        v-if="data?.releaseNotes"
        class="markdown-body"
        v-html="data.releaseNotes"
        @click="handleMarkdownClick"
      />
      <div v-else class="markdown-body">暂无更新日志</div>
    </n-scrollbar>
    <n-flex class="menu" justify="end">
      <n-button strong secondary @click="emit('close')"> 取消 </n-button>
      <n-button type="warning" strong secondary @click="goDownload"> 前往下载 </n-button>
      <!-- 已下载完成：显示立即安装 -->
      <n-button v-if="statusStore.updateDownloaded" type="success" strong @click="doInstall">
        立即安装
      </n-button>
      <!-- 下载中：显示进度 -->
      <n-button
        v-else
        :loading="statusStore.updateDownloading"
        type="primary"
        @click="startDownload"
      >
        {{
          statusStore.updateDownloading
            ? `下载中 ${statusStore.updateDownloadProgress}%`
            : "立即更新"
        }}
      </n-button>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import type { UpdateInfoType } from "@/types/main";
import { useStatusStore } from "@/stores";
import packageJson from "@/../package.json";

const props = defineProps<{ data: UpdateInfoType }>();

const emit = defineEmits<{ close: [] }>();

const statusStore = useStatusStore();

// 检测是否为预发布版本（alpha/beta/rc 等）
const isPrerelease = computed(() => {
  const version = props.data?.version || "";
  return /-(alpha|beta|rc|dev|canary|nightly)/i.test(version);
});

// 处理markdown中的链接点击
const handleMarkdownClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  // 从事件目标向上遍历，查找最近的 <a> 标签
  const anchor = target.closest("a");
  if (anchor?.href) {
    event.preventDefault();
    window.open(anchor.href, "_blank");
  }
};

// 开始下载更新
const startDownload = () => {
  window.electron.ipcRenderer.send("start-download-update");
};

// 安装更新
const doInstall = () => {
  window.electron.ipcRenderer.send("install-update");
};

// 前往下载
const goDownload = () => {
  emit("close");
  window.open("https://splayer.imsyy.top/download.html", "_blank");
};
</script>

<style lang="scss" scoped>
.update-app {
  .version {
    margin-bottom: 20px;

    .n-tag {
      border-radius: 6px;
    }

    .time {
      margin-left: auto;
      font-size: 13px;
    }
  }

  .menu {
    margin-top: 20px;
  }

  .prerelease-warning {
    margin-bottom: 12px;
  }

  .markdown-body {
    margin-top: 0 !important;
  }
}
</style>
