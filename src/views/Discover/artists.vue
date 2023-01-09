<template>
  <div class="artists">
    <div class="menu">
      <n-space class="initial">
        <n-tag
          round
          v-for="item in artistInitials"
          :key="item"
          :bordered="false"
          :type="item.key == artistInitialChoose ? 'primary' : 'default'"
        >
          {{ item.value }}
        </n-tag>
      </n-space>
      <n-space class="category">
        <n-tag
          round
          v-for="(item, index) in artistTypeNames"
          :key="item"
          :bordered="false"
          :type="index == artistTypeNamesChoose ? 'primary' : 'default'"
        >
          {{ item }}
        </n-tag>
      </n-space>
    </div>
    <ArtistLists :listData="artistsData" :loadingNum="30" />
    <n-button v-if="hasMore" class="more" size="large" strong secondary round>
      更多
    </n-button>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { getArtistList } from "@/api";
import ArtistLists from "@/components/DataList/ArtistLists.vue";

const router = useRouter();

// 歌手标签数据
let artistInitials = [
  { key: "-1", value: "热门" },
  ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(i + 65)).map(
    (v) => ({
      key: v,
      value: v,
    })
  ),
  { key: "0", value: "#" },
];
let artistInitialChoose = ref(
  router.currentRoute.value.query.initial
    ? router.currentRoute.value.query.initial
    : artistInitials[0].key
);

// 歌手分类数据
let artistTypeNames = [
  "全部",
  "华语",
  "华语男",
  "华语女",
  "华语组合",
  "欧美",
  "欧美男",
  "欧美女",
  "欧美组合",
  "日本",
  "日本男",
  "日本女",
  "日本组合",
  "韩国",
  "韩国男",
  "韩国女",
  "韩国组合",
  "其他",
];
let artistType = [-1, -1, 1, 2, 3, -1, 1, 2, 3, -1, 1, 2, 3, -1, 1, 2, 3, -1];
let artistArea = [
  -1, 7, 7, 7, 7, 96, 96, 96, 96, 8, 8, 8, 8, 16, 16, 16, 16, 0,
];
let artistTypeNamesChoose = ref(
  router.currentRoute.value.query.type
    ? Number(router.currentRoute.value.query.type)
    : 0
);

// 歌手数据
let artistsData = ref([]);
let artistsOffset = ref(0);
let hasMore = ref(true);

// 获取歌手数据
const getArtistListData = (
  type = -1,
  area = -1,
  limit = 30,
  offset = 0,
  initial = -1
) => {
  getArtistList(type, area, limit, offset, initial).then((res) => {
    if (res.artists) {
      // 是否还有更多
      res.more ? (hasMore.value = true) : (hasMore.value = false);
      // 遍历数据
      res.artists.forEach((v) => {
        artistsData.value.push({
          id: v.id,
          name: v.name,
          cover: v.img1v1Url,
        });
      });
    } else {
      hasMore.value = false;
      $message.error("歌手内容为空");
    }
  });
};

onMounted(() => {
  // 获取歌手数据
  getArtistListData(
    artistType[artistTypeNamesChoose.value],
    artistArea[artistTypeNamesChoose.value],
    30,
    0,
    artistInitialChoose.value
  );
});
</script>

<style lang="scss" scoped>
.artists {
  text-align: center;
  .menu {
    margin-bottom: 16px;
    .n-tag {
      font-size: 13px;
      padding: 0 16px;
      cursor: pointer;
      transition: all 0.3s;
      &:hover {
        background-color: $mainSecondaryColor;
        color: $mainColor;
      }
      &:active {
        transform: scale(0.9);
      }
    }
    .category {
      margin-top: 18px;
    }
  }
  .more {
    margin-top: 40px;
    width: 100px;
  }
}
</style>