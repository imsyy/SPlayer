<template>
  <n-card
    :class="
      music.getPlaylists[0] && music.showPlayBar ? 'player show' : 'player'
    "
    content-style="padding: 0"
  >
    <n-slider
      v-model:value="music.getPlaySongTime.barMoveDistance"
      class="progress"
      :step="0.01"
      :tooltip="false"
      @update:value="songTimeSliderUpdate"
      @click.stop
    />
    <div class="data">
      <div class="pic" @click.stop="music.setBigPlayerState(true)">
        <img
          :src="
            music.getPlaySongData
              ? music.getPlaySongData.album.picUrl.replace(/^http:/, 'https:') +
                '?param=50y50'
              : '/images/pic/default.png'
          "
          alt="pic"
        />
        <n-icon class="open" size="30" :component="KeyboardArrowUpFilled" />
      </div>
      <div class="name">
        <div
          class="song text-hidden"
          @click.stop="router.push(`/song?id=${music.getPlaySongData.id}`)"
        >
          {{ music.getPlaySongData ? music.getPlaySongData.name : "暂无歌曲" }}
        </div>
        <AllArtists
          class="text-hidden"
          v-if="music.getPlaySongData"
          :artistsData="music.getPlaySongData.artist"
        />
      </div>
      <div class="time">
        <span>{{ music.getPlaySongTime.songTimePlayed }}</span>
        <span>/</span>
        <span>{{ music.getPlaySongTime.songTimeDuration }}</span>
      </div>
    </div>
    <div class="control">
      <n-icon
        v-if="!music.getPersonalFmMode"
        title="上一曲"
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
          size="46"
          :title="music.getPlayState ? '暂停' : '播放'"
          :component="music.getPlayState ? PauseCircleFilled : PlayCircleFilled"
          @click.stop="music.setPlayState(!music.getPlayState)"
        />
      </div>
      <n-icon
        class="next"
        size="30"
        :component="SkipNextRound"
        @click.stop="music.setPlaySongIndex('next')"
      />
    </div>
    <div :class="music.getPersonalFmMode ? 'menu fm' : 'menu'">
      <div class="like" v-if="music.getPlaySongData">
        <n-icon
          class="like-icon"
          size="24"
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
      <div class="pattern">
        <n-icon
          :component="
            persistData.playSongMode === 'normal'
              ? PlayCycle
              : persistData.playSongMode === 'random'
              ? ShuffleOne
              : PlayOnce
          "
          @click="music.setPlaySongMode()"
        />
      </div>
      <div class="playlist">
        <PlayList />
        <n-icon
          class="next"
          size="30"
          :component="PlaylistPlayRound"
          @click.stop="music.showPlayList = !music.showPlayList"
        />
      </div>
      <div class="volume">
        <n-icon
          size="28"
          :component="
            persistData.playVolume == 0
              ? VolumeOffRound
              : persistData.playVolume < 0.4
              ? VolumeMuteRound
              : persistData.playVolume < 0.7
              ? VolumeDownRound
              : VolumeUpRound
          "
          @click.stop="volumeMute"
        />
        <n-slider
          class="volmePg"
          v-model:value="persistData.playVolume"
          :tooltip="false"
          :min="0"
          :max="1"
          :step="0.01"
          @click.stop
        />
      </div>
    </div>
    <audio
      ref="player"
      :autoplay="music.getPlayState"
      @timeupdate="songUpdate"
      @play="songPlay"
      @pause="songPause"
      @canplay="songCanplay"
      @error="songError"
      @ended="music.setPlaySongIndex('next')"
      :src="music.getPlaySongLink"
    ></audio>
  </n-card>
  <BigPlayer />
</template>

<script setup>
import { checkMusicCanUse, getMusicUrl, getMusicLyric } from "@/api";
import { NIcon } from "naive-ui";
import {
  KeyboardArrowUpFilled,
  MusicNoteFilled,
  PlayCircleFilled,
  PauseCircleFilled,
  SkipNextRound,
  SkipPreviousRound,
  PlaylistPlayRound,
  VolumeOffRound,
  VolumeMuteRound,
  VolumeDownRound,
  VolumeUpRound,
  RepeatRound,
  RepeatOneRound,
  ThumbDownRound,
  FavoriteBorderRound,
  FavoriteRound,
} from "@vicons/material";
import { PlayCycle, PlayOnce, ShuffleOne } from "@icon-park/vue-next";
import { storeToRefs } from "pinia";
import { musicStore, userStore } from "@/store/index";
import { useRouter } from "vue-router";
import AllArtists from "@/components/DataList/AllArtists.vue";
import PlayList from "@/components/DataList/PlayList.vue";
import BigPlayer from "./BigPlayer.vue";
import debounce from "@/utils/debounce";
import { nextTick } from "vue";

