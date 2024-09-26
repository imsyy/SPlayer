<template>
  <div class="search-type">
    <Transition name="fade" mode="out-in">
      <CoverList
        v-if="searchCount > 0"
        :data="searchResultData"
        :loading="loading"
        :loadMore="hasMore"
        type="playlist"
        @loadMore="loadMore"
      />
      <n-empty
        v-else
        :description="`很抱歉，未能找到与 ${keyword} 相关的任何歌单`"
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
import type { CoverType } from "@/types/main";
import { searchResult } from "@/api/search";
import { formatCoverList } from "@/utils/format";

const props = defineProps<{
  keyword: string;
}>();

// 搜索数据
const hasMore = ref<boolean>(true);
const loading = ref<boolean>(true);
const searchOffset = ref<number>(0);
const searchCount = ref<number>(1);
const searchResultData = ref<CoverType[]>([]);

// 获取搜索结果
const getSearchResult = async () => {
  // 获取数据
  loading.value = true;
  const result = await searchResult(props.keyword, 50, searchOffset.value, 1000);
  // 是否还有
  hasMore.value = result.result?.hasMore || result.result?.playlistCount > searchOffset.value + 50;
  // 搜索总数
  searchCount.value = result.result?.playlistCount;
  // 处理数据
  const playlistData = formatCoverList(result.result.playlists);
  searchResultData.value = searchResultData.value?.concat(playlistData);
  loading.value = false;
};

// 加载更多
const loadMore = () => {
  searchOffset.value += 50;
  getSearchResult();
};

onMounted(() => {
  getSearchResult();
});
</script>
