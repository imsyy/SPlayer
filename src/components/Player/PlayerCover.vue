<template>
  <div class="cover">
    <div class="pic">
      <img
        class="album"
        :src="
          music.getPlaySongData
            ? music.getPlaySongData.album.picUrl.replace(/^http:/, 'https:') +
              '?param=1024y1024'
            : '/images/pic/default.png'
        "
        alt="cover"
      />
      <img
        class="shadow"
        :src="
          music.getPlaySongData
            ? music.getPlaySongData.album.picUrl.replace(/^http:/, 'https:') +
              '?param=1024y1024'
            : '/images/pic/default.png'
        "
        alt="shadow"
      />
    </div>
    <div class="control">
      <div class="data">
        <div class="desc">
          <span class="name text-hidden">
            {{
              music.getPlaySongData
                ? music.getPlaySongData.name
                : $t("other.noSong")
            }}
          </span>
          <div v-if="music.getPlaySongData" class="message">
            <AllArtists
              :artistsData="[
                music.getPlaySongData.artist[0],
                music.getPlaySongData.artist[1]
                  ? music.getPlaySongData.artist[1]
                  : null,
              ]"
            />
            <span
              class="ablum text-hidden"
              @click="
                routerJump('/album', {
                  id: music.getPlaySongData
                    ? music.getPlaySongData.album.id
                    : null,
                })
              "
            >
              {{ music.getPlaySongData.album.name }}
            </span>
          </div>
        </div>
        <n-icon
          v-if="music.getPlaySongData && user.userLogin"
          class="like"
          size="20"
          :component="
            music.getSongIsLike(music.getPlaySongData.id)
              ? FavoriteRound
              : FavoriteBorderRound
          "
          @click.stop="
            music.getSongIsLike(music.getPlaySongData.id)
              ? music.changeLikeList(music.getPlaySongData.id, false)
              : music.changeLikeList(music.getPlaySongData.id, true)
          "
        />
      </div>
      <div class="time">
        <span>{{ music.getPlaySongTime.songTimePlayed }}</span>
        <vue-slider
          v-model="music.getPlaySongTime.barMoveDistance"
          @drag-start="music.setPlayState(false)"
          @drag-end="sliderDragEnd"
          @click.stop="
            songTimeSliderUpdate(music.getPlaySongTime.barMoveDistance)
          "
          :tooltip="'none'"
        />
        <span>{{ music.getPlaySongTime.songTimeDuration }}</span>
      </div>
      <div class="buttons">
        <n-icon
          :style="
            music.getPersonalFmMode
              ? 'opacity: 0.2;pointer-events: none;'
              : null
          "
          size="16"
          class="mode"
          :component="
            music.getPlaySongMode === 'normal'
              ? PlayCycle
              : music.getPlaySongMode === 'random'
              ? ShuffleOne
              : PlayOnce
          "
          @click="music.setPlaySongMode()"
        />
        <n-icon
          v-if="!music.getPersonalFmMode"
          class="prev"
          size="30"
          :component="SkipPreviousRound"
          @click.stop="music.setPlaySongIndex('prev')"
        />
        <n-icon
          v-else
          class="dislike"
          size="20"
          :style="!user.userLogin ? 'opacity: 0.2;pointer-events: none;' : null"
          :component="ThumbDownRound"
          @click="music.setFmDislike(music.getPersonalFmData.id)"
        />
        <div class="play-state">
          <n-icon
            size="50"
            :component="music.getPlayState ? PauseRound : PlayArrowRound"
            @click.stop="music.setPlayState(!music.getPlayState)"
          />
        </div>
        <n-icon
          class="next"
          size="30"
          :component="SkipNextRound"
          @click.stop="music.setPlaySongIndex('next')"
        />
        <n-icon
          class="comment"
          size="18"
          :component="MessageFilled"
          @click="
            routerJump('/comment', {
              id: music.getPlaySongData ? music.getPlaySongData.id : null,
            })
          "
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  PlayArrowRound,
  PauseRound,
  SkipNextRound,
  SkipPreviousRound,
  MessageFilled,
  ThumbDownRound,
  FavoriteBorderRound,
  FavoriteRound,
} from "@vicons/material";
import { PlayCycle, PlayOnce, ShuffleOne } from "@icon-park/vue-next";
import { musicStore, userStore } from "@/store";
import { useRouter } from "vue-router";
import { setSeek } from "@/utils/Player";
import AllArtists from "@/components/DataList/AllArtists.vue";
import VueSlider from "vue-slider-component";
import "vue-slider-component/theme/default.css";

