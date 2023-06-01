<template>
  <Transition name="show">
    <n-card
      v-show="music.getPlaylists[0] && music.showPlayBar"
      class="player"
      content-style="padding: 0"
    >
      <div class="slider">
        <span>{{ music.getPlaySongTime.songTimePlayed }}</span>
        <vue-slider
          v-model="music.getPlaySongTime.barMoveDistance"
          @drag-start="music.setPlayState(false)"
          @drag-end="sliderDragEnd"
          @click.stop="
            songTimeSliderUpdate(music.getPlaySongTime.barMoveDistance)
          "
          :tooltip="'active'"
          :use-keyboard="false"
        >
          <template v-slot:tooltip>
            <div class="slider-tooltip">
              {{
                getSongPlayingTime(
                  (music.getPlaySongTime.duration / 100) *
                    music.getPlaySongTime.barMoveDistance
                )
              }}
            </div>
          </template>
        </vue-slider>
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
                music.getPlaySongData
                  ? music.getPlaySongData.name
                  : $t("other.noSong")
              }}
            </div>
            <!-- 显示歌手或歌词 -->
            <div class="artisrOrLrc" v-if="music.getPlaySongData">
              <Transition name="fade" mode="out-in">
                <template v-if="setting.bottomLyricShow">
                  <Transition name="fade" mode="out-in">
                    <AllArtists
                      v-if="
                        !music.getPlayState || !music.getPlaySongLyric.lrc[0]
                      "
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
              </Transition>
            </div>
          </div>
        </div>
        <div class="control">
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
              size="46"
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
          <n-popover trigger="hover" :keep-alive-on-hover="false">
            <template #trigger>
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
            </template>
            {{
              music.getSongIsLike(music.getPlaySongData.id)
                ? $t("menu.cancelCollection")
                : $t("menu.collection")
            }}
          </n-popover>
          <n-popover trigger="hover" :keep-alive-on-hover="false">
            <template #trigger>
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
            </template>
            {{ $t("menu.add") }}
          </n-popover>
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
          <n-popover trigger="hover" :keep-alive-on-hover="false">
            <template #trigger>
              <div :class="music.showPlayList ? 'playlist open' : 'playlist'">
                <n-icon
                  size="30"
                  :component="PlaylistPlayRound"
                  @click.stop="music.showPlayList = !music.showPlayList"
                />
              </div>
            </template>
            {{ $t("general.name.playlists") }}
          </n-popover>
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
    </n-card>
  </Transition>
  <!-- 播放列表 -->
  <PlayListDrawer ref="PlayListDrawerRef" />
  <!-- 添加到歌单 -->
  <AddPlaylist ref="addPlayListRef" />
  <!-- 播放器 -->
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
import { musicStore, settingStore, siteStore } from "@/store";
import {
  createSound,
  setVolume,
  setSeek,
  fadePlayOrPause,
} from "@/utils/Player";
import { getSongPlayingTime } from "@/utils/timeTools";
import { useRouter } from "vue-router";
import { debounce } from "throttle-debounce";
import { useI18n } from "vue-i18n";
import VueSlider from "vue-slider-component";
import AddPlaylist from "@/components/DataModal/AddPlaylist.vue";
import PlayListDrawer from "@/components/DataModal/PlayListDrawer.vue";
import AllArtists from "@/components/DataList/AllArtists.vue";
import ColorThief from "colorthief";
import BigPlayer from "./BigPlayer.vue";
import "vue-slider-component/theme/default.css";

const { t } = useI18n();
const router = useRouter();
const setting = settingStore();
const music = musicStore();
const site = siteStore();
const { persistData } = storeToRefs(music);
const addPlayListRef = ref(null);
const PlayListDrawerRef = ref(null);

// UNM 是否存在
const useUnmServerHas = import.meta.env.VITE_UNM_API ? true : false;

// 音频标签
const player = ref(null);

