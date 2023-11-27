<template>
  <div class="artist-songs">
    <Transition name="fade" mode="out-in">
      <div v-if="artistAllSongs !== 'empty'" class="list">
        <!-- 列表 -->
        <SongList :data="artistAllSongs" :showPagination="false" />
        <!-- 分页 -->
        <Pagination
          v-if="artistAllSongs?.length"
          :totalCount="totalCount"
          :pageNumber="pageNumber"
          @pageNumberChange="pageNumberChange"
        />
      </div>
      <n-empty
        v-else
        description="当前歌手暂无歌曲"
        class="tip"
        style="margin-top: 60px"
        size="large"
      />
    </Transition>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { siteSettings } from "@/stores";
import { getSongDetail } from "@/api/song";
import { getArtistAllSongs } from "@/api/artist";
import formatData from "@/utils/formatData";

const router = useRouter();
const settings = siteSettings();

// 歌手数据
const artistId = ref(router.currentRoute.value.query.id);
const artistAllSongs = ref(null);
const totalCount = ref(0);
const pageNumber = ref(Number(router.currentRoute.value.query?.page) || 1);

// 获取歌手全部歌曲
const getArtistAllSongsData = async (id, limit = settings.loadSize, offset = 0) => {
  try {
    const result = await getArtistAllSongs(id, limit, offset);
    // 数据总数
    totalCount.value = result.total;
    if (totalCount.value === 0) return (artistAllSongs.value = "empty");
    // 处理数据
    const ids = result.songs.map((song) => song.id).join(",");
    const songsDetail = await getSongDetail(ids);
    artistAllSongs.value = formatData(songsDetail.songs, "song");
  } catch (error) {
    console.error("获取歌手全部歌曲失败：", error);
  }
};

// 页数变化
const pageNumberChange = (page) => {
  router.push({
    path: "/artist/songs",
    query: {
      id: artistId.value,
      page: page,
    },
  });
};

// 监听路由变化
watch(
  () => router.currentRoute.value,
  async (val) => {
    if (val.name === "ar-songs") {
      // 更改参数
      artistId.value = val.query.id;
      pageNumber.value = Number(val.query?.page) || 1;
      // 调用接口
      await getArtistAllSongsData(
        artistId.value,
        settings.loadSize,
        (pageNumber.value - 1) * settings.loadSize,
      );
    }
  },
);

onBeforeMount(async () => {
  await getArtistAllSongsData(
    artistId.value,
    settings.loadSize,
    (pageNumber.value - 1) * settings.loadSize,
  );
});
</script>
