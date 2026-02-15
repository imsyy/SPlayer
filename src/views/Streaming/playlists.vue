<template>
  <div class="streaming-playlists">
    <!-- 歌单列表 -->
    <CoverList
      :data="playlistData"
      :loading="loading"
      :show-size="false"
      type="playlist"
      is-streaming
      empty-description="暂无歌单"
    />
  </div>
</template>

<script setup lang="ts">
import type { CoverType } from "@/types/main";
import { useStreamingStore } from "@/stores";

const streamingStore = useStreamingStore();

const loading = ref<boolean>(false);

// 歌单数据
const playlistData = computed<CoverType[]>(() => {
  return streamingStore.playlists.value.map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    cover: playlist.cover || "/images/album.jpg?asset",
    description: playlist.description,
    count: playlist.songCount || 0,
  }));
});
</script>

<style lang="scss" scoped>
.streaming-playlists {
  height: 100%;
  padding-bottom: 20px;
  overflow-y: auto;
  .cover-list {
    padding: 4px;
  }
  .empty {
    margin-top: 100px;
  }
}
</style>
