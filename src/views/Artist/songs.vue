<template>
  <div class="artist-songs">
    <SongList
      :data="songData"
      :loading="loading"
      loadMore
      @reachBottom="reachBottom"
      @scroll="emit('scroll', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import { artistAllSongs } from "@/api/artist";
import { songDetail } from "@/api/song";
import { formatSongsList } from "@/utils/format";
import { debounce } from "lodash-es";
import player from "@/utils/player";

const props = defineProps<{
  id: number;
}>();

const emit = defineEmits<{
  scroll: [e: Event];
}>();

// 歌曲数据
const loading = ref<boolean>(true);
const hasMore = ref<boolean>(true);
const songData = ref<SongType[]>([]);
const songOffset = ref<number>(0);

// 获取歌手全部歌曲
const getArtistAllSongs = async () => {
  try {
    if (!props.id) return;
    loading.value = true;
    // 获取数据
    const result = await artistAllSongs(props.id, 100, songOffset.value);
    // 是否还有
    hasMore.value = result?.more;
    // 处理数据
    const ids: number[] = result?.songs.map((song: any) => song.id as number);
    const songs = await songDetail(ids);
    const songDetailData = formatSongsList(songs?.songs);
    songData.value = songData.value.concat(songDetailData);
    loading.value = false;
  } catch (error) {
    console.error("Error getting artist all songs:", error);
  }
};

// 播放全部歌曲
const playAllSongs = debounce(() => {
  if (!songData.value || !songData.value?.length) return;
  player.updatePlayList(songData.value);
}, 300);

// 列表触底
const reachBottom = () => {
  if (hasMore.value) {
    songOffset.value += 100;
    getArtistAllSongs();
  } else {
    loading.value = false;
  }
};

defineExpose({ playAllSongs });

onMounted(getArtistAllSongs);
</script>
