<template>
  <n-skeleton
    v-if="!bannerData[0]"
    :style="{ height: bannerHeight + 'px' }"
    width="100%"
    :sharp="false"
  />
  <Transition>
    <n-carousel
      autoplay
      draggable
      keyboard
      class="banner"
      :effect="bannerType"
      :style="{ height: bannerHeight + 'px' }"
      v-if="bannerData[0]"
    >
      <n-carousel-item
        class="item"
        :style="bannerType == 'card' ? 'width:60%' : ''"
        v-for="item in bannerData"
        :key="item"
      >
        <img
          :src="
            item.imageUrl.replace(/^http:/, 'https:') + '?imageView&quality=89'
          "
          alt="banner"
          @click="bannerJump(item.targetType, item.targetId, item.url)"
        />
      </n-carousel-item>
    </n-carousel>
  </Transition>
</template>

<script setup>
import { useRouter } from "vue-router";
import { getBanner } from "@/api/home";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const router = useRouter();

// 轮播图高度
const bannerHeight = ref(0);

// 轮播图数据
const bannerType = ref("card");
const bannerData = ref([]);

// 请求轮播图数据
const getBannerData = () => {
  getBanner().then((res) => {
    console.log(res);
    bannerData.value = res.banners;
  });
};

// 轮播图点击事件
const bannerJump = (type, id, url) => {
  switch (type) {
    case 1:
      // 歌曲页
      router.push(`/song?id=${id}`);
      break;
    case 10:
      // 专辑页
      router.push(`/album?id=${id}`);
      break;
    case 1000:
      // 歌单页
      router.push(`/playlist?id=${id}&page=1`);
      break;
    case 1004:
      // MV页
      router.push(`/video?id=${id}`);
      break;
    case 3000:
      // 站外链接
      const time = setTimeout(() => {
        window.open(url);
      }, 2000);
      $message.loading(t("general.message.jumpOut"), {
        closable: true,
        duration: 2000,
        onClose: () => {
          clearTimeout(time);
        },
      });
      break;
    default:
      break;
  }
};

// 获取宽度计算轮播图高度
const getBannerHeight = () => {
  if (window.innerWidth > 680) {
    bannerType.value = "card";
    if (window.innerWidth >= 1200 && window.innerWidth <= 1500) {
      bannerHeight.value = window.innerWidth / 5.5;
    } else if (window.innerWidth <= 1500) {
      bannerHeight.value = window.innerWidth / 5;
    } else {
      bannerHeight.value = 300;
    }
  } else {
    bannerType.value = "slide";
    bannerHeight.value = window.innerWidth / 3;
  }
};

onMounted(() => {
  getBannerData();
  // 监听宽度
  getBannerHeight();
  window.addEventListener("resize", getBannerHeight);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", getBannerHeight);
});
</script>

<style lang="scss" scoped>
.banner {
  // max-width: 1200px;
  // margin: 0 auto;
  .item {
    border-radius: 8px;
    img {
      margin: 0 auto;
      width: 100%;
      height: 100%;
      object-fit: cover;
      cursor: pointer;
    }
  }
}
.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease;
}
.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>
