<!-- 发现 - 排行榜 -->
<template>
  <div class="dsc-toplists">
    <div class="official">
      <n-divider> 官方榜 </n-divider>
      <SpecialCover
        :data="toplistData.officialList"
        columns="1 sm:2 xl:3"
        height="160px"
        showSongs
        cycle
      />
    </div>
    <div class="global">
      <n-divider> 全球榜 </n-divider>
      <MainCover :data="toplistData.globalList" />
    </div>
  </div>
</template>

<script setup>
import { getTopPlaylist } from "@/api/playlist";
import formatData from "@/utils/formatData";

// 排行榜数据
const toplistData = ref({
  // 官方榜
  officialList: [],
  // 全球榜
  globalList: [],
});

// 获取排行榜数据
const getTopPlaylistData = () => {
  try {
    getTopPlaylist().then((res) => {
      toplistData.value = {
        officialList: [],
        globalList: [],
      };
      // 区分榜单
      toplistData.value.officialList = formatData(
        res.list?.filter((v) => v.ToplistType !== undefined),
      );
      toplistData.value.globalList = formatData(
        res.list?.filter((v) => v.ToplistType === undefined),
      );
    });
  } catch (error) {
    console.error("排行榜获取失败：", error);
    $message.error("排行榜获取失败");
  }
};

onBeforeMount(() => {
  getTopPlaylistData();
});
</script>
