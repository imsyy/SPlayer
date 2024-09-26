<template>
  <div class="artist-type">
    <CoverList
      :data="videoData"
      :loading="loading"
      :loadMore="hasMore"
      type="video"
      cols="2 600:2 800:3 900:4 1200:5 1400:6"
      @loadMore="loadMore"
    />
  </div>
</template>

<script setup lang="ts">
import type { CoverType } from "@/types/main";
import { artistVideos } from "@/api/artist";
import { formatCoverList } from "@/utils/format";

const props = defineProps<{
  id: number;
}>();

// 歌曲数据
const loading = ref<boolean>(true);
const hasMore = ref<boolean>(true);
const videoData = ref<CoverType[]>([]);
const videoOffset = ref<number>(0);

// 获取歌手全部视频
const getArtistAllVideos = async () => {
  try {
    if (!props.id) return;
    loading.value = true;
    // 获取数据
    const result = await artistVideos(props.id, 50, videoOffset.value);
    // 是否还有
    hasMore.value = result?.hasMore;
    // 处理数据
    const listData = formatCoverList(result?.mvs);
    videoData.value = videoData.value.concat(listData);
    loading.value = false;
  } catch (error) {
    console.error("Error getting artist all videos:", error);
  }
};

// 加载更多
const loadMore = () => {
  if (hasMore.value) {
    videoOffset.value += 50;
    getArtistAllVideos();
  } else {
    loading.value = false;
  }
};

onMounted(getArtistAllVideos);
</script>
