<!-- 发现 - 最新音乐 -->
<template>
  <div class="dsc-new">
    <n-flex class="menu" justify="space-between">
      <n-flex class="type">
        <n-tag
          v-for="(item, index) in newTypeNames"
          :key="index"
          :bordered="false"
          :type="index == newTypeChoose ? 'primary' : 'default'"
          class="tag"
          round
          @click="newTypeChange(index)"
        >
          {{ item }}
        </n-tag>
      </n-flex>
      <n-flex class="area">
        <n-tag
          v-for="(item, index) in newAreaNames"
          :key="index"
          :bordered="false"
          :type="index == newAreaChoose ? 'primary' : 'default'"
          class="tag"
          round
          @click="newAreaChange(index)"
        >
          {{ item.value }}
        </n-tag>
      </n-flex>
    </n-flex>
    <!-- 列表 -->
    <Transition name="fade" mode="out-in">
      <div v-if="newTypeChoose === 0" class="new-album">
        <MainCover :data="newAlbumData" />
        <!-- 分页 -->
        <Pagination
          :totalCount="alTotalCount"
          :pageNumber="pageNumber"
          @pageNumberChange="pageNumberChange"
        />
      </div>
      <div v-else-if="newTypeChoose === 1" class="new-song">
        <SongList :data="newSongData" />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { siteSettings } from "@/stores";
import { getNewSong, getAllNewAlbum } from "@/api/recommend";
import formatData from "@/utils/formatData";

const router = useRouter();
const settings = siteSettings();

// 分类数据
const newTypeNames = ["新碟上架", "新歌速递"];
const newAreaNames = [
  { key: "ALL", num: 0, value: "全部" },
  { key: "ZH", num: 7, value: "华语" },
  { key: "EA", num: 96, value: "欧美" },
  { key: "KR", num: 16, value: "韩国" },
  { key: "JP", num: 8, value: "日本" },
];
const pageNumber = ref(Number(router.currentRoute.value.query?.page) || 1);
const newTypeChoose = ref(Number(router.currentRoute.value.query?.type) || 0);
const newAreaChoose = ref(Number(router.currentRoute.value.query?.area) || 0);

// 音乐数据
const alTotalCount = ref(0);
const newSongData = ref([]);
const newAlbumData = ref([]);

// 获取最新音乐数据
const getAllNewData = (limit = settings.loadSize, offset = 0) => {
  // 新歌速递
  if (newTypeChoose.value === 0) {
    const area = newAreaNames[newAreaChoose.value]?.key || "ALL";
    getAllNewAlbum(area, limit, offset).then((res) => {
      // 数据总数
      alTotalCount.value = res.total;
      // 处理数据
      newAlbumData.value.push(...formatData(res.albums, "album"));
    });
  } else if (newTypeChoose.value === 1) {
    const area = newAreaNames[newAreaChoose.value]?.num || 0;
    getNewSong(area).then((res) => {
      newSongData.value = [];
      newSongData.value = formatData(res.data, "song");
    });
  }
  if (newTypeChoose.value > 1 || newAreaChoose.value > 4) {
    $message.error("传入参数错误");
  }
};

// 分类变化
const newTypeChange = (key) => {
  router.push({
    path: "/discover/new",
    query: {
      type: key,
      area: newAreaChoose.value,
      ...(key === 1 && { page: 1 }),
    },
  });
};

// 地区变化
const newAreaChange = (key) => {
  router.push({
    path: "/discover/new",
    query: {
      type: newTypeChoose.value,
      area: key,
      ...(newTypeChoose.value === 1 && { page: 1 }),
    },
  });
};

// 页数变化
const pageNumberChange = (page) => {
  newAlbumData.value = [];
  router.push({
    path: "/discover/new",
    query: {
      type: newTypeChoose.value,
      area: newAreaChoose.value,
      page,
    },
  });
};

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    if (val.name === "dsc-new") {
      newSongData.value = [];
      newAlbumData.value = [];
      pageNumber.value = Number(val.query?.page) || 1;
      newTypeChoose.value = Number(val.query?.type) || 0;
      newAreaChoose.value = val.query?.area || 0;
      getAllNewData(settings.loadSize, (pageNumber.value - 1) * settings.loadSize);
    }
  },
);

onBeforeMount(() => {
  getAllNewData();
});
</script>

<style lang="scss" scoped>
.dsc-new {
  .menu {
    margin-bottom: 20px;
    .tag {
      font-size: 13px;
      padding: 0 16px;
      line-height: 0;
      cursor: pointer;
      transition:
        transform 0.3s,
        background-color 0.3s,
        color 0.3s;
      &:hover {
        background-color: var(--main-second-color);
        color: var(--main-color);
      }
      &:active {
        transform: scale(0.95);
      }
    }
  }
}
</style>
