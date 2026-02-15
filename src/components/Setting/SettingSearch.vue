<template>
  <div class="setting-search" :class="{ focus: isFocus }">
    <n-input
      ref="inputInst"
      v-model:value="inputValue"
      clearable
      placeholder="搜索设置项..."
      class="search-input"
      @focus="isFocus = true"
      @blur="handleBlur"
    >
      <template #prefix>
        <SvgIcon name="Search" :size="18" />
      </template>
    </n-input>

    <Transition name="fadeDown">
      <n-card v-show="isFocus && inputValue" class="search-result" content-style="padding: 0">
        <n-scrollbar style="max-height: calc(75vh - 280px); border-radius: 8px">
          <div v-if="resultList.length === 0" class="empty">
            <n-text depth="3">未找到相关设置</n-text>
          </div>
          <div
            v-for="item in resultList"
            :key="item.value"
            class="result-item"
            @mousedown.prevent="handleSelect(item.value!)"
          >
            <div class="group-label" v-if="item.groupLabel">{{ item.groupLabel }}</div>
            <div class="label">{{ item.label }}</div>
            <div class="desc" v-if="item.desc">{{ item.desc }}</div>
          </div>
        </n-scrollbar>
      </n-card>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { SelectOption, NInput } from "naive-ui";
import Fuse from "fuse.js";

interface SearchOption extends SelectOption {
  searchLabel?: string;
  desc?: string;
  groupLabel?: string;
}

const props = defineProps<{
  options: SearchOption[];
}>();

const emit = defineEmits(["select", "active-change"]);

const inputInst = ref<InstanceType<typeof NInput> | null>(null);
const inputValue = ref("");
const isFocus = ref(false);
const resultList = ref<SearchOption[]>([]);

let fuse: Fuse<SearchOption> | null = null;

// 搜索激活状态
const isSearchActive = computed(() => isFocus.value && !!inputValue.value);

watch(isSearchActive, (val) => {
  emit("active-change", val);
});

// 初始化 Fuse
watch(
  () => props.options,
  (newOptions) => {
    fuse = new Fuse(newOptions, {
      keys: ["label", "searchLabel", "groupLabel"],
      threshold: 0.3,
      ignoreLocation: true,
    });
  },
  { immediate: true },
);

// 搜索逻辑
watch(inputValue, (val) => {
  if (!val || !fuse) {
    resultList.value = [];
    return;
  }
  resultList.value = fuse.search(val).map((res) => res.item);
});

// 处理失焦
const handleBlur = () => {
  isFocus.value = false;
};

// 处理选择
const handleSelect = (value: string | number) => {
  emit("select", value);
  isFocus.value = false;
  inputValue.value = "";
  emit("active-change", false);
  inputInst.value?.blur();
};
</script>

<style scoped lang="scss">
.setting-search {
  position: relative;
  width: 100%;
  margin-bottom: 12px;
  z-index: 100;
  .search-input {
    width: 100%;
    border-radius: 8px;
  }
  .search-result {
    position: absolute;
    top: 46px;
    left: 0;
    width: 100%;
    border-radius: 8px;
    z-index: 101;
    .empty {
      padding: 16px;
      text-align: center;
    }
    .result-item {
      padding: 12px 16px;
      cursor: pointer;
      transition: background-color 0.2s;
      &:hover {
        background-color: var(--n-close-color-hover);
      }
      .group-label {
        font-size: 12px;
        opacity: 0.5;
        margin-bottom: 2px;
      }
      .label {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 4px;
      }
      .desc {
        font-size: 12px;
        opacity: 0.6;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }
}
</style>
