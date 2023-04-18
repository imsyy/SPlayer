<template>
  <n-card
    :class="
      music.getPlaylists[0] && music.showPlayBar ? 'player show' : 'player'
    "
    content-style="padding: 0"
  >
    <div class="slider">
      <span>{{ music.getPlaySongTime.songTimePlayed }}</span>
      <n-slider
        v-model:value="music.getPlaySongTime.barMoveDistance"
        class="progress"
        :step="0.01"
        :tooltip="false"
        @update:value="songTimeSliderUpdate"
        @click.stop
      />
      <span>{{ music.getPlaySongTime.songTimeDuration }}</span>
    </div>
    <div class="all">
      <div class="data">
        <div class="pic" @click.stop="music.setBigPlayerState(true)">
          <img
            :src="
              music.getPlaySongData
                ? music.getPlaySongData.album.picUrl.replace(
                    /^http:/,
                    'https:'
                  ) + '?param=50y50'
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
            {{
              music.getPlaySongData ? music.getPlaySongData.name : "暂无歌曲"
            }}
          </div>
          <div class="artisrOrLrc" v-if="music.getPlaySongData">
            <template v-if="setting.bottomLyricShow">
              <Transition mode="out-in">
                <AllArtists
                  v-if="!music.getPlayState || !music.getPlaySongLyric.lrc[0]"
                  class="text-hidden"
                  :artistsData="music.getPlaySongData.artist"
                />
                <n-text
                  v-else-if="
                    setting.showYrc &&
                    music.getPlaySongLyricIndex != -1 &&
                    music.getPlaySongLyric.hasYrc
                  "
                  class="lrc text-hidden"
                >
                  <n-text
                    v-for="item in music.getPlaySongLyric.yrc[
                      music.getPlaySongLyricIndex
                    ].content"
                    :key="item"
                    :depth="3"
                  >
                    {{ item.content }}
                  </n-text>
                </n-text>
                <n-text
                  v-else-if="
                    music.getPlaySongLyricIndex != -1 &&
                    music.getPlaySongLyric.lrc[0]
                  "
                  class="lrc text-hidden"
                  :depth="3"
                  v-html="
                    music.getPlaySongLyric.lrc[music.getPlaySongLyricIndex]
                      .content
                  "
                />
                <AllArtists
                  v-else
                  class="text-hidden"
                  :artistsData="music.getPlaySongData.artist"
                />
              </Transition>
            </template>
            <template v-else>
              <AllArtists
                class="text-hidden"
                :artistsData="music.getPlaySongData.artist"
              />
            </template>
          </div>
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
            :component="
              music.getPlayState ? PauseCircleFilled : PlayCircleFilled
            "
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
        <div class="add-playlist">
          <n-icon
            class="add-icon"
            size="30"
            :component="PlaylistAddRound"
            @click.stop="
              addPlayListRef.openAddToPlaylist(music.getPlaySongData.id)
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
  <AddPlaylist ref="addPlayListRef" />
  <BigPlayer />
</template>

<script setup>
import {
  checkMusicCanUse,
  getMusicUrl,
  getMusicNumUrl,
  getMusicNewLyric,
} from "@/api/song";
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
  ThumbDownRound,
  FavoriteBorderRound,
  FavoriteRound,
  PlaylistAddRound,
} from "@vicons/material";
import { PlayCycle, PlayOnce, ShuffleOne } from "@icon-park/vue-next";
import { storeToRefs } from "pinia";
import { musicStore, settingStore } from "@/store";
import { useRouter } from "vue-router";
import AddPlaylist from "@/components/DataModel/AddPlaylist.vue";
import AllArtists from "@/components/DataList/AllArtists.vue";
import PlayList from "@/components/DataList/PlayList.vue";
import BigPlayer from "./BigPlayer.vue";
import debounce from "@/utils/debounce";

const router = useRouter();
const setting = settingStore();
const music = musicStore();
const { persistData } = storeToRefs(music);
const addPlayListRef = ref(null);

// 重试次数
const testNumber = ref(0);

// UNM 是否存在
const useUnmServerHas = import.meta.env.VITE_UNM_API ? true : false;

// 音频标签
const player = ref(null);

// 获取歌曲播放数据
const getPlaySongData = (data, level = setting.songLevel) => {
  try {
    const { id, fee } = data;
    // VIP 歌曲或需要购买专辑
    if (useUnmServerHas && setting.useUnmServer && (fee === 1 || fee === 4)) {
      getMusicNumUrlData(id);
    }
    // 免费或无版权
    else {
      checkMusicCanUse(id).then((res) => {
        if (res.success) {
          console.log("当前歌曲可用");
          if (fee === 1 || fee === 4)
            $message.info("当前歌曲为 VIP 专享，仅可试听");
          // 获取音乐地址
          getMusicUrl(id, level).then((res) => {
            music.setPlaySongLink(res.data[0].url.replace(/^http:/, "https:"));
          });
        } else {
          if (useUnmServerHas && setting.useUnmServer) {
            getMusicNumUrlData(id);
          } else {
            $message.warning("当前歌曲播放失败，跳至下一首");
            music.setPlaySongIndex("next");
          }
        }
      });
    }
    // 获取歌词
    getMusicNewLyric(id).then((res) => {
      music.setPlaySongLyric(res);
    });
  } catch (err) {
    console.log("当前歌曲所有音源匹配失败：" + err);
    if (music.getPlayState && $player) {
      $message.warning("当前歌曲所有音源匹配失败，跳至下一首");
      music.setPlaySongIndex("next");
    }
  }
};

