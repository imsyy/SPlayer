<template>
  <div class="local-playlists">
    <!-- 歌单列表 -->
    <CoverList
      :data="playlistData"
      :loading="false"
      type="playlist"
      :show-size="false"
      empty-description="暂无本地歌单"
      :hiddenCover="settingStore.hiddenCovers.playlist"
    />
  </div>
</template>

<script setup lang="ts">
import type { CoverType } from "@/types/main";
import { useLocalStore, useSettingStore } from "@/stores";
import CoverList from "@/components/List/CoverList.vue";

const localStore = useLocalStore();
const settingStore = useSettingStore();

// 歌单数据
const playlistData = computed<CoverType[]>(() => {
  return localStore.localPlaylists.map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    cover: playlist.cover || "/images/album.jpg?asset",
    description: playlist.description,
    count: playlist.songs.length,
    createTime: playlist.createTime,
    updateTime: playlist.updateTime,
  }));
});
</script>

<style lang="scss" scoped>
.local-playlists {
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
