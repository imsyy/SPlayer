<template>
  <div class="albums">
    <CoverLists :listData="artistData" listType="album" />
    <Pagination
      :totalCount="totalCount"
      :pageNumber="pageNumber"
      @pageSizeChange="pageSizeChange"
      @pageNumberChange="pageNumberChange"
    />
  </div>
</template>

<script setup>
import { getArtistAblums } from "@/api/artist";
import { useRouter } from "vue-router";
import { getLongTime } from "@/utils/timeTools";
import CoverLists from "@/components/DataList/CoverLists.vue";
import Pagination from "@/components/Pagination/index.vue";
const router = useRouter();

// 歌手数据
const artistId = ref(router.currentRoute.value.query.id);
const artistData = ref([]);
const pagelimit = ref(30);
const pageNumber = ref(
  router.currentRoute.value.query.page
    ? Number(router.currentRoute.value.query.page)
    : 1
);
const totalCount = ref(0);

// 获取歌手专辑
const getArtistAblumsData = (id, limit = 30, offset = 0) => {
  getArtistAblums(id, limit, offset).then((res) => {
    console.log(res);
    // 数据总数
    totalCount.value = res.artist.albumSize;
    // 列表数据
    artistData.value = [];
    if (res.hotAlbums) {
      res.hotAlbums.forEach((v) => {
        artistData.value.push({
          id: v.id,
          cover: v.picUrl,
          name: v.name,
          artist: v.artists,
          time: getLongTime(v.publishTime),
        });
      });
    } else {
      $message.error("搜索内容为空");
    }
    // 请求后回顶
    if (typeof $scrollToTop !== "undefined") $scrollToTop();
  });
};

// 当前页数数据变化
const pageNumberChange = (val) => {
  router.push({
    path: "/artist/albums",
    query: {
      id: artistId.value,
      page: val,
    },
  });
};

// 每页个数数据变化
const pageSizeChange = (val) => {
  console.log(val);
  pagelimit.value = val;
  getArtistAblumsData(
    artistId.value,
    val,
    (pageNumber.value - 1) * pagelimit.value
  );
};

onMounted(() => {
  getArtistAblumsData(
    artistId.value,
    pagelimit.value,
    (pageNumber.value - 1) * pagelimit.value
  );
});

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    artistId.value = val.query.id;
    pageNumber.value = Number(val.query.page ? val.query.page : 1);
    if (val.name == "ar-albums") {
      getArtistAblumsData(
        artistId.value,
        pagelimit.value,
        (pageNumber.value - 1) * pagelimit.value
      );
    }
  }
);
</script>

<style lang="scss" scoped>
.albums {
  padding-top: 10px;
}
</style>
