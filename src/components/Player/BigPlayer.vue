<template>
  <Transition name="up">
    <div
      v-if="music.showBigPlayer"
      class="bplayer"
      :style="
        music.getPlaySongData
          ? 'background-image: url(' +
            music.getPlaySongData.album.picUrl.replace(/^http:/, 'https:') +
            '?param=50y50)'
          : ''
      "
    >
      <div class="gray" />
      <n-icon
        class="close"
        size="40"
        :component="KeyboardArrowDownFilled"
        @click="music.setBigPlayerState(false)"
      />
      <n-icon
        class="screenfull"
        size="36"
        :component="screenfullIcon"
        @click="screenfullChange"
      />
      <div
        :class="
          music.getPlaySongLyric[0] && music.getPlaySongLyric.length > 4
            ? 'all'
            : 'all noLrc'
        "
      >
        <div class="left">
          <PlayerCover v-if="setting.playerStyle === 'cover'" />
          <PlayerRecord v-else />
        </div>
        <div
          class="right"
          @mouseenter="menuShow = true"
          @mouseleave="menuShow = false"
        >
          <Transition name="lrc">
            <div
              class="lrcShow"
              v-if="
                music.getPlaySongLyric[0] && music.getPlaySongLyric.length > 4
              "
            >
              <div class="data" v-show="setting.playerStyle === 'record'">
                <div class="name text-hidden">
                  <span>{{
                    music.getPlaySongData
                      ? music.getPlaySongData.name
                      : "暂无歌曲"
                  }}</span>
                  <span
                    v-if="music.getPlaySongData && music.getPlaySongData.alia"
                    >{{ music.getPlaySongData.alia[0] }}</span
                  >
                </div>
                <div
                  class="artists text-hidden"
                  v-if="music.getPlaySongData && music.getPlaySongData.artist"
                >
                  <span
                    class="artist"
                    v-for="(item, index) in music.getPlaySongData.artist"
                    :key="item"
                  >
                    <span>{{ item.name }}</span>
                    <span
                      v-if="index != music.getPlaySongData.artist.length - 1"
                      >/</span
                    >
                  </span>
                </div>
              </div>
              <div
                :class="
                  setting.playerStyle === 'cover'
                    ? 'lrc-all cover'
                    : 'lrc-all record'
                "
                v-if="music.getPlaySongLyric[0]"
                :style="
                  setting.lyricsPosition === 'center'
                    ? { textAlign: 'center', paddingRight: '0' }
                    : null
                "
                @mouseleave="lrcAllLeave"
              >
                <div class="placeholder"></div>
                <div
                  :class="
                    music.getPlaySongLyricIndex == index ? 'lrc on' : 'lrc'
                  "
                  :style="{ marginBottom: setting.lyricsFontSize - 1.6 + 'vh' }"
                  v-for="(item, index) in music.getPlaySongLyric"
                  :key="item"
                  :id="'lrc' + index"
                  @click="jumpTime(item.time)"
                >
                  <div
                    class="lrc-text"
                    :style="{
                      transformOrigin:
                        setting.lyricsPosition === 'center' ? 'center' : null,
                      filter: setting.lyricsBlur
                        ? `blur(${getFilter(
                            music.getPlaySongLyricIndex,
                            index
                          )}px)`
                        : null,
                    }"
                  >
                    <span
                      class="lyric"
                      :style="{ fontSize: setting.lyricsFontSize + 'vh' }"
                    >
                      {{ item.lyric }}
                    </span>
                    <span
                      v-show="
                        music.getPlaySongTransl &&
                        setting.getShowTransl &&
                        item.lyricFy
                      "
                      :style="{ fontSize: setting.lyricsFontSize - 0.4 + 'vh' }"
                      class="lyric-fy"
                    >
                      {{ item.lyricFy }}</span
                    >
                  </div>
                </div>
                <div class="placeholder"></div>
              </div>
              <div
                :class="menuShow ? 'menu show' : 'menu'"
                v-show="setting.playerStyle === 'record'"
              >
                <n-icon
                  v-if="music.getPlaySongTransl"
                  :class="setting.getShowTransl ? 'open' : ''"
                  :component="GTranslateFilled"
                  @click="setting.setShowTransl(!setting.getShowTransl)"
                />
                <n-icon
                  class="open"
                  :component="MessageFilled"
                  @click="toComment"
                />
              </div>
            </div>
          </Transition>
        </div>
      </div>
      <div class="canvas">
        <canvas v-if="setting.musicFrequency" class="avBars" ref="avBars" />
      </div>
    </div>
  </Transition>
</template>

<script setup>
import {
  KeyboardArrowDownFilled,
  GTranslateFilled,
  MessageFilled,
  FullscreenRound,
  FullscreenExitRound,
} from "@vicons/material";
import { musicStore, settingStore } from "@/store";
import { useRouter } from "vue-router";
import MusicFrequency from "@/utils/MusicFrequency.js";
import PlayerRecord from "./PlayerRecord.vue";
import PlayerCover from "./PlayerCover.vue";
import screenfull from "screenfull";

