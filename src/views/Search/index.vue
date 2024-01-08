<!-- 搜索 -->
<template>
  <div class="search">
    <template v-if="searchKeywords">
      <div class="title">
        <n-text class="key">{{ searchKeywords }}</n-text>
        <n-text depth="3">的相关搜索</n-text>
      </div>
      <!-- 标签页 -->
      <n-tabs v-model:value="tabValue" class="tabs" type="segment" @update:value="tabChange">
        <n-tab name="sea-songs"> 单曲 </n-tab>
        <n-tab name="sea-artists"> 歌手 </n-tab>
        <n-tab name="sea-albums"> 专辑 </n-tab>
        <n-tab name="sea-playlists"> 歌单 </n-tab>
        <n-tab name="sea-videos"> 视频 </n-tab>
        <n-tab name="sea-djs"> 电台 </n-tab>
      </n-tabs>
      <!-- 路由页面 -->
      <router-view v-slot="{ Component }">
        <keep-alive>
          <Transition name="router" mode="out-in">
            <component :is="Component" />
          </Transition>
        </keep-alive>
      </router-view>
    </template>
    <template v-else>
      <div class="title">
        <n-text class="key">参数不完整</n-text>
      </div>
      <n-button class="back" strong secondary @click="router.go(-1)"> 返回上一页 </n-button>
    </template>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

// 搜索数据
const searchKeywords = ref(router.currentRoute.value.query.keywords);

// 默认选中
const tabValue = ref(router.currentRoute.value?.name ?? "sea-songs");

// 标签页切换
const tabChange = (val) => {
  const routerPath = val.replace(/^sea-/, "");
  router.push({
    path: `/search/${routerPath}`,
    query: {
      keywords: searchKeywords.value,
    },
  });
};

// 监听路由变化
watch(
  () => router.currentRoute.value,
  (val) => {
    searchKeywords.value = val.query?.keywords;
    tabValue.value = val?.name ?? "sea-songs";
  },
);
</script>

<style lang="scss" scoped>
.search {
  .title {
    margin: 10px 0;
    font-size: 22px;
    .key {
      font-size: 36px;
      font-weight: bold;
      margin-right: 8px;
    }
    .n-text {
      display: inline;
    }
  }
  .tabs {
    margin-bottom: 20px;
  }
}
</style>
