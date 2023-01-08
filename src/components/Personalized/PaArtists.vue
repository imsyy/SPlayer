<template>
  <div class="paartists">
    <n-h3 class="title" prefix="bar">
      歌手推荐
      <n-tabs
        class="tab"
        :default-value="-1"
        size="small"
        @update:value="tabChange"
      >
        <n-tab :name="-1"> 全部 </n-tab>
        <n-tab :name="7"> 华语 </n-tab>
        <n-tab :name="96"> 欧美 </n-tab>
        <n-tab :name="8"> 日本 </n-tab>
        <n-tab :name="16"> 韩国 </n-tab>
      </n-tabs>
      <span class="more" @click="router.push('/discover/artists')">更多</span>
    </n-h3>
    <ArtistLists :listData="artistsData" :gridCollapsed="true" />
  </div>
</template>

<script setup>
import { getArtistList } from "@/api";
import { useRouter } from "vue-router";
import ArtistLists from "@/components/DataList/ArtistLists.vue";

const router = useRouter();

// 歌手数据
let artistsData = ref([]);

// 获取歌手数据
const getArtistListData = (type = -1, area = -1, limit = 6) => {
  getArtistList(type, area, limit).then((res) => {
    artistsData.value = [];
    if (res.artists) {
      res.artists.forEach((v) => {
        artistsData.value.push({
          id: v.id,
          name: v.name,
          cover: v.img1v1Url,
        });
      });
    } else {
      $message.error("推荐歌手内容为空");
    }
  });
};

// Tab 切换
const tabChange = (value) => {
  console.log(value);
  getArtistListData(-1, value);
};

onMounted(() => {
  getArtistListData();
});
</script>

<style lang="scss" scoped>
.paartists {
  margin-top: 40px;
  padding: 0 4px;
  .title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-left: 16px;
    .tab {
      width: auto;
      margin-right: auto;
      margin-left: 20px;
      @media (max-width: 440px) {
        display: none;
      }
      :deep(.n-tabs-tab-pad) {
        width: 12px;
      }
    }
    .more {
      font-size: 14px;
      transition: all 0.3s;
      cursor: pointer;
      &::after {
        content: ">";
        margin-left: 6px;
      }
      &:hover {
        color: $mainColor;
      }
    }
  }
}
</style>