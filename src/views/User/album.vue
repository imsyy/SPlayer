<template>
  <div class="album">
    <CoverLists :listData="user.getUserAlbumLists.list" listType="album" />
  </div>
</template>

<script setup>
import { userStore } from "@/store";
import CoverLists from "@/components/DataList/CoverLists.vue";

const user = userStore();

onMounted(() => {
  if (!user.getUserAlbumLists.has && !user.getUserAlbumLists.isLoading)
    user.setUserAlbumLists();
});
</script>
