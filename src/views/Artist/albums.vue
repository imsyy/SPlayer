<template>
  <div class="artist-albums">
    <Transition name="fade" mode="out-in">
      <div v-if="artistAblums !== 'empty'" class="list">
        <!-- 列表 -->
        <MainCover :data="artistAblums" type="album" />
        <!-- 分页 -->
        <Pagination
          v-if="artistAblums?.length"
          :totalCount="totalCount"
          :pageNumber="pageNumber"
          @pageNumberChange="pageNumberChange"
        />
      </div>
      <n-empty
        v-else
        description="当前歌手暂无专辑"
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
import { getArtistAblums } from "@/api/artist";
import formatData from "@/utils/formatData";

const router = useRouter();
const settings = siteSettings();

// 歌手数据
const artistId = ref(router.currentRoute.value.query.id);
const artistAblums = ref(null);
const totalCount = ref(0);
const pageNumber = ref(Number(router.currentRoute.value.query?.page) || 1);

// 获取歌手全部专辑
const getArtistAblumsData = async (id, limit = settings.loadSize, offset = 0) => {
  try {
    artistAblums.value = null;
    const result = await getArtistAblums(id, limit, offset);
    // 数据总数
    totalCount.value = result.artist.albumSize;
    if (totalCount.value === 0) return (artistAblums.value = "empty");
    // 处理数据
    artistAblums.value = formatData(result.hotAlbums, "album");
  } catch (error) {
    console.error("获取歌手专辑失败：", error);
  }
};

// 页数变化
const pageNumberChange = (page) => {
  router.push({
    path: "/artist/albums",
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
    if (val.name === "ar-albums") {
      // 更改参数
      artistId.value = val.query.id;
      pageNumber.value = Number(val.query?.page) || 1;
      // 调用接口
      await getArtistAblumsData(
        artistId.value,
        settings.loadSize,
        (pageNumber.value - 1) * settings.loadSize,
      );
    }
  },
);

onBeforeMount(async () => {
  await getArtistAblumsData(
    artistId.value,
    settings.loadSize,
    (pageNumber.value - 1) * settings.loadSize,
  );
});
</script>
