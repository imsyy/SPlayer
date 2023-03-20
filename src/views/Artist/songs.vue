<template>
  <div class="songs">
    <DataLists :listData="artistData" />
  </div>
</template>

<script setup>
import { getArtistSongs } from "@/api";
import { useRouter } from "vue-router";
import { getSongTime } from "@/utils/timeTools.js";
import DataLists from "@/components/DataList/DataLists.vue";
const router = useRouter();

// 歌手数据
const artistId = ref(router.currentRoute.value.query.id);
const artistData = ref([]);

// 获取歌手热门歌曲
const getArtistSongsData = (id) => {
  getArtistSongs(id).then((res) => {
    console.log(res);
    artistData.value = [];
    res.hotSongs.forEach((v, i) => {
      artistData.value.push({
        id: v.id,
        num: i + 1,
        name: v.name,
        artist: v.ar,
        album: v.al,
        alia: v.alia,
        time: getSongTime(v.dt),
        fee: v.fee,
        pc: v.pc ? v.pc : null,
      });
    });
  });
};

onMounted(() => {
  getArtistSongsData(artistId.value);
});

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    artistId.value = val.query.id;
    if (val.name == "ar-songs") {
      getArtistSongsData(artistId.value);
    }
  }
);
</script>