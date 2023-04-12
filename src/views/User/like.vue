<template>
  <div class="like">
    <CoverLists :listData="user.getUserPlayLists.like" />
  </div>
</template>

<script setup>
import { userStore } from "@/store";
import CoverLists from "@/components/DataList/CoverLists.vue";

const user = userStore();

onMounted(() => {
  $setSiteTitle("音乐库 - 收藏的歌单");
  if (!user.getUserPlayLists.has && !user.getUserPlayLists.isLoading)
    user.setUserPlayLists();
});
</script>