const router = useRouter();
const music = musicStore();
const setting = settingStore();

// 工具栏显隐
const menuShow = ref(false);

// 音乐频谱
const avBars = ref(null);
const musicFrequency = ref(null);

// 歌词模糊数值
const getFilter = (lrcIndex, index) => {
  if (lrcIndex >= index) {
    return lrcIndex - index;
  } else {
    return index - lrcIndex;
  }
};

// 点击歌词跳转
const jumpTime = (time) => {
  if ($player) $player.currentTime = time;
};

// 鼠标移出歌词区域
const lrcAllLeave = () => {
  if (!music.playState) {
    lyricsScroll(music.getPlaySongLyricIndex);
  }
};

// 全屏切换
const screenfullIcon = shallowRef(FullscreenRound);
const screenfullChange = () => {
  if (screenfull.isEnabled) {
    screenfull.toggle();
    screenfullIcon.value = screenfull.isFullscreen
      ? FullscreenRound
      : FullscreenExitRound;
    // 延迟一段时间执行列表滚动
    setTimeout(() => {
      lyricsScroll(music.getPlaySongLyricIndex);
    }, 500);
  }
};

// 前往评论
const toComment = () => {
  music.setBigPlayerState(false);
  router.push({
    path: "/comment",
    query: {
      id: music.getPlaySongData ? music.getPlaySongData.id : null,
    },
  });
};

// 歌词滚动
const lyricsScroll = (index) => {
  const type = setting.lyricsBlock;
  const el = document.getElementById(
    `lrc${type === "center" ? index : index - 2}`
  );
  if (el) {
    el.scrollIntoView({
      behavior: "smooth",
      block: type,
    });
  }
};

onMounted(() => {
  nextTick(() => {
    if (setting.musicFrequency && music.getPlaylists[0]) {
      $player.crossOrigin = "anonymous";
      musicFrequency.value = new MusicFrequency(
        avBars.value,
        $player,
        null,
        50,
        null,
        null,
        5
      );
      musicFrequency.value.drawSpectrum();
    }
    // 滚动歌词
    lyricsScroll(music.getPlaySongLyricIndex);
  });
});

// 监听页面是否打开
watch(
  () => music.showBigPlayer,
  (val) => {
    if (val) {
      console.log("开启播放器", music.getPlaySongLyricIndex);
      nextTick(() => {
        lyricsScroll(music.getPlaySongLyricIndex);
      });
    }
  }
);

// 监听歌词滚动
watch(
  () => music.getPlaySongLyricIndex,
  (val) => lyricsScroll(val)
);
</script>

