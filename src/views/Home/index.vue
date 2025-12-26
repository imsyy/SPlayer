<template>
  <div class="home">
    <div class="welcome">
      <n-h1>{{ greetings }}</n-h1>
      <n-text depth="3">{{ t("home.mood") }}</n-text>

    </div>
    <!-- 在线模式 -->
    <HomeOnline v-if="settingStore.useOnlineService" />
    <!-- 本地模式 -->
    <HomeLocal v-else />
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
import { getGreeting } from "@/utils/time";
import { useI18n } from "vue-i18n";
import HomeOnline from "./HomeOnline.vue";
import HomeLocal from "./HomeLocal.vue";

const { t } = useI18n();
const settingStore = useSettingStore();

// 问候语
const greetings = computed(() => {
  return t(`home.greeting.${getGreeting()}`);
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
