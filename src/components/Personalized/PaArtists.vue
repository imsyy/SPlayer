<template>
  <div class="paartists">
    <n-h3 class="title" prefix="bar">
      {{ $t("home.title.artists") }}
      <n-tabs
        class="tab"
        :default-value="-1"
        size="small"
        @update:value="tabChange"
      >
        <n-tab :name="-1"> {{ $t("general.type.all") }} </n-tab>
        <n-tab :name="7"> {{ $t("general.type.china") }} </n-tab>
        <n-tab :name="96"> {{ $t("general.type.western") }} </n-tab>
        <n-tab :name="8"> {{ $t("general.type.japan") }} </n-tab>
        <n-tab :name="16"> {{ $t("general.type.korea") }} </n-tab>
      </n-tabs>
      <span class="more" @click="router.push('/discover/artists?page=1')">
        {{ $t("home.title.more") }}
      </span>
    </n-h3>
    <ArtistLists :listData="artistsData" :gridCollapsed="true" />
  </div>
</template>

<script setup>
import { getArtistList } from "@/api/artist";
import { useRouter } from "vue-router";
import ArtistLists from "@/components/DataList/ArtistLists.vue";

const router = useRouter();

// 歌手数据
const artistsData = ref([]);

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
          size: v.musicSize,
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
  artistsData.value = [];
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
        color: var(--main-color);
      }
    }
  }
}
</style>
