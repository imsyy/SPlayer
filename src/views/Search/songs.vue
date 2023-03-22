<template>
  <div class="songs">
    <DataLists :listData="searchData" />
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
import { getSearchData, getMusicDetail } from "@/api";
import { useRouter } from "vue-router";
import { getSongTime } from "@/utils/timeTools.js";
import DataLists from "@/components/DataList/DataLists.vue";
import Pagination from "@/components/Pagination/index.vue";
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
const getSearchDataList = (keywords, limit = 30, offset = 0, type = 1) => {
  getSearchData(keywords, limit, offset, type).then((res) => {
    console.log(res);
    // 数据总数
    totalCount.value = res.result.songCount;
    // 列表数据
    if (res.result.songs) {
      const ids = res.result.songs.map((obj) => obj.id);
      getMusicDetail(ids.join(",")).then((res) => {
        console.log(res);
        searchData.value = [];
        res.songs.forEach((v, i) => {
          searchData.value.push({
            id: v.id,
            num: i + 1 + (pageNumber.value - 1) * pagelimit.value,
            name: v.name,
            artist: v.ar,
            album: v.al,
            alia: v.alia,
            time: getSongTime(v.dt),
            fee: v.fee,
            pc: v.pc ? v.pc : null,
            mv: v.mv ? v.mv : null,
          });
        });
      });
    } else {
      $message.error("搜索内容为空");
    }
    // 请求后回顶并结束加载条
    if ($mainContent) $mainContent.scrollIntoView({ behavior: "smooth" });
  });
};

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    searchKeywords.value = val.query.keywords;
    pageNumber.value = Number(val.query.page);
    if (val.name == "s-songs") {
      getSearchDataList(
        searchKeywords.value,
        pagelimit.value,
        pageNumber.value ? (pageNumber.value - 1) * pagelimit.value : 0
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
    path: "/search/songs",
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
