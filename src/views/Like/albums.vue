<template>
  <div class="like-type">
    <CoverList
      :data="dataStore.userLikeData.albums"
      :loading="true"
      type="album"
      :hiddenCover="settingStore.hiddenCovers.like"
    />
  </div>
</template>

<script setup lang="ts">
import { useDataStore, useSettingStore } from "@/stores";

const dataStore = useDataStore();
const settingStore = useSettingStore();
</script>
