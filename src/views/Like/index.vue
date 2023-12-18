<template>
  <div class="like">
    <n-h1 class="title">我的收藏</n-h1>
    <!-- 标签页 -->
    <n-tabs v-model:value="tabValue" class="tabs" type="segment" @update:value="tabChange">
      <n-tab name="like-albums"> 专辑 </n-tab>
      <n-tab name="like-playlists"> 歌单 </n-tab>
      <n-tab name="like-artists"> 歌手 </n-tab>
      <n-tab name="like-videos"> 视频 </n-tab>
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
const tabValue = ref(router.currentRoute.value?.name ?? "like-albums");

// 标签页切换
const tabChange = (val) => {
  const routerPath = val.replace(/^like-/, "");
  router.push({
    path: `/like/${routerPath}`,
  });
};

// 监听路由变化
watch(
  () => router.currentRoute.value,
  (val) => (tabValue.value = val?.name ?? "like-playlists"),
);
</script>

<style lang="scss" scoped>
.like {
  .title {
    margin: 20px 0;
    font-size: 36px;
    font-weight: bold;
  }
  .tabs {
    margin-bottom: 20px;
  }
}
</style>
