<!-- 播放器 - 全屏 -->
<template>
  <Transition name="up" mode="out-in">
    <div
      v-if="showFullPlayer"
      :style="{
        '--cover-main-color': `rgb(${coverTheme?.dark?.shadeTwo})` || '#efefef',
        '--cover-second-color': `rgba(${coverTheme?.dark?.shadeTwo}, 0.14)` || '#efefef14',
        '--cover-bg': coverBackground,
        cursor: playerControlShow ? 'auto' : 'none',
      }"
      class="full-player"
      @mousemove="controlShowChange"
      @mouseleave="playerControlShow = false"
    >
      <!-- 遮罩 -->
      <Transition name="fade" mode="out-in">
        <div
          :key="
            playerBackgroundType === 'gradient'
              ? coverBackground
              : music.getPlaySongData?.coverSize?.s || music.getPlaySongData?.localCover
          "
          :class="['overlay', playerBackgroundType]"
        >
          <!-- 模糊背景 -->
          <template v-if="playerBackgroundType === 'blur'">
            <img
              class="overlay-img"
              :src="music.getPlaySongData?.coverSize?.s || music.getPlaySongData?.localCover"
              alt="overlay"
            />
          </template>
          <!-- 流动背景 -->
          <template v-else-if="playerBackgroundType === 'animation'">
            <img
              v-for="item in 4"
              :key="item"
              :src="music.getPlaySongData?.coverSize?.s || music.getPlaySongData?.localCover"
              :style="{
                transform: `rotate(${item * 180}deg)`,
              }"
              class="overlay-img"
              alt="overlay"
            />
          </template>
        </div>
      </Transition>
      <!-- 按钮 -->
      <Transition name="fade" mode="out-in">
        <div v-show="playerControlShow" class="menu">
          <div class="left"></div>
          <div class="right">
            <!-- 全屏切换 -->
            <n-icon @click.stop="screenfullChange">
              <SvgIcon
                :icon="screenfullStatus ? 'fullscreen-exit-rounded' : 'fullscreen-rounded'"
              />
            </n-icon>
            <!-- 关闭 -->
            <n-icon v-if="!screenfullStatus" @click.stop="showFullPlayer = false">
              <SvgIcon icon="keyboard-arrow-down-rounded" />
            </n-icon>
          </div>
        </div>
      </Transition>
      <!-- 主内容 -->
      <div
        :class="{
          content: true,
          'no-lrc': !playSongLyric.lrc?.[0] && playSongLyric.lrc?.length <= 4,
        }"
      >
        <!-- 封面 -->
        <Transition name="fade" mode="out-in">
          <div :key="music.getPlaySongData.id" class="cover">
            <n-image
              :src="
                music.getPlaySongData?.coverSize?.l ||
                music.getPlaySongData?.cover ||
                music.getPlaySongData?.localCover
              "
              class="cover-img"
              preview-disabled
              @load="
                (e) => {
                  e.target.style.opacity = 1;
                }
              "
            >
              <template #placeholder>
                <div class="cover-loading">
                  <img class="loading-img" src="/images/pic/song.jpg?assest" alt="loading-img" />
                </div>
              </template>
            </n-image>
            <!-- 封面背板 -->
            <n-image
              class="cover-shadow"
              preview-disabled
              :src="
                music.getPlaySongData?.coverSize?.l ||
                music.getPlaySongData?.cover ||
                music.getPlaySongData?.localCover
              "
            />
          </div>
        </Transition>
        <!-- 信息 -->
        <div class="data">
          <div class="desc">
            <div class="title">
              <n-text>{{ music.getPlaySongData.name || "未知曲目" }}</n-text>
              <n-popover :show-arrow="false" placement="right-start" trigger="hover" raw>
                <template #trigger>
                  <n-tag v-show="playUseOtherSource" round> 其他音源 </n-tag>
                </template>
                <div class="title-tip">
                  <n-text>该歌曲暂时无法播放，为您采用其他音源，可能会与原曲存在差别</n-text>
                </div>
              </n-popover>
            </div>
            <span v-if="music.getPlaySongData.alia" class="alia">{{
              music.getPlaySongData.alia
            }}</span>
            <div class="artist">
              <n-icon depth="3" size="20">
                <SvgIcon icon="account-music" />
              </n-icon>
              <div v-if="Array.isArray(music.getPlaySongData.artists)" class="all-ar">
                <span v-for="ar in music.getPlaySongData.artists" :key="ar.id" class="ar">
                  {{ ar.name }}
                </span>
              </div>
              <div v-else class="all-ar">
                <span class="ar"> {{ music.getPlaySongData.artists || "未知艺术家" }} </span>
              </div>
            </div>
            <div
              class="album"
              @click.stop="
                () => {
                  if (typeof music.getPlaySongData.album !== 'string') {
                    showFullPlayer = false;
                    router.push(`/album?id=${music.getPlaySongData?.album.id}`);
                  }
                }
              "
            >
              <n-icon depth="3" size="20">
                <SvgIcon icon="album" />
              </n-icon>
              <span v-if="music.getPlaySongData.album" class="al">
                {{
                  typeof music.getPlaySongData.album === "string"
                    ? music.getPlaySongData.album
                    : music.getPlaySongData.album.name
                }}
              </span>
              <span v-else class="album">未知专辑</span>
            </div>
          </div>
        </div>
      </div>
      <!-- 歌词 -->
      <Lyric :cursorShow="playerControlShow" />
      <!-- 控制中心 -->
      <PlayerControl v-show="playerControlShow" />
    </div>
  </Transition>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { musicData, siteStatus, siteSettings, siteData } from "@/stores";
