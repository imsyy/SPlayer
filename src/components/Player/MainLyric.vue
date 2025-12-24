<template>
  <div
    :key="`lyric-${musicStore.playSong.id}`"
    :style="{
      '--lrc-size': settingStore.lyricFontSize + 'px',
      '--lrc-tran-size': settingStore.lyricTranFontSize + 'px',
      '--lrc-roma-size': settingStore.lyricRomaFontSize + 'px',
      '--lrc-bold': settingStore.lyricFontBold ? 'bold' : 'normal',
      '--ja-font-family':
        settingStore.japaneseLyricFont !== 'follow' ? settingStore.japaneseLyricFont : '',
      '--en-font-family':
        settingStore.englishLyricFont !== 'follow' ? settingStore.englishLyricFont : '',
      '--ko-font-family':
        settingStore.koreanLyricFont !== 'follow' ? settingStore.koreanLyricFont : '',
      'font-family': settingStore.LyricFont !== 'follow' ? settingStore.LyricFont : '',
      cursor: statusStore.playerMetaShow ? 'auto' : 'none',
    }"
    :class="[
      'lyric',
      settingStore.playerType,
      settingStore.lyricsPosition,
      { pure: statusStore.pureLyricMode, 'yrc-anim': settingStore.showYrcAnimation },
    ]"
    @mouseenter="lrcMouseStatus = settingStore.lrcMousePause ? true : false"
    @mouseleave="lrcAllLeave"
  >
    <div
      class="lyric-content"
      @after-enter="lyricsScroll(statusStore.lyricIndex)"
      @after-leave="lyricsScroll(statusStore.lyricIndex)"
    >
      <Transition name="fade" mode="out-in">
        <div v-if="statusStore.lyricLoading" class="lyric-loading">歌词正在加载中...</div>
        <div v-else class="lyric-scroll-container" tabindex="-1">
          <n-scrollbar ref="lyricScroll" class="lyric-scroll">
            <!-- 逐字歌词 -->
            <template v-if="settingStore.showYrc && musicStore.isHasYrc">
              <div id="lrc-placeholder" class="placeholder">
                <!-- 倒计时 -->
                <CountDown
                  :start="0"
                  :duration="musicStore.songLyric.yrcData[0].startTime || 0"
                  :seek="playSeek"
                  :playing="statusStore.playStatus"
                />
              </div>
              <div
                v-for="(item, index) in musicStore.songLyric.yrcData"
                :key="index"
                :id="`lrc-${index}`"
                :class="[
                  'lrc-line',
                  'is-yrc',
                  {
                    // on: statusStore.lyricIndex === index,
                    // 当播放时间大于等于当前歌词的开始时间
                    on: isYrcLineOn(item, index),
                    'is-bg': item.isBG,
                    'is-duet': item.isDuet,
                  },
                ]"
                :style="{
                  filter: settingStore.lyricsBlur
                    ? (playSeek >= item.startTime && playSeek < item.endTime) ||
                      statusStore.lyricIndex === index
                      ? 'blur(0)'
                      : `blur(${Math.min(Math.abs(statusStore.lyricIndex - index) * 1.8, 10)}px)`
                    : 'blur(0)',
                }"
                @click="jumpSeek(item.startTime)"
              >
                <!-- 歌词 -->
                <div class="content">
                  <div
                    v-for="(text, textIndex) in item.words"
                    :key="textIndex"
                    :class="{
                      'content-text': true,
                      'end-with-space': text.word.endsWith(' ') || text.startTime === 0,
                    }"
                    :style="getYrcVars(text, index)"
                  >
                    <span class="yrc-word" :lang="getLyricLanguage(text.word)">
                      {{ text.word }}
                    </span>
                  </div>
                </div>
                <!-- 翻译 -->
                <span v-if="item.translatedLyric && settingStore.showTran" class="tran" lang="en">
                  {{ item.translatedLyric }}
                </span>
                <!-- 音译 -->
                <span v-if="item.romanLyric && settingStore.showRoma" class="roma" lang="en">
                  {{ item.romanLyric }}
                </span>
                <!-- 间奏倒计时 -->
                <div
                  v-if="
                    settingStore.countDownShow &&
                    item.startTime > 0 &&
                    (musicStore.songLyric.yrcData[index + 1]?.startTime || 0) - item.endTime >=
                      10000
                  "
                  class="count-down-content"
                >
                  <CountDown
                    :start="item.endTime"
                    :duration="
                      (musicStore.songLyric.yrcData[index + 1]?.startTime || 0) - item.endTime
                    "
                    :seek="playSeek"
                    :playing="statusStore.playStatus"
                  />
                </div>
              </div>
              <div class="placeholder" />
            </template>
            <!-- 普通歌词 -->
            <template v-else-if="musicStore.isHasLrc">
              <div id="lrc-placeholder" class="placeholder">
                <!-- 倒计时 -->
                <CountDown
                  :start="0"
                  :duration="musicStore.songLyric.lrcData[0].startTime || 0"
                  :seek="playSeek"
                  :playing="statusStore.playStatus"
                />
              </div>
              <div
                v-for="(item, index) in musicStore.songLyric.lrcData"
                :key="index"
                :id="`lrc-${index}`"
                :class="['lrc-line', 'is-lrc', { on: statusStore.lyricIndex === index }]"
                :style="{
                  filter: settingStore.lyricsBlur
                    ? `blur(${Math.min(Math.abs(statusStore.lyricIndex - index) * 1.8, 10)}px)`
                    : 'blur(0)',
                }"
                @click="jumpSeek(item.startTime)"
              >
                <!-- 歌词 -->
                <span class="content" :lang="getLyricLanguage(item.words?.[0]?.word)">
                  {{ item.words?.[0]?.word }}
                </span>
                <!-- 翻译 -->
                <span v-if="item.translatedLyric && settingStore.showTran" class="tran" lang="en">
                  {{ item.translatedLyric }}
                </span>
                <!-- 音译 -->
                <span v-if="item.romanLyric && settingStore.showRoma" class="roma" lang="en">
                  {{ item.romanLyric }}
                </span>
              </div>
              <div class="placeholder" />
            </template>
          </n-scrollbar>
        </div>
      </Transition>
    </div>
    <!-- 歌词菜单组件 -->
    <LyricMenu />
  </div>
