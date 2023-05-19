<template>
  <div class="discover">
    <n-text class="title">{{ $t("nav.discover") }}</n-text>
    <n-tabs
      class="main-tab"
      type="segment"
      @update:value="tabChange"
      v-model:value="tabValue"
    >
      <n-tab name="playlists">{{ $t("nav.discoverChildren.playlists") }}</n-tab>
      <n-tab name="toplists">{{ $t("nav.discoverChildren.toplists") }}</n-tab>
      <n-tab name="artists">{{ $t("nav.discoverChildren.artists") }}</n-tab>
    </n-tabs>
    <main class="content">
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

// Tab 默认选中
const tabValue = ref(router.currentRoute.value.path.split("/")[2]);

// Tab 选项卡变化
const tabChange = (value) => {
  console.log(value);
  router.push({
    path: `/discover/${value}`,
    page: 1,
  });
};

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    tabValue.value = val.path.split("/")[2];
  }
);
</script>

<style lang="scss" scoped>
.discover {
  .title {
    display: block;
    margin: 30px 0 20px;
    font-size: 40px;
    font-weight: bold;
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
