<template>
  <div class="paalbum">
    <n-h3 class="title" prefix="bar">
      新碟上架
      <span class="more">更多</span>
    </n-h3>
    <CoverLists
      listType="album"
      :listData="newAlbumData"
      :loadingNum="12"
      :gridCollapsed="true"
    />
  </div>
</template>

<script setup>
import { getNewAlbum } from "@/api";
import { useRouter } from "vue-router";
import { getLongTime } from "@/utils/timeTools.js";
import CoverLists from "@/components/DataList/CoverLists.vue";
const router = useRouter();

// 专辑数据
const newAlbumData = ref([]);

// 获取推荐数据
const getNewAlbumData = () => {
  getNewAlbum().then((res) => {
    newAlbumData.value = [];
    if (res.albums) {
      res.albums.forEach((v) => {
        newAlbumData.value.push({
          id: v.id,
          cover: v.picUrl,
          name: v.name,
          artist: [v.artist],
          time: getLongTime(v.publishTime),
        });
      });
    } else {
      $message.error("新碟上架内容为空");
    }
  });
};

onMounted(() => {
  getNewAlbumData();
});
</script>

<style lang="scss" scoped>
.paalbum {
  margin-top: 40px;
  padding: 0 4px;
  .title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-left: 16px;
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