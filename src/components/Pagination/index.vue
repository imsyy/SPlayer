<template>
  <n-pagination
    v-if="totalCount > currentPageSize"
    class="pagination"
    :display-order="['pages', 'size-picker', 'quick-jumper']"
    :item-count="totalCount"
    :page-sizes="pageSizes"
    v-model:page="currentPageNumber"
    v-model:page-size="currentPageSize"
    :show-size-picker="showSizePicker"
    :show-quick-jumper="showQuickJumper"
  >
    <template #prefix="{ itemCount }"> 共 {{ itemCount }} 项 </template>
    <template #goto> 前往 </template>
  </n-pagination>
</template>

<script setup>
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
  // 自定义配置
  showSizePicker: {
    type: Boolean,
    default: true,
  },
  showQuickJumper: {
    type: Boolean,
    default: true,
  },
});
const emit = defineEmits(["pageSizeChange", "pageNumberChange"]);

// 每页个数
const currentPageSize = ref(30);
// 当前页数
const currentPageNumber = ref(1);

// 自定义每页数量
const pageSizes = ref([
  {
    label: "10条/页",
    value: 10,
  },
  {
    label: "20条/页",
    value: 20,
  },
  {
    label: "30条/页",
    value: 30,
  },
  {
    label: "50条/页",
    value: 50,
  },
  {
    label: "100条/页",
    value: 100,
  },
]);

// 每页个数数据变化
const pageSizeChange = (val) => {
  emit("pageSizeChange", val);
};
watch(
  () => currentPageSize.value,
  (val) => {
    pageSizeChange(val);
  }
);

// 当前页数数据变化
const pageNumberChange = (val) => {
  emit("pageNumberChange", val);
};
watch(
  () => currentPageNumber.value,
  (val) => {
    pageNumberChange(val);
  }
);
watch(
  () => props.pageNumber,
  (val) => {
    currentPageNumber.value = val;
  }
);

onMounted(() => {
  // 更改当前页数
  currentPageNumber.value = props.pageNumber;
});
</script>

<style lang="scss" scoped>
.pagination {
  margin-top: 40px;
  justify-content: center;
}

// 移动端
@media (max-width: 768px) {
  .pagination {
    :deep(.n-pagination-prefix) {
      display: none;
    }
    :deep(.n-pagination-quick-jumper) {
      display: none;
    }
    :deep(.n-select) {
      display: none;
    }
  }
}
</style>
