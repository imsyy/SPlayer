<template>
  <Provider>
    <!-- 主框架 -->
    <n-layout :class="['all-layout', status.showFullPlayer ? 'full-player' : null]">
      <!-- 导航栏 -->
      <n-layout-header bordered>
        <MainNav />
        <TitleBar v-if="checkPlatform.electron()" />
      </n-layout-header>
      <!-- 主内容 -->
      <n-layout
        :class="{
          'body-layout': true,
          'player-bar': Object.keys(music.playSongData)?.length && status.showPlayBar,
        }"
        position="absolute"
        has-sider
      >
        <!-- 侧边栏 -->
        <n-layout-sider
          class="main-sider"
          :collapsed="status.asideMenuCollapsed"
          :native-scrollbar="false"
          :collapsed-width="64"
          :width="240"
          show-trigger="bar"
          collapse-mode="width"
          bordered
          @collapse="status.asideMenuCollapsed = true"
          @expand="status.asideMenuCollapsed = false"
        >
          <div class="sider-all">
            <Menu />
          </div>
        </n-layout-sider>
        <!-- 页面区 -->
        <n-layout :native-scrollbar="false" embedded>
          <main id="main-layout" class="main-layout">
            {{ music.getplaySongData }}
            <!-- 回顶 -->
            <n-back-top bottom="110">
              <n-icon size="26">
                <SvgIcon icon="chevron-up" />
              </n-icon>
            </n-back-top>
            <!-- 路由页面 -->
            <router-view v-slot="{ Component }">
              <keep-alive>
                <Transition name="router" mode="out-in">
                  <component :is="Component" />
                </Transition>
              </keep-alive>
            </router-view>
          </main>
        </n-layout>
      </n-layout>
    </n-layout>
    <!-- 主播放器 -->
    <MainControl />
    <!-- 全屏播放器 -->
    <FullPlayer />
    <!-- 全局播放列表 -->
    <n-config-provider v-if="status.showFullPlayer" :theme="darkTheme">
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

// 网络无法连接
const canNotConnect = (error) => {
  console.error("网络连接错误：", error.message);
  $dialog.destroyAll();
  $dialog.error({
    title: "网络连接错误",
    content: "网络连接错误，请检查您当前的网络状态",
    positiveText: "重试",
    negativeText: "前往本地歌曲",
    onPositiveClick: () => {
      location.reload();
    },
    onNegativeClick: () => {
      router.push("/local");
    },
  });
};

onMounted(() => {
  // 挂载方法
  window.$canNotConnect = canNotConnect;
  // 主播放器
  initPlayer(settings.autoPlay);
  // 全局事件
  globalEvents();
  // 键盘监听
  window.addEventListener("keyup", globalShortcut);
});

onUnmounted(() => {
  window.removeEventListener("keyup", globalShortcut);
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
    &.player-bar {
      bottom: 80px;
    }
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
    .main-layout {
      padding: 24px;
    }
  }
  &.full-player {
    transform: scale(0.95);
  }
}
</style>
