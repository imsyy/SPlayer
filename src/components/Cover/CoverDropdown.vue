<!-- 封面列表 - 右键菜单 -->
<template>
  <n-dropdown
    :x="dropdownX"
    :y="dropdownY"
    :show="dropdownShow"
    :options="dropdownOptions"
    class="cover-list-dropdown"
    placement="bottom-start"
    trigger="manual"
    size="large"
    @select="dropdownShow = false"
    @clickoutside="dropdownShow = false"
  >
  </n-dropdown>
</template>

<script setup>
import { NIcon } from "naive-ui";
import { copyData } from "@/utils/helper";
import { siteData } from "@/stores";
import SvgIcon from "@/components/Global/SvgIcon";

const data = siteData();

// 右键菜单数据
const dropdownX = ref(0);
const dropdownY = ref(0);
const dropdownShow = ref(false);
const dropdownOptions = ref(null);

// 图标渲染
const renderIcon = (icon, size, translate = 0) => {
  return () =>
    h(
      NIcon,
      {
        size: size ?? "18",
        style: { transform: `translateX(2px) translateY(${translate}px)` },
      },
      () => h(SvgIcon, { icon }),
    );
};

// 打开右键菜单
const openDropdown = (e, type, id) => {
  console.log(e, type, id);
  e.preventDefault();
  if (!id) return false;
  if (id === "like-songs") id = data.getUserLikePlaylistId;
  dropdownShow.value = false;
  nextTick().then(() => {
    // 右键菜单数据
    dropdownOptions.value = [
      {
        key: "copy",
        label: "复制分享链接",
        props: {
          onClick: () => {
            const link = `https://music.163.com/#/${type}?id=${id}`;
            copyData(link);
          },
        },
        icon: renderIcon("content-copy", 20),
      },
      {
        key: "open",
        label: "打开源页面链接",
        props: {
          onClick: () => {
            window.open(`https://music.163.com/#/${type}?id=${id}`);
          },
        },
        icon: renderIcon("link", 20),
      },
    ];
    // 右键菜单状态
    dropdownShow.value = true;
    dropdownX.value = e.clientX;
    dropdownY.value = e.clientY;
  });
};

defineExpose({
  openDropdown,
});
</script>
