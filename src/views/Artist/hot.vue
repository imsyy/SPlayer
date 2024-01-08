<template>
  <div class="artist-hot">
    <n-h4 class="title" prefix="bar">
      <n-text class="name">热门歌曲</n-text>
      <div class="more" @click="router.push(`/artist/songs?id=${artistId}`)">
        <n-text depth="3">查看全部</n-text>
        <n-icon class="more" depth="3">
          <SvgIcon icon="chevron-right" />
        </n-icon>
      </div>
    </n-h4>
    <!-- 列表 -->
    <SongList :data="artistHotSongs" :showPagination="false" :showTitle="false" />
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { getArtistSongs } from "@/api/artist";
import { getSongDetail } from "@/api/song";
import formatData from "@/utils/formatData";

const router = useRouter();

// 歌手数据
const artistId = ref(router.currentRoute.value.query.id);
const artistHotSongs = ref(null);

// 获取歌手热门数据
const getArtistHotData = async (id) => {
  try {
    artistHotSongs.value = null;
    // 获取热门歌曲
    const result = await getArtistSongs(id);
    // 处理数据
    if (result.hotSongs?.[0]?.al?.picUrl) {
      artistHotSongs.value = formatData(result.hotSongs, "song");
      return true;
    }
    const ids = result.hotSongs.map((song) => song.id).join(",");
    const songsDetail = await getSongDetail(ids);
    artistHotSongs.value = formatData(songsDetail.songs, "song");
  } catch (error) {
    console.error("获取歌手热门数据失败：", error);
  }
};

// 监听路由变化
watch(
  () => router.currentRoute.value,
  async (val) => {
    artistId.value = val.query.id;
    if (val.name === "ar-hot") {
      await getArtistHotData(artistId.value);
    }
  },
);

onBeforeMount(async () => {
  await getArtistHotData(artistId.value);
});
</script>

<style lang="scss" scoped>
.artist-hot {
  .title {
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-left: 6px;
    margin-top: 16px;
    padding-left: 16px;
    cursor: pointer;
    .more {
      display: flex;
      flex-direction: row;
      align-items: center;
      margin-left: auto;
      font-size: 14px;
    }
  }
}
</style>
