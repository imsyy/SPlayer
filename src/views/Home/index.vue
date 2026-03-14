<template>
  <div class="home">
    <div v-if="settingStore.showHomeGreeting" class="welcome">
      <n-h1>{{ greetings }}</n-h1>
      <n-text depth="3">由此开启好心情 ~</n-text>
    </div>
    <!-- 在线模式 -->
    <HomeOnline v-if="settingStore.useOnlineService" />
    <!-- 本地模式 -->
    <HomeLocal v-else />
  </div>
</template>

<script setup lang="ts">
import { useSettingStore, useDataStore } from "@/stores";
import { getGreeting } from "@/utils/time";
import { isLogin } from "@/utils/auth";
import HomeOnline from "./HomeOnline.vue";
import HomeLocal from "./HomeLocal.vue";

const settingStore = useSettingStore();
const dataStore = useDataStore();

// 问候语
const greetings = computed(() => {
  const greeting = getGreeting();
  const name = isLogin() ? dataStore.userData.name : "";
  return name ? `${greeting}，${name}` : greeting;
});
</script>

<style lang="scss" scoped>
.home {
  width: 100%;
  max-width: 1500px;
  margin: 0 auto;
  .welcome {
    margin-top: 8px;
    margin-bottom: 20px;
    .n-h1 {
      margin: 0;
      font-weight: bold;
    }
  }
}
</style>
