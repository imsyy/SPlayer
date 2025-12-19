<template>
  <div id="app-layout">
    <!-- 主框架 -->
    <n-layout
      id="main"
      :class="{
        'show-player': musicStore.isHasPlayer && statusStore.showPlayBar,
        'show-full-player': statusStore.showFullPlayer,
      }"
      has-sider
    >
      <!-- 侧边栏 -->
      <n-layout-sider
        id="main-sider"
        :style="{
          height:
            musicStore.isHasPlayer && statusStore.showPlayBar ? 'calc(100vh - 80px)' : '100vh',
        }"
        :content-style="{
          overflow: 'hidden',
          height: '100%',
          padding: '0',
        }"
        :native-scrollbar="false"
        :collapsed="statusStore.menuCollapsed"
        :collapsed-width="64"
        :width="240"
        collapse-mode="width"
        show-trigger="bar"
        bordered
        @collapse="statusStore.menuCollapsed = true"
        @expand="statusStore.menuCollapsed = false"
      >
        <Sider />
      </n-layout-sider>
      <n-layout id="main-layout">
        <!-- 导航栏 -->
        <Nav id="main-header" />
        <n-layout
          ref="contentRef"
          id="main-content"
          :native-scrollbar="false"
          :style="{
            '--layout-height': contentHeight,
          }"
          :content-style="{
            display: 'grid',
            gridTemplateRows: '1fr',
            minHeight: '100%',
            padding: '0 24px',
          }"
          position="absolute"
          embedded
        >
          <!-- 路由页面 -->
          <RouterView v-slot="{ Component }">
            <Transition :name="`router-${settingStore.routeAnimation}`" mode="out-in">
              <KeepAlive v-if="settingStore.useKeepAlive" :max="20" :exclude="['layout']">
                <component :is="Component" class="router-view" />
              </KeepAlive>
              <component v-else :is="Component" class="router-view" />
            </Transition>
          </RouterView>
          <!-- 回顶 -->
          <n-back-top :right="40" :bottom="120">
            <SvgIcon :size="22" name="Up" />
          </n-back-top>
        </n-layout>
      </n-layout>
    </n-layout>
    <!-- 播放列表 -->
    <MainPlayList />
    <!-- 全局播放器 -->
    <MainPlayer />
    <!-- 全屏播放器 -->
    <FullPlayer />
  </div>
</template>

<script setup lang="ts">
import { useMusicStore, useStatusStore, useSettingStore } from "@/stores";
import { useBlobURLManager } from "@/core/resource/BlobURLManager";
import { isElectron } from "@/utils/env";
import init from "@/utils/init";
import { useVisualizerBridge } from "@/core/player/VisualizerBridge";

const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();

const visualizerBridge = useVisualizerBridge();

const blobURLManager = useBlobURLManager();

// 主内容
const contentRef = ref<HTMLElement | null>(null);

// 主内容高度
const { height: contentHeight } = useElementSize(contentRef);

watchEffect(() => {
  statusStore.mainContentHeight = contentHeight.value;
});

// 将 hex 颜色转换为 RGB 字符串
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }
  return "255, 255, 255";
};

// 统一同步拾音器外观设置
const syncVisualizerAppearance = () => {
  if (isElectron && statusStore.showVisualizer) {
    let colorRgb: string;
    if (settingStore.visualizerColor === "theme") {
      colorRgb = statusStore.mainColor;
    } else {
      // 自定义颜色需要从 hex 转换为 RGB
      colorRgb = hexToRgb(settingStore.visualizerColor);
    }
    
    window.electron.ipcRenderer.send("update-visualizer-theme", colorRgb);
    window.electron.ipcRenderer.send("update-visualizer-opacity", settingStore.visualizerOpacity);
    window.electron.ipcRenderer.send("update-visualizer-width", settingStore.visualizerWidth);
    window.electron.ipcRenderer.send("update-visualizer-shape", settingStore.visualizerShape);
    window.electron.ipcRenderer.send("update-visualizer-gradient", settingStore.visualizerGradient);
  }
};

// 监听拾音器外观设置变化
watch(
  [
    () => statusStore.mainColor,
    () => settingStore.visualizerColor,
    () => settingStore.visualizerOpacity,
    () => settingStore.visualizerWidth,
    () => settingStore.visualizerShape,
    () => settingStore.visualizerGradient,
    () => statusStore.showVisualizer,
  ],
  () => {
    syncVisualizerAppearance();
  },
  { immediate: true, deep: true },
);

// 监听拾音器开启状态，负责窗口创建和销毁
watch(
  () => statusStore.showVisualizer,
  (val) => {
    if (isElectron) {
      window.electron.ipcRenderer.send("toggle-visualizer", val);
      if (val) {
        visualizerBridge.start();
        // 设置会在拾音器窗口准备就绪时通过 IPC 自动同步
      } else {
        visualizerBridge.stop();
      }
    }
  },
  { immediate: true },
);

onMounted(() => {
  init();
  if (isElectron) {
    // 监听拾音器窗口准备就绪，立即同步一次外观
    window.electron.ipcRenderer.on("sync-visualizer-settings", () => {
      syncVisualizerAppearance();
    });
  }
  if (!isElectron) {
    window.addEventListener("beforeunload", (event) => {
      event.preventDefault();
      // 释放所有 blob URL
      blobURLManager.revokeAllBlobURLs();
      event.returnValue = "";
    });
  }
});
</script>

<style lang="scss" scoped>
#app-layout {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
#main {
  flex: 1;
  height: 100%;
  transition:
    transform 0.3s var(--n-bezier),
    opacity 0.3s var(--n-bezier);
  #main-layout {
    // background-color: rgba(var(--background), 0.58);
    background-color: rgba(var(--background));
  }
  #main-content {
    top: 70px;
    background-color: transparent;
    transition: bottom 0.3s;
    .router-view {
      position: relative;
      height: 100%;
      &.n-result {
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
    }
  }
  &.show-player {
    // #main-sider {
    //   margin-bottom: 80px;
    // }
    #main-content {
      bottom: 80px;
    }
  }
  &.show-full-player {
    opacity: 0;
    transform: scale(0.9);
    #main-header {
      -webkit-app-region: no-drag;
    }
  }
}
</style>