<style lang="scss" scoped>
.up-enter-active,
.up-leave-active {
  transform: translateY(0);
  transition: all 0.5s cubic-bezier(0.65, 0.05, 0.36, 1);
}
.up-enter-from,
.up-leave-to {
  transform: translateY(100%);
}
.lrc-enter-active,
.lrc-leave-active {
  transition: opacity 0.3s ease;
}
.lrc-enter-active {
  transition-delay: 0.3s;
}
.lrc-enter-from,
.lrc-leave-to {
  opacity: 0;
}
.bplayer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  overflow: hidden;
  color: #ffffff;
  background-repeat: no-repeat;
  background-size: 150% 150%;
  background-position: center;
  display: flex;
  justify-content: center;
  &::after {
    // content: "";
    position: absolute;
    top: 0;
    left: calc(50% - 2px);
    height: 100%;
    width: 4px;
    background-color: red;
  }
  .gray {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #00000060;
    backdrop-filter: blur(80px);
    z-index: -1;
  }
  .close,
  .screenfull {
    position: absolute;
    top: 24px;
    right: 24px;
    opacity: 0.3;
    color: #fff;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.3s;
    &:hover {
      background-color: #ffffff20;
      transform: scale(1.05);
      opacity: 1;
    }
    &:active {
      transform: scale(1);
    }
  }
  .screenfull {
    right: 80px;
    padding: 2px;
    @media (max-width: 768px) {
      display: none;
    }
  }
  .all {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    transition: all 0.3s ease-in-out;
    &.noLrc {
      .left {
        padding-right: 0;
        transform: translateX(25vh);
      }
      @media (max-width: 768px) {
        .left {
          width: 100%;
          display: flex !important;
          transform: none;
          align-items: center;
        }
        .right {
          display: none !important;
        }
      }
    }
    @media (max-width: 768px) {
      .left {
        display: none !important;
      }
      .right {
        padding: 0 5vw;
        .lrcShow {
          .lrc-all {
            height: 70vh !important;
            padding-right: 16% !important;
          }
          .data,
          .menu {
            display: block !important;
            opacity: 1 !important;
          }
        }
      }
    }
    .left {
      // flex: 1;
      // padding: 0 4vw;
      width: 50%;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: center;
      transition: all 0.3s ease-in-out;
      padding-right: 3.8vw;
      box-sizing: border-box;
    }
    .right {
      flex: 1;
      height: 100%;
      padding-left: 2vw;
      .lrcShow {
        height: 100%;
        display: flex;
        justify-content: center;
        flex-direction: column;
        .data {
          padding: 0 20px;
          margin-bottom: 8px;
          .name {
            font-size: 3vh;
            -webkit-line-clamp: 2;
            padding-right: 26px;
            span {
              &:nth-of-type(2) {
                margin-left: 12px;
                font-size: 2.3vh;
                opacity: 0.6;
              }
            }
          }
          .artists {
            margin-top: 4px;
            opacity: 0.6;
            font-size: 1.8vh;
            .artist {
              span {
                &:nth-of-type(2) {
                  margin: 0 2px;
                }
              }
            }
          }
        }
        .lrc-all {
          padding-right: 20%;
          scrollbar-width: none;
          // max-width: 460px;
          max-width: 52vh;
          overflow: auto;
          mask: linear-gradient(
            180deg,
            hsla(0, 0%, 100%, 0) 0,
            hsla(0, 0%, 100%, 0.6) 15%,
            #fff 25%,
            #fff 75%,
            hsla(0, 0%, 100%, 0.6) 85%,
            hsla(0, 0%, 100%, 0)
          );
          -webkit-mask: linear-gradient(
            180deg,
            hsla(0, 0%, 100%, 0) 0,
            hsla(0, 0%, 100%, 0.6) 15%,
            #fff 25%,
            #fff 75%,
            hsla(0, 0%, 100%, 0.6) 85%,
            hsla(0, 0%, 100%, 0)
          );
          &::-webkit-scrollbar {
            display: none;
          }
          &.cover {
            height: 80vh;
          }
          &.record {
            height: 60vh;
          }
          &:hover {
            .lrc-text {
              filter: blur(0) !important;
            }
          }
          .placeholder {
            width: 100%;
            height: 50%;
          }
          .lrc {
            opacity: 0.4;
            transition: all 0.3s;
            // display: flex;
            // flex-direction: column;
            // margin-bottom: 4px;
            // padding: 12px 20px;
            margin-bottom: 0.8vh;
            padding: 1.8vh 3vh;
            border-radius: 8px;
            transition: all 0.3s;
            transform-origin: left center;
            cursor: pointer;
            .lrc-text {
              display: flex;
              flex-direction: column;
              transition: all 0.35s ease-in-out;
              transform: scale(0.95);
              transform-origin: left center;
              .lyric {
                transition: all 0.3s;
                // font-size: 2.4vh;
              }
              .lyric-fy {
                margin-top: 2px;
                transition: all 0.3s;
                opacity: 0.8;
                // font-size: 2vh;
              }
            }
            &.on {
              opacity: 1;
              .lrc-text {
                transform: scale(1.05);
                .lyric {
                  font-weight: bold;
                  text-shadow: 0px 0px 30px #ffffff40;
                }
              }
            }
            &:hover {
              @media (min-width: 768px) {
                background-color: #ffffff20;
              }
            }
            &:active {
              transform: scale(0.95);
            }
          }
        }
        .menu {
          opacity: 0;
          padding: 0 20px;
          margin-top: 20px;
          display: flex;
          flex-direction: row;
          align-items: center;
          transition: all 0.3s;
          &.show {
            opacity: 1;
          }
          .n-icon {
            margin-right: 8px;
            font-size: 24px;
            cursor: pointer;
            padding: 8px;
            border-radius: 8px;
            opacity: 0.4;
            transition: all 0.3s;
            &:hover {
              background-color: #ffffff30;
            }
            &:active {
              transform: scale(0.95);
            }
            &.open {
              opacity: 1;
            }
          }
        }
      }
    }
  }
  .canvas {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    max-width: 1600px;
    z-index: -1;
    position: absolute;
    bottom: 0;
    -webkit-mask: linear-gradient(
      to right,
      hsla(0deg, 0%, 100%, 0) 0,
      hsla(0deg, 0%, 100%, 0.6) 15%,
      #fff 30%,
      #fff 70%,
      hsla(0deg, 0%, 100%, 0.6) 85%,
      hsla(0deg, 0%, 100%, 0)
    );
    mask: linear-gradient(
      to right,
      hsla(0deg, 0%, 100%, 0) 0,
      hsla(0deg, 0%, 100%, 0.6) 15%,
      #fff 30%,
      #fff 70%,
      hsla(0deg, 0%, 100%, 0.6) 85%,
      hsla(0deg, 0%, 100%, 0)
    );
    .avBars {
      max-width: 1600px;
      opacity: 0.6;
    }
  }
}
</style>