// 网易云解灰
const getMusicNumUrlData = (id) => {
  getMusicNumUrl(id)
    .then((res) => {
      if (res.code === 200) {
        console.log("替换成功：" + res.data.url.replace(/^http:/, ""));
        music.setPlaySongLink(res.data.url.replace(/^http:/, ""));
      }
    })
    .catch((err) => {
      console.log("解灰失败：" + err);
      $message.warning("当前歌曲解灰失败，跳至下一首");
      music.setPlaySongIndex("next");
    });
};

// 歌曲进度更新事件
const songUpdate = (e) => {
  const currentTime = e.target.currentTime;
  const duration = e.target.duration;
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
  testNumber.value = 0;
  if (!music.getPlaySongData) {
    $message.error("音乐数据获取失败");
    return false;
  }
  music.setPlayState(true);
  // 兼容 mediaSession
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: music.getPlaySongData.name,
      artist: music.getPlaySongData.artist[0].name,
      album: music.getPlaySongData.album.name,
      artwork: [
        {
          src:
            music.getPlaySongData.album.picUrl.replace(/^http:/, "https:") +
            "?param=96y96",
          sizes: "96x96",
        },
        {
          src:
            music.getPlaySongData.album.picUrl.replace(/^http:/, "https:") +
            "?param=128y128",
          sizes: "128x128",
        },
        {
          src:
            music.getPlaySongData.album.picUrl.replace(/^http:/, "https:") +
            "?param=192y192",
          sizes: "192x192",
        },
      ],
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      music.setPlaySongIndex("next");
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      music.setPlaySongIndex("prev");
    });
  }
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
  // $setSiteTitle(
  //   music.getPlaySongData.name + " - " + music.getPlaySongData.artist[0].name
  // );
  window.document.title =
    music.getPlaySongData.name +
    " - " +
    music.getPlaySongData.artist[0].name +
    " - SPlayer";
};

// 音乐渐入渐出
const isFading = ref(false);
const songInOrOut = (type) => {
  if (isFading.value) {
    return;
  }
  isFading.value = true;

  if (type === "play") {
    let volume = 0;
    $player.play();
    const interval = setInterval(() => {
      // 如果音量已经到达当前音量，则停止渐入
      if (volume >= persistData.value.playVolume) {
        clearInterval(interval);
        isFading.value = false;
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
        isFading.value = false;
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
  // window.document.title = "SPlayer";
  $setSiteTitle();
};

// 歌曲进度条更新
const songTimeSliderUpdate = (val) => {
  if ($player && music.getPlaySongTime && music.getPlaySongTime.duration)
    $player.currentTime = (music.getPlaySongTime.duration / 100) * val;
};

// 歌曲播放失败事件
const songError = () => {
  console.error("歌曲播放失败");
  $message.error("歌曲播放失败");
  if (testNumber.value < 4) {
    if (music.getPlaylists[0]) getPlaySongData(music.getPlaySongData);
    testNumber.value++;
  } else {
    $message.error("歌曲重试次数过多，请刷新后重试");
  }
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
    getPlaySongData(music.getPlaySongData);
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
      getPlaySongData(val);
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
  transition: all 0.3s;
  z-index: 2;
  &.show {
    bottom: 0;
  }
  .slider {
    position: absolute;
    top: -12px;
    left: 0;
    width: 100%;
    display: flex;
    align-items: center;
    @media (max-width: 640px) {
      top: -6px;
      > {
        span {
          display: none;
        }
      }
    }

    .progress {
      --n-handle-size: 12px;
      --n-rail-height: 3px;
    }
    > {
      span {
        font-size: 12px;
        white-space: nowrap;
        background-color: var(--n-color);
        outline: 1px solid var(--n-border-color);
        padding: 2px 8px;
        border-radius: 25px;
        margin: 0 2px;
      }
    }
  }

  .all {
    height: 100%;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-items: center;
    max-width: 1400px;
    margin: 0 auto;
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
        .artisrOrLrc {
          font-size: 12px;
          margin-top: 2px;
          .v-enter-active,
          .v-leave-active {
            transition: opacity 0.3s ease;
          }

          .v-enter-from,
          .v-leave-to {
            opacity: 0;
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
        .volume,
        .like,
        .add-playlist,
        .pattern {
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
      .add-playlist {
        margin-left: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
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
