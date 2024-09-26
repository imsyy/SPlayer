<template>
  <div class="discover">
    <div class="title">
      <n-text class="keyword">发现音乐</n-text>
    </div>
    <!-- 标签页 -->
    <n-tabs
      v-model:value="discoverType"
      class="tabs"
      type="segment"
      @update:value="(name: string) => router.push({ name })"
    >
      <n-tab name="discover-playlists"> 歌单广场 </n-tab>
      <n-tab name="discover-toplists"> 排行榜 </n-tab>
      <n-tab name="discover-artists"> 歌手 </n-tab>
      <n-tab name="discover-new"> 最新音乐 </n-tab>
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
import { useSettingStore } from "@/stores";

const router = useRouter();
const settingStore = useSettingStore();

// 发现路由
const discoverType = ref<string>(
  (router.currentRoute.value?.name as string) || "discover-playlists",
);
</script>

<style lang="scss" scoped>
.discover {
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
  }
}
</style>
