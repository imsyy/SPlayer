<template>
  <div class="home">
    <Banner v-if="setting.bannerShow" />
    <!-- 个性化推荐 -->
    <n-h3 class="title" prefix="bar"> 专属推荐 </n-h3>
    <n-grid class="recommendation" cols="4" item-responsive x-gap="20">
      <n-grid-item span="1 950:2">
        <PaDailySongs />
      </n-grid-item>
      <n-grid-item span="3 950:2">
        <PaPersonalFm />
      </n-grid-item>
    </n-grid>
    <!-- 公共推荐 -->
    <PaPlayLists />
    <PaArtists />
    <PaAlbum />
  </div>
</template>

<script setup>
import { settingStore } from "@/store";
import Banner from "@/components/Banner/index.vue";
import PaPlayLists from "@/components/Personalized/PaPlayLists.vue";
import PaArtists from "@/components/Personalized/PaArtists.vue";
import PaAlbum from "@/components/Personalized/PaAlbum.vue";
import PaDailySongs from "@/components/Personalized/PaDailySongs.vue";
import PaPersonalFm from "@/components/Personalized/PaPersonalFm.vue";

const setting = settingStore();

onMounted(() => {
  $setSiteTitle(import.meta.env.VITE_SITE_TITLE);
});
</script>

<style lang="scss" scoped>
.home {
  .title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-left: 16px;
  }
  :deep(.recommendation) {
    @media (max-width: 750px) {
      grid-template-columns: repeat(1, minmax(0px, 1fr)) !important;
      gap: 20px 0 !important;
    }
  }
}
</style>
