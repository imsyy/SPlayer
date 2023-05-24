<template>
  <div class="all-songs">
    <div class="title" v-if="artistId">
      <template v-if="artistData[0]">
        <span class="key">{{
          artistName ? artistName : $t("general.name.unknownArtist")
        }}</span>
        <span>{{ $t("general.name.allSong") }} </span>
      </template>
    </div>
    <div class="title" v-else>
      <span class="key">{{ $t("general.name.noKeywords") }}</span>
      <br />
      <n-button
        strong
        secondary
        @click="router.go(-1)"
        style="margin-top: 20px"
      >
        {{ $t("general.name.goBack") }}
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
import { getArtistDetail, getArtistAllSongs } from "@/api/artist";
import { getMusicDetail } from "@/api/song";
import { useRouter } from "vue-router";
import { getSongTime } from "@/utils/timeTools";
import { useI18n } from "vue-i18n";
import DataLists from "@/components/DataList/DataLists.vue";
import Pagination from "@/components/Pagination/index.vue";

const { t } = useI18n();
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

// 获取歌手名称
const getArtistDetailData = (id) => {
  getArtistDetail(id).then((res) => {
    artistName.value = res.data.artist.name;
  });
};

// 获取歌手信息
const getArtistAllSongsData = (id, limit = 30, offset = 0, order = "hot") => {
  if (!id) return false;
  getArtistAllSongs(id, limit, offset, order)
    .then((res) => {
      console.log(res);
      // 获取歌手名称
      getArtistDetailData(id);
      // 全部歌曲数据
      if (res.songs[0]) {
        // 数据总数
        totalCount.value = res.total;
        // 列表数据
        const ids = res.songs.map((obj) => obj.id);
        getMusicDetail(ids.join(",")).then((res) => {
          console.log(res);
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
        });
      } else {
        $message.error(t("general.message.acquisitionFailed"));
      }
      // 请求后回顶
      if (typeof $scrollToTop !== "undefined") $scrollToTop();
    })
    .catch((err) => {
      router.go(-1);
      console.error(t("general.message.acquisitionFailed"), err);
      $message.error(t("general.message.acquisitionFailed"));
    });
};

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    artistId.value = val.query.id;
    pageNumber.value = Number(val.query.page ? val.query.page : 1);
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
