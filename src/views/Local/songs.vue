<!-- 本地歌曲 - 歌曲 -->
<template>
  <div class="local-songs">
    <SongList :data="songList" />
  </div>
</template>

<script setup>
// eslint-disable-next-line no-unused-vars
const props = defineProps({
  // 歌曲信息
  songList: {
    type: Array,
    default: () => [],
  },
});
</script>
