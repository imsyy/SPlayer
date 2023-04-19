<template>
  <div class="record">
    <img
      :class="music.getPlayState ? 'pointer play' : 'pointer'"
      src="/images/ico/pointer.png"
      alt="pointer"
    />
    <div
      class="pic"
      :style="{
        animationPlayState: music.getPlayState ? 'running' : 'paused',
      }"
    >
      <img
        class="album"
        :src="
          music.getPlaySongData
            ? music.getPlaySongData.album.picUrl.replace(/^http:/, 'https:') +
              '?param=500y500'
            : '/images/pic/default.png'
        "
        alt="cover"
      />
    </div>
    <div class="control">
      <n-icon
        v-if="!music.getPersonalFmMode"
        class="prev"
        size="36"
        :component="SkipPreviousRound"
        @click.stop="music.setPlaySongIndex('prev')"
      />
      <n-icon
        v-else
        class="dislike"
        size="24"
        :component="ThumbDownRound"
        @click="music.setFmDislike(music.getPersonalFmData.id)"
      />
      <div class="play-state">
        <n-icon
          v-show="!music.getPlayState"
          size="58"
          :component="PlayCircleFilled"
          @click.stop="music.setPlayState(true)"
        />
        <n-icon
          v-show="music.getPlayState"
          size="58"
          :component="PauseCircleFilled"
          @click.stop="music.setPlayState(false)"
        />
      </div>
      <n-icon
        class="next"
        size="36"
        :component="SkipNextRound"
        @click.stop="music.setPlaySongIndex('next')"
      />
    </div>
  </div>
</template>

<script setup>
import {
  PlayCircleFilled,
  PauseCircleFilled,
  SkipNextRound,
  SkipPreviousRound,
  ThumbDownRound,
} from "@vicons/material";
import { musicStore } from "@/store";
const music = musicStore();
</script>

<style lang="scss" scoped>
.record {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    .control {
      opacity: 1;
    }
  }
  .pointer {
    position: absolute;
    width: 14vh;
    left: calc(50% - 1.8vh);
    top: -14vh;
    transform: rotate(-20deg);
    transform-origin: 1.8vh 1.8vh;
    z-index: 1;
    transition: all 0.3s;
    &.play {
      transform: rotate(0);
    }
  }
  .pic {
    animation: rotate 18s linear infinite;
    border-radius: 50%;
    border: 1vh solid #ffffff30;
    background: linear-gradient(black 0%, transparent, black 98%),
      radial-gradient(
        #000 52%,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555,
        #000,
        #555
      );
    background-clip: content-box;
    width: 40vh;
    height: 40vh;
    display: flex;
    justify-content: center;
    align-items: center;
    .album {
      border: 1vh solid #ffffff40;
      border-radius: 50%;
      width: 70%;
      height: 70%;
      object-fit: cover;
    }
  }
  .control {
    opacity: 0;
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    width: 68%;
    height: 68%;
    border-radius: 50%;
    background-color: #00000050;
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(20px);
    transition: all 0.5s;
    .n-icon {
      cursor: pointer;
      transition: all 0.3s;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      &:hover {
        transform: scale(1.1);
      }
      &:active {
        transform: scale(1);
      }
    }
    .play-state {
      display: flex;
      align-items: center;
      justify-content: center;
      .n-icon {
        width: 60px;
        height: 60px;
      }
    }
  }
}

// 旋转动画
@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