// 获取歌曲播放数据
const getPlaySongData = (data, level = setting.songLevel) => {
  try {
    const { id, fee, pc } = data;
    // VIP 歌曲或需要购买专辑
    if (
      useUnmServerHas &&
      setting.useUnmServer &&
      !pc &&
      (fee === 1 || fee === 4)
    ) {
      console.log("网易云解灰");
      getMusicNumUrlData(id);
    }
    // 免费或无版权
    else {
      checkMusicCanUse(id).then((res) => {
        if (res.success) {
          console.log("当前歌曲可用");
          if (!pc && (fee === 1 || fee === 4))
            $message.info(t("general.message.vipTip"));
          // 获取音乐地址
          getMusicUrl(id, level).then((res) => {
            player.value = createSound(
              res.data[0].url.replace(/^http:/, "https:")
            );
          });
        } else {
          if (useUnmServerHas && setting.useUnmServer) {
            getMusicNumUrlData(id);
          } else {
            $message.warning(t("general.message.playError"));
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
    if (music.getPlaylists[0] && music.getPlayState) {
      console.log("当前歌曲所有音源匹配失败：" + err);
      $message.warning(t("general.message.playError"));
      music.setPlaySongIndex("next");
    }
  }
};

// 网易云解灰
const getMusicNumUrlData = (id) => {
  getMusicNumUrl(id)
    .then((res) => {
      if (res.code === 200) {
        const songUrl = res.data.url.replace(/^http:/, "");
        // 匹配酷我域名
        const pattern = /kuwo\.cn/i;
        if (pattern.test(songUrl) && res.data?.proxyUrl) {
          player.value = createSound(res.data.proxyUrl);
          console.log("替换成功：" + res.data.proxyUrl);
        } else {
          player.value = createSound(songUrl);
          console.log("替换成功：" + songUrl);
        }
      }
    })
    .catch((err) => {
      console.log("解灰失败：" + err);
      $message.warning(t("general.message.playError"));
      music.setPlaySongIndex("next");
    });
};

// 歌曲进度条更新
const sliderDragEnd = () => {
  songTimeSliderUpdate(music.getPlaySongTime.barMoveDistance);
  music.setPlayState(true);
};
const songTimeSliderUpdate = (val) => {
  if (player.value && music.getPlaySongTime?.duration) {
    const currentTime = (music.getPlaySongTime.duration / 100) * val;
    setSeek(player.value, currentTime);
  }
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

// 歌曲更换事件
const songChange = debounce(500, (val) => {
  if (val === undefined) {
    window.document.title =
      sessionStorage.getItem("siteTitle") ?? import.meta.env.VITE_SITE_TITLE;
  }
  // 加载数据
  getPlaySongData(val);
  getPicColor(val?.album.picUrl);
});

// 获取封面图主色
const getPicColor = (url) => {
  if (!url) return false;
  const imgUrl = url.replace(/^http:/, "https:") + "?param=50y50";
  const img = new Image();
  fetch(imgUrl)
    .then((res) => res.blob())
    .then((blob) => {
      img.src = URL.createObjectURL(blob);
      img.addEventListener("load", async () => {
        const colorThief = new ColorThief();
        const color = await colorThief.getColor(img);
        console.log(`当前封面主色：rgb(${color.join(",")})`);
        site.songPicColor = `rgb(${color.join(",")})`;
      });
    })
    .catch((err) => {
      console.error("图像处理出错：" + err);
      site.songPicColor = "rgb(128,128,128)";
    });
};

onMounted(() => {
  // 挂载方法
  window.$getPlaySongData = getPlaySongData;
  // 获取音乐数据
  if (music.getPlaylists[0] && music.getPlaySongData) {
    getPlaySongData(music.getPlaySongData);
    getPicColor(music.getPlaySongData.album.picUrl);
  }
});

// 监听当前音乐数据变化
watch(
  () => music.getPlaySongData,
  (val) => {
    music.setPlaySongTime({ currentTime: 0, duration: 0 });
    songChange(val);
  }
);

// 监听当前音量数据变化
watch(
  () => persistData.value.playVolume,
  (val) => {
    if (player.value) setVolume(player.value, val);
  }
);

// 监听当前音乐状态变化
watch(
  () => music.getPlayState,
  (val) => {
    nextTick().then(() => {
      if (player.value && !music.isLoadingSong) {
        fadePlayOrPause(
          player.value,
          val ? "play" : "pause",
          persistData.value.playVolume
        );
      }
    });
  }
);
</script>

<style lang="scss" scoped>
.show-enter-active,
.show-leave-active {
  transform: translateY(0);
  transition: all 0.3s cubic-bezier(0.65, 0.05, 0.36, 1);
}
.show-enter-from,
.show-leave-to {
  transform: translateY(80px);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.player {
  height: 70px;
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 2;
  .slider {
    position: absolute;
    top: -12px;
    left: 0;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    @media (max-width: 640px) {
      top: -8px;
      > {
        span {
          display: none;
        }
      }
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
    .vue-slider {
      width: 100% !important;
      height: 3px !important;
      cursor: pointer;
      .slider-tooltip {
        font-size: 12px;
        white-space: nowrap;
        background-color: var(--n-color);
        outline: 1px solid var(--n-border-color);
        padding: 2px 8px;
        border-radius: 25px;
      }
      :deep(.vue-slider-rail) {
        background-color: var(--n-border-color);
        border-radius: 25px;
        .vue-slider-process {
          background-color: var(--main-color);
        }
        .vue-slider-dot {
          width: 12px !important;
          height: 12px !important;
        }
        .vue-slider-dot-handle-focus {
          box-shadow: 0px 0px 1px 2px var(--main-color);
        }
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
            color: var(--main-color);
          }
        }
        .artisrOrLrc {
          font-size: 12px;
          margin-top: 2px;
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
        color: var(--main-color);
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
        transform: scale(1);
        transition: all 0.3s;
        &:hover {
          color: var(--n-color-embedded);
          background-color: var(--main-color);
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
        color: var(--main-color);
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
      color: var(--main-color);
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
        @media (min-width: 640px) {
          &:hover {
            background-color: var(--main-color);
            color: var(--n-color-embedded);
          }
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
        &.open {
          .n-icon {
            background-color: var(--main-color);
            color: var(--n-color-embedded);
          }
        }
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
        .play-state {
          margin: 0;
        }
      }
    }
  }
}
</style>
