<!-- 搜索 - 电台 -->
<template>
  <div class="search-djs">
    <Transition name="fade" mode="out-in">
      <div v-if="searchData !== 'empty'" class="list">
        <!-- 列表 -->
        <MainCover :data="searchData" type="dj" />
        <!-- 分页 -->
        <Pagination
          v-if="searchData?.length"
          :totalCount="totalCount"
          :pageNumber="pageNumber"
          @pageNumberChange="pageNumberChange"
        />
      </div>
      <n-empty
        v-else
        :description="`很抱歉，未能找到与 ${searchKeywords} 相关的任何电台`"
        style="margin-top: 60px"
        size="large"
      >
        <template #icon>
          <n-icon>
            <SvgIcon icon="search-off" />
          </n-icon>
        </template>
      </n-empty>
    </Transition>
  </div>
</template>

<script setup>
import { getSearchRes } from "@/api/search";
import { useRouter } from "vue-router";
import { siteSettings } from "@/stores";
import formatData from "@/utils/formatData";

const router = useRouter();
const settings = siteSettings();

// 搜索数据
const searchData = ref([]);
const totalCount = ref(0);
const searchKeywords = ref(router.currentRoute.value.query?.keywords || "");
const pageNumber = ref(Number(router.currentRoute.value.query?.page) || 1);

// 获取搜索数据
const getSearchResData = (
  keywords = searchKeywords.value,
  limit = settings.loadSize,
  offset = 0,
  type = 1009,
) => {
  try {
    searchData.value = [];
    getSearchRes(keywords, limit, offset, type).then((res) => {
      console.log(res);
      // 数据总数
      totalCount.value = res.result.djRadiosCount;
      if (Object.keys(res.result)?.length === 0) return (searchData.value = "empty");
      // 处理数据
      searchData.value = formatData(res.result.djRadios, "dj");
    });
  } catch (error) {
    console.error("搜索出现错误：", error);
    $message.error("搜索出现错误");
  }
};

// 页数变化
const pageNumberChange = (page) => {
  router.push({
    path: "/search/djs",
    query: {
      keywords: searchKeywords.value,
      page: page,
    },
  });
};

// 监听路由变化
watch(
  () => router.currentRoute.value,
  (val) => {
    if (val.name == "sea-djs") {
      // 更改参数
      pageNumber.value = Number(val.query?.page) || 1;
      searchKeywords.value = val.query?.keywords || "";
      // 调用接口
      getSearchResData(
        searchKeywords.value,
        settings.loadSize,
        (pageNumber.value - 1) * settings.loadSize,
      );
    }
  },
);

onBeforeMount(() => {
  getSearchResData(
    searchKeywords.value,
    settings.loadSize,
    (pageNumber.value - 1) * settings.loadSize,
  );
});
</script>
