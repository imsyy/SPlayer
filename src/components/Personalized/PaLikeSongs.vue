<template>
  <!-- 喜欢的音乐 -->
  <div
    class="like-song"
    :style="`background-image: url(${cardImage})`"
    @click="toLikeSongs"
  >
    <div class="gray" />
    <div class="left">
      <n-icon class="icon" :component="CollectionRecords" size="30" />
      <div class="title">
        <n-text class="name">{{ $t("home.modules.likeSong.title") }}</n-text>
        <n-text class="tip">{{ $t("home.modules.likeSong.subtitle") }}</n-text>
      </div>
    </div>
    <div class="right">
      <n-icon class="icon" :component="Right" size="20" />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { userStore } from "@/store";
import { CollectionRecords, Right } from "@icon-park/vue-next";

const router = useRouter();
const user = userStore();

// 卡片背景
const cardImage = ref(null);

// 生成卡片背景
const getCardImage = (index) => {
  if (user.userLogin && user.getUserPlayLists.own[0]) {
    const num =
      index ?? Math.floor(Math.random() * user.getUserPlayLists.own.length);
    cardImage.value =
      user.getUserPlayLists.own[num]?.cover.replace(/^http:/, "https:") +
      "?param=100y100";
  } else {
    cardImage.value = "/images/pic/pic.jpg";
  }
};

// 跳转喜欢的音乐
const toLikeSongs = () => {
  if (user.userLogin) {
    const id = user.getUserPlayLists.own[0]?.id;
    if (id) {
      router.push(`/playlist?id=${id}&page=1`);
    } else {
      console.error("发生错误");
    }
  } else {
    $message.error("请登录账号后使用");
    router.push("/login");
  }
};

onMounted(() => {
  getCardImage();
  if (
    user.userLogin &&
    !user.getUserPlayLists.has &&
    !user.getUserPlayLists.isLoading
  ) {
    user.setUserPlayLists(() => {
      getCardImage();
    });
  }
});
</script>

<style lang="scss" scoped>
.like-song {
  position: relative;
  color: #fff;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border-radius: 8px;
  padding: 0 18px;
  box-sizing: border-box;
  background-repeat: no-repeat;
  background-size: 120% 120%;
  background-position: center;
  cursor: pointer;
  z-index: 0;
  overflow: hidden;
  &:hover {
    .left {
      .title {
        .name {
          opacity: 0;
          transform: translateY(-50px);
        }
        .tip {
          opacity: 1;
          transform: translateY(0);
        }
      }
    }
    .right {
      .icon {
        opacity: 1;
        transform: translateX(0);
      }
    }
  }
  .gray {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #00000040;
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(20px);
    z-index: -1;
  }
  .left {
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    .icon {
      margin-right: 12px;
    }
    .title {
      height: 100%;
      width: 100%;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
      .name {
        color: #fff;
        font-size: 18px;
        transition: all 0.3s;
        @media (max-width: 1020px) {
          font-size: 16px;
        }
      }
      .tip {
        height: 100%;
        display: flex;
        align-items: center;
        position: absolute;
        color: #fff;
        opacity: 0;
        transform: translateY(50px);
        transition: all 0.3s;
      }
    }
  }
  .right {
    display: flex;
    .icon {
      opacity: 0;
      transform: translateX(-8px);
      transition: all 0.3s;
    }
  }
}
</style>
