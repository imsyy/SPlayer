<template>
  <div class="artists">
    <ArtistLists :listData="user.getUserArtistLists.list" />
  </div>
</template>

<script setup>
import { userStore } from "@/store";
import ArtistLists from "@/components/DataList/ArtistLists.vue";

const user = userStore();

onMounted(() => {
  $setSiteTitle("音乐库 - 收藏的歌手");
  if (!user.getUserArtistLists.has && !user.getUserArtistLists.isLoading)
    user.setUserArtistLists();
});
</script>
