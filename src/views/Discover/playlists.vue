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
        @click="catModalShow = true"
      >
        <template #icon>
          <n-icon class="up" :component="ChevronRightRound" />
        </template>
        {{ catName }}
      </n-button>
      <n-modal
        class="s-modal"
        v-model:show="catModalShow"
        preset="card"
        :title="$t('general.name.playlistType')"
        :bordered="false"
      >
        <template #header>
          {{ $t("general.name.playlistType") }}
          <n-tag
            round
            class="tag"
            :type="catName == '全部歌单' ? 'primary' : 'default'"
            :style="{
              marginLeft: '12px',
              fontSize: '12px',
              transform: 'translateY(-2px)',
              cursor: 'pointer',
            }"
            :bordered="false"
            @click="changeTagName('全部歌单')"
          >
            {{ $t("general.name.allPLaylist") }}
          </n-tag>
        </template>
        <n-scrollbar>
          <div class="all-cat" v-if="music.catList?.sub[0]">
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
          <div class="error" v-else>
            {{ $t("general.message.acquisitionFailed") }}
          </div>
        </n-scrollbar>
      </n-modal>
      <!-- 精品歌单开关 -->
      <n-space
        v-if="getHaveHqPlaylists(music.highqualityCatList, catName)"
        align="center"
      >
        <n-text>{{ $t("general.name.bestPlaylist") }}</n-text>
        <n-switch
          v-model:value="hqPLayListOpen"
          @update:value="hqPLayListChange"
          :round="false"
        />
      </n-space>
    </div>
    <CoverLists :listData="playlistsData" />
    <Pagination
      v-if="playlistsData[0] && !hqPLayListOpen"
      :totalCount="totalCount"
      :pageNumber="pageNumber"
      @pageSizeChange="pageSizeChange"
      @pageNumberChange="pageNumberChange"
    />
    <n-space justify="center">
      <n-button
        v-if="hqPLayListOpen && hasMore"
        class="more"
        size="large"
        strong
        secondary
        round
        :loading="loading"
        @click="
          () => {
            loading = true;
            getHqPlaylistData(catName);
          }
        "
      >
        {{ $t("general.name.loadMore") }}
      </n-button>
    </n-space>
  </div>
</template>

<script setup>
import { ChevronRightRound, LocalFireDepartmentRound } from "@vicons/material";
import { useRouter } from "vue-router";
import { musicStore } from "@/store";
import { getHighqualityPlaylist, getTopPlaylist } from "@/api/playlist";
import { formatNumber } from "@/utils/timeTools";
import { useI18n } from "vue-i18n";
import CoverLists from "@/components/DataList/CoverLists.vue";
import Pagination from "@/components/Pagination/index.vue";

const { t } = useI18n();
const router = useRouter();
const music = musicStore();

// 分类数据
const catModalShow = ref(false);
const catName = ref(
  router.currentRoute.value.query.cat
    ? router.currentRoute.value.query.cat
    : "全部歌单"
);

// 歌单数据
const playlistsData = ref([]);
const totalCount = ref(0);
const pagelimit = ref(30);
const pageNumber = ref(
  router.currentRoute.value.query.page
    ? Number(router.currentRoute.value.query.page)
    : 1
);

// 精品歌单数据
const hqPLayListOpen = ref(
  router.currentRoute.value.query.hq
    ? router.currentRoute.value.query.hq == "true"
      ? true
      : false
    : false
);
const hasMore = ref(true);
const loading = ref(false);

// 获取是否有精品歌单
const getHaveHqPlaylists = (array, name) => {
  if (name == "全部歌单") {
    return true;
  } else {
    return array.some((item) => {
      return item.name == name;
    });
  }
};

// 精品歌单状态变化
const hqPLayListChange = (val) => {
  playlistsData.value = [];
  router.push({
    path: "/discover/playlists",
    query: {
      cat: catName.value,
      hq: val ? true : false,
      page: 1,
    },
  });
};

