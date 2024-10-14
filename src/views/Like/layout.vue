<template>
  <div class="like">
    <div class="title">
      <n-text class="keyword">我的收藏</n-text>
      <n-flex v-if="dataStore.loginType !== 'uid'" class="status">
        <div
          v-for="(item, index) in likeData"
          :key="index"
          class="item"
          @click="router.push({ name: item.name })"
        >
          <SvgIcon :name="item.icon" :depth="3" />
          <n-number-animation :from="0" :to="item.length" />
        </div>
      </n-flex>
    </div>
    <!-- 标签页 -->
    <n-tabs
      v-if="dataStore.loginType !== 'uid'"
      v-model:value="likeType"
      class="tabs"
      type="segment"
      @update:value="(name: string) => router.push({ name })"
    >
      <n-tab name="like-playlists"> 歌单 </n-tab>
      <n-tab name="like-albums"> 专辑 </n-tab>
      <n-tab name="like-artists"> 歌手 </n-tab>
      <n-tab name="like-videos"> 视频 </n-tab>
      <n-tab name="like-radios"> 播客 </n-tab>
    </n-tabs>
    <!-- 路由 -->
    <RouterView v-slot="{ Component }">
      <Transition :name="`router-${settingStore.routeAnimation}`" mode="out-in">
        <KeepAlive>
          <component :is="Component" class="router-view" />
        </KeepAlive>
      </Transition>
    </RouterView>
  </div>
</template>

<script setup lang="ts">
import { useDataStore, useSettingStore } from "@/stores";

const router = useRouter();
const dataStore = useDataStore();
const settingStore = useSettingStore();

const likeType = ref<string>((router.currentRoute.value?.name as string) || "like-playlists");

// 喜欢数据
const likeData = computed(() => [
  {
    icon: "MusicList",
    name: "like-playlists",
    length: dataStore.userLikeData.playlists?.length || 0,
  },
  {
    icon: "Album",
    name: "like-albums",
    length: dataStore.userLikeData.albums?.length || 0,
  },
  {
    icon: "Artist",
    name: "like-artists",
    length: dataStore.userLikeData.artists?.length || 0,
  },
  {
    icon: "Video",
    name: "like-videos",
    length: dataStore.userLikeData.mvs?.length || 0,
  },
  {
    icon: "Record",
    name: "like-radios",
    length: dataStore.userLikeData.djs?.length || 0,
  },
]);

onBeforeRouteUpdate((to) => {
  if (to.matched[0].name !== "like") return;
  likeType.value = to.name as string;
});
</script>

<style lang="scss" scoped>
.like {
  display: flex;
  flex-direction: column;
  .title {
    display: flex;
    align-items: flex-end;
    line-height: normal;
    margin-top: 12px;
    margin-bottom: 20px;
    height: 40px;
    .keyword {
      font-size: 30px;
      font-weight: bold;
      margin-right: 12px;
      line-height: normal;
    }
    .status {
      font-size: 15px;
      font-weight: normal;
      line-height: 30px;
      .item {
        display: flex;
        align-items: center;
        opacity: 0.9;
        cursor: pointer;
        .n-icon {
          margin-right: 4px;
        }
      }
    }
  }
}
</style>
