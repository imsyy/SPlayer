<template>
  <div class="playlists">
    <div class="menu">
      <!-- 分类选择 -->
      <n-button
        strong
        secondary
        class="cat"
        icon-placement="right"
        round
        @click="catModelShow = true"
      >
        <template #icon>
          <n-icon class="up" :component="ChevronRightRound" />
        </template>
        {{ catName }}
      </n-button>
      <n-modal
        class="cat-model"
        v-model:show="catModelShow"
        style="width: 60vw; min-width: min(24rem, 100vw)"
        preset="card"
        title="歌单分类"
        :bordered="false"
      >
        <template #header>
          歌单分类
          <n-tag
            round
            class="tag"
            :type="catName == '全部歌单' ? 'primary' : 'default'"
            :style="{
              marginLeft: '12px',
              fontSize: '12px',
              transform: 'translateY(-2px)',
            }"
            :bordered="false"
            @click="changeTagName('全部歌单')"
          >
            全部歌单
          </n-tag>
        </template>
        <n-scrollbar style="max-height: 80vh">
          <div class="all-cat" v-if="music.catList.sub && music.catList.sub[0]">
            <n-list>
              <n-list-item
                v-for="(cat, key) in music.catList.categories"
                :key="cat"
              >
                <template #prefix>
                  <n-text class="type"> {{ cat }} </n-text>
                </template>
                <n-space>
                  <n-tag
                    round
                    class="tag"
                    size="large"
                    v-for="item in music.catList.sub.filter(
                      (v) => v.category == key
                    )"
                    :key="item"
                    :bordered="false"
                    :type="item.name == catName ? 'primary' : 'default'"
                    @click="changeTagName(item.name)"
                  >
                    {{ item.name }}
                    <template #icon>
                      <n-icon
                        class="icon"
                        v-if="item.hot"
                        :component="LocalFireDepartmentRound"
                      />
                    </template>
                  </n-tag>
                </n-space>
              </n-list-item>
            </n-list>
          </div>
          <div class="error" v-else>分类数据获取失败</div>
        </n-scrollbar>
      </n-modal>
      <!-- 排序类型 -->
      <n-select
        class="order"
        v-model:value="listOrder"
        :options="listOrderOptions"
        @update:value="listOrderChange"
      />
    </div>
    <CoverLists :listData="playlistsData" />
    <Pagination
      v-if="playlistsData[0]"
      :totalCount="totalCount"
      @pageSizeChange="pageSizeChange"
      @pageNumberChange="pageNumberChange"
    />
  </div>
</template>

<script setup>
import { ChevronRightRound, LocalFireDepartmentRound } from "@vicons/material";
import { useRouter } from "vue-router";
import { musicStore } from "@/store";
import { getPlayListCatlist, getTopPlaylist } from "@/api";
import { formatNumber } from "@/utils/timeTools.js";
import CoverLists from "@/components/DataList/CoverLists.vue";
import Pagination from "@/components/Pagination/index.vue";

const router = useRouter();
const music = musicStore();

// 分类数据
let catModelShow = ref(false);
let catName = ref(
  router.currentRoute.value.query.cat
    ? router.currentRoute.value.query.cat
    : "全部歌单"
);

// 排序数据
let listOrder = ref(
  router.currentRoute.value.query.order
    ? router.currentRoute.value.query.order
    : "hot"
);
let listOrderOptions = [
  {
    label: "最热",
    value: "hot",
  },
  {
    label: "最新",
    value: "new",
  },
];

// 歌单数据
let playlistsData = ref([]);
let totalCount = ref(0);
let pagelimit = ref(30);
let pageNumber = ref(
  router.currentRoute.value.query.page
    ? Number(router.currentRoute.value.query.page)
    : 1
);

// 获取歌单分类
const getPlayListCatlistData = () => {
  getPlayListCatlist().then((res) => {
    if (res.code == 200) {
      music.catList = res;
    } else {
      $message.error("歌单分类获取失败");
    }
  });
};

// 获取歌单数据
const getPlaylistData = (
  cat = "全部歌单",
  limit = 30,
  offset = 0,
  order = "hot"
) => {
  getTopPlaylist(cat, limit, offset, order).then((res) => {
    console.log(res);
    // 数据总数
    totalCount.value = res.total;
    // 列表数据
    playlistsData.value = [];
    if (res.playlists[0]) {
      res.playlists.forEach((v) => {
        playlistsData.value.push({
          id: v.id,
          cover: v.coverImgUrl,
          name: v.name,
          artist: v.creator,
          playCount: formatNumber(v.playCount),
        });
      });
    } else {
      $message.error("歌单列表为空");
    }
    // 请求后回顶
    if ($mainContent) $mainContent.scrollIntoView({ behavior: "smooth" });
  });
};

// 更换标签名
const changeTagName = (name) => {
  router.push({
    path: "/discover/playlists",
    query: {
      page: 1,
      cat: name,
      order: listOrder.value,
    },
  });
  catModelShow.value = false;
};

// 排序方式变化
const listOrderChange = (order) => {
  console.log(order);
  router.push({
    path: "/discover/playlists",
    query: {
      page: 1,
      cat: catName.value,
      order,
    },
  });
};

// 每页个数数据变化
const pageSizeChange = (val) => {
  console.log(val);
  pagelimit.value = val;
  getPlaylistData(
    catName.value,
    val,
    (pageNumber.value - 1) * pagelimit.value,
    listOrder.value
  );
};

// 当前页数数据变化
const pageNumberChange = (val) => {
  router.push({
    path: "/discover/playlists",
    query: {
      page: val,
      cat: catName.value,
      order: listOrder.value,
    },
  });
};

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    catName.value = val.query.cat;
    pageNumber.value = Number(val.query.page);
    listOrder.value = val.query.order;
    if (val.name == "dsc-playlists") {
      getPlaylistData(
        catName.value,
        pagelimit.value,
        (pageNumber.value - 1) * pagelimit.value,
        listOrder.value
      );
    }
  }
);

onMounted(() => {
  // 获取歌单分类
  if (!music.catList.sub) getPlayListCatlistData();
  // 获取歌单数据
  getPlaylistData(
    catName.value,
    pagelimit.value,
    (pageNumber.value - 1) * pagelimit.value,
    listOrder.value
  );
});
</script>

<style lang="scss" scoped>
.playlists {
  .menu {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    .order {
      width: 80px;
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
}
.tag {
  cursor: pointer;
  transition: all 0.3s;
  &:hover {
    background-color: $mainSecondaryColor;
    color: $mainColor;
  }
  &:active {
    transform: scale(0.95);
  }
  .icon {
    color: $mainColor;
    font-size: 16px;
    margin-left: 4px;
    transform: translateY(-1px);
  }
}
</style>