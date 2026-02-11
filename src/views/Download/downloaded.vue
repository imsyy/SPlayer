<template>
  <div class="download-downloaded">
    <SongList :data="data" :loading="loading" @removeSong="getDownloadMusic" />
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import SongList from "@/components/List/SongList.vue";

defineProps<{
  data: SongType[];
  loading: boolean;
}>();

const getDownloadMusic = inject("getDownloadMusic") as () => void;
</script>

<style lang="scss" scoped>
.download-downloaded {
  height: 100%;
}
</style>
