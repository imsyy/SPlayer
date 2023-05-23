<template>
  <div class="artists">
    <ArtistLists :listData="searchData" />
  </div>
</template>

<script setup>
import { getSearchData } from "@/api/search";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import ArtistLists from "@/components/DataList/ArtistLists.vue";

const { t } = useI18n();
const router = useRouter();

// 搜索数据
const searchKeywords = ref(router.currentRoute.value.query.keywords);
const searchData = ref([]);
const pagelimit = ref(30);
const pageNumber = ref(1);
const totalCount = ref(0);

// 获取搜索数据
const getSearchDataList = (keywords, limit = 30, offset = 0, type = 100) => {
  getSearchData(keywords, limit, offset, type).then((res) => {
    console.log(res);
    // 数据总数
    totalCount.value = res.result.artistCount;
    // 列表数据
    searchData.value = [];
    if (res.result.artists) {
      res.result.artists.forEach((v) => {
        searchData.value.push({
          id: v.id,
          name: v.name,
          cover: v.img1v1Url,
        });
      });
    } else {
      $message.error(t("general.message.acquisitionFailed"));
    }
    // 请求后回顶
    if (typeof $scrollToTop !== "undefined") $scrollToTop();
  });
};

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    searchKeywords.value = val.query.keywords;
    if (val.name == "s-artists") {
      getSearchDataList(
        searchKeywords.value,
        pagelimit.value,
        (pageNumber.value - 1) * pagelimit.value
      );
    }
  }
);

onMounted(() => {
  getSearchDataList(searchKeywords.value);
});
</script>