const router = useRouter();
const user = userStore();
const music = musicStore();
const { persistData } = storeToRefs(music);

// 音频标签
const player = ref(null);

// 获取歌曲播放数据
const getPlaySongData = (id) => {
  checkMusicCanUse(id).then((res) => {
    if (res.success) {
      console.log("音乐可用");
      // 获取音乐地址
      getMusicUrl(id).then((res) => {
        if (res.data[0].fee == 1) {
          $message.warning("当前歌曲为 VIP 专享，仅可试听");
        }
        music.setPlaySongLink(res.data[0].url.replace(/^http:/, "https:"));
      });
      // 获取歌词
      getMusicLyric(id).then((res) => {
        music.setPlaySongLyric(res);
      });
    } else {
      console.log("无法播放");
      $message.error("当前歌曲无法播放，已跳至下一首");
      music.setPlaySongIndex("next");
    }
  });
};

// 歌曲进度更新事件
const songUpdate = (e) => {
  let currentTime = e.target.currentTime;
  let duration = e.target.duration;
  music.setPlaySongTime({ currentTime, duration });
};

// 歌曲缓冲完毕
const songCanplay = () => {
  console.log("缓冲完毕", music.getPlayState);
  if (music.getPlayState && $player) {
    music.setPlayState(true);
    songInOrOut("play");
  }
};

// 歌曲开始播放
const songPlay = () => {
  music.setPlayState(true);
  $message.info(
    music.getPlaySongData.name + " - " + music.getPlaySongData.artist[0].name,
    {
      icon: () =>
        h(NIcon, null, {
          default: () => h(MusicNoteFilled),
        }),
    }
  );
  // 写入播放历史
  music.setPlayHistory(music.getPlaySongData);
  // 更改页面标题
  window.document.title = music.getPlaySongData.name + " - SPlayer";
};

// 音乐渐入渐出
const songInOrOut = (type) => {
  if (type === "play") {
    let volume = 0;
    $player.play();
    const interval = setInterval(() => {
      // 如果音量已经到达当前音量，则停止渐入
      if (volume >= persistData.value.playVolume) {
        clearInterval(interval);
        return;
      }
      // 增加音量
      volume += 0.1;
      if (volume > persistData.value.playVolume) {
        volume = persistData.value.playVolume;
      }
      $player.volume = volume;
    }, 30);
  } else if (type === "pause") {
    let volume = persistData.value.playVolume;
    const interval = setInterval(() => {
      // 如果音量已经到达最小值，则停止渐出
      if (volume <= 0) {
        clearInterval(interval);
        $player.pause();
        return;
      }
      // 减小音量
      volume -= 0.1;
      if (volume < 0) {
        volume = 0;
      }
      $player.volume = volume;
    }, 30);
  }
};

// 歌曲暂停
const songPause = () => {
  console.log("音乐暂停");
  if (!$player.ended) music.setPlayState(false);
  // 更改页面标题
  window.document.title = "SPlayer";
};

// 歌曲进度条更新
const songTimeSliderUpdate = (val) => {
  if ($player && music.getPlaySongTime && music.getPlaySongTime.duration)
    $player.currentTime = (music.getPlaySongTime.duration / 100) * val;
};

// 进度条弹出提示
// const sliderTooltip = (val) => {
//   if ($player && music.getPlaySongTime && music.getPlaySongTime.duration)
//     return getSongPlayingTime((music.getPlaySongTime.duration / 100) * val);
// };

// 歌曲播放失败事件
const songError = () => {
  // $message.error("播放失败，请重试");
  if (music.getPlaylists[0]) getPlaySongData(music.getPlaySongData.id);
  if (music.getPlayState) songInOrOut("play");
};

// 静音事件
const volumeMute = () => {
  if (persistData.value.playVolume > 0) {
    persistData.value.playVolumeMute = persistData.value.playVolume;
    persistData.value.playVolume = 0;
  } else {
    persistData.value.playVolume = persistData.value.playVolumeMute;
  }
};

onMounted(() => {
  // 获取音乐数据
  if (music.getPlaylists[0] && music.getPlaySongData)
    getPlaySongData(music.getPlaySongData.id);
  // 挂载播放器
  window.$player = player.value;
  // 恢复上次播放进度
  if (music.getPlaySongTime && music.getPlaySongTime.currentTime) {
    $player.currentTime = music.getPlaySongTime.currentTime;
  }
  // 设置音量
  if ($player) $player.volume = persistData.value.playVolume;
});

