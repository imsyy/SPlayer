<template>
  <div class="like">
    <CoverLists :listData="user.getUserPlayLists.like" :showMore="true" />
  </div>
</template>

<script setup>
import { userStore } from "@/store";
import CoverLists from "@/components/DataList/CoverLists.vue";

const user = userStore();

onMounted(() => {
  if (!user.getUserPlayLists.has) user.setUserPlayLists();
});
</script>