import screenfull from "screenfull";
import throttle from "@/utils/throttle";

const router = useRouter();
const data = siteData();
const music = musicData();
const status = siteStatus();
const settings = siteSettings();
const { playList, playSongLyric } = storeToRefs(music);
const { playerBackgroundType, showYrc } = storeToRefs(settings);
const { coverTheme, coverBackground } = storeToRefs(data);
const { playerControlShow, controlTimeOut, showFullPlayer, playUseOtherSource } =
  storeToRefs(status);

// 全屏状态
const screenfullStatus = ref(false);

// 全屏切换
const screenfullChange = () => {
  if (screenfull.isEnabled) {
    screenfull.toggle();
    screenfullStatus.value = screenfull.isFullscreen ? false : true;
  }
};

// 控制中心显隐
const controlShowChange = throttle(() => {
  playerControlShow.value = true;
  if (controlTimeOut.value) {
    clearTimeout(controlTimeOut.value);
  }
  controlTimeOut.value = setTimeout(() => {
    playerControlShow.value = false;
  }, 2000);
}, 300);

// 监听播放器开启
watch(
  () => showFullPlayer.value,
  (val) => {
    // 性能提示
    if (val && showYrc.value && playList.value?.length >= 400) {
      // $message.warning("当前播放歌曲数量过多，逐字歌词动画已降低帧数");
    }
  },
);

onUnmounted(() => {
  clearTimeout(controlTimeOut.value);
});
</script>

