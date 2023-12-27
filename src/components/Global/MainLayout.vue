<template>
  <main id="main-layout" :class="['main-layout', { 'no-sider': !showSider }]">
    <!-- 回顶 -->
    <n-back-top
      :bottom="music.getPlaySongData?.id && showPlayBar ? 110 : 50"
      style="transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
    >
      <n-icon size="26">
        <SvgIcon icon="chevron-up" />
      </n-icon>
    </n-back-top>
    <!-- 路由页面 -->
    <router-view v-slot="{ Component }" class="main-router">
      <keep-alive>
        <Transition name="router" mode="out-in">
          <component :is="Component" />
        </Transition>
      </keep-alive>
    </router-view>
  </main>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { musicData, siteStatus, siteSettings } from "@/stores";

const music = musicData();
const status = siteStatus();
const settings = siteSettings();
const { showPlayBar } = storeToRefs(status);
const { showSider } = storeToRefs(settings);
</script>

<style lang="scss" scoped>
.main-layout {
  padding: 24px;
  &.no-sider {
    padding: 0;
    background-color: var(--n-color);
    .main-router {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px 10vw;
      @media (max-width: 1200px) {
        padding: 24px 5vw;
      }
    }
  }
}
</style>
