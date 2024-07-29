<!-- 发现 - 歌单 -->
<template>
  <div class="dsc-playlists">
    <!-- 菜单 -->
    <n-flex class="menu" align="center" justify="space-between">
      <!-- 分类选择 -->
      <n-button
        class="cat"
        icon-placement="right"
        strong
        secondary
        round
        @click="catChangeShow = true"
      >
        <template #icon>
          <n-icon class="more" depth="3">
            <SvgIcon icon="chevron-right" />
          </n-icon>
        </template>
        {{ catName }}
      </n-button>
      <Transition name="fade" mode="out-in">
        <n-flex v-if="getHaveHqPlaylists(data.plCatList.hqCatList, catName)" align="center">
          <n-text>精品歌单</n-text>
          <n-switch v-model:value="hqPlOpen" :round="false" @update:value="hqPlOpenChange" />
        </n-flex>
      </Transition>
    </n-flex>
    <!-- 列表 -->
    <MainCover :data="allPlData" />
    <!-- 分页 -->
    <Pagination
      v-if="!hqPlOpen"
      :totalCount="plTotalCount"
      :pageNumber="pageNumber"
      @pageNumberChange="pageNumberChange"
    />
    <!-- 加载更多 -->
    <Transition name="fade" mode="out-in">
      <n-flex justify="center">
        <n-button
          v-if="hqPlOpen && plHasMore"
          :loading="plHasLoading"
          class="load-more"
          size="large"
          strong
          secondary
          round
          @click="
            () => {
              plHasLoading = true;
              getDscPlaylistData(catName);
            }
          "
        >
          加载更多
        </n-button>
      </n-flex>
    </Transition>
    <!-- 分类切换 -->
    <n-modal v-model:show="catChangeShow" :bordered="false" preset="card">
      <template #header>
        <div class="cat-header">
          <n-text>歌单分类</n-text>
          <n-tag
            :type="catName == '全部歌单' ? 'primary' : 'default'"
            :bordered="false"
            round
            class="tag"
            @click="changeCatName('全部歌单')"
          >
            全部歌单
          </n-tag>
        </div>
      </template>
      <n-scrollbar style="max-height: 70vh">
        <div v-if="data.plCatList.catList?.length" class="all-cat">
          <n-list>
            <n-list-item v-for="(cat, key) in data.plCatList.allCat" :key="cat">
              <template #prefix>
                <n-text class="type"> {{ cat }} </n-text>
              </template>
              <n-flex>
                <n-tag
                  v-for="item in data.plCatList.catList.filter((v) => v.category == key)"
                  :key="item"
                  :bordered="false"
                  :type="item.name == catName ? 'primary' : 'default'"
                  round
                  class="tag"
                  size="large"
                  @click="changeCatName(item.name)"
                >
                  {{ item.name }}
                  <template #icon>
                    <n-icon v-if="item.hot" class="hot">
                      <SvgIcon icon="fire" />
                    </n-icon>
                  </template>
                </n-tag>
              </n-flex>
            </n-list-item>
          </n-list>
        </div>
        <div v-else class="error">
          <n-text>加载失败</n-text>
        </div>
      </n-scrollbar>
    </n-modal>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { siteData, siteSettings } from "@/stores";
import { getDscPlaylist } from "@/api/playlist";
import formatData from "@/utils/formatData";

const data = siteData();
const settings = siteSettings();
const router = useRouter();

// 路由数据
const pageNumber = ref(Number(router.currentRoute.value.query?.page) || 1);
const catName = ref(router.currentRoute.value.query?.cat || "全部歌单");
const hqPlOpen = ref(router.currentRoute.value.query?.hq === "true" ?? false);

// 歌单数据
const catChangeShow = ref(false);
const allPlData = ref([]);
const plHasMore = ref(false);
const plHasLoading = ref(false);
const plTotalCount = ref(0);

// 获取是否有精品歌单
const getHaveHqPlaylists = (array, name) => {
  if (array?.length <= 0) return false;
  if (name == "全部歌单") {
    return true;
  } else {
    return array.some((item) => {
      return item.name == name;
    });
  }
};

// 获取歌单
const getDscPlaylistData = (cat = "全部歌单", limit = settings.loadSize, offset = 0) => {
  try {
    // 获取 before
    const allPlDataLength = allPlData.value.length;
    const resBefore = allPlDataLength > 0 ? allPlData.value[allPlDataLength - 1].updateTime : null;
    // 获取数据
    getDscPlaylist(cat, limit, offset, hqPlOpen.value, resBefore).then((res) => {
      // 数据总数
      plTotalCount.value = res.total;
      // 列表数据
      if (hqPlOpen.value) {
        // 是否有更多
        res.more ? (plHasMore.value = true) : (plHasMore.value = false);
        plHasLoading.value = false;
        allPlData.value.push(...formatData(res.playlists));
      } else {
        allPlData.value = [];
        allPlData.value = formatData(res.playlists);
      }
    });
  } catch (error) {
    plHasMore.value = false;
    console.error("歌单列表获取失败：", error);
    $message.error("歌单列表获取失败");
  }
};

// 精品歌单切换
const hqPlOpenChange = (val) => {
  allPlData.value = [];
  router.push({
    path: "/discover/playlists",
    query: {
      cat: catName.value,
      hq: val ? true : false,
    },
  });
};

// 分类切换
const changeCatName = (key) => {
  allPlData.value = [];
  router.push({
    path: "/discover/playlists",
    query: {
      cat: key,
      page: 1,
    },
  });
  catChangeShow.value = false;
};

// 页数变化
const pageNumberChange = (page) => {
  allPlData.value = [];
  router.push({
    path: "/discover/playlists",
    query: {
      cat: catName.value,
      page: page,
    },
  });
};

// 监听路由变化
watch(
  () => router.currentRoute.value,
  (val) => {
    if (val.name === "dsc-playlists") {
      // 更改参数
      pageNumber.value = Number(val.query?.page) || 1;
      catName.value = val.query?.cat || "全部歌单";
      hqPlOpen.value = val.query?.hq === "true" ?? false;
      // 调用接口
      getDscPlaylistData(
        catName.value,
        settings.loadSize,
        (pageNumber.value - 1) * settings.loadSize,
      );
    }
  },
);

onMounted(() => {
  // 获取分类列表
  data.setPlCatList();
  // 获取歌单列表
  getDscPlaylistData(catName.value, settings.loadSize, (pageNumber.value - 1) * settings.loadSize);
});
</script>

<style lang="scss" scoped>
.dsc-playlists {
  .menu {
    margin-bottom: 20px;
  }
  .load-more {
    margin-top: 40px;
  }
}
.cat-header {
  display: flex;
  align-items: center;
  .n-tag {
    margin-left: 12px;
    font-size: 12px;
    transition:
      transform 0.3s,
      background-color 0.3s,
      color 0.3s;
    cursor: pointer;
    &:hover {
      background-color: var(--main-second-color);
      color: var(--main-color);
    }
    &:active {
      transform: scale(0.95);
    }
  }
}
.all-cat {
  .type {
    white-space: nowrap;
    &::after {
      content: ">";
      margin-left: 6px;
      opacity: 0.6;
    }
  }
  .tag {
    background-color: var(--n-action-color);
    transition:
      transform 0.3s,
      background-color 0.3s,
      color 0.3s;
    cursor: pointer;
    .hot {
      color: var(--main-color);
      font-size: 16px;
      margin-left: 4px;
    }
    &:hover {
      background-color: var(--main-second-color);
      color: var(--main-color);
    }
    &:active {
      transform: scale(0.95);
    }
  }
}
</style>
