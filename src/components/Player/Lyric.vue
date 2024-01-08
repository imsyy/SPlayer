<!-- 播放器 - 歌词 -->
<template>
  <div
    :style="{
      cursor: cursorShow ? 'pointer' : 'none',
    }"
    :class="['lyric', `lyric-${lyricsPosition}`, { pure: pureLyricMode }, playCoverType]"
    @mouseenter="lrcMouseStatus = lrcMousePause ? true : false"
    @mouseleave="lrcAllLeave"
  >
    <Transition name="fade" mode="out-in">
      <div
        v-if="playSongLyric.lrc?.[0] && playSongLyric.lrc?.length > 4"
        :key="playSongLyric.lrc?.[0]"
        class="lyric-all"
        @after-enter="lyricsScroll(playSongLyricIndex)"
        @after-leave="lyricsScroll(playSongLyricIndex)"
      >
        <n-scrollbar ref="lyricScroll" style="width: 100%">
          <!-- 普通歌词 -->
          <template v-if="!showYrc || !playSongLyric.hasYrc">
            <div class="placeholder">
              <!-- 倒计时 -->
              <CountDown
                v-if="countDownShow"
                :start="0"
                :duration="playSongLyric.lrc[0]?.time || 0"
                :seek="playSeek"
                isFirst
              />
            </div>
            <div
              v-for="(item, index) in playSongLyric.lrc"
              :id="'lrc' + index"
              :key="index"
              :class="{ 'lrc-line': true, on: Number(playSongLyricIndex) === index, islrc: true }"
              :style="{
                filter: lyricsBlur
                  ? `blur(${Math.min(Math.abs(Number(playSongLyricIndex) - index) * 1.5, 10)}px)`
                  : 'blur(0)',
              }"
              @click.stop="jumpSeek(item?.time)"
            >
              <!-- 歌词 -->
              <span
                :style="{
                  fontSize: lyricsFontSize + 'px',
                }"
                class="lrc-content"
              >
                {{ item.content }}
              </span>
              <!-- 翻译 -->
              <span
                v-if="showTransl && playSongLyric.hasLrcTran && item.tran"
                :style="{ fontSize: lyricsFontSize - (lyricsFontSize < 40 ? 10 : 16) + 'px' }"
                class="lrc-fy"
              >
                {{ item.tran }}
              </span>
              <!-- 音译 -->
              <span v-if="showRoma && playSongLyric.hasLrcRoma && item.roma" class="lrc-roma">
                {{ item.roma }}
              </span>
            </div>
          </template>
          <!-- 逐字歌词 -->
          <template v-else-if="playSongLyric.yrc?.[0]">
            <div class="placeholder">
              <!-- 倒计时 -->
              <CountDown
                v-if="countDownShow"
                :start="0"
                :duration="playSongLyric.yrc[0].time || 0"
                :seek="playSeek"
                isFirst
              />
            </div>
            <div
              v-for="(item, index) in playSongLyric.yrc"
              :id="'lrc' + index"
              :key="index"
              :class="{ 'lrc-line': true, on: Number(playSongLyricIndex) === index, isyrc: true }"
              :style="{
                filter: lyricsBlur
                  ? `blur(${Math.min(Math.abs(Number(playSongLyricIndex) - index) * 1.5, 10)}px)`
                  : 'blur(0)',
              }"
              @click.stop="jumpSeek(item?.time)"
            >
              <!-- 歌词 -->
              <div
                :style="{
                  fontSize: lyricsFontSize + 'px',
                }"
                class="lrc-content"
              >
                <div
                  v-for="(text, textIndex) in item.content"
                  :key="textIndex"
                  :class="{
                    'lrc-text': true,
                    'lrc-long': text.duration >= 1.5,
                    'end-with-space': text.endsWithSpace,
                  }"
                >
                  <span class="word">{{ text.content }}</span>
                  <span class="filler" :style="getYrcStyle(text, index)">
                    {{ text.content }}
                  </span>
                </div>
              </div>
              <!-- 翻译 -->
              <span
                v-if="showTransl && playSongLyric.hasLrcTran && item.tran"
                :style="{ fontSize: lyricsFontSize - (lyricsFontSize < 40 ? 10 : 16) + 'px' }"
                class="lrc-fy"
              >
                {{ item.tran }}
              </span>
              <!-- 音译 -->
              <span v-if="showRoma && playSongLyric.hasLrcRoma && item.roma" class="lrc-roma">
                {{ item.roma }}
              </span>
            </div>
          </template>
          <div class="placeholder" />
        </n-scrollbar>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { musicData, siteSettings, siteStatus } from "@/stores";
import { setSeek, fadePlayOrPause } from "@/utils/Player";

// eslint-disable-next-line no-unused-vars
const props = defineProps({
  // 鼠标显示
  cursorShow: {
    type: Boolean,
    default: true,
  },
});

