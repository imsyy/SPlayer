<!-- 发现 - 主页面 -->
<template>
  <div class="discover">
    <n-h1 class="title">发现音乐</n-h1>
    <!-- 标签页 -->
    <n-tabs v-model:value="tabValue" class="tabs" type="segment" @update:value="tabChange">
      <n-tab name="dsc-playlists"> 歌单 </n-tab>
      <n-tab name="dsc-toplists"> 排行榜 </n-tab>
      <n-tab name="dsc-artists"> 歌手 </n-tab>
      <n-tab name="dsc-new"> 最新音乐 </n-tab>
    </n-tabs>
    <!-- 路由页面 -->
    <router-view v-slot="{ Component }">
      <keep-alive>
        <Transition name="router" mode="out-in">
          <component :is="Component" />
        </Transition>
      </keep-alive>
    </router-view>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

// 默认选中
const tabValue = ref(router.currentRoute.value?.name ?? "dsc-playlists");

// 标签页切换
const tabChange = (val) => {
  const routerPath = val.replace(/^dsc-/, "");
  router.push({
    path: `/discover/${routerPath}`,
  });
};

// 监听路由变化
watch(
  () => router.currentRoute.value,
  (val) => (tabValue.value = val?.name ?? "dsc-playlists"),
);
</script>

<style lang="scss" scoped>
.discover {
  .title {
    margin: 20px 0;
    font-size: 36px;
    font-weight: bold;
  }
  .tabs {
    margin-bottom: 20px;
    z-index: 2;
  }
}
</style>