</template>

<script setup lang="ts">
import { LyricWord } from "@applemusic-like-lyrics/lyric";
import { NScrollbar } from "naive-ui";
import { useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { usePlayerController } from "@/core/player/PlayerController";
import { getLyricLanguage } from "@/utils/format";
import { isElectron } from "@/utils/env";

const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();
const player = usePlayerController();

const lrcMouseStatus = ref<boolean>(false);
const lyricScroll = ref<InstanceType<typeof NScrollbar> | null>(null);

// 实时播放进度
const playSeek = ref<number>(player.getSeek());

// 实时更新播放进度（按歌曲 id 应用偏移）
const { pause: pauseSeek, resume: resumeSeek } = useRafFn(() => {
  const songId = musicStore.playSong?.id as number | undefined;
  playSeek.value = player.getSeek() + statusStore.getSongOffset(songId);
});

// 鼠标移出歌词区域
const lrcAllLeave = () => {
  lrcMouseStatus.value = false;
  lyricsScroll(statusStore.lyricIndex);
};

// 歌词滚动
const lyricsScroll = (index: number) => {
  const lrcItemDom = document.getElementById(index >= 0 ? "lrc-" + index : "lrc-placeholder");
  if (lrcItemDom && (!lrcMouseStatus.value || statusStore.pureLyricMode)) {
    const container = lrcItemDom.parentElement;
    if (!container) return;
    // 调整滚动的距离
    const scrollDistance = lrcItemDom.offsetTop - container.offsetTop - 100;
    // 开始滚动
    if (settingStore.lyricsScrollPosition === "center") {
      lrcItemDom?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      lyricScroll.value?.scrollTo({ top: scrollDistance, behavior: "smooth" });
    }
  }
};

/**
 * CSS 变量类型（避免随意使用 any）
 */
type CssVars = Record<`--${string}`, string>;

const YRC_DIM_ALPHA = 0.3;
const YRC_LINE_FADE_MS = 250;

/** 逐字歌词行数据类型 */
type YrcLineLike = { startTime: number; endTime: number };

/** 逐字歌词行淡出索引 */
const yrcFadingLineIndex = ref<number | null>(null);
/** 逐字歌词行淡出时间 */
const yrcFadingUntilAt = ref<number>(0);

/**
 * 获取逐字歌词行淡出因子
 * @param index 歌词行索引
 * @returns 淡出因子
 */
const getYrcFadeFactor = (index: number): number => {
  if (yrcFadingLineIndex.value !== index) return 1;
  const now = Date.now();
  if (now >= yrcFadingUntilAt.value) return 1;
  const remain = yrcFadingUntilAt.value - now;
  return Math.min(Math.max(remain / YRC_LINE_FADE_MS, 0), 1);
};

/**
 * 逐字歌词样式计算
 * @param wordData 逐字歌词数据
 * @param lyricIndex 歌词行索引
 * @returns 逐字歌词动画样式
 */
const getYrcVars = (wordData: LyricWord, lyricIndex: number): CssVars => {
  // 缓存 playSeek 值，避免多次访问响应式变量
  const currentSeek = playSeek.value;
  const fadeFactor = getYrcFadeFactor(lyricIndex);

  // 只对激活行计算逐字变量：非激活行走纯 CSS（避免无谓计算）
  const currentLine = musicStore.songLyric.yrcData[lyricIndex];
  if (!isYrcLineOn(currentLine, lyricIndex)) return {};

  // 无动画模式：未唱到的词保持暗色，唱到后整词高亮
  if (!settingStore.showYrcAnimation) {
    const wordOpacity =
      statusStore.playLoading === false && wordData.startTime > currentSeek ? YRC_DIM_ALPHA : 1;
    return { "--yrc-opacity": `${wordOpacity}` };
  }

  const duration = wordData.endTime - wordData.startTime;
  const safeDuration = Math.max(duration, 1);
  const rawProgress = (currentSeek - wordData.startTime) / safeDuration;
  const progress = Math.min(Math.max(rawProgress, 0), 1);
  const maskX = `${(1 - progress) * 100}%`;

  // 未唱到的词：保持统一暗色，避免出现半亮半暗的“虚影边”
  const hasStarted = currentSeek >= wordData.startTime;
  // 注意：激活行会启用 mask，mask alpha 会与元素 opacity 相乘；
  // 为避免未开始词在激活行变得“更淡”（0.3 * 0.3 = 0.09），动画模式下元素 opacity 固定为 1，
  // 明暗仅由 mask alpha 控制。
  const brightAlpha = hasStarted ? YRC_DIM_ALPHA + (1 - YRC_DIM_ALPHA) * fadeFactor : YRC_DIM_ALPHA;
  const darkAlpha = YRC_DIM_ALPHA;

  return {
    "--yrc-mask-x": maskX,
    "--yrc-opacity": "1",
    "--yrc-bright-alpha": `${brightAlpha}`,
    "--yrc-dark-alpha": `${darkAlpha}`,
  };
};

/**
 * 判断逐字歌词行是否激活
 * @param line 逐字歌词行数据
 * @param index 歌词行索引
 * @returns 是否激活
 */
const isYrcLineOn = (line: YrcLineLike, index: number): boolean => {
  const currentSeek = playSeek.value;
  const isInRange = currentSeek >= line.startTime && currentSeek < line.endTime;
  const isCurrent = statusStore.lyricIndex === index;
  const isFading = yrcFadingLineIndex.value === index && Date.now() < yrcFadingUntilAt.value;
  return isInRange || isCurrent || isFading;
};

/**
 * 进度跳转
 * @param time 时间
 */
const jumpSeek = (time: number) => {
  if (!time) return;
  lrcMouseStatus.value = false;
  const offsetMs = statusStore.getSongOffset(musicStore.playSong?.id);
  player.setSeek(time - offsetMs);
  player.play();
};

// 监听歌词滚动
watch(
  () => statusStore.lyricIndex,
  (val, oldVal) => {
    lyricsScroll(val);
    // 行切换时，让上一行做一次短暂淡出（高亮不会瞬间消失）
    if (typeof oldVal === "number" && oldVal >= 0 && oldVal !== val) {
      yrcFadingLineIndex.value = oldVal;
      yrcFadingUntilAt.value = Date.now() + YRC_LINE_FADE_MS;
    }
  },
);

onMounted(() => {
  // 恢复进度
  resumeSeek();
  nextTick().then(() => {
    lyricsScroll(statusStore.lyricIndex);
  });
  if (isElectron) {
    window.electron.ipcRenderer.on("lyricsScroll", () => lyricsScroll(statusStore.lyricIndex));
  }
});

onBeforeUnmount(() => {
  console.log("离开歌词");
  pauseSeek();
  if (isElectron) {
    window.electron.ipcRenderer.removeAllListeners("lyricsScroll");
  }
});
</script>

<style lang="scss" scoped>
.lyric {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  height: 100%;
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
  :deep(.n-scrollbar-rail) {
    display: none;
  }
  :deep(.n-scrollbar-content) {
    padding-left: 10px;
    padding-right: 80px;
    max-width: 100%; /* 新增：防止宽度溢出 */
    box-sizing: border-box; /* 新增：确保 padding 不影响宽度 */
  }
  .placeholder {
    width: 100%;
    &:first-child {
      height: 300px;
      display: flex;
      align-items: flex-end;
    }
    &:last-child {
      height: 0;
      padding-top: 100%;
    }
  }
  .lyric-content {
    width: 100%;
    height: 100%;
    .lyric-scroll-container {
      width: 100%;
      height: 100%;
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
    will-change: filter, opacity, transform;
    transition:
      filter 0.35s,
      opacity 0.35s,
      transform 0.5s cubic-bezier(0.25, 0.1, 0.25, 1);
    cursor: pointer;
    width: 100%;
    .content {
      display: block;
      font-size: var(--lrc-size);
      font-weight: var(--lrc-bold);
      width: 100%;
      overflow-wrap: anywhere; /* 支持超长单词换行 */
      word-break: break-word; /* 优先空格或连字符换行，超长单词强制换行 */
      white-space: normal; /* 新增：明确文本换行行为 */
      hyphens: auto; /* 英文自动连字符 */
      .content-text {
        position: relative;
        display: inline-block;
        overflow: visible; /* 允许字形下伸部（j/g/y 等）正常绘制 */
        overflow-wrap: anywhere; /* 新增：逐字歌词单词支持换行 */
        word-break: break-word; /* 新增：单词内换行 */
        white-space: normal; /* 新增：确保逐字歌词换行 */
        .yrc-word {
          display: inline-block;
          box-sizing: border-box;
          /* 给字形上下留一点空间，避免下伸部在某些渲染条件下被裁 */
          padding-block: 0.2em;
          margin-block: -0.2em;
          /* 非激活行/未唱到 */
          opacity: var(--yrc-opacity, 0.3);
        }
        .yrc-word:lang(ja) {
          font-family: var(--ja-font-family);
        }
        .yrc-word:lang(en) {
          font-family: var(--en-font-family);
        }
        .yrc-word:lang(ko) {
          font-family: var(--ko-font-family);
        }
        &.end-with-space {
          margin-right: 12px;
          &:last-child {
            margin-right: 0;
          }
        }
      }
      &:lang(ja) {
        font-family: var(--ja-font-family);
      }
      &:lang(en) {
        font-family: var(--en-font-family);
      }
      &:lang(ko) {
        font-family: var(--ko-font-family);
      }
    }
    .tran {
      margin-top: 8px;
      opacity: 0.6;
      font-size: var(--lrc-tran-size);
      transition: opacity 0.35s;
      width: 100%;
      overflow-wrap: anywhere; /* 支持超长单词换行 */
      word-break: break-word; /* 优先空格或连字符换行，超长单词强制换行 */
      white-space: normal; /* 新增：明确文本换行行为 */
      hyphens: auto; /* 英文自动连字符 */
    }
    .roma {
      margin-top: 4px;
      opacity: 0.5;
      font-size: var(--lrc-roma-size);
      transition: opacity 0.35s;
      width: 100%;
      overflow-wrap: anywhere; /* 支持超长单词换行 */
      word-break: break-word; /* 优先空格或连字符换行，超长单词强制换行 */
      white-space: normal; /* 新增：明确文本换行行为 */
      hyphens: auto; /* 英文自动连字符 */
    }
    .count-down-content {
      height: 50px;
      margin-top: 40px;
    }
    .count-down {
      transform-origin: left;
      justify-content: flex-end;
    }
    &.is-lrc {
      opacity: 0.3;
    }
    &.is-yrc {
      .content {
        display: flex;
        flex-wrap: wrap;
        width: 100%;
        overflow-wrap: anywhere; /* 逐字歌词支持超长单词换行 */
        word-break: break-word; /* 优先空格或连字符换行 */
        white-space: normal; /* 确保换行行为 */
      }
      .tran,
      .roma {
        opacity: 0.3;
      }
      &.is-bg {
        opacity: 0.4;
        transform: scale(0.7);
        padding: 0px 20px;
      }
      &.is-duet {
        transform-origin: right;
        .content,
        .tran,
        .roma {
          text-align: right;
          justify-content: flex-end;
        }
      }
    }
    &.on {
      opacity: 1 !important;
      transform: scale(1);
      .tran,
      .roma {
        opacity: 0.6;
      }
      &.is-bg {
        opacity: 0.85 !important;
      }
    }
    &::before {
      content: "";
      display: block;
      position: absolute;
      left: 0px;
      top: 0;
      width: 100%;
      height: 100%;
      border-radius: 8px;
      background-color: rgba(var(--main-cover-color), 0.14);
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
  &.flex-end {
    span {
      text-align: right;
    }
    .placeholder {
      justify-content: flex-end;
    }
    .lrc-line {
      transform-origin: right;
      .content {
        text-align: right;
      }
      .count-down {
        transform-origin: right;
        justify-content: flex-end;
      }
    }
  }
  &.center,
  &.pure {
    span {
      text-align: center !important;
    }
    .placeholder {
      justify-content: center !important;
    }
    .lrc-line {
      transform-origin: center !important;
      .content {
        text-align: center !important;
        justify-content: center !important;
      }
      .count-down {
        transform-origin: center;
        justify-content: center;
      }
    }
  }
  &.pure {
    :deep(.n-scrollbar-content) {
      padding: 0 80px;
      max-width: 100%; /* 新增：防止宽度溢出 */
      box-sizing: border-box; /* 新增：确保 padding 不影响宽度 */
    }
    .lyric-content {
      .placeholder {
        &:first-child {
          height: 100px;
        }
      }
      .lrc-line {
        margin-bottom: -12px;
        transform: scale(0.76);
        &.on {
          transform: scale(0.9);
        }
      }
    }
  }
  &:hover {
    .lrc-line {
      filter: blur(0) !important;
    }
  }

  /* 逐字歌词：动画模式仅对激活行启用 mask */
  &.yrc-anim {
    .lrc-line.is-yrc.on {
      .content-text {
        .yrc-word {
          /* 亮/暗由 mask alpha 控制；opacity 用于行尾渐隐到暗态 */
          will-change: -webkit-mask-position-x;
          mask-image: linear-gradient(
            to right,
            rgba(0, 0, 0, var(--yrc-bright-alpha, 1)) 45.4545454545%,
            rgba(0, 0, 0, var(--yrc-dark-alpha, 0.3)) 54.5454545455%
          );
          mask-size: 220% 100%;
          mask-repeat: no-repeat;
          -webkit-mask-image: linear-gradient(
            to right,
            rgba(0, 0, 0, var(--yrc-bright-alpha, 1)) 45.4545454545%,
            rgba(0, 0, 0, var(--yrc-dark-alpha, 0.3)) 54.5454545455%
          );
          -webkit-mask-size: 220% 100%;
          -webkit-mask-repeat: no-repeat;
          -webkit-mask-position-x: var(--yrc-mask-x, 0%);
          transition: none;
        }
      }
    }
  }
}
</style>

<style scoped>
.lyric-loading {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
</style>
