<template>
  <div class="radio-type">
    <div class="type-title">
      <n-button class="back" secondary strong round @click="router.push('/radio-hot')">
        <template #icon>
          <SvgIcon name="NavigateBefore" />
        </template>
        返回全部
      </n-button>
      <n-h1 class="title">{{ radioName }}</n-h1>
    </div>
    <!-- 分类 -->
    <n-tabs class="tabs" type="segment" animated>
      <!-- 类别热门 -->
      <n-tab-pane name="type-hot" tab="热门">
        <CoverList :data="radioHotData" :loading="true" type="radio" />
      </n-tab-pane>
      <n-tab-pane name="type-rec" tab="推荐">
        <CoverList :data="radioRecData" :loading="true" type="radio" />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { radioCatHot, radioCatRecommend } from "@/api/radio";
import type { CoverType } from "@/types/main";
import { formatCoverList } from "@/utils/format";

const router = useRouter();

// 播客数据
const radioId = ref<number>(Number(router.currentRoute.value.query.id as string));
const radioName = ref<string>(router.currentRoute.value.query.name as string);
const radioHotData = ref<CoverType[]>([]);
const radioRecData = ref<CoverType[]>([]);

// 获取播客分类数据
const getRadioTypeData = async () => {
  try {
    radioHotData.value = [];
    radioRecData.value = [];
    // 获取推荐
    const [recHot, recRec] = await Promise.all([
      radioCatHot(radioId.value),
      radioCatRecommend(radioId.value),
    ]);
    // 热门数据
    radioHotData.value = formatCoverList(recHot.djRadios);
    // 推荐数据
    radioRecData.value = formatCoverList(recRec.djRadios);
  } catch (error) {
    console.error("Error getting rec radio:", error);
    window.$message.error("获取电台分类出现错误");
  }
};

onBeforeRouteUpdate((to) => {
  if (to.name !== "radio-type") return;
  radioId.value = Number(to.query.type as string);
  radioName.value = to.query.name as string;
  getRadioTypeData();
});

onActivated(() => {
  const id = Number(router.currentRoute.value.query.id as string);
  const name = router.currentRoute.value.query.name as string;
  if (id !== radioId.value || name !== radioName.value) {
    radioId.value = id;
    radioName.value = name;
    getRadioTypeData();
  }
});

onMounted(getRadioTypeData);
</script>

<style lang="scss" scoped>
.radio-type {
  .type-title {
    margin-top: 12px;
    .title {
      margin: 16px 0 20px 0;
      font-size: 36px;
      font-weight: bold;
    }
  }
  .tabs {
    :deep(.n-tab-pane) {
      padding-top: 20px;
    }
  }
}
</style>
