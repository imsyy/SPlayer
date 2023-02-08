<template>
  <div class="like">
    <CoverLists :listData="music.getUserPlayLists.like" :showMore="true" />
  </div>
</template>

<script setup>
import { musicStore } from "@/store";
import CoverLists from "@/components/DataList/CoverLists.vue";

const music = musicStore();

onMounted(() => {
  if (!music.getUserPlayLists.has) music.setUserPlayLists();
});
</script>