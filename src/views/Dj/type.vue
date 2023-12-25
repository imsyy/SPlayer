<!-- 播客 - 分类 -->
<template>
  <div class="dj-type">
    <div class="type-title">
      <n-button class="back" secondary strong round @click="router.push('/dj-hot')">
        <template #icon>
          <n-icon size="24" depth="3">
            <SvgIcon icon="chevron-left" />
          </n-icon>
        </template>
        返回全部
      </n-button>
      <n-h1 class="title">{{ djName }}</n-h1>
    </div>
    <!-- 分类 -->
    <n-tabs class="tabs" type="segment" animated>
      <!-- 类别热门 -->
      <n-tab-pane name="type-hot" tab="热门" display-directive="show">
        <MainCover :data="djHotData" type="dj" />
      </n-tab-pane>
      <n-tab-pane name="type-rec" tab="推荐" display-directive="show">
        <MainCover :data="djRecData" type="dj" />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { getRadioHot, getRecType } from "@/api/dj";
import formatData from "@/utils/formatData";

const router = useRouter();

// 电台数据
const djId = ref(router.currentRoute.value.query.type);
const djName = ref(router.currentRoute.value.query.name || "未知分类");
const djHotData = ref(null);
const djRecData = ref(null);

// 获取电台分类数据
const getRadioTypeData = async (id) => {
  try {
    const [recHot, recRec] = await Promise.all([getRadioHot(id), getRecType(id)]);
    console.log(recHot, recRec);
    // 热门数据
    djHotData.value = formatData(recHot.djRadios, "dj");
    // 推荐数据
    djRecData.value = formatData(recRec.djRadios, "dj");
  } catch (error) {
    console.error("获取电台分类出错：", error);
    $message.error("获取电台分类出现错误");
  }
};

onMounted(async () => {
  await getRadioTypeData(djId.value);
});
</script>

<style lang="scss" scoped>
.dj-type {
  .title {
    margin: 16px 0 20px 0;
    font-size: 36px;
    font-weight: bold;
    .back {
      font-size: 16px;
      font-weight: normal;
    }
  }
  .tabs {
    :deep(.n-tab-pane) {
      padding-top: 20px;
    }
  }
}
</style>
