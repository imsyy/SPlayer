<template>
  <div class="search">
    <div class="title" v-if="searchKeywords">
      <span class="key">{{ searchKeywords }}</span>
      <span>的搜索结果</span>
    </div>
    <div class="title" v-else>
      <span class="key">未提供搜索关键字</span>
      <br />
      <n-button
        strong
        secondary
        @click="router.go(-1)"
        style="margin-top: 20px"
      >
        返回上一级
      </n-button>
    </div>
    <n-tabs
      class="main-tab"
      type="line"
      @update:value="tabChange"
      v-model:value="tabValue"
      v-if="searchKeywords"
    >
      <n-tab name="songs"> 单曲 </n-tab>
      <n-tab name="artists"> 歌手 </n-tab>
      <n-tab name="albums"> 专辑 </n-tab>
      <n-tab name="videos"> 视频 </n-tab>
      <n-tab name="playlists"> 歌单 </n-tab>
    </n-tabs>
    <main class="content" v-if="searchKeywords">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <Transition name="move" mode="out-in">
            <component :is="Component" />
          </Transition>
        </keep-alive>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
const router = useRouter();

// 搜索关键词
const searchKeywords = ref(router.currentRoute.value.query.keywords);

// Tab 默认选中
const tabValue = ref(router.currentRoute.value.path.split("/")[2]);

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    searchKeywords.value = val.query.keywords;
    tabValue.value = val.path.split("/")[2];
  }
);

// Tab 选项卡变化
const tabChange = (value) => {
  console.log(value);
  router.push({
    path: `/search/${value}`,
    query: {
      keywords: searchKeywords.value,
    },
  });
};
</script>

<style lang="scss" scoped>
.search {
  .title {
    margin-top: 30px;
    margin-bottom: 20px;
    font-size: 24px;
    .key {
      font-size: 40px;
      font-weight: bold;
      margin-right: 8px;
    }
  }
  .content {
    margin-top: 20px;
  }
}

// 路由跳转动画
.move-enter-active,
.move-leave-active {
  transition: all 0.2s ease;
}

.move-enter-from,
.move-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>