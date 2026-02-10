<template>
  <div class="update-app">
    <n-flex :size="10" class="version" align="center">
      <n-tag :bordered="false" type="primary">
        {{ packageJson?.version || "v0.0.0" }}
      </n-tag>
      <SvgIcon name="Right" />
      <n-tag :bordered="false" type="warning">
        {{ data?.version || "v0.0.0" }}
      </n-tag>
      <n-tag v-if="isPrerelease" :bordered="false" type="error" size="small"> 测试版 </n-tag>
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
      <n-button :loading="downloadStatus" type="primary" @click="startDownload">
        {{ downloadStatus ? `下载中 ${downloadProgress}%` : "立即更新" }}
      </n-button>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import type { UpdateInfoType } from "@/types/main";
import packageJson from "@/../package.json";

const props = defineProps<{ data: UpdateInfoType }>();

const emit = defineEmits<{ close: [] }>();

// 检测是否为预发布版本（alpha/beta/rc 等）
const isPrerelease = computed(() => {
  const version = props.data?.version || "";
  return /-(alpha|beta|rc|dev|canary|nightly)/i.test(version);
});

// 下载更新数据
const downloadStatus = ref<boolean>(false);
const downloadProgress = ref<number>(0);

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

// 开始更新
const startDownload = async () => {
  downloadStatus.value = true;
  window.electron.ipcRenderer.send("start-download-update");
  // 监听状态
  window.electron.ipcRenderer.on("download-progress", (_, progress) => {
    downloadProgress.value = Number((progress?.percent || 0).toFixed(2));
  });
  // 更新错误
  window.electron.ipcRenderer.on("update-error", (_, error) => {
    downloadStatus.value = false;
    console.error("Error updating:", error);
    window.$message.error("更新过程出现错误");
  });
  // 更新完成
  window.electron.ipcRenderer.on("update-downloaded", () => {
    emit("close");
    downloadStatus.value = false;
    window.$message.success("更新下载完成");
  });
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
