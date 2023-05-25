<template>
  <div
    class="papersonalfm"
    v-if="music.getPersonalFmData?.id"
    :style="`background-image: url(${music.getPersonalFmData.album.picUrl.replace(
      /^http:/,
      'https:'
    )}?param=300y300)`"
  >
    <div class="gray" />
    <img
      class="pic"
      :src="
        music.getPersonalFmData.album.picUrl.replace(/^http:/, 'https:') +
        '?param=300y300'
      "
      alt="pic"
    />
    <div class="data">
      <div class="info">
        <span
          class="name text-hidden"
          @click="router.push(`/song?id=${music.getPersonalFmData.id}`)"
        >
          {{ music.getPersonalFmData.name }}
        </span>
        <AllArtists
          class="text-hidden"
          :artistsData="music.getPersonalFmData.artist"
        />
      </div>
      <div class="controls">
        <n-icon
          class="state"
          size="46"
          :component="
            music.getPersonalFmMode
              ? music.getPlayState
                ? PauseCircleFilled
                : PlayCircleFilled
              : PlayCircleFilled
          "
          @click="fmPlayOrPause"
        />
        <n-icon
          class="next"
          size="30"
          :component="SkipNextRound"
          @click="fmNext"
        />
        <n-icon
          class="dislike"
          size="20"
          :component="ThumbDownRound"
          @click="music.setFmDislike(music.getPersonalFmData.id)"
        />
        <div class="radio">
          <div class="icon">
            <n-icon size="20" :component="RadioFilled" />
            <span>{{ $t("home.modules.papersonalfm.title") }}</span>
          </div>
          <span class="tip" v-if="!user.userLogin">
            {{ $t("home.modules.papersonalfm.subtitle") }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { musicStore, userStore } from "@/store";
import { useRouter } from "vue-router";
import {
  PlayCircleFilled,
  PauseCircleFilled,
  SkipNextRound,
  ThumbDownRound,
  RadioFilled,
} from "@vicons/material";
import AllArtists from "@/components/DataList/AllArtists.vue";

const music = musicStore();
const user = userStore();
const router = useRouter();

// 私人 fm 播放与暂停
const fmPlayOrPause = () => {
  if (music.getPersonalFmMode) {
    music.setPlayState(!music.getPlayState);
  } else {
    music.setPersonalFmMode(true);
    music.setPlayState(true);
  }
};

// 下一曲
const fmNext = () => {
  music.setPersonalFmMode(true);
  music.setPlaySongIndex("next");
};

onMounted(() => {
  if (!music.getPersonalFmData.id) music.setPersonalFmData();
});
</script>

<style lang="scss" scoped>
.papersonalfm {
  position: relative;
  display: flex;
  align-items: center;
  padding: 20px;
  height: 100%;
  border-radius: 8px;
  box-sizing: border-box;
  overflow: hidden;
  color: #ffffff;
  background-repeat: no-repeat;
  background-size: 150% 150%;
  background-position: center;
  z-index: 0;
  transition: all 0.3s;
  .gray {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #00000040;
    -webkit-backdrop-filter: blur(40px);
    backdrop-filter: blur(40px);
    z-index: -1;
  }
  .pic {
    // width: fit-content;
    height: 100%;
    border-radius: 8px;
    margin-right: 16px;
  }
  .data {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    .info {
      width: 100%;
      box-sizing: border-box;
      .name {
        font-size: 24px;
        font-weight: bold;
        -webkit-line-clamp: 2;
        cursor: pointer;
      }
      .artists {
        flex-wrap: nowrap;
        :deep(.artist) {
          display: inline-block;
          white-space: nowrap;
          .name {
            color: #ffffffcc;
            &:hover {
              color: #fff;
            }
          }
        }
      }
    }
    .controls {
      display: flex;
      flex-direction: row;
      align-items: center;
      .state {
        margin-right: 2px;
        transition: transform 0.3s;
        cursor: pointer;
        &:hover {
          transform: scale(1.1);
        }
        &:active {
          transform: scale(1);
        }
      }
      .next,
      .dislike {
        cursor: pointer;
        margin: 0 4px;
        padding: 4px;
        border-radius: 8px;
        transform: scale(1);
        transition: all 0.3s;
        @media (min-width: 640px) {
          &:hover {
            background-color: #ffffff30;
          }
        }
        &:active {
          transform: scale(0.9);
        }
      }
      .dislike {
        padding: 9px;
      }
      .radio {
        opacity: 0.6;
        margin-left: auto;
        margin-top: auto;
        margin-right: 4px;
        transform: translateY(4px);
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        font-size: 16px;
        font-weight: bold;
        pointer-events: none;
        z-index: -1;
        @media (max-width: 490px) {
          position: absolute;
          right: 20px;
          bottom: 20px;
        }
        .icon {
          display: flex;
          align-items: center;
          .n-icon {
            margin-right: 6px;
            transform: translateY(-1px);
          }
        }
        .tip {
          font-size: 12px;
          font-weight: normal;
          display: block;
        }
      }
    }
  }
  @media (max-width: 1020px) {
    .pic {
      height: 96px;
      position: absolute;
      top: 20px;
      left: 20px;
    }
    .data {
      .info {
        padding-left: 116px;
        .name {
          font-size: 22px;
        }
      }
    }
  }
}
</style>
