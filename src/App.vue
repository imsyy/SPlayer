<template>
  <Provider>
    <!-- 主框架 -->
    <n-layout class="all-layout">
      <!-- 导航栏 -->
      <n-layout-header bordered>
        <MainNav />
      </n-layout-header>
      <!-- 主内容 - 有侧边栏 -->
      <n-layout
        v-if="showSider"
        :class="{
          'body-layout': true,
          'player-bar': Object.keys(music.getPlaySongData)?.length && showPlayBar,
        }"
        position="absolute"
        has-sider
      >
        <!-- 侧边栏 -->
        <n-layout-sider
          :collapsed="asideMenuCollapsed"
          :native-scrollbar="false"
          :collapsed-width="64"
          :width="240"
          class="main-sider"
          show-trigger="bar"
          collapse-mode="width"
          bordered
          @collapse="asideMenuCollapsed = true"
          @expand="asideMenuCollapsed = false"
        >
          <div class="sider-all">
            <Menu />
          </div>
        </n-layout-sider>
        <!-- 页面区 -->
        <n-layout :native-scrollbar="false" embedded>
          <MainLayout />
        </n-layout>
      </n-layout>
      <!-- 主内容 - 无侧边栏 -->
      <n-layout-content
        v-else
        :class="{
          'body-layout': true,
          'player-bar': Object.keys(music.getPlaySongData)?.length && showPlayBar,
        }"
        :native-scrollbar="false"
        position="absolute"
        embedded
      >
        <MainLayout />
      </n-layout-content>
    </n-layout>
    <!-- 主播放器 -->
    <MainControl />
    <!-- 全屏播放器 -->
    <FullPlayer />
    <!-- 全局播放列表 -->
    <n-config-provider v-if="showFullPlayer" :theme="darkTheme">
      <Playlist />
    </n-config-provider>
    <Playlist v-else />
    <!-- 全局水印 -->
    <!-- <n-watermark
      :font-size="16"
      :line-height="16"
      :width="384"
      :height="384"
      :x-offset="12"
      :y-offset="60"
      :rotate="-15"
      content="开发中，敬请期待"
      cross
      fullscreen
    /> -->
  </Provider>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { darkTheme } from "naive-ui";
import { useRouter } from "vue-router";
import { musicData, siteStatus, siteSettings } from "@/stores";
import { initPlayer } from "@/utils/Player";
import { checkPlatform } from "@/utils/helper";
import globalShortcut from "@/utils/globalShortcut";
import globalEvents from "@/utils/globalEvents";

const router = useRouter();
const music = musicData();
const status = siteStatus();
const settings = siteSettings();
const { autoPlay, showSider } = storeToRefs(settings);
const { showPlayBar, asideMenuCollapsed, showFullPlayer } = storeToRefs(status);

// 公告数据
const annShow =
  import.meta.env.RENDERER_VITE_ANN_TITLE && import.meta.env.RENDERER_VITE_ANN_CONTENT
    ? true
    : false;
const annType = import.meta.env.RENDERER_VITE_ANN_TYPE;
const annTitle = import.meta.env.RENDERER_VITE_ANN_TITLE;
const annContene = import.meta.env.RENDERER_VITE_ANN_CONTENT;
const annDuration = Number(import.meta.env.RENDERER_VITE_ANN_DURATION);

// 显示公告
const showAnnouncements = () => {
  if (annShow) {
    $notification[annType]({
      content: annTitle,
      meta: annContene,
      duration: annDuration,
    });
  }
};

// 网络无法连接
const canNotConnect = (error) => {
  console.error("网络连接错误：", error.message);
  $dialog.destroyAll();
  $dialog.error({
    title: "网络连接错误",
    content: "网络连接错误，请检查您当前的网络状态",
    positiveText: "重试",
    negativeText: checkPlatform.electron() ? "前往本地歌曲" : "取消",
    onPositiveClick: () => {
      location.reload();
    },
    onNegativeClick: () => {
      if (checkPlatform.electron()) router.push("/local");
    },
  });
};

// 网页端键盘事件
const handleKeyUp = (event) => {
  globalShortcut(event, router);
};

onMounted(() => {
  // 挂载方法
  window.$canNotConnect = canNotConnect;
  // 主播放器
  initPlayer(autoPlay.value);
  // 全局事件
  globalEvents(router);
  // 键盘监听
  if (!checkPlatform.electron()) {
    window.addEventListener("keyup", handleKeyUp);
  }
  // 显示公告
  showAnnouncements();
});

onUnmounted(() => {
  if (!checkPlatform.electron()) window.removeEventListener("keyup", handleKeyUp);
});
</script>

<style lang="scss" scoped>
.all-layout {
  height: 100%;
  transition: transform 0.3s;
  .n-layout-header {
    height: 60px;
    display: flex;
    flex-direction: row;
    align-items: center;
    -webkit-app-region: drag;
  }
  .body-layout {
    top: 60px;
    transition: bottom 0.3s;
    .main-sider {
      :deep(.n-scrollbar-content) {
        height: 100%;
      }
      .sider-all {
        height: 100%;
      }
      @media (max-width: 720px) {
        display: none;
      }
    }
    &.player-bar {
      bottom: 80px;
    }
  }
}
</style>
