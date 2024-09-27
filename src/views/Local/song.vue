<template>
  <div class="local-songs">
    <SongList
      :key="data?.length"
      :data="data"
      :loading="loading"
      :hidden-cover="!settingStore.showLocalCover"
    />
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import { useSettingStore } from "@/stores";

const settingStore = useSettingStore();

defineProps<{
  data: SongType[];
  loading: boolean;
}>();
</script>
