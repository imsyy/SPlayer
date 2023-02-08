<template>
  <div class="user">
    <div class="title">
      <span class="key">{{ user.getUserData.nickname }}</span>
      <span>的音乐库</span>
    </div>
    <n-tabs
      class="main-tab"
      type="line"
      @update:value="tabChange"
      v-model:value="tabValue"
    >
      <n-tab name="playlists"> 我的歌单 </n-tab>
      <n-tab name="like"> 收藏的歌单 </n-tab>
      <n-tab name="cloud"> 音乐云盘 </n-tab>
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
import { userStore } from "@/store/index";
import { useRouter } from "vue-router";

const router = useRouter();
const user = userStore();

// Tab 默认选中
let tabValue = ref(router.currentRoute.value.path.split("/")[2]);

// Tab 选项卡变化
const tabChange = (value) => {
  console.log(value);
  router.push({
    path: `/user/${value}`,
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
.user {
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