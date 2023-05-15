<template>
  <div class="videos">
    <VideoLists :listData="artistData" />
    <Pagination
      :totalCount="totalCount"
      :pageNumber="pageNumber"
      @pageSizeChange="pageSizeChange"
      @pageNumberChange="pageNumberChange"
    />
  </div>
</template>

<script setup>
import { getArtistVideos } from "@/api/artist";
import { useRouter } from "vue-router";
import { formatNumber, getSongTime } from "@/utils/timeTools";
import VideoLists from "@/components/DataList/VideoLists.vue";
import Pagination from "@/components/Pagination/index.vue";

const router = useRouter();
const props = defineProps({
  // 视频总数
  mvSize: {
    type: Number,
    default: 0,
  },
});

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

// 获取歌手视频
const getArtistVideosData = (id, limit = 30, offset = 0) => {
  getArtistVideos(id, limit, offset).then((res) => {
    console.log(res);
    // 数据总数
    totalCount.value = props.mvSize;
    // 列表数据
    artistData.value = [];
    if (res.mvs) {
      res.mvs.forEach((v) => {
        artistData.value.push({
          id: v.id,
          cover: v.imgurl16v9,
          name: v.name,
          artist: [v.artist],
          playCount: formatNumber(v.playCount),
          duration: getSongTime(v.duration),
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
    path: "/artist/videos",
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
  getArtistVideosData(
    artistId.value,
    val,
    (pageNumber.value - 1) * pagelimit.value
  );
};

onMounted(() => {
  getArtistVideosData(
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
    if (val.name == "ar-videos") {
      getArtistVideosData(
        artistId.value,
        pagelimit.value,
        (pageNumber.value - 1) * pagelimit.value
      );
    }
  }
);
</script>
