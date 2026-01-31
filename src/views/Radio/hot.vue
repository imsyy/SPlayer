<template>
  <div class="radio-hot">
    <!-- 分类 -->
    <Transition name="fade" mode="out-in">
      <div v-if="radioTypeData?.length > 0" class="radio-type">
        <n-grid :collapsed="gridCollapsed" x-gap="20" y-gap="20" cols="3 400:4 600:5 800:6 1000:7">
          <n-gi v-for="(item, index) in radioTypeData" :key="index">
            <n-card
              class="cat"
              hoverable
              @click="
                router.push({
                  path: '/radio-type',
                  query: {
                    id: item.id,
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
              <SvgIcon :name="overflow ? 'Down' : 'Up'" />
              <n-text>{{ overflow ? "查看全部" : "收起标签" }}</n-text>
            </n-card>
          </n-gi>
        </n-grid>
      </div>
      <div v-else class="radio-type">
        <n-grid x-gap="20" y-gap="20" cols="3 400:4 600:5 800:6 1000:7" collapsed>
          <n-gi v-for="item in 20" :key="item">
            <n-card class="cat" hoverable>
              <n-skeleton text round />
            </n-card>
          </n-gi>
        </n-grid>
      </div>
    </Transition>
    <!-- 推荐 -->
    <div class="rec">
      <!-- 热门推荐 -->
      <n-h3 class="title" prefix="bar">
        <n-text class="name">热门推荐</n-text>
      </n-h3>
      <CoverList :data="radioHotData" :loading="true" type="radio" />
      <!-- 分类推荐 -->
      <template v-for="(item, index) in radioCatRecData" :key="index">
        <n-h3 class="title" prefix="bar">
          <n-text class="name">{{ item.name }}</n-text>
          <SvgIcon :size="26" name="Right" />
        </n-h3>
        <CoverList :data="item.radio || []" :loading="true" type="radio" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CoverType } from "@/types/main";
import { radioCatList, radioToplist, radioTypes } from "@/api/radio";
import { getCacheData } from "@/utils/cache";
import { formatCoverList } from "@/utils/format";

interface RadioType {
  id: number;
  name: string;
  radio?: CoverType[];
}

const router = useRouter();

// 栅格折叠
const gridCollapsed = ref<boolean>(true);

// 播客数据
const radioTypeData = ref<RadioType[]>([]);
const radioHotData = ref<CoverType[]>([]);
const radioCatRecData = ref<RadioType[]>([]);

// 获取播客分类
const getRadioType = async () => {
  try {
    const result = await getCacheData(radioCatList, {
      key: "radioTypeData",
      time: 0,
      storage: "localStorage",
    });
    radioTypeData.value = result.categories.map(({ name, id }) => ({ name, id }));
  } catch (error) {
    console.error("Error getting radio cat list:", error);
    window.$message.error("分类获取失败，请重试");
  }
};

// 获取推荐电台
const getRecRadioData = async () => {
  try {
    const [recRes, catRecRes] = await Promise.all([radioToplist("hot"), radioTypes()]);
    radioHotData.value = formatCoverList(recRes.toplist);
    radioCatRecData.value = catRecRes.data?.map((v: any) => ({
      id: v.categoryId,
      name: v.categoryName,
      radio: formatCoverList(v.radios),
    }));
  } catch (error) {
    console.error("Error getting rec radio:", error);
    window.$message.error("获取推荐电台出现错误");
  }
};

onMounted(() => {
  getRadioType();
  getRecRadioData();
});
</script>

<style lang="scss" scoped>
.radio-hot {
  .radio-type {
    margin: 12px 0 30px;
    transition: opacity 0.2s;
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
  .rec {
    .title {
      margin: 0;
      display: flex;
      align-items: center;
      width: max-content;
      cursor: pointer;
      .n-icon {
        opacity: 0;
        transform: translateX(4px);
        transition:
          opacity 0.3s,
          transform 0.3s;
      }
      &:hover {
        .n-icon {
          opacity: 1;
          transform: translateX(0);
        }
      }
    }
  }
}
</style>
