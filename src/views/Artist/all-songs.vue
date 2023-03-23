<template>
  <div class="all-songs">
    <div class="title" v-if="artistId">
      <span class="key">{{ artistName ? artistName : "未知歌手" }}</span>
      <span>全部歌曲</span>
    </div>
    <div class="title" v-else>
      <span class="key">未提供所需信息</span>
      <br />
      <n-button
        strong
        secondary
        @click="router.go(-1)"
        style="margin-top: 20px"
      >
        返回上一级
      </n-button>
    </div>
    <div class="songs" v-if="artistId">
      <DataLists :listData="artistData" />
      <Pagination
        v-if="artistData[0]"
        :pageNumber="pageNumber"
        :totalCount="totalCount"
        @pageSizeChange="pageSizeChange"
        @pageNumberChange="pageNumberChange"
      />
    </div>
  </div>
</template>

<script setup>
import { getArtistAllSongs } from "@/api";
import { useRouter } from "vue-router";
import { getSongTime } from "@/utils/timeTools.js";
import DataLists from "@/components/DataList/DataLists.vue";
import Pagination from "@/components/Pagination/index.vue";

const router = useRouter();

// 歌手信息
const artistId = ref(router.currentRoute.value.query.id);
const artistData = ref([]);
const artistName = ref(null);
const totalCount = ref(0);
const pagelimit = ref(30);
const pageNumber = ref(
  router.currentRoute.value.query.page
    ? Number(router.currentRoute.value.query.page)
    : 1
);

// 获取歌手信息
const getArtistAllSongsData = (id, limit = 30, offset = 0, order = "hot") => {
  getArtistAllSongs(id, limit, offset, order).then((res) => {
    console.log(res);
    if (res.songs[0]) {
      // 数据总数
      totalCount.value = res.total;
      // 歌手名称
      artistName.value = res.songs[0].ar[0].name;
      // 列表数据
      artistData.value = [];
      res.songs.forEach((v, i) => {
        artistData.value.push({
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
    } else {
      $message.error("歌手全部歌曲为空");
    }
    // 请求后回顶并结束加载条
    if ($mainContent) $mainContent.scrollIntoView({ behavior: "smooth" });
  });
};

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    artistId.value = val.query.id;
    pageNumber.value = Number(val.query.page);
    if (val.name == "all-songs") {
      getArtistAllSongsData(
        artistId.value,
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
    artistId.value,
    val,
    (pageNumber.value - 1) * pagelimit.value
  );
};

// 当前页数数据变化
const pageNumberChange = (val) => {
  router.push({
    path: "/all-songs",
    query: {
      id: artistId.value,
      page: val,
    },
  });
};

onMounted(() => {
  getArtistAllSongsData(
    artistId.value,
    pagelimit.value,
    (pageNumber.value - 1) * pagelimit.value
  );
});
</script>

<style lang="scss" scoped>
.all-songs {
  .title {
    margin-top: 30px;
    margin-bottom: 20px;
    font-size: 24px;
    .key {
      font-size: 40px;
      font-weight: bold;
      margin-right: 8px;
    }
  }
}
</style>
