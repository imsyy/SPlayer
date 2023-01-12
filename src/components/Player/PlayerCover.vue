<template>
  <div class="cover">
    <div class="pic">
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
      <div class="data">
        <div class="desc">
          <span class="name text-hidden">
            {{
              music.getPlaySongData ? music.getPlaySongData.name : "暂无歌曲"
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
        <span>{{ songTimePlayed }}</span>
        <n-slider
          v-model:value="songTimeVal"
          class="progress"
          :step="0.01"
          @update:value="songTimeSliderUpdate"
        />
        <span>{{ songTimeDuration }}</span>
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
import { getSongPlayingTime } from "@/utils/timeTools.js";
import { musicStore, userStore } from "@/store/index";
import { useRouter } from "vue-router";
import AllArtists from "@/components/DataList/AllArtists.vue";

const router = useRouter();
const music = musicStore();
const user = userStore();

let canvas = ref(null);

// 进度条数据
let songTimeVal = ref(0);
let songTimePlayed = ref("00:00");
let songTimeDuration = ref("00:00");

// 歌曲进度条更新
const songTimeSliderUpdate = (val) => {
  if ($player && music.getPlaySongTime && music.getPlaySongTime.duration)
    $player.currentTime = (music.getPlaySongTime.duration / 100) * val;
};

// 页面跳转
const routerJump = (url, query) => {
  music.setBigPlayerState(false);
  router.push({
    path: url,
    query,
  });
};

// 监听歌曲进度更新
watch(
  () => music.getPlaySongTime,
  (val) => {
    if (val.barMoveDistance) {
      songTimeVal.value = val.barMoveDistance;
      songTimePlayed.value = getSongPlayingTime(
        (val.duration / 100) * val.barMoveDistance
      );
      songTimeDuration.value = getSongPlayingTime(val.duration);
    }
  }
);
</script>

<style lang="scss" scoped>
.cover {
  .pic {
    width: 50vh;
    height: 50vh;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 0 40px 14px rgb(0 0 0 / 20%);
    .album {
      width: 100%;
      height: 100%;
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
      .desc {
        width: 100%;
        padding-right: 4px;
        .name {
          font-size: 3vh;
          font-weight: bold;
          -webkit-line-clamp: 2;
        }
        .message {
          cursor: pointer;
          display: flex;
          align-items: center;
          margin: 2px 0 6px;
          font-size: 2vh;
          width: 100%;
          color: #ffffffcc;
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
      .progress {
        margin: 0 12px;
        --n-handle-size: 12px;
        --n-fill-color: #fff;
        --n-fill-color-hover: #fff;
        --n-rail-color: #ffffff20;
        --n-rail-color-hover: #ffffff30;
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