<template>
  <div class="albums">
    <CoverLists :listData="searchData" listType="album" />
    <Pagination
      v-if="searchData[0]"
      :pageNumber="pageNumber"
      :totalCount="totalCount"
      @pageSizeChange="pageSizeChange"
      @pageNumberChange="pageNumberChange"
    />
  </div>
</template>

<script setup>
import { getSearchData } from "@/api/search";
import { useRouter } from "vue-router";
import { getLongTime } from "@/utils/timeTools";
import { useI18n } from "vue-i18n";
import CoverLists from "@/components/DataList/CoverLists.vue";
import Pagination from "@/components/Pagination/index.vue";

const { t } = useI18n();
const router = useRouter();

// 搜索数据
const searchKeywords = ref(router.currentRoute.value.query.keywords);
const searchData = ref([]);
const totalCount = ref(0);
const pagelimit = ref(30);
const pageNumber = ref(
  router.currentRoute.value.query.page
    ? Number(router.currentRoute.value.query.page)
    : 1
);

// 获取搜索数据
const getSearchDataList = (keywords, limit = 30, offset = 0, type = 10) => {
  getSearchData(keywords, limit, offset, type).then((res) => {
    console.log(res);
    // 数据总数
    totalCount.value = res.result.albumCount;
    // 列表数据
    searchData.value = [];
    if (res.result.albums) {
      res.result.albums.forEach((v) => {
        searchData.value.push({
          id: v.id,
          cover: v.picUrl,
          name: v.name,
          artist: v.artists,
          time: getLongTime(v.publishTime),
        });
      });
    } else {
      $message.error(t("general.message.acquisitionFailed"));
    }
    // 请求后回顶
    if (typeof $scrollToTop !== "undefined") $scrollToTop();
  });
};

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    searchKeywords.value = val.query.keywords;
    pageNumber.value = Number(val.query.page ? val.query.page : 1);
    if (val.name == "s-albums") {
      getSearchDataList(
        searchKeywords.value,
        pagelimit.value,
        (pageNumber.value - 1) * pagelimit.value
      );
    }
  }
);

// 每页个数数据变化
const pageSizeChange = (val) => {
  console.log(val);
  pagelimit.value = val;
  getSearchDataList(
    searchKeywords.value,
    val,
    (pageNumber.value - 1) * pagelimit.value
  );
};

// 当前页数数据变化
const pageNumberChange = (val) => {
  router.push({
    path: "/search/albums",
    query: {
      keywords: searchKeywords.value,
      page: val,
    },
  });
};

onMounted(() => {
  getSearchDataList(
    searchKeywords.value,
    pagelimit.value,
    (pageNumber.value - 1) * pagelimit.value
  );
});
</script>