const music = musicData();
const settings = siteSettings();
const status = siteStatus();
const { playSeek, pureLyricMode, playSongLyricIndex } = storeToRefs(status);
const { playSongLyric } = storeToRefs(music);
const {
  showYrc,
  showYrcAnimation,
  countDownShow,
  lyricsFontSize,
  lrcMousePause,
  lyricsBlock,
  lyricsPosition,
  lyricsBlur,
  showTransl,
  showRoma,
  playCoverType,
} = storeToRefs(settings);

// 歌词滚动数据
const lyricScroll = ref(null);
const lrcMouseStatus = ref(false);

// 鼠标移出歌词区域
const lrcAllLeave = () => {
  lrcMouseStatus.value = false;
  lyricsScroll(playSongLyricIndex.value);
};

// 歌词滚动
const lyricsScroll = (index) => {
  const el = document.getElementById("lrc" + index);
  if (el && !lrcMouseStatus.value) {
    const container = el.parentElement;
    // 调整滚动的距离
    const scrollDistance = el.offsetTop - container.offsetTop - 80;
    // 开始滚动
    if (lyricsBlock.value === "center") {
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      lyricScroll.value?.scrollTo({ top: scrollDistance, behavior: "smooth" });
    }
  }
};

// 逐字歌词样式计算
const getYrcStyle = (wordData, lyricIndex) => {
  if (showYrcAnimation.value) {
    // 如果当前歌词索引与播放歌曲的歌词索引不匹配
    if (playSongLyricIndex.value !== lyricIndex) {
      return {
        transitionDuration: `0ms, 0ms, 0.35s`,
        transitionDelay: `0ms`,
      };
    }
    // 如果播放状态不是加载中，且当前单词的时间加上持续时间减去播放进度大于 0
    if (status.playLoading === false && wordData.time + wordData.duration - playSeek.value > 0) {
      return {
        transitionDuration: `0s, 0s, 0.35s`,
        transitionDelay: `0ms`,
        WebkitMaskPositionX: `${
          100 - Math.max(((playSeek.value - wordData.time) / wordData.duration) * 100, 0)
        }%`,
      };
    }
    // 如果以上条件都不满足
    return {
      transitionDuration: `${wordData.duration}ms, ${wordData.duration * 0.8}ms, 0.35s`,
      transitionDelay: `${wordData.time - playSeek.value}ms, ${
        wordData.time - playSeek.value + wordData.duration * 0.5
      }ms, 0ms`,
    };
  } else {
    // 如果当前歌词索引与播放歌曲的歌词索引不匹配，或者播放状态不是加载中且当前单词的时间大于等于播放进度
    if (
      playSongLyricIndex.value !== lyricIndex ||
      (status.playLoading === false && wordData.time >= playSeek.value)
    ) {
      return { opacity: 0 };
    }
    // 如果以上条件都不满足
    return { opacity: 1 };
  }
};

// 进度跳转
const jumpSeek = (time) => {
  if (!time) return false;
  setSeek(time);
  fadePlayOrPause();
};

// 主进程调用歌词滚动
if (typeof electron !== "undefined") {
  electron.ipcRenderer.on("lyricsScroll", () => {
    lyricsScroll(playSongLyricIndex.value);
  });
}

// 监听歌词滚动
watch(
  () => playSongLyricIndex.value,
  (val) => lyricsScroll(val),
);
watch(
  () => pureLyricMode.value,
  () => lyricsScroll(playSongLyricIndex.value),
);

onMounted(() => {
  nextTick().then(() => {
    lyricsScroll(playSongLyricIndex.value);
  });
});
</script>

