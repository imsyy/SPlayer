<template>
  <div
    class="padailysongs"
    :style="`background-image: url(${cardImage})`"
    @click="router.push('/dailySongs')"
  >
    <div class="gray" />
    <div class="text">
      <div class="date">
        <n-icon class="calendar" :component="CalendarTodayFilled" size="40" />
        <n-text class="num" v-html="new Date().getDate()" />
      </div>
      <div class="desc">
        <n-text class="title">{{ $t("home.modules.dailySongs.title") }}</n-text>
        <n-text class="tip">{{ $t("home.modules.dailySongs.subtitle") }}</n-text>
      </div>
    </div>
    <div class="control">
      <n-avatar
        class="cover"
        :src="cardImage"
        fallback-src="/images/pic/default.png"
      />
      <n-icon
        class="play"
        :component="PlayCircleFilled"
        size="50"
        @click.stop="playThisSong"
      />
    </div>
  </div>
</template>

<script setup>
import { getDailySongs } from "@/api/home";
import { useRouter } from "vue-router";
import { musicStore, userStore } from "@/store";
import { PlayCircleFilled, CalendarTodayFilled } from "@vicons/material";

const music = musicStore();
const user = userStore();
const router = useRouter();

// 卡片背景
const cardImage = ref(null);

// 随机数
const randomNumber = Math.floor(Math.random() * music.getDailySongs.length);

// 生成卡片背景
const getCardImage = () => {
  if (user.userLogin && music.getDailySongs[0]) {
    cardImage.value =
      music.getDailySongs[randomNumber]?.album.picUrl.replace(
        /^http:/,
        "https:"
      ) + "?param=100y100";
  } else {
    cardImage.value = "/images/pic/pic.jpg";
  }
};

// 获取每日推荐数据
const getDailySongsData = () => {
  getCardImage();
  if (music.getDailySongs.length === 0 && user.userLogin) {
    getDailySongs().then((res) => {
      if (res.data.dailySongs) {
        music.setDailySongs(res.data.dailySongs);
        getCardImage();
      } else {
        $message.error("每日推荐获取失败");
      }
    });
  }
};

// 从当前歌曲开始播放
const playThisSong = () => {
  if (user.userLogin) {
    if (music.getDailySongs.length !== 0) {
      // 正在播放的歌曲id
      const songId = music.getPlaySongData?.id;
      // 查找是否在日推中
      const isHas = music.getDailySongs.findIndex((o) => o.id === songId);
      console.log(isHas);
      music.setPersonalFmMode(false);
      music.setPlayState(true);
      if (isHas === -1) {
        music.setPlaylists(music.getDailySongs);
        music.addSongToPlaylists(music.getDailySongs[randomNumber]);
      }
    } else {
      $message.error("每日推荐获取失败，请刷新后重试");
    }
  } else {
    $message.error("请登录账号后使用");
  }
};

onMounted(() => {
  getDailySongsData();
});
</script>

<style lang="scss" scoped>
.padailysongs {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 110px;
  border-radius: 8px;
  padding: 0 28px;
  box-sizing: border-box;
  overflow: hidden;
  z-index: 0;
  margin-bottom: 20px;
  transition: all 0.3s;
  background-repeat: no-repeat;
  background-size: 120% 120%;
  background-position: center;
  cursor: pointer;
  &:hover {
    .control {
      .cover {
        opacity: 0;
      }
      .play {
        transform: rotate(0);
        opacity: 1;
        right: 5px;
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
  .text {
    display: flex;
    align-items: center;
    .date {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      margin-right: 18px;
      .num {
        margin-top: 8px;
        position: absolute;
        font-size: 14px;
        font-weight: bold;
        color: #fff;
      }
    }
    .desc {
      display: flex;
      flex-direction: column;
      span {
        color: #fff;
      }
      .title {
        font-size: 20px;
        margin-bottom: 2px;
        @media (max-width: 1020px) {
          font-size: 18px;
        }
      }
      .tip {
        color: #e9e9e9;
        font-size: 13px;
      }
    }
  }
  .control {
    position: relative;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-left: 12px;
    .cover {
      position: relative;
      background-color: transparent;
      width: 70px;
      height: 70px;
      transition: all 0.3s;
      z-index: 0;
      overflow: inherit;
      :deep(img) {
        border-radius: 8px;
      }
      &::before,
      &::after {
        content: "";
        border-radius: 8px;
        width: 100%;
        height: 100%;
        position: absolute;
        background-color: #fff;
        opacity: 0.6;
        transform: scale(0.85) translateX(11px);
        z-index: -1;
      }
      &::after {
        transform: scale(0.7) translateX(27px);
        opacity: 0.4;
        z-index: -2;
      }
    }
    .play {
      color: #fff;
      opacity: 0;
      right: -70px;
      position: absolute;
      transform: rotate(180deg);
      transition: all 0.3s;
      cursor: pointer;
      &:hover {
        transform: scale(1.1);
      }
      &:active {
        transform: scale(1);
      }
    }
  }
}
</style>
