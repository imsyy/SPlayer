<template>
  <div class="artist-type">
    <CoverList
      :data="albumData"
      :loading="loading"
      :loadMore="hasMore"
      type="album"
      @loadMore="loadMore"
    />
  </div>
</template>

<script setup lang="ts">
import type { CoverType } from "@/types/main";
import { artistAblums } from "@/api/artist";
import { formatCoverList } from "@/utils/format";

const props = defineProps<{
  id: number;
}>();

// 歌曲数据
const loading = ref<boolean>(true);
const hasMore = ref<boolean>(true);
const albumData = ref<CoverType[]>([]);
const albumOffset = ref<number>(0);

// 获取歌手全部专辑
const getArtistAllAlbums = async () => {
  try {
    if (!props.id) return;
    loading.value = true;
    // 获取数据
    const result = await artistAblums(props.id, 50, albumOffset.value);
    // 是否还有
    hasMore.value = result?.more;
    // 处理数据
    const listData = formatCoverList(result?.hotAlbums);
    albumData.value = albumData.value.concat(listData);
    loading.value = false;
  } catch (error) {
    console.error("Error getting artist all albums:", error);
  }
};

// 加载更多
const loadMore = () => {
  if (hasMore.value) {
    albumOffset.value += 50;
    getArtistAllAlbums();
  } else {
    loading.value = false;
  }
};

onMounted(getArtistAllAlbums);
</script>
