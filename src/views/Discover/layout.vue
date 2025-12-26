<template>
  <div class="discover">
    <div class="title">
      <n-text class="keyword">{{ t("discover.title") }}</n-text>
    </div>
    <!-- 标签页 -->
    <n-tabs
      v-model:value="discoverType"
      class="tabs"
      type="segment"
      @update:value="(name: string) => router.push({ name })"
    >
      <n-tab name="discover-playlists"> {{ t("discover.playlists") }} </n-tab>
      <n-tab name="discover-toplists"> {{ t("discover.toplists") }} </n-tab>
      <n-tab name="discover-artists"> {{ t("discover.artists") }} </n-tab>
      <n-tab name="discover-new"> {{ t("discover.new") }} </n-tab>
    </n-tabs>
    <!-- 路由 -->
    <RouterView v-slot="{ Component }">
      <Transition :name="`router-${settingStore.routeAnimation}`" mode="out-in">
        <KeepAlive v-if="settingStore.useKeepAlive">
          <component :is="Component" class="router-view" />
        </KeepAlive>
        <component v-else :is="Component" class="router-view" />
      </Transition>
    </RouterView>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
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
