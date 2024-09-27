<template>
  <div class="discover-playlists">
    <n-flex justify="space-between" align="center" class="menu">
      <!-- 分类 -->
      <n-button
        :focusable="false"
        icon-placement="right"
        strong
        secondary
        round
        @click="catChangeShow = true"
      >
        <template #icon>
          <n-icon class="more" depth="3">
            <SvgIcon name="Right" />
          </n-icon>
        </template>
        {{ catName }}
      </n-button>
      <!-- 精品 -->
      <Transition name="fade" mode="out-in">
        <n-tabs
          v-if="hasHqPlaylist"
          v-model:value="catHqType"
          class="tabs"
          type="segment"
          @update:value="
            (name: string) => changeCatName(catName, name === 'normal' ? 'false' : 'true')
          "
        >
          <n-tab name="normal"> 推荐 </n-tab>
          <n-tab name="hq"> 精品 </n-tab>
        </n-tabs>
      </Transition>
    </n-flex>
    <CoverList
      v-if="playlistCount > 0"
      :data="playlistData"
      :loading="loading"
      :loadMore="hasMore"
      type="playlist"
      @loadMore="loadMore"
    />
    <!-- 分类选择 -->
    <n-modal
      v-model:show="catChangeShow"
      display-directive="show"
      style="width: 600px"
      preset="card"
    >
      <template #header>
        <n-flex align="center" class="cat-header">
          <n-text>歌单分类</n-text>
          <n-tag
            :type="catName == '全部歌单' ? 'primary' : 'default'"
            :bordered="false"
            round
            @click="changeCatName('全部歌单')"
          >
            全部歌单
          </n-tag>
        </n-flex>
      </template>
      <n-tabs type="segment" animated>
        <n-tab-pane
          v-for="(item, key, index) in dataStore.catData.type"
          :key="index"
          :name="key"
          :tab="item"
        >
          <n-flex class="cat-list">
            <n-tag
              v-for="(cat, catIndex) in dataStore.catData.cats.filter(
                (cat) => cat.category === Number(key),
              )"
              :key="catIndex"
              :bordered="false"
              :class="{ choose: catName === cat.name }"
              size="large"
              round
              @click="changeCatName(cat.name)"
            >
              {{ cat.name }}
              <template #icon>
                <SvgIcon v-if="cat.hot" :depth="3" name="Fire" />
              </template>
            </n-tag>
          </n-flex>
        </n-tab-pane>
      </n-tabs>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import type { CoverType } from "@/types/main";
import { useDataStore } from "@/stores";
import { allCatlistPlaylist } from "@/api/playlist";
import { formatCoverList } from "@/utils/format";

const router = useRouter();
const dataStore = useDataStore();

const catChangeShow = ref<boolean>(false);

// 歌单分类
const catName = ref<string>((router.currentRoute.value.query?.cat as string) || "全部歌单");
const catHqType = ref<string>(
  (router.currentRoute.value.query?.hq as string) === "true" ? "hq" : "normal",
);

// 歌单数据
const hasMore = ref<boolean>(true);
const loading = ref<boolean>(true);
const playlistOffset = ref<number>(0);
const playlistCount = ref<number>(1);
const playlistData = ref<CoverType[]>([]);

// 是否有精品歌单
const hasHqPlaylist = computed<boolean>(() => {
  if (dataStore.catData.hqCats?.length === 0) return false;
  if (catName.value === "全部歌单") return true;
  return dataStore.catData.hqCats.some((item) => item.name === catName.value);
});

// 获取歌单数据
const getAllCatlistPlaylist = async () => {
  // before
  const before = playlistData.value?.at(-1)?.updateTime ?? undefined;
  // 获取数据
  loading.value = true;
  const result = await allCatlistPlaylist(
    catName.value,
    50,
    playlistOffset.value,
    catHqType.value === "hq" ? true : false,
    before,
  );
  // 是否还有
  playlistCount.value = result?.total;
  hasMore.value = result.more || result?.total > playlistOffset.value + 50;
  // 处理数据
  const listData = formatCoverList(result.playlists);
  playlistData.value = playlistData.value?.concat(listData);
  loading.value = false;
};

// 加载更多
const loadMore = () => {
  playlistOffset.value += 50;
  getAllCatlistPlaylist();
};

// 分类切换
const changeCatName = (cat: string, hq: string = "false") => {
  catChangeShow.value = false;
  router.push({
    name: "discover-playlists",
    query: { cat, hq },
  });
};

// 参数变化
onBeforeRouteUpdate((to) => {
  if (to.name !== "discover-playlists") return;
  catName.value = (to.query?.cat as string) || "全部歌单";
  catHqType.value = (to.query?.hq as string) === "true" ? "hq" : "normal";
  playlistData.value = [];
  // 获取歌单
  getAllCatlistPlaylist();
});

onMounted(() => {
  dataStore.getPlaylistCatList();
  // 获取歌单
  getAllCatlistPlaylist();
});
</script>

<style lang="scss" scoped>
.discover-playlists {
  .menu {
    margin-top: 20px;
    .n-button {
      height: 40px;
    }
    .n-tabs {
      height: 40px;
      width: 140px;
      --n-tab-border-radius: 25px !important;
      :deep(.n-tabs-rail) {
        outline: 1px solid var(--n-tab-color-segment);
      }
    }
  }
}
.cat-list {
  align-content: flex-start;
  min-height: 140px;
  margin-top: 8px;
  .n-tag {
    font-size: 14px;
    .n-icon {
      font-size: 16px;
      margin-left: 4px;
    }
  }
}
</style>
