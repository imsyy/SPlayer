<!-- 发现 - 歌手 -->
<template>
  <div class="dsc-artists">
    <div class="menu">
      <!-- 字母分类 -->
      <n-flex class="initial">
        <n-tag
          v-for="item in artistInitials"
          :key="item"
          :bordered="false"
          :class="['tag', { choose: item.key == artistInitialChoose }]"
          round
          @click="artistInitialChange(item.key)"
        >
          {{ item.value }}
        </n-tag>
      </n-flex>
      <!-- 地区分类 -->
      <n-flex class="category">
        <n-tag
          v-for="(item, index) in artistTypeNames"
          :key="item"
          :class="[
            'tag',
            item.length > 2 ? 'hidden' : 'show',
            { choose: index == artistTypeNamesChoose },
          ]"
          :bordered="false"
          round
          @click="artistTypeChange(index)"
        >
          {{ item }}
        </n-tag>
      </n-flex>
    </div>
    <MainCover :data="artistsData" columns="3 s:4 m:5 l:6" type="artist" />
    <n-flex v-if="arHasMore" justify="center">
      <n-button
        :loading="arIsLoading"
        class="load-more"
        size="large"
        strong
        secondary
        round
        @click="arLoadMore"
      >
        加载更多
      </n-button>
    </n-flex>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { siteSettings } from "@/stores";
import { getArtistList } from "@/api/artist";
import formatData from "@/utils/formatData";

const router = useRouter();
const settings = siteSettings();

// 歌手标签数据
const artistInitials = [
  { key: -1, value: "热门" },
  ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(i + 65)).map((v) => ({
    key: v,
    value: v,
  })),
  { key: 0, value: "#" },
];
const artistInitialChoose = ref(router.currentRoute.value.query?.initial || artistInitials[0].key);

// 歌手分类数据
const artistTypeNames = [
  "全部",
  ...["华语", "欧美", "日本", "韩国"].flatMap((region) => [
    `${region}`,
    `${region}男`,
    `${region}女`,
    `${region}组合`,
  ]),
  "其他",
];
const artistType = [-1, -1, 1, 2, 3, -1, 1, 2, 3, -1, 1, 2, 3, -1, 1, 2, 3, -1];
const artistArea = [-1, 7, 7, 7, 7, 96, 96, 96, 96, 8, 8, 8, 8, 16, 16, 16, 16, 0];
const artistTypeNamesChoose = ref(Number(router.currentRoute.value.query?.type) || 0);

// 歌手数据
const artistsData = ref([]);
const artistsOffset = ref(0);
const arHasMore = ref(false);
const arIsLoading = ref(false);

// 获取歌手数据
const getArtistListData = (
  type = artistType[artistTypeNamesChoose.value] || -1,
  area = artistArea[artistTypeNamesChoose.value] || -1,
  offset = artistsOffset.value,
  initial = artistInitialChoose.value,
  limit = settings.loadSize,
) => {
  getArtistList(type, area, offset, initial, limit).then((res) => {
    // 是否还有更多
    res.more ? (arHasMore.value = true) : (arHasMore.value = false);
    arIsLoading.value = false;
    // 获取数据
    artistsData.value.push(...formatData(res.artists, "artist"));
  });
};

// 歌手标签变化
const artistInitialChange = (key) => {
  router.push({
    path: "/discover/artists",
    query: {
      type: artistTypeNamesChoose.value,
      initial: key,
      page: 1,
    },
  });
};

// 歌手分类变化
const artistTypeChange = (key) => {
  router.push({
    path: "/discover/artists",
    query: {
      type: key,
      initial: artistInitialChoose.value,
      page: 1,
    },
  });
};

// 加载更多
const arLoadMore = () => {
  arIsLoading.value = true;
  artistsOffset.value += settings.loadSize;
  getArtistListData();
};

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    if (val.name === "dsc-artists") {
      artistsData.value = [];
      artistsOffset.value = 0;
      artistTypeNamesChoose.value = Number(val.query?.type) || 0;
      artistInitialChoose.value = val.query?.initial || artistInitials[0].key;
      getArtistListData(
        artistType[artistTypeNamesChoose.value],
        artistArea[artistTypeNamesChoose.value],
        artistsOffset.value,
        artistInitialChoose.value,
      );
    }
  },
);

onMounted(() => {
  getArtistListData();
});
</script>

<style lang="scss" scoped>
.dsc-artists {
  .menu {
    margin-bottom: 16px;
    @media (max-width: 768px) {
      .initial {
        display: none !important;
      }
    }
    @media (max-width: 480px) {
      .category {
        gap: initial !important;
        .hidden {
          display: none !important;
        }
        .show {
          margin-right: 12px;
          margin-bottom: 8px;
        }
      }
    }
    .tag {
      font-size: 13px;
      padding: 0 16px;
      line-height: 0;
      cursor: pointer;
      transition:
        transform 0.3s,
        background-color 0.3s,
        color 0.3s;
      &:hover {
        background-color: var(--main-second-color);
        color: var(--main-color);
      }
      &:active {
        transform: scale(0.95);
      }
      &.choose {
        background-color: var(--main-second-color);
        color: var(--main-color);
      }
    }
    .category {
      margin-top: 18px;
    }
  }
  .artistlists {
    @media (max-width: 480px) {
      padding-top: 12px;
    }
  }
  .load-more {
    margin: 30px 0 20px 0;
  }
}
</style>