// 监听当前音乐数据变化
watch(
  () => music.getPlaySongData,
  (val) => {
    debounce(() => {
      getPlaySongData(val.id);
    }, 500);
  }
);

// 监听当前音量数据变化
watch(
  () => persistData.value.playVolume,
  (val) => {
    if ($player) $player.volume = val;
  }
);

// 监听当前音乐状态变化
watch(
  () => music.getPlayState,
  (val) => {
    nextTick(() => {
      // $player ? (val ? $player.play() : $player.pause()) : null;
      if ($player) {
        // val ? $player.play() : $player.pause();
        val ? songInOrOut("play") : songInOrOut("pause");
      } else {
        $message.error("播放器初始化失败，请重试");
      }
    });
  }
);

// 监听歌曲进度更新
// watch(
//   () => music.getPlaySongTime,
//   (val) => {
//     if (val.barMoveDistance) {
//       songTimeVal.value = val.barMoveDistance;
//     }
//   }
// );
</script>

<style lang="scss" scoped>
.player {
  height: 70px;
  position: fixed;
  bottom: -90px;
  left: 0;
  transition: 0.3s;
  z-index: 2;
  &.show {
    bottom: 0;
    transition: 0.5s;
  }
  .progress {
    position: absolute;
    top: -6px;
    left: 0;
    --n-handle-size: 12px;
    --n-rail-height: 3px;
  }
  :deep(.n-card__content) {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-items: center;
    @media (max-width: 620px) {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      .data {
        .time {
          display: none;
        }
      }
      .control {
        margin-left: auto;
        .prev,
        .next {
          display: none;
        }
      }
    }
    .data {
      display: flex;
      flex-direction: row;
      align-items: center;
      .pic {
        width: 50px;
        height: 50px;
        min-width: 50px;
        border-radius: 8px;
        overflow: hidden;
        margin-right: 12px;
        position: relative;
        box-shadow: 0 6px 8px -2px rgb(0 0 0 / 16%);
        cursor: pointer;
        img {
          width: 100%;
          height: 100%;
          transform: scale(1);
          filter: blur(0) brightness(1);
          transition: all 0.3s;
        }
        .open {
          position: absolute;
          top: calc(50% - 15px);
          left: calc(50% - 15px);
          width: 30px;
          height: 30px;
          color: #fff;
          opacity: 0;
          transform: scale(0.6);
          transition: all 0.3s;
        }
        &:hover {
          img {
            transform: scale(1.1);
            filter: blur(6px) brightness(0.8);
          }
          .open {
            opacity: 1;
            transform: scale(1);
          }
        }
      }
      .name {
        .song {
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
          &:hover {
            color: $mainColor;
          }
        }
        .artists {
          font-size: 12px;
        }
      }
      .time {
        font-size: 12px;
        opacity: 0.6;
        margin-left: auto;
        white-space: nowrap;
        span {
          &:nth-of-type(2) {
            margin: 0 2px;
          }
        }
      }
    }
    .control {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      .next,
      .prev,
      .dislike {
        color: $mainColor;
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
        transform: scale(1);
        transition: all 0.3s;
        &:hover {
          color: var(--n-color-embedded);
          background-color: $mainColor;
        }
        &:active {
          transform: scale(0.9);
        }
      }
      .dislike {
        padding: 9px;
      }
      .play-state {
        width: 46px;
        height: 46px;
        color: $mainColor;
        margin: 0 12px;
        cursor: pointer;
        transform: scale(1);
        transition: all 0.3s;
        &:hover {
          transform: scale(1.1);
        }
        &:active {
          transform: scale(1);
        }
      }
    }
    .menu {
      position: relative;
      height: 100%;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-end;
      color: $mainColor;
      @media (max-width: 640px) {
        .volume {
          display: none !important;
        }
      }
      &.fm {
        .pattern,
        .playlist {
          display: none;
        }
      }
      .n-icon {
        padding: 4px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s;
        &:hover {
          background-color: $mainColor;
          color: var(--n-color-embedded);
        }
        &:active {
          transform: scale(0.95);
        }
      }
      .like {
        display: flex;
        align-items: center;
        justify-content: center;
        .n-icon {
          padding: 7px;
          margin-top: 1px;
        }
      }
      .pattern {
        margin-left: 8px;
        .n-icon {
          font-size: 22px;
          padding: 8px;
        }
      }
      .playlist {
        margin-left: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .volume {
        display: flex;
        align-items: center;
        flex-direction: row;
        margin-left: 8px;
        width: 100px;
        .n-icon {
          margin-right: 6px;
        }
        .volmePg {
          --n-handle-size: 12px;
          --n-rail-height: 3px;
        }
      }
    }
  }
}
</style>