<style lang="scss" scoped>
.lyric {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  font-size: 14px;
  box-sizing: border-box;
  height: calc(100vh - 200px);
  overflow: hidden;
  filter: drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.2));
  mask: linear-gradient(
    180deg,
    hsla(0, 0%, 100%, 0) 0,
    hsla(0, 0%, 100%, 0.6) 5%,
    #fff 10%,
    #fff 75%,
    hsla(0, 0%, 100%, 0.6) 85%,
    hsla(0, 0%, 100%, 0)
  );
  -webkit-mask: linear-gradient(
    180deg,
    hsla(0, 0%, 100%, 0) 0,
    hsla(0, 0%, 100%, 0.6) 5%,
    #fff 10%,
    #fff 75%,
    hsla(0, 0%, 100%, 0.6) 85%,
    hsla(0, 0%, 100%, 0)
  );
  :deep(.n-scrollbar-rail) {
    display: none;
  }
  :deep(.n-scrollbar-content) {
    padding-left: 10px;
    padding-right: 80px;
  }
  .fade-enter-active {
    transition-delay: 0.3s;
  }
  .lyric-all {
    width: 100%;
    height: 100%;
  }
  .placeholder {
    width: 100%;
    &:first-child {
      height: 260px;
      display: flex;
      align-items: flex-end;
    }
    &:last-child {
      height: 0;
      padding-top: 100%;
    }
  }
  .lrc-line {
    position: relative;
    display: flex;
    flex-direction: column;
    margin: 6px 0;
    padding: 10px 16px;
    transform: scale(0.86);
    transform-origin: left center;
    transition:
      filter 0.35s,
      opacity 0.35s,
      transform 0.35s ease-in-out;
    .lrc-content {
      font-size: 46px;
      font-weight: bold;
      word-wrap: break-word;
      // 逐字歌词部分样式
      .lrc-text {
        position: relative;
        display: inline-block;
        .word {
          opacity: 0.3;
        }
        .filler {
          opacity: 0;
          position: absolute;
          left: 0;
          top: 0;
          transform: none;
          will-change: -webkit-mask-position-x;
          mask-image: linear-gradient(
            to right,
            rgb(0, 0, 0) 45.4545454545%,
            rgba(0, 0, 0, 0) 54.5454545455%
          );
          mask-size: 220% 100%;
          mask-repeat: no-repeat;
          -webkit-mask-image: linear-gradient(
            to right,
            rgb(0, 0, 0) 45.4545454545%,
            rgba(0, 0, 0, 0) 54.5454545455%
          );
          -webkit-mask-size: 220% 100%;
          -webkit-mask-repeat: no-repeat;
          transition: all 0.35s;
        }
        &.end-with-space {
          margin-right: 12px;
          &:last-child {
            margin-right: 0;
          }
        }
      }
    }
    .lrc-fy {
      margin-top: 8px;
      font-size: 30px;
      opacity: 0.6;
      transition: opacity 0.35s;
    }
    .lrc-roma {
      margin-top: 4px;
      font-size: 20px;
      opacity: 0.6;
      transition: opacity 0.35s;
    }
    &.islrc {
      opacity: 0.3;
    }
    &.isyrc {
      .lrc-content {
        display: flex;
        flex-wrap: wrap;
      }
      .lrc-fy,
      .lrc-roma {
        opacity: 0.3;
      }
    }
    &.on {
      opacity: 1;
      transform: scale(1);
      // 逐字歌词
      .lrc-text {
        .filler {
          opacity: 1;
          -webkit-mask-position-x: 0%;
          transition-property: -webkit-mask-position-x, transform, opacity;
          transition-timing-function: linear, ease, ease;
        }
        &.end-with-space {
          margin-right: 12px;
        }
        // &.lrc-long {
        //   .filler {
        //     filter: drop-shadow(0px 0px 10px rgba(255, 255, 255, 0.6));
        //   }
        // }
      }
      .lrc-fy,
      .lrc-roma {
        opacity: 0.6;
      }
    }
    @media (min-width: 768px) {
      &::before {
        content: "";
        display: block;
        position: absolute;
        left: 0px;
        top: 0;
        width: 100%;
        height: 100%;
        border-radius: 8px;
        background-color: var(--cover-second-color);
        opacity: 0;
        z-index: 0;
        transform: scale(1.05);
        transition:
          transform 0.35s ease,
          opacity 0.35s ease;
        pointer-events: none;
      }
      &:hover {
        opacity: 1;
        filter: blur(0) !important;
        &::before {
          transform: scale(1);
          opacity: 1;
        }
      }
      &:active {
        &::before {
          transform: scale(0.95);
        }
      }
    }
  }
  &.lyric-center,
  &.pure {
    span {
      text-align: center !important;
    }
    .placeholder {
      justify-content: center !important;
    }
    .lrc-line {
      transform-origin: center !important;
      align-items: center !important;
      .lrc-content {
        justify-content: center !important;
      }
    }
  }
  &.lyric-right {
    span {
      text-align: right;
    }
    .placeholder {
      justify-content: flex-end;
    }
    .lrc-line {
      transform-origin: right;
      align-items: flex-end;
      .lrc-content {
        justify-content: flex-end;
      }
    }
  }
  &.pure {
    :deep(.n-scrollbar-content) {
      padding: 0 80px;
    }
  }
  &.record,
  &.pure {
    height: calc(100vh - 300px);
    margin-bottom: 40px;
    .lrc-line {
      margin-bottom: -12px;
      transform: scale(0.76);
      &.on {
        transform: scale(0.9);
      }
    }
  }
  @media (max-width: 700px) {
    :deep(.n-scrollbar-content) {
      padding: 0 20px !important;
    }
    .lrc-line {
      .lrc-content {
        font-size: 6.5vw !important;
      }
      .lrc-fy {
        font-size: 4.5vw !important;
      }
      .lrc-roma {
        font-size: 4vw !important;
      }
    }
  }
}
</style>
