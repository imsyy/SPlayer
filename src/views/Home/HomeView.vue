<template>
  <div class="home">
    <Banner v-if="setting.bannerShow" />
    <!-- 个性化推荐 -->
    <n-h3 class="title" prefix="bar">{{ $t("home.title.exclusive") }}</n-h3>
    <n-grid class="recommend" :x-gap="20" :cols="2">
      <n-gi class="rec-left">
        <!-- 每日推荐 -->
        <PaDailySongs />
        <!-- 其他推荐 -->
        <n-grid class="rec-func" x-gap="12" :cols="2">
          <n-gi>
            <PaRadar />
          </n-gi>
          <n-gi>
            <PaLikeSongs />
          </n-gi>
        </n-grid>
      </n-gi>
      <n-gi class="rec-right">
        <PaPersonalFm />
      </n-gi>
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
import PaRadar from "@/components/Personalized/PaRadar.vue";
import PaLikeSongs from "@/components/Personalized/PaLikeSongs.vue";

const setting = settingStore();

onMounted(() => {
  if (typeof $setSiteTitle !== "undefined")
    $setSiteTitle(import.meta.env.VITE_SITE_TITLE);
  // 回顶
  if (typeof $scrollToTop !== "undefined") $scrollToTop();
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
  .recommend {
    @media (max-width: 850px) {
      grid-template-columns: repeat(1, minmax(0px, 1fr)) !important;
      gap: 20px 0 !important;
      .rec-left {
        display: flex;
        flex-direction: column-reverse;
        .padailysongs {
          margin-bottom: 0;
          margin-top: 20px;
        }
      }
    }
    .rec-left,
    .rec-right {
      height: 200px;
    }
    .rec-func {
      height: 70px;
    }
  }
}
</style>
