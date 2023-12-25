<template>
  <div class="like">
    <n-h1 class="title">我的收藏</n-h1>
    <!-- 数据统计 -->
    <div class="num">
      <!-- 专辑 -->
      <div class="num-item">
        <n-icon size="18">
          <SvgIcon icon="album" />
        </n-icon>
        <n-number-animation :from="0" :to="userLikeData.albums?.length ?? 0" />
        张专辑
      </div>
      <!-- 歌单 -->
      <div class="num-item">
        <n-icon size="18">
          <SvgIcon icon="queue-music-rounded" />
        </n-icon>
        <n-number-animation :from="0" :to="userLikeData.playlists?.length ?? 0" />
        个歌单
      </div>
      <!-- 歌手 -->
      <div class="num-item">
        <n-icon size="18">
          <SvgIcon icon="account-music" />
        </n-icon>
        <n-number-animation :from="0" :to="userLikeData.artists?.length ?? 0" />
        位歌手
      </div>
      <!-- 视频 -->
      <div class="num-item">
        <n-icon size="18">
          <SvgIcon icon="video" />
        </n-icon>
        <n-number-animation :from="0" :to="userLikeData.mvs?.length ?? 0" />
        个视频
      </div>
      <!-- 电台 -->
      <div class="num-item">
        <n-icon size="18">
          <SvgIcon icon="record" />
        </n-icon>
        <n-number-animation :from="0" :to="userLikeData.djs?.length ?? 0" />
        个电台
      </div>
    </div>
    <!-- 标签页 -->
    <n-tabs v-model:value="tabValue" class="tabs" type="segment" @update:value="tabChange">
      <n-tab name="like-albums"> 专辑 </n-tab>
      <n-tab name="like-playlists"> 歌单 </n-tab>
      <n-tab name="like-artists"> 歌手 </n-tab>
      <n-tab name="like-videos"> 视频 </n-tab>
      <n-tab name="like-djs"> 电台 </n-tab>
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
import { storeToRefs } from "pinia";
import { siteData } from "@/stores";
import { useRouter } from "vue-router";

const router = useRouter();
const data = siteData();
const { userLikeData } = storeToRefs(data);

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
  .num {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: 20px;
    .num-item {
      display: flex;
      flex-direction: row;
      align-items: center;
      &::after {
        content: "/";
        margin: 0 8px;
        opacity: 0.6;
      }
      &:last-child {
        &::after {
          display: none;
        }
      }
      .n-icon {
        margin-right: 4px;
      }
    }
  }
  .tabs {
    margin-bottom: 20px;
  }
}
</style>
