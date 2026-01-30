<template>
  <div class="like-type">
    <CoverList
      :data="dataStore.userLikeData.mvs"
      :loading="true"
      cols="2 600:2 800:3 900:4 1200:5 1400:6"
      type="video"
      :hiddenCover="settingStore.hiddenCovers.like"
    />
  </div>
</template>

<script setup lang="ts">
import { useDataStore, useSettingStore } from "@/stores";

const dataStore = useDataStore();
const settingStore = useSettingStore();
</script>