<style lang="scss" scoped>
.full-player {
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  color: var(--cover-main-color);
  background-color: #00000060;
  backdrop-filter: blur(80px);
  overflow: hidden;
  z-index: 100;
  // 遮罩
  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    z-index: -1;
    &::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #00000060;
      backdrop-filter: blur(20px);
    }
    &.blur {
      display: flex;
      align-items: center;
      justify-content: center;
      .overlay-img {
        width: 150%;
        height: 150%;
        filter: blur(80px) contrast(1.2);
      }
    }
    &.animation {
      transform: scale(1.3);
      .overlay-img {
        position: absolute;
        width: 50%;
        height: 50%;
        filter: blur(80px) contrast(1.75);
        &:nth-of-type(1) {
          top: 0;
          left: 0;
          animation: coverRotate 62s infinite linear;
        }
        &:nth-of-type(2) {
          left: 0;
          bottom: 0;
          animation: coverRotate 55s infinite linear reverse;
        }
        &:nth-of-type(3) {
          bottom: 50%;
          right: 0;
          animation: coverRotate 58s infinite linear reverse;
        }
        &:nth-of-type(4) {
          bottom: 0;
          right: 0;
          animation: coverRotate 65s infinite linear;
        }
      }
    }
    &.gradient {
      background: var(--cover-bg);
    }
  }
  // 按钮
  .menu {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 80px;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 2;
    box-sizing: border-box;
    .left,
    .right {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-end;
      flex: 1;
    }
    .n-icon {
      margin-left: 12px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      opacity: 0.3;
      border-radius: 8px;
      transition:
        opacity 0.3s,
        transform 0.3s,
        background-color 0.3s;
      cursor: pointer;
      &:hover {
        background-color: #ffffff20;
        transform: scale(1.05);
        opacity: 1;
      }
      &:active {
        transform: scale(1);
      }
    }
  }
  // 内容
  .content {
    width: 50%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    transition: transform 0.3s;
    &.no-lrc {
      transform: translateX(50%);
    }
    .cover {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 70%;
      max-width: 55vh;
      height: auto;
      aspect-ratio: 1 / 1;
      .cover-img {
        width: 100%;
        height: 100%;
        border-radius: 32px;
        overflow: hidden;
        z-index: 1;
        box-shadow: 0 0 10px 6px #00000008;
        transition: opacity 0.1s ease-in-out;
        :deep(img) {
          width: 100%;
          height: 100%;
          opacity: 0;
          transition: opacity 0.3s ease-in-out;
        }
      }
      .cover-shadow {
        position: absolute;
        top: 12px;
        height: 100%;
        width: 100%;
        filter: blur(20px) opacity(0.6);
        transform: scale(0.95);
        z-index: 0;
        :deep(img) {
          width: 100%;
          height: 100%;
        }
      }
    }
    .data {
      width: 70%;
      max-width: 55vh;
      margin-top: 24px;
      padding: 0 2px;
      box-sizing: border-box;
      .desc {
        display: flex;
        flex-direction: column;
        .title {
          display: flex;
          align-items: center;
          margin-left: 4px;
          .n-text {
            font-size: 26px;
            font-weight: bold;
            color: var(--cover-main-color);
            -webkit-line-clamp: 2;
          }
          .n-tag {
            margin-left: 6px;
            cursor: pointer;
          }
        }
        .alia {
          margin: 6px 0 6px 2px;
          opacity: 0.6;
          font-size: 18px;
        }
        .artist {
          margin-top: 2px;
          display: flex;
          align-items: center;
          .n-icon {
            margin-right: 4px;
            color: var(--cover-main-color);
          }
          .all-ar {
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            overflow: hidden;
            word-break: break-all;
            .ar {
              font-size: 16px;
              opacity: 0.7;
              display: inline-flex;
              transition: opacity 0.3s;
              cursor: pointer;
              &::after {
                content: "/";
                margin: 0 4px;
                transition: none;
              }
              &:last-child {
                &::after {
                  display: none;
                }
              }
              &:hover {
                opacity: 1;
              }
            }
          }
        }
        .album {
          margin-top: 2px;
          font-size: 16px;
          display: flex;
          align-items: center;
          .n-icon {
            margin-right: 4px;
            color: var(--cover-main-color);
          }
          .al {
            opacity: 0.7;
            transition: opacity 0.3s;
            // -webkit-line-clamp: 2;
            cursor: pointer;
            &:hover {
              opacity: 1;
            }
          }
        }
      }
    }
  }
  // 全局
  span {
    display: -webkit-box;
    overflow: hidden;
    word-break: break-all;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }
}
// 局外样式
.title-tip {
  width: 200px;
  padding: 12px 20px;
  background-color: var(--main-second-color);
  border-radius: 12px;
  .n-text {
    display: initial;
  }
}
</style>
