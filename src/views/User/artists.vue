<template>
  <div class="artists">
    <ArtistLists :listData="music.getUserArtistlists.list" />
  </div>
</template>

<script setup>
import { musicStore } from "@/store";
import ArtistLists from "@/components/DataList/ArtistLists.vue";

const music = musicStore();

onMounted(() => {
  if (!music.setUserArtistLists.has) music.setUserArtistLists();
});
</script>
