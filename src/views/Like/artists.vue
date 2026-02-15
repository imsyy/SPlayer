<template>
  <div class="like-type">
    <ArtistList
      :data="dataStore.userLikeData.artists"
      :loading="true"
      :hiddenCover="settingStore.hiddenCovers.like"
    />
  </div>
</template>

<script setup lang="ts">
import { useDataStore, useSettingStore } from "@/stores";

const dataStore = useDataStore();
const settingStore = useSettingStore();
</script>
