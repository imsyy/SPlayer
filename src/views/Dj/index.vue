<!-- 播客 / 电台 -->
<template>
  <div class="dj">
    <!-- 分类 -->
    <Transition name="fade" mode="out-in">
      <n-grid
        v-if="djCatData"
        :collapsed="gridCollapsed"
        class="dj-cat"
        x-gap="20"
        y-gap="20"
        cols="3 s:4 m:5 l:6 xl:7"
        responsive="screen"
      >
        <n-gi v-for="(item, index) in djCatData" :key="index">
          <n-card
            class="cat"
            hoverable
            @click="
              router.push({
                path: '/dj-type',
                query: {
                  type: item.id,
                  name: item.name,
                },
              })
            "
          >
            <n-text>{{ item.name }}</n-text>
          </n-card>
        </n-gi>
        <n-gi class="suffix" suffix #="{ overflow }">
          <n-card class="cat" hoverable @click="gridCollapsed = !gridCollapsed">
            <n-icon size="24" depth="3">
              <SvgIcon :icon="overflow ? 'chevron-down' : 'chevron-up'" />
            </n-icon>
            <n-text>{{ overflow ? "查看全部" : "收起标签" }}</n-text>
          </n-card>
        </n-gi>
      </n-grid>
      <n-grid
        v-else
        class="dj-cat"
        x-gap="20"
        y-gap="20"
        cols="2 s:3 m:4 l:5 xl:6"
        responsive="screen"
        collapsed
      >
        <n-gi v-for="item in 20" :key="item">
          <n-card class="cat" hoverable>
            <n-skeleton style="height: 20px" text round />
          </n-card>
        </n-gi>
      </n-grid>
    </Transition>
    <!-- 推荐 -->
    <div class="recommend">
      <!-- 热门推荐 -->
      <n-h3 class="title" prefix="bar">
        <n-text class="name">热门推荐</n-text>
      </n-h3>
      <MainCover :data="djRecommendData" type="dj" />
      <!-- 分类推荐 -->
      <n-grid x-gap="20" y-gap="20" :cols="2">
        <n-gi>
          <div class="light-green" />
        </n-gi>
      </n-grid>
      <div v-for="(item, index) in djCatRecData" :key="index" class="type">
        <n-h3 class="title" prefix="bar" @click="router.push(`/dj-type?type=${item.categoryId}`)">
          <n-text class="name">{{ item.categoryName }}</n-text>
          <n-icon class="more" depth="3">
            <SvgIcon icon="chevron-right" />
          </n-icon>
        </n-h3>
        <MainCover :data="formatData(item.radios, 'dj')" type="dj" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { getDjCatelist, getDjRecommend, getDjCategoryRec } from "@/api/dj";
import { getCacheData } from "@/utils/helper";
import { useRouter } from "vue-router";
import formatData from "@/utils/formatData";

const router = useRouter();

// 栅格数据
const gridCollapsed = ref(true);

// 电台数据
const djCatData = ref(null);
const djRecommendData = ref(null);
const djCatRecData = ref(null);

// 获取电台分类
const getDjCatelistData = async () => {
  try {
    const result = await getCacheData("djCat", 30, getDjCatelist);
    // 解构赋值
    djCatData.value = result.categories.map(({ name, id }) => ({ name, id }));
  } catch (error) {
    console.error("获取电台分类出现错误", error);
    $message.error("电台分类获取失败，请重试");
  }
};

// 获取推荐电台
const getDjRecommendData = async () => {
  try {
    const [recRes, catRecRes] = await Promise.all([getDjRecommend(), getDjCategoryRec()]);
    console.log(recRes, catRecRes);
    djRecommendData.value = formatData(recRes.djRadios, "dj");
    djCatRecData.value = catRecRes.data;
  } catch (error) {
    console.error("获取推荐电台出错：", error);
    $message.error("获取推荐电台出现错误");
  }
};

onBeforeMount(async () => {
  await getDjCatelistData();
  await getDjRecommendData();
});
</script>

<style lang="scss" scoped>
.dj {
  .dj-cat {
    .cat {
      height: 48px;
      border-radius: 8px;
      cursor: pointer;
      :deep(.n-card__content) {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
      }
      .n-icon {
        margin-right: 4px;
      }
    }
  }
  .recommend {
    margin-top: 20px;
    .title {
      position: relative;
      display: flex;
      flex-direction: row;
      align-items: center;
      margin-left: 2px;
      margin-top: 28px;
      padding-left: 16px;
      cursor: pointer;
      .more {
        font-size: 26px;
        opacity: 0;
        transform: translateX(4px);
        transition:
          opacity 0.3s,
          transform 0.3s;
      }
      &:hover {
        .more {
          opacity: 1;
          transform: translateX(0);
        }
      }
    }
  }
}
</style>
