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
import type { CoverType } from "@/types/main";
import { renderIcon, copyData } from "@/utils/helper";
import { useMusicStore, useStatusStore } from "@/stores";

const emit = defineEmits<{
  // 直接搜索
  toPlay: [item: CoverType];
}>();

const router = useRouter();
const musicStore = useMusicStore();
const statusStore = useStatusStore();

// 右键菜单数据
const dropdownX = ref<number>(0);
const dropdownY = ref<number>(0);
const dropdownShow = ref<boolean>(false);
const dropdownOptions = ref<DropdownOption[]>([]);
// 开启右键菜单
const openDropdown = async (
  e: MouseEvent,
  item: CoverType,
  type: "playlist" | "album" | "video" | "radio",
) => {
  try {
    e.preventDefault();
    dropdownShow.value = false;
    // 生成菜单
    nextTick().then(() => {
      dropdownOptions.value = [
        {
          key: "open",
          label: "查看详情",
          props: {
            onClick: () =>
              router.push({
                name: type,
                query: { id: item.id },
              }),
          },
          icon: renderIcon("Eye"),
        },
        {
          key: "play",
          label: "播放",
          show: musicStore.playPlaylistId !== item.id || !statusStore.playStatus,
          props: {
            onClick: () => emit("toPlay", item),
          },
          icon: renderIcon("Play"),
        },
        {
          key: "pause",
          label: "暂停",
          show: musicStore.playPlaylistId === item.id && statusStore.playStatus,
          props: {
            onClick: () => emit("toPlay", item),
          },
          icon: renderIcon("Pause"),
        },
        {
          key: "line",
          type: "divider",
        },
        {
          key: "copy",
          label: "复制链接",
          props: {
            onClick: () => copyData(`https://music.163.com/#/${type}?id=${item.id}`),
          },
          icon: renderIcon("Link"),
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
