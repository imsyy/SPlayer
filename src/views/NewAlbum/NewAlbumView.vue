<template>
  <div class="new-album">
    <div class="title">
      <span class="key">全部新碟</span>
    </div>
    <n-space class="category">
      <n-tag
        class="tag"
        round
        v-for="item in albumArea"
        :key="item"
        :bordered="false"
        :type="item.value == albumAreaChoose ? 'primary' : 'default'"
        @click="changeArea(item.value)"
      >
        {{ item.label }}
      </n-tag>
    </n-space>
    <CoverLists :listData="newAlbumData" listType="album" />
    <Pagination
      v-if="newAlbumData[0]"
      :pageNumber="pageNumber"
      :totalCount="totalCount"
      @pageSizeChange="pageSizeChange"
      @pageNumberChange="pageNumberChange"
    />
  </div>
</template>

<script setup>
import { getAlbumNew } from "@/api/album";
import { useRouter } from "vue-router";
import { getLongTime } from "@/utils/timeTools";
import CoverLists from "@/components/DataList/CoverLists.vue";
import Pagination from "@/components/Pagination/index.vue";

const router = useRouter();

// 新碟数据
const newAlbumData = ref([]);
const totalCount = ref(0);
const pagelimit = ref(30);
const pageNumber = ref(
  router.currentRoute.value.query.page
    ? Number(router.currentRoute.value.query.page)
    : 1
);
const albumAreaChoose = ref(
  router.currentRoute.value.query.area
    ? router.currentRoute.value.query.area
    : "ALL"
);
const albumArea = [
  {
    label: "全部",
    value: "ALL",
  },
  {
    label: "华语",
    value: "ZH",
  },
  {
    label: "欧美",
    value: "EA",
  },
  {
    label: "韩国",
    value: "KR",
  },
  {
    label: "日本",
    value: "JP",
  },
];

// 获取新碟数据
const getAlbumNewData = (area, limit = 30, offset = 0) => {
  getAlbumNew(area, limit, offset).then((res) => {
    console.log(res);
    // 数据总数
    totalCount.value = res.total;
    // 列表数据
    newAlbumData.value = [];
    if (res.albums) {
      res.albums.forEach((v) => {
        newAlbumData.value.push({
          id: v.id,
          cover: v.picUrl,
          name: v.name,
          artist: v.artists,
          time: getLongTime(v.publishTime),
        });
      });
    } else {
      $message.error("全部新碟为空");
    }
    // 请求后回顶并结束加载条
    if ($mainContent) $mainContent.scrollIntoView({ behavior: "smooth" });
  });
};

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    albumAreaChoose.value = val.query.area ? val.query.area : "ALL";
    pageNumber.value = Number(val.query.page ? val.query.page : 1);
    if (val.name == "new-album") {
      getAlbumNewData(
        albumAreaChoose.value,
        pagelimit.value,
        (pageNumber.value - 1) * pagelimit.value
      );
    }
  }
);

// 每页个数数据变化
const pageSizeChange = (val) => {
  console.log(val);
  pagelimit.value = val;
  getAlbumNewData(
    albumAreaChoose.value,
    val,
    (pageNumber.value - 1) * pagelimit.value
  );
};

// 当前页数数据变化
const pageNumberChange = (val) => {
  router.push({
    path: "/new-album",
    query: {
      area: albumAreaChoose.value,
      page: val,
    },
  });
};

// 切换分类
const changeArea = (area) => {
  router.push({
    path: "/new-album",
    query: {
      area,
      page: 1,
    },
  });
};

onMounted(() => {
  $setSiteTitle("全部新碟");
  getAlbumNewData(
    albumAreaChoose.value,
    pagelimit.value,
    (pageNumber.value - 1) * pagelimit.value
  );
});
</script>

<style lang="scss" scoped>
.new-album {
  .title {
    margin-top: 30px;
    margin-bottom: 20px;
    .key {
      font-size: 40px;
      font-weight: bold;
      margin-right: 8px;
    }
  }
  .category {
    margin-bottom: 20px;
    .tag {
      font-size: 13px;
      padding: 0 16px;
      line-height: 0;
      cursor: pointer;
      transition: all 0.3s;
      &:hover {
        background-color: var(--main-second-color);
        color: var(--main-color);
      }
      &:active {
        transform: scale(0.9);
      }
    }
  }
}
</style>
