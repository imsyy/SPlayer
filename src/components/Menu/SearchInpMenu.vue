<template>
  <n-dropdown
    :x="dropdownX"
    :y="dropdownY"
    :show="dropdownShow"
    :options="dropdownOptions"
    class="search-inp-menu"
    placement="bottom-start"
    trigger="manual"
    @select="dropdownShow = false"
    @clickoutside="dropdownShow = false"
  >
  </n-dropdown>
</template>

<script setup lang="ts">
import type { DropdownOption } from "naive-ui";
import { renderIcon, copyData, getClipboardData } from "@/utils/helper";
import { useStatusStore } from "@/stores";

const emit = defineEmits<{
  // 直接搜索
  toSearch: [value: string];
}>();

const statusStore = useStatusStore();

// 右键菜单数据
const dropdownX = ref<number>(0);
const dropdownY = ref<number>(0);
const dropdownShow = ref<boolean>(false);
const dropdownOptions = ref<DropdownOption[]>([]);

// 开启右键菜单
const openDropdown = async (e: MouseEvent) => {
  try {
    e.preventDefault();
    dropdownShow.value = false;
    // 当前状态
    const ClipboardData = await getClipboardData();
    // 生成菜单
    nextTick().then(() => {
      dropdownOptions.value = [
        {
          key: "copy",
          label: "复制搜索框内容",
          show: !!statusStore.searchInputValue,
          props: {
            onClick: () => copyData(statusStore.searchInputValue),
          },
          icon: renderIcon("Copy"),
        },
        {
          key: "paste",
          label: "粘贴至搜索框",
          show: !!ClipboardData,
          props: {
            onClick: () => (statusStore.searchInputValue += ClipboardData),
          },
          icon: renderIcon("Paste"),
        },
        {
          key: "paste-search",
          label: "粘贴并搜索",
          show: !!ClipboardData,
          props: {
            onClick: () => {
              statusStore.searchInputValue = ClipboardData as string;
              emit("toSearch", statusStore.searchInputValue);
            },
          },
          icon: renderIcon("Search"),
        },
      ];
      // 显示菜单
      dropdownX.value = e.clientX;
      dropdownY.value = e.clientY;
      dropdownShow.value = true;
    });
  } catch (error) {
    console.error("右键菜单出现异常：", error);
    window.$message.error("右键菜单出现异常");
  }
};

defineExpose({ openDropdown });
</script>
