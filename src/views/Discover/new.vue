<template>
  <div class="discover-new">
    <n-flex class="menu" justify="space-between">
      <n-flex class="type">
        <n-tag
          v-for="(item, index) in newTypeNames"
          :key="index"
          :class="{ choose: index === newTypeChoose }"
          :bordered="false"
          round
          @click="newQueryChange(index, newAreaChoose)"
        >
          {{ item }}
        </n-tag>
      </n-flex>
      <n-flex class="area">
        <n-tag
          v-for="(item, index) in newAreaNames"
          :key="index"
          :class="{ choose: index === newAreaChoose }"
          :bordered="false"
          round
          @click="newQueryChange(newTypeChoose, index)"
        >
          {{ item.value }}
        </n-tag>
      </n-flex>
    </n-flex>
    <!-- 列表 -->
    <Transition name="fade" mode="out-in">
      <CoverList
        v-if="newTypeChoose === 0"
        :data="newAlbumData"
        :loading="loading"
        :loadMore="hasMore"
        @loadMore="loadMore"
        type="album"
      />
      <SongList
        v-else-if="newTypeChoose === 1"
        :data="newSongData"
        :loading="loading"
        disabledSort
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { newAlbumsAll, newSongs } from "@/api/rec";
import type { CoverType, SongType } from "@/types/main";
import { formatCoverList, formatSongsList } from "@/utils/format";

const router = useRouter();

// 分类数据
const newTypeNames = ["新碟上架", "新歌速递"];
const newAreaNames = [
  { key: "ALL", num: 0, value: "全部" },
  { key: "ZH", num: 7, value: "华语" },
  { key: "EA", num: 96, value: "欧美" },
  { key: "KR", num: 16, value: "韩国" },
  { key: "JP", num: 8, value: "日本" },
] as const;
const newTypeChoose = ref<number>(Number(router.currentRoute.value.query?.type as string) || 0);
const newAreaChoose = ref<number>(Number(router.currentRoute.value.query?.area as string) || 0);

// 地区类型
type AreaKey = (typeof newAreaNames)[number]["key"];

// 音乐数据
const hasMore = ref<boolean>(true);
const loading = ref<boolean>(true);
const newOffset = ref<number>(0);
const newSongData = ref<SongType[]>([]);
const newAlbumData = ref<CoverType[]>([]);

// 获取最新音乐数据
const getAllNewData = async () => {
  // 获取数据
  loading.value = true;
  // 新碟上架
  if (newTypeChoose.value === 0) {
    const area: AreaKey = newAreaNames[newAreaChoose.value]?.key || "ALL";
    const result = await newAlbumsAll(area, 50, newOffset.value);
    // 是否还有
    hasMore.value = result.total > newOffset.value + 50;
    // 处理数据
    const albumData = formatCoverList(result.albums);
    newAlbumData.value = newAlbumData.value.concat(albumData);
  }
  // 新歌速递
  else if (newTypeChoose.value === 1) {
    const area = newAreaNames[newAreaChoose.value]?.num || 0;
    const result = await newSongs(area);
    // 处理数据
    newSongData.value = formatSongsList(result.data);
  }
  loading.value = false;
};

// 参数变化
const newQueryChange = (type: number, area: number) => {
  router.push({
    name: "discover-new",
    query: { type, area },
  });
};

// 加载更多
const loadMore = () => {
  newOffset.value += 50;
  getAllNewData();
};

// 参数变化
onBeforeRouteUpdate((to) => {
  if (to.name !== "discover-new") return;
  // 更新参数
  newTypeChoose.value = Number(to.query?.type as string) || 0;
  newAreaChoose.value = Number(to.query?.area as string) || 0;
  // 获取歌单
  loading.value = true;
  newOffset.value = 0;
  newSongData.value = [];
  newAlbumData.value = [];
  getAllNewData();
});

onMounted(getAllNewData);
</script>

<style lang="scss" scoped>
.discover-new {
  display: flex;
  flex-direction: column;
  height: 100%;
  .menu {
    margin-top: 20px;
  }
  .song-list {
    flex: 1;
  }
}
</style>
