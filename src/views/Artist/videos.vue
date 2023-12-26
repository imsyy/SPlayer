<template>
  <div class="artist-videos">
    <Transition name="fade" mode="out-in">
      <div v-if="artistVideos !== 'empty'" class="list">
        <!-- 列表 -->
        <MainCover :data="artistVideos" columns="1 s:2 m:3 l:4 xl:5" type="mv" />
        <!-- 分页 -->
        <Pagination
          v-if="artistVideos?.length"
          :totalCount="totalCount"
          :pageNumber="pageNumber"
          @pageNumberChange="pageNumberChange"
        />
      </div>
      <n-empty
        v-else
        description="当前歌手暂无视频"
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
import { getArtistVideos } from "@/api/artist";
import formatData from "@/utils/formatData";

const router = useRouter();
const settings = siteSettings();
const props = defineProps({
  // 视频总数
  mvSize: {
    type: Number,
    default: 0,
  },
});

// 歌手数据
const artistId = ref(router.currentRoute.value.query.id);
const artistVideos = ref(null);
const totalCount = ref(0);
const pageNumber = ref(Number(router.currentRoute.value.query?.page) || 1);

// 获取歌手全部视频
const getArtistVideosData = async (id, limit = settings.loadSize, offset = 0) => {
  try {
    artistVideos.value = null;
    const result = await getArtistVideos(id, limit, offset);
    // 数据总数
    totalCount.value = props.mvSize;
    if (totalCount.value === 0) return (artistVideos.value = "empty");
    // 处理数据
    artistVideos.value = formatData(result.mvs, "mv");
  } catch (error) {
    console.error("获取歌手视频失败：", error);
  }
};

// 页数变化
const pageNumberChange = (page) => {
  router.push({
    path: "/artist/videos",
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
    if (val.name === "ar-videos") {
      // 更改参数
      artistId.value = val.query.id;
      pageNumber.value = Number(val.query?.page) || 1;
      // 调用接口
      await getArtistVideosData(
        artistId.value,
        settings.loadSize,
        (pageNumber.value - 1) * settings.loadSize,
      );
    }
  },
);

onBeforeMount(async () => {
  await getArtistVideosData(
    artistId.value,
    settings.loadSize,
    (pageNumber.value - 1) * settings.loadSize,
  );
});
</script>
