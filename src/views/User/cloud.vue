<template>
  <div class="cloud">
    <DataLists :listData="cloudData" @cloudDataLoad="cloudDataLoad" />
    <Pagination
      :totalCount="totalCount"
      :pageNumber="pageNumber"
      @pageSizeChange="pageSizeChange"
      @pageNumberChange="pageNumberChange"
    />
  </div>
</template>

<script setup>
import { getCloud } from "@/api";
import { useRouter } from "vue-router";
import { getSongTime } from "@/utils/timeTools.js";
import DataLists from "@/components/DataList/DataLists.vue";
import Pagination from "@/components/Pagination/index.vue";

const router = useRouter();

// 云盘数据
let cloudData = ref([]);
let pagelimit = ref(30);
let pageNumber = ref(
  router.currentRoute.value.query.page
    ? Number(router.currentRoute.value.query.page)
    : 1
);
let totalCount = ref(0);

// 获取云盘数据
const getCloudData = (limit = 30, offset = 0, scroll = true) => {
  getCloud(limit, offset).then((res) => {
    console.log(res);
    totalCount.value = res.count;
    cloudData.value = [];
    if (res.data) {
      res.data.forEach((v, i) => {
        cloudData.value.push({
          id: v.songId,
          num: i + 1 + (pageNumber.value - 1) * pagelimit.value,
          name: v.simpleSong.name,
          artist: v.simpleSong.ar,
          album: v.simpleSong.al,
          alia: v.simpleSong.alia,
          time: getSongTime(v.simpleSong.dt),
        });
      });
    } else {
      $message.error("搜索内容为空");
    }
    // 请求后回顶
    if ($mainContent && scroll)
      $mainContent.scrollIntoView({ behavior: "smooth" });
  });
};

// 每页个数数据变化
const pageSizeChange = (val) => {
  console.log(val);
  pagelimit.value = val;
  getCloudData(val, (pageNumber.value - 1) * pagelimit.value);
};

// 当前页数数据变化
const pageNumberChange = (val) => {
  router.push({
    path: "/user/cloud",
    query: {
      page: val,
    },
  });
};

// 当前页数据重载
const cloudDataLoad = (scroll = false) => {
  getCloudData(
    pagelimit.value,
    (pageNumber.value - 1) * pagelimit.value,
    scroll
  );
};

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    pageNumber.value = Number(val.query.page);
    if (val.name == "cloud") {
      getCloudData(pagelimit.value, (val.query.page - 1) * pagelimit.value);
    }
  }
);

onMounted(() => {
  getCloudData(pagelimit.value, (pageNumber.value - 1) * pagelimit.value);
});
</script>