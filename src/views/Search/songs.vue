<template>
  <div class="search-type">
    <Transition name="fade" mode="out-in">
      <SongList
        v-if="searchCount > 0"
        :data="searchResultData"
        :loading="loading"
        loadMore
        disabledSort
        @reachBottom="reachBottom"
      />
      <n-empty
        v-else
        :description="`很抱歉，未能找到与 ${keyword} 相关的任何歌曲`"
        style="margin-top: 60px"
        size="large"
      >
        <template #icon>
          <SvgIcon name="SearchOff" />
        </template>
      </n-empty>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import { searchResult } from "@/api/search";
import { formatSongsList } from "@/utils/format";

const props = defineProps<{
  keyword: string;
}>();

// 搜索数据
const hasMore = ref<boolean>(true);
const loading = ref<boolean>(true);
const searchOffset = ref<number>(0);
const searchCount = ref<number>(1);
const searchResultData = ref<SongType[]>([]);

// 获取搜索结果
const getSearchResult = async () => {
  // 获取数据
  loading.value = true;
  const result = await searchResult(props.keyword, 50, searchOffset.value, 1);
  // 是否还有
  hasMore.value = result.result?.hasMore || result.result?.songCount > searchOffset.value + 50;
  // 搜索总数
  searchCount.value = result.result?.songCount;
  // 处理数据
  const songData = formatSongsList(result.result.songs);
  searchResultData.value = searchResultData.value?.concat(songData);
  loading.value = false;
};

// 列表触底
const reachBottom = () => {
  if (hasMore.value) {
    console.log("加载");
    searchOffset.value += 50;
    getSearchResult();
  } else {
    loading.value = false;
  }
};

onMounted(() => {
  getSearchResult();
});
</script>
