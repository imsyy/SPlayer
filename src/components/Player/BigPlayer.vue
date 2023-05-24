<template>
  <Transition name="up">
    <div
      v-if="music.showBigPlayer"
      class="bplayer"
      :style="[
        music.getPlaySongData && setting.backgroundImageShow === 'blur'
          ? 'background-image: url(' +
            music.getPlaySongData.album.picUrl.replace(/^http:/, 'https:') +
            '?param=50y50)'
          : '',
        `backgroundColor: ${site.songPicColor}`,
      ]"
    >
      <div
        :class="setting.backgroundImageShow === 'blur' ? 'gray blur' : 'gray'"
      />
      <div class="icon-menu">
        <div class="menu-left">
          <div v-if="setting.showLyricSetting" class="icon">
            <n-icon
              class="setting"
              size="30"
              :component="SettingsRound"
              @click="LyricSettingRef.openLyricSetting()"
            />
          </div>
        </div>
        <div class="menu-right">
          <div class="icon">
            <n-icon
              class="screenfull"
              :component="screenfullIcon"
              @click="screenfullChange"
            />
          </div>
          <div class="icon">
            <n-icon
              class="close"
              :component="KeyboardArrowDownFilled"
              @click="music.setBigPlayerState(false)"
            />
          </div>
        </div>
      </div>
      <div
        :class="
          music.getPlaySongLyric.lrc[0] && music.getPlaySongLyric.lrc.length > 4
            ? 'all'
            : 'all noLrc'
        "
      >
        <!-- 提示文本 -->
        <Transition name="lrc">
          <div class="tip" v-show="lrcMouseStatus">
            <n-text>{{ $t("other.lrcClicks") }}</n-text>
          </div>
        </Transition>
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
                music.getPlaySongLyric.lrc[0] &&
                music.getPlaySongLyric.lrc.length > 4
              "
            >
              <div class="data" v-show="setting.playerStyle === 'record'">
                <div class="name text-hidden">
                  <span>{{
                    music.getPlaySongData
                      ? music.getPlaySongData.name
                      : $t("other.noSong")
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
              <RollingLyrics
                @mouseenter="
                  lrcMouseStatus = setting.lrcMousePause ? true : false
                "
                @mouseleave="lrcAllLeave"
                @lrcTextClick="lrcTextClick"
              />
              <div
                :class="menuShow ? 'menu show' : 'menu'"
                v-show="setting.playerStyle === 'record'"
              >
                <n-icon
                  v-if="music.getPlaySongTransl"
                  :class="setting.showTransl ? 'open' : ''"
                  :component="GTranslateFilled"
                  @click="setting.setShowTransl(!setting.showTransl)"
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
      <!-- 音乐频谱 -->
      <!-- <Spectrum v-if="setting.musicFrequency" /> -->
      <!-- 歌词设置 -->
      <LyricSetting ref="LyricSettingRef" />
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
  SettingsRound,
} from "@vicons/material";
import { musicStore, settingStore, siteStore } from "@/store";
import { useRouter } from "vue-router";
import { setSeek } from "@/utils/Player";
import PlayerRecord from "./PlayerRecord.vue";
import PlayerCover from "./PlayerCover.vue";
import RollingLyrics from "./RollingLyrics.vue";
// import Spectrum from "./Spectrum.vue";
import LyricSetting from "@/components/DataModal/LyricSetting.vue";
import screenfull from "screenfull";

const router = useRouter();
const music = musicStore();
const site = siteStore();
const setting = settingStore();

// 工具栏显隐
const menuShow = ref(false);

// 歌词设置弹窗
const LyricSettingRef = ref(null);

// 歌词文本点击事件
const lrcTextClick = (time) => {
  if (typeof $player !== "undefined") setSeek($player, time);
  music.setPlayState(true);
  lrcMouseStatus.value = false;
};

// 鼠标移出歌词区域
const lrcMouseStatus = ref(false);
const lrcAllLeave = () => {
  lrcMouseStatus.value = false;
  lyricsScroll(music.getPlaySongLyricIndex);
};

// 全屏切换
const timeOut = ref(null);
const screenfullIcon = shallowRef(FullscreenRound);
const screenfullChange = () => {
  if (screenfull.isEnabled) {
    screenfull.toggle();
    screenfullIcon.value = screenfull.isFullscreen
      ? FullscreenRound
      : FullscreenExitRound;
    // 延迟一段时间执行列表滚动
    timeOut.value = setTimeout(() => {
      lrcMouseStatus.value = false;
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
  const lrcType =
    !music.getPlaySongLyric.hasYrc || !setting.showYrc ? "lrc" : "yrc";
  const el = document.getElementById(lrcType + index);
  if (el && !lrcMouseStatus.value) {
    const container = el.parentElement;
    const containerHeight = container.clientHeight;
    // 调整滚动的距离
    const scrollDistance =
      el.offsetTop -
      container.offsetTop -
      (type === "center" ? containerHeight / 2 - el.offsetHeight / 2 : 80);
    container.scrollTo({
      top: scrollDistance,
      behavior: "smooth",
    });
  }
};

// 改变 PWA 应用标题栏颜色
const changePwaColor = () => {
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (music.showBigPlayer) {
    themeColorMeta.setAttribute("content", site.songPicColor);
  } else {
    if (setting.getSiteTheme === "light") {
      themeColorMeta.setAttribute("content", "#ffffff");
    } else if (setting.getSiteTheme === "dark") {
      themeColorMeta.setAttribute("content", "#18181c");
    }
  }
};

onMounted(() => {
  nextTick().then(() => {
    // 滚动歌词
    lyricsScroll(music.getPlaySongLyricIndex);
  });
});

onBeforeUnmount(() => {
  clearTimeout(timeOut.value);
});

// 监听页面是否打开
watch(
  () => music.showBigPlayer,
  (val) => {
    changePwaColor();
    if (val) {
      console.log("开启播放器", music.getPlaySongLyricIndex);
      nextTick().then(() => {
        music.showPlayList = false;
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

// 监听主题色改变
watch(
  () => site.songPicColor,
  () => changePwaColor()
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
    background-color: #00000030;
    -webkit-backdrop-filter: blur(80px);
    backdrop-filter: blur(80px);
    z-index: -1;
    &.blur {
      background-color: #00000060;
    }
  }
  .icon-menu {
    padding: 20px;
    width: 100%;
    height: 80px;
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 2;
    box-sizing: border-box;
    .menu-left,
    .menu-right {
      display: flex;
      align-items: center;
      .icon {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 40px;
        opacity: 0.3;
        border-radius: 8px;
        transition: all 0.3s;
        cursor: pointer;
        &:hover {
          background-color: #ffffff20;
          transform: scale(1.05);
          opacity: 1;
        }
        &:active {
          transform: scale(1);
        }
        .screenfull,
        .setting {
          @media (max-width: 768px) {
            display: none;
          }
        }
      }
    }
    .menu-right {
      .icon {
        margin-left: 12px;
      }
    }
  }
  .all {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    transition: all 0.3s ease-in-out;
    position: relative;
    &.noLrc {
      .left {
        padding-right: 0;
        transform: translateX(25vh);
        @media (max-width: 1200px) {
          transform: translateX(22.2vh);
        }
        @media (min-width: 769px) and (max-width: 869px) {
          transform: translateX(20.1vh);
        }
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
        padding: 0 2vw;
        .lrcShow {
          .lrc-all {
            height: 70vh !important;
            // padding-right: 16% !important;
            margin-right: 0 !important;
          }
          .data,
          .menu {
            display: block !important;
            opacity: 1 !important;
          }
        }
      }
    }
    .tip {
      position: absolute;
      top: 24px;
      left: calc(50% - 150px);
      width: 300px;
      height: 40px;
      border-radius: 25px;
      background-color: #ffffff20;
      -webkit-backdrop-filter: blur(20px);
      backdrop-filter: blur(20px);
      display: flex;
      align-items: center;
      justify-content: center;
      span {
        color: #ffffffc7;
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
          padding: 0 3vh;
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
        .menu {
          opacity: 0;
          padding: 0 3vh;
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
