<template>
  <div class="artists">
    <ArtistLists :listData="user.getUserArtistlists.list" />
  </div>
</template>

<script setup>
import { userStore } from "@/store";
import ArtistLists from "@/components/DataList/ArtistLists.vue";

const user = userStore();

onMounted(() => {
  if (!user.getUserArtistlists.has) user.setUserArtistLists();
});
</script>