// 获取歌单数据
const getPlaylistData = (cat = "全部歌单", limit = 30, offset = 0) => {
  getTopPlaylist(cat, limit, offset).then((res) => {
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
      $message.error(t("general.message.acquisitionFailed"));
    }
    // 请求后回顶
    if (typeof $scrollToTop !== "undefined") $scrollToTop();
  });
};

// 获取精品歌单数据
const getHqPlaylistData = (cat = "全部歌单", limit = 30) => {
  // 获取 before
  const before = playlistsData.value[0]
    ? playlistsData.value[playlistsData.value.length - 1].updateTime
    : null;
  // 获取数据
  getHighqualityPlaylist(cat, limit, before).then((res) => {
    console.log(res);
    // 列表数据
    if (res.playlists[0]) {
      // 是否还有更多
      res.more ? (hasMore.value = true) : (hasMore.value = false);
      loading.value = false;
      // 遍历数据
      res.playlists.forEach((v) => {
        playlistsData.value.push({
          id: v.id,
          cover: v.coverImgUrl,
          name: v.name,
          artist: v.creator,
          playCount: formatNumber(v.playCount),
          updateTime: v.updateTime,
        });
      });
    } else {
      hasMore.value = false;
      $message.error(t("general.message.acquisitionFailed"));
    }
  });
};

// 更换标签名
const changeTagName = (name) => {
  playlistsData.value = [];
  router.push({
    path: "/discover/playlists",
    query: {
      cat: name,
      page: 1,
    },
  });
  catModalShow.value = false;
};

// 排序方式变化
const listOrderChange = (order) => {
  console.log(order);
  router.push({
    path: "/discover/playlists",
    query: {
      cat: catName.value,
      page: 1,
    },
  });
};

// 每页个数数据变化
const pageSizeChange = (val) => {
  console.log(val);
  pagelimit.value = val;
  getPlaylistData(catName.value, val, (pageNumber.value - 1) * pagelimit.value);
};

// 当前页数数据变化
const pageNumberChange = (val) => {
  router.push({
    path: "/discover/playlists",
    query: {
      cat: catName.value,
      page: val,
    },
  });
};

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    catName.value = val.query.cat ? val.query.cat : "全部歌单";
    hqPLayListOpen.value = val.query.hq
      ? val.query.hq == "true"
        ? true
        : false
      : false;
    if (val.name == "dsc-playlists") {
      if (hqPLayListOpen.value) {
        playlistsData.value = [];
        getHqPlaylistData(catName.value);
      } else {
        pageNumber.value = val.query.page ? Number(val.query.page) : 1;
        getPlaylistData(
          catName.value,
          pagelimit.value,
          (pageNumber.value - 1) * pagelimit.value
        );
      }
    }
  }
);

onMounted(() => {
  $setSiteTitle(t("nav.discover") + " - " + t("general.name.playlist"));
  // 获取歌单分类
  if (!music.catList.sub || !music.highqualityCatList[0])
    music.setCatList(true);
  // 获取歌单数据
  if (hqPLayListOpen.value) {
    getHqPlaylistData(catName.value);
  } else {
    getPlaylistData(
      catName.value,
      pagelimit.value,
      (pageNumber.value - 1) * pagelimit.value
    );
  }
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
  .more {
    margin-top: 40px;
    width: 140px;
    font-size: 16px;
    transition: all 0.3s;
    &:hover {
      background-color: var(--main-second-color);
      color: var(--main-color);
    }
    &:active {
      transform: scale(0.95);
    }
    :deep(.n-button__icon) {
      margin-right: 12px;
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
    background-color: var(--main-second-color);
    color: var(--main-color);
  }
  &:active {
    transform: scale(0.95);
  }
  .icon {
    color: var(--main-color);
    font-size: 16px;
    margin-left: 4px;
    transform: translateY(-1px);
  }
}
</style>
