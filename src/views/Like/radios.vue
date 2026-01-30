<template>
  <div class="like-type">
    <CoverList
      :data="dataStore.userLikeData.djs"
      :loading="true"
      type="radio"
      :hiddenCover="settingStore.hiddenCovers.like"
    />
  </div>
</template>

<script setup lang="ts">
import { useDataStore, useSettingStore } from "@/stores";

const dataStore = useDataStore();
const settingStore = useSettingStore();
</script>
