<!-- 主分页 -->
<template>
  <Transition name="fade" mode="out-in">
    <n-pagination
      v-if="totalCount > settings.loadSize"
      v-model:page="currentPageNumber"
      :class="['pagination']"
      :item-count="totalCount"
      :page-sizes="[settings.loadSize]"
    />
  </Transition>
</template>

<script setup>
import { siteSettings } from "@/stores";

const settings = siteSettings();

const props = defineProps({
  // 数据总量
  totalCount: {
    type: Number,
    default: 0,
  },
  // 当前页数
  pageNumber: {
    type: Number,
    default: 1,
  },
});

// 发射事件
const emit = defineEmits(["pageNumberChange"]);

// 当前页数
const currentPageNumber = ref(1);

// 监听当前页数变化
watch(
  () => currentPageNumber.value,
  (val) => {
    emit("pageNumberChange", val);
  },
);

// 监听传入页数变化
watch(
  () => props.pageNumber,
  (val) => (currentPageNumber.value = val),
);

onMounted(() => {
  // 更改当前页数
  currentPageNumber.value = props.pageNumber;
});
</script>

<style lang="scss" scoped>
.pagination {
  margin-top: 40px;
  margin-bottom: 30px;
  justify-content: center;
}
</style>
