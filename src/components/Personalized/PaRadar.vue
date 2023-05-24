<template>
  <!-- 私人雷达 -->
  <div class="radar" @click="router.push(`/playlist?id=${radarId}&page=1`)">
    <div class="gray" />
    <div class="left">
      <n-icon class="icon" :component="RadarThree" size="30" />
      <div class="title">
        <n-text class="name">{{ $t("home.modules.radar.title") }}</n-text>
        <n-text class="tip">{{ $t("home.modules.radar.subtitle") }}</n-text>
      </div>
    </div>
    <div class="right">
      <n-icon class="icon" :component="Right" size="20" />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { RadarThree, Right } from "@icon-park/vue-next";

const router = useRouter();

// 私人雷达歌单
const radarId = ref(3136952023);
</script>

<style lang="scss" scoped>
.radar {
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
  background-image: url("/images/pic/radar.jpg");
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
    background-color: #00000010;
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
