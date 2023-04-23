<template>
  <div class="playlists">
    <div class="data">
      <n-button
        class="add"
        type="primary"
        strong
        secondary
        round
        @click="createPlaylistRef.openCreatePlaylist()"
      >
        <template #icon>
          <n-icon :component="AddCircleRound" />
        </template>
        新建歌单
      </n-button>
      <!-- 新建歌单 -->
      <CreatePlaylist ref="createPlaylistRef" />
    </div>
    <CoverLists :listData="user.getUserPlayLists.own" />
  </div>
</template>

<script setup>
import { AddCircleRound } from "@vicons/material";
import { userStore } from "@/store";
import CoverLists from "@/components/DataList/CoverLists.vue";
import CreatePlaylist from "@/components/DataModal/CreatePlaylist.vue";

const user = userStore();
const createPlaylistRef = ref(null);

onMounted(() => {
  $setSiteTitle("音乐库 - 我的歌单");
  if (!user.getUserPlayLists.has && !user.getUserPlayLists.isLoading)
    user.setUserPlayLists();
});
</script>

<style lang="scss" scoped>
.playlists {
  .data {
    width: 100%;
    margin: 20px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