const router = useRouter();
const music = musicStore();
const user = userStore();

// 歌曲进度条更新
const sliderDragEnd = () => {
  songTimeSliderUpdate(music.getPlaySongTime.barMoveDistance);
  music.setPlayState(true);
};
const songTimeSliderUpdate = (val) => {
  if (typeof $player !== "undefined" && music.getPlaySongTime?.duration) {
    const currentTime = (music.getPlaySongTime.duration / 100) * val;
    setSeek($player, currentTime);
  }
};

// 页面跳转
const routerJump = (url, query) => {
  music.setBigPlayerState(false);
  router.push({
    path: url,
    query,
  });
};
</script>

<style lang="scss" scoped>
.cover {
  .pic {
    position: relative;
    width: 50vh;
    height: 50vh;
    z-index: 1;
    // overflow: hidden;
    @media (max-width: 1200px) {
      width: 44vh;
      height: 44vh;
    }
    @media (max-width: 870px) {
      width: 40vh;
      height: 40vh;
    }
    .album {
      width: 100%;
      height: 100%;
      border-radius: 8px;
    }
    .shadow {
      position: absolute;
      left: 0;
      top: 12px;
      height: 100%;
      width: 100%;
      filter: blur(16px) opacity(0.6);
      transform: scale(0.92, 0.96);
      z-index: -1;
      background-size: cover;
      aspect-ratio: 1/1;
    }
  }
  .control {
    margin-top: 24px;
    .data {
      width: 50vh;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      @media (max-width: 1200px) {
        width: 44vh;
      }
      @media (max-width: 870px) {
        width: 40vh;
      }
      .desc {
        width: 100%;
        padding-right: 4px;
        .name {
          font-size: 23px;
          font-weight: bold;
          -webkit-line-clamp: 2;
          @media (max-width: 1200px) {
            font-size: 20px;
          }
        }
        .message {
          cursor: pointer;
          display: flex;
          align-items: center;
          margin: 2px 0 6px;
          font-size: 2vh;
          font-size: 15px;
          width: 100%;
          color: #ffffffcc;
          @media (max-width: 1200px) {
            font-size: 14px;
          }
          .ablum {
            transition: all 0.3s;
            &:hover {
              color: #fff;
            }
            &::before {
              content: "·";
              margin: 0 4px;
            }
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
      }
      .like {
        padding: 8px;
        border-radius: 8px;
        transition: all 0.3s;
        cursor: pointer;
        &:hover {
          background-color: #ffffff26;
        }
        &:active {
          transform: scale(0.9);
        }
      }
    }
    .time {
      display: flex;
      flex-direction: row;
      align-items: center;
      span {
        opacity: 0.8;
      }
      .vue-slider {
        margin: 0 10px;
        width: 100% !important;
        transform: translateY(-1px);
        cursor: pointer;
        :deep(.vue-slider-rail) {
          background-color: #ffffff20;
          border-radius: 25px;
          .vue-slider-process {
            background-color: #fff;
          }
          .vue-slider-dot {
            width: 12px !important;
            height: 12px !important;
            box-shadow: none;
          }
          .vue-slider-dot-handle-focus {
            box-shadow: none;
          }
        }
      }
    }
    .buttons {
      margin-top: 26px;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      .play-state {
        display: flex;
        align-items: center;
        justify-content: center;
        .n-icon {
          padding: 0;
        }
      }
      .mode,
      .comment {
        &.n-icon {
          opacity: 0.8;
          margin: 0 6px;
          padding: 8px;
        }
      }
      .dislike {
        padding: 10px !important;
      }
      .n-icon {
        margin: 0 4px;
        cursor: pointer;
        padding: 6px;
        border-radius: 8px;
        transition: all 0.3s;
        &:hover {
          background-color: #ffffff4d;
        }
        &:active {
          transform: scale(0.9);
        }
      }
    }
  }
}
</style>
