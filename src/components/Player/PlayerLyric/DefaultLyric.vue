<template>
  <div
    :key="`lyric-${musicStore.playSong.id}`"
    :style="{
      '--lrc-size': getFontSize(settingStore.lyricFontSize, settingStore.lyricFontSizeMode),
      '--lrc-tran-size': getFontSize(
        settingStore.lyricTranFontSize,
        settingStore.lyricFontSizeMode,
      ),
      '--lrc-roma-size': getFontSize(
        settingStore.lyricRomaFontSize,
        settingStore.lyricFontSizeMode,
      ),
      '--lrc-bold': settingStore.lyricFontWeight,
      '--lrc-left-padding': `${settingStore.lyricHorizontalOffset}px`,
      'font-family': settingStore.LyricFont !== 'follow' ? settingStore.LyricFont : '',
      cursor: statusStore.playerMetaShow ? 'auto' : 'none',
      ...lyricLangFontStyle(settingStore),
    }"
    :class="[
      'lyric',
      settingStore.playerType,
      settingStore.lyricsPosition,
      settingStore.lyricsPosition,
      {
        pure: statusStore.pureLyricMode,
        'align-right': settingStore.lyricAlignRight,
        'meta-show': statusStore.playerMetaShow,
      },
    ]"
    @mouseleave="lrcAllLeave"
  >
    <div class="lyric-content">
      <Transition name="fade" mode="out-in">
        <div v-if="statusStore.lyricLoading" class="lyric-loading">歌词正在加载中...</div>
        <div
          v-else
          ref="lyricScrollContainer"
          class="lyric-scroll-container"
          tabindex="-1"
          @wheel="handleUserScroll"
        >
          <!-- 顶部占位 -->
          <div id="lrc-placeholder" class="placeholder" />
          <!-- 预处理后的歌词列表 -->
          <template v-for="(item, index) in processedLyrics" :key="`item-${index}`">
            <!-- 倒计时行 -->
            <div
              v-if="item.type === 'countdown'"
              class="countdown-line"
              :style="{
                animationPlayState: statusStore.playStatus ? 'running' : 'paused',
              }"
            >
              <Transition name="fade" mode="out-in">
                <div v-if="isCountdownVisible(item)" class="count-down">
                  <div
                    v-for="i in 3"
                    :key="i"
                    :style="{ opacity: getPointOpacity(item, i - 1) }"
                    class="point"
                  />
                </div>
              </Transition>
            </div>
            <!-- 歌词行 -->
            <div
              v-else
              :id="`lrc-${index}`"
              :class="getLyricLineClass(item, index)"
              :style="getLyricLineStyle(item, index)"
              @click="jumpSeek(item.data.startTime)"
            >
              <!-- 逐字歌词 -->
              <template v-if="isYrcMode">
                <div class="content">
                  <div
                    v-for="(text, textIndex) in item.data.words"
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
              </template>
              <!-- 普通歌词 -->
              <template v-else>
                <span class="content" :lang="getLyricLanguage(item.data.words?.[0]?.word)">
                  {{ item.data.words?.[0]?.word }}
                </span>
              </template>
              <!-- 翻译和音译 -->
              <template v-if="settingStore.swapTranRoma">
                <!-- 音译在前 -->
                <span v-if="item.data.romanLyric && settingStore.showRoma" class="roma" lang="en">
                  {{ item.data.romanLyric }}
                </span>
                <span
                  v-if="item.data.translatedLyric && settingStore.showTran"
                  class="tran"
                  lang="en"
                >
                  {{ item.data.translatedLyric }}
                </span>
              </template>
              <template v-else>
                <!-- 翻译在前（默认） -->
                <span
                  v-if="item.data.translatedLyric && settingStore.showTran"
                  class="tran"
                  lang="en"
                >
                  {{ item.data.translatedLyric }}
                </span>
                <span v-if="item.data.romanLyric && settingStore.showRoma" class="roma" lang="en">
                  {{ item.data.romanLyric }}
                </span>
              </template>
            </div>
          </template>
          <!-- 底部占位 -->
          <div class="placeholder" />
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type LyricWord, type LyricLine } from "@applemusic-like-lyrics/lyric";
import { useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { usePlayerController } from "@/core/player/PlayerController";
import { getLyricLanguage } from "@/utils/format";
import { isElectron } from "@/utils/env";
import { lyricLangFontStyle } from "@/utils/lyric/lyricFontConfig";
import { getFontSize } from "@/utils/style";

const props = defineProps({
  currentTime: {
    type: Number,
    default: 0,
  },
});

const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();
const player = usePlayerController();

const lyricScrollContainer = ref<HTMLElement | null>(null);

// 是否为逐字歌词模式
const isYrcMode = computed(() => settingStore.showYrc && musicStore.isHasYrc);

// 获取当前使用的歌词数据
const currentLyricData = computed(() => {
  return isYrcMode.value ? musicStore.songLyric.yrcData : musicStore.songLyric.lrcData;
});

/** 处理后的歌词项类型 */
type ProcessedLyricItem =
  | { type: "lyric"; originalIndex: number; data: LyricLine }
  | { type: "countdown"; startTime: number; duration: number };

/** 间奏倒计时最小时长（毫秒） */
const COUNTDOWN_THRESHOLD = 10000;
/** 开头倒计时最小时长（毫秒） */
const INTRO_THRESHOLD = 3000;

/** 预处理歌词数据 */
const processedLyrics = computed<ProcessedLyricItem[]>(() => {
  const lyrics = currentLyricData.value;
  if (!lyrics || lyrics.length === 0) return [];
  const result: ProcessedLyricItem[] = [];
  // 检查开头是否需要倒计时
  const firstLyricStart = lyrics[0]?.startTime || 0;
  if (settingStore.countDownShow && firstLyricStart >= INTRO_THRESHOLD) {
    result.push({
      type: "countdown",
      startTime: 0,
      duration: firstLyricStart,
    });
  }
  // 遍历歌词
  for (let i = 0; i < lyrics.length; i++) {
    const item = lyrics[i];
    result.push({
      type: "lyric",
      originalIndex: i,
      data: item,
    });
    // 检查是否需要插入倒计时
    if (settingStore.countDownShow && i < lyrics.length - 1) {
      const currentEnd = item.endTime;
      const nextStart = lyrics[i + 1]?.startTime || 0;
      const gap = nextStart - currentEnd;
      if (gap >= COUNTDOWN_THRESHOLD) {
        result.push({
          type: "countdown",
          startTime: currentEnd,
          duration: gap,
        });
      }
    }
  }
  return result;
});

/** 倒计时是否可见 */
const isCountdownVisible = (item: ProcessedLyricItem): boolean => {
  if (item.type !== "countdown") return false;
  // 计算实时时间 - 0.5s 是否小于开始 + 持续时间
  return props.currentTime + 500 < item.startTime + item.duration;
};

/** 计算当前活跃的歌词行索引列表 */
const activeLineIndices = computed<number[]>(() => {
  const lyrics = processedLyrics.value;
  if (!lyrics || lyrics.length === 0) return [];
  const currentSeek = props.currentTime;
  const activeCandidates: number[] = [];

  for (let i = 0; i < lyrics.length; i++) {
    const item = lyrics[i];
    let start = 0;
    let end = Infinity;
    if (item.type === "lyric") {
      start = item.data.startTime || 0;
      end = item.data.endTime ?? Infinity;
    } else {
      start = item.startTime;
      end = item.startTime + item.duration;
    }

    if (currentSeek >= start && currentSeek < end) {
      activeCandidates.push(i);
    }
  }
  // 如果没有活跃行，找最近的上一行
  if (activeCandidates.length === 0 && currentSeek > 0) {
    // 找到第一个开始时间大于当前时间的行
    const nextIndex = lyrics.findIndex((item) => {
      const start = item.type === "lyric" ? item.data.startTime : item.startTime;
      return (start || 0) > currentSeek;
    });
    if (nextIndex === -1) return [lyrics.length - 1]; // 都在后面，取最后一行
    if (nextIndex > 0) return [nextIndex - 1]; // 取前一行
  }
  return activeCandidates;
});

/** 首个高亮行索引 */
const firstActiveIndex = computed(() => {
  return activeLineIndices.value[0] ?? -1;
});

/** 判断某行是否高亮 */
const isLineActive = (index: number): boolean => {
  return activeLineIndices.value.includes(index);
};

/**
 * 计算倒计时圆点透明度
 * @param item 倒计时项
 * @param index 圆点索引
 */
const getPointOpacity = (item: ProcessedLyricItem, index: number): number => {
  if (item.type !== "countdown") return 0;
  const perPointTime = item.duration / 3;
  const currentTime = props.currentTime - item.startTime;
  if (currentTime <= 0) return 0;
  if (currentTime < perPointTime * (index + 1)) {
    const percentage = (currentTime - perPointTime * index) / perPointTime;
    return 0.1 + 0.7 * (1 - percentage);
  }
  return 0.1;
};

/** 当前滚动动画 ID */
let scrollAnimationId: number | null = null;
/** 用户是否正在滚动 */
const userScrolling = ref(false);
/** 用户滚动恢复超时 ID */
let userScrollTimeoutId: ReturnType<typeof setTimeout> | null = null;
/** 用户滚动恢复超时时间（毫秒） */
const USER_SCROLL_TIMEOUT = 3000;

/**
 * 自主滚动
 */
const handleUserScroll = () => {
  userScrolling.value = true;
  if (userScrollTimeoutId !== null) {
    clearTimeout(userScrollTimeoutId);
  }
  // 超时后恢复
  userScrollTimeoutId = setTimeout(() => {
    userScrolling.value = false;
    userScrollTimeoutId = null;
    lyricsScroll(firstActiveIndex.value);
  }, USER_SCROLL_TIMEOUT);
};

/**
 * 平滑滚动
 * @param container 滚动容器
 * @param targetY 目标位置
 * @param duration 滚动时间
 */
const smoothScrollTo = (container: HTMLElement, targetY: number, duration = 300) => {
  // 取消之前的动画
  if (scrollAnimationId !== null) {
    cancelAnimationFrame(scrollAnimationId);
    scrollAnimationId = null;
  }
  // 计算起始位置和目标位置
  const startY = container.scrollTop;
  const diff = targetY - startY;
  // 如果差值很小，直接设置
  if (Math.abs(diff) < 0.5) {
    container.scrollTop = targetY;
    return;
  }
  const startTime = performance.now();
  /**
   * 平滑滚动动画
   * @param currentTime 当前时间
   */
  const step = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // easeInOutQuad 缓动
    const easedProgress =
      progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    container.scrollTop = startY + diff * easedProgress;
    if (progress < 1) {
      scrollAnimationId = requestAnimationFrame(step);
    } else {
      scrollAnimationId = null;
    }
  };
  scrollAnimationId = requestAnimationFrame(step);
};

/**
 * 歌词滚动
 */
const lyricsScroll = (index: number) => {
  const container = lyricScrollContainer.value;
  if (!container) return;
  // 用户滚动时不自动滚动
  if (userScrolling.value) return;
  const lrcItemDom = document.getElementById(index >= 0 ? `lrc-${index}` : "lrc-placeholder");
  if (!lrcItemDom) return;
  // 计算目标滚动位置
  const containerHeight = container.clientHeight;
  const elementTop = lrcItemDom.offsetTop;
  const elementHeight = lrcItemDom.offsetHeight;
  // 居中偏移滚动
  let targetY = elementTop - (containerHeight - elementHeight) * settingStore.lyricsScrollOffset;
  // 确保不超出边界
  targetY = Math.max(0, Math.min(targetY, container.scrollHeight - container.clientHeight));
  // 执行平滑滚动
  smoothScrollTo(container, targetY, 500);
};

/**
 * 鼠标移出歌词区域恢复自动滚动
 */
const lrcAllLeave = () => {
  userScrolling.value = false;
  if (userScrollTimeoutId !== null) {
    clearTimeout(userScrollTimeoutId);
    userScrollTimeoutId = null;
  }
  lyricsScroll(firstActiveIndex.value);
};

type CssVars = Record<`--${string}`, string>;

/** 逐字歌词淡入淡出因子 */
const YRC_DIM_ALPHA = 0.3;
/** 逐字歌词淡入淡出时间 */
const YRC_LINE_FADE_MS = 250;
/** 淡入淡出行索引 */
const yrcFadingLineIndex = ref<number | null>(null);
/** 淡入淡出结束时间 */
const yrcFadingUntilAt = ref<number>(0);

/**
 * 获取逐字歌词淡入淡出因子
 * @param index 歌词行索引
 */
const getYrcFadeFactor = (index: number): number => {
  if (yrcFadingLineIndex.value !== index) return 1;
  const now = Date.now();
  if (now >= yrcFadingUntilAt.value) return 1;
  const remain = yrcFadingUntilAt.value - now;
  return Math.min(Math.max(remain / YRC_LINE_FADE_MS, 0), 1);
};

/**
 * 获取逐字歌词样式变量
 * @param wordData 逐字歌词数据
 * @param lyricIndex 歌词行索引
 */
const getYrcVars = (wordData: LyricWord, lyricIndex: number): CssVars => {
  const currentSeek = props.currentTime;
  const fadeFactor = getYrcFadeFactor(lyricIndex);
  // 判断是否显示
  const currentLineItem = processedLyrics.value[lyricIndex];
  if (!currentLineItem || currentLineItem.type !== "lyric") return {};

  if (!isYrcLineOn(lyricIndex)) return {};
  // 计算进度
  const duration = wordData.endTime - wordData.startTime;
  const safeDuration = Math.max(duration, 1);
  const rawProgress = (currentSeek - wordData.startTime) / safeDuration;
  const progress = Math.min(Math.max(rawProgress, 0), 1); // Allow > 1 for latching
  const maskX = `${(1 - Math.min(progress, 1)) * 100}%`;
  // 计算透明度
  const hasStarted = currentSeek >= wordData.startTime;
  const brightAlpha = hasStarted ? YRC_DIM_ALPHA + (1 - YRC_DIM_ALPHA) * fadeFactor : YRC_DIM_ALPHA;
  const darkAlpha = YRC_DIM_ALPHA;

  // 计算每个字的动态变换效果
  // Calculate dynamic transform for each word
  let transform = "scale(1)";
  if (progress > 0) {
    // 随着播放进度逐渐放大并上浮
    // Gradually scale up and float up with playback progress
    const scale = 1 + 0.08 * progress;
    const y = -2 * progress;
    transform = `scale(${scale}) translateY(${y}px)`;
  }

  return {
    "--yrc-mask-x": maskX,
    "--yrc-opacity": "1",
    "--yrc-bright-alpha": `${brightAlpha}`,
    "--yrc-dark-alpha": `${darkAlpha}`,
    "--yrc-transform": transform,
  };
};

/**
 * 判断逐字歌词是否显示
 * @param index 歌词行索引
 */
const isYrcLineOn = (index: number): boolean => {
  const isActive = isLineActive(index);
  const isFading = yrcFadingLineIndex.value === index && Date.now() < yrcFadingUntilAt.value;
  return isActive || isFading;
};

/**
 * 获取歌词行 class
 * @param item 预处理后的歌词项
 * @param index 在列表中的索引
 */
const getLyricLineClass = (item: ProcessedLyricItem, index: number) => {
  if (item.type !== "lyric") return [];
  const lyricData = item.data;
  // 判断是否显示
  const isOn = isYrcMode.value ? isYrcLineOn(index) : isLineActive(index);
  return [
    "lrc-line",
    isYrcMode.value ? "is-yrc" : "is-lrc",
    {
      on: isOn,
      "is-bg": lyricData.isBG,
      "is-duet": lyricData.isDuet,
    },
  ];
};

/**
 * 获取歌词行 style
 * @param item 预处理后的歌词项
 * @param index 在列表中的索引
 */
const getLyricLineStyle = (item: ProcessedLyricItem, index: number) => {
  if (item.type !== "lyric") return {};

  if (!settingStore.lyricsBlur) return { filter: "blur(0)" };
  // 计算模糊程度
  const activeIdx = firstActiveIndex.value;
  const isOn = isLineActive(index);
  return {
    filter: isOn ? "blur(0)" : `blur(${Math.min(Math.abs(activeIdx - index) * 1.8, 10)}px)`,
  };
};

/**
 * 进度跳转
 */
const jumpSeek = (time: number) => {
  if (!time) return;
  // 清除用户滚动状态
  userScrolling.value = false;
  if (userScrollTimeoutId !== null) {
    clearTimeout(userScrollTimeoutId);
    userScrollTimeoutId = null;
  }
  const offsetMs = statusStore.getSongOffset(musicStore.playSong?.id);
  player.setSeek(time - offsetMs);
  player.play();
};

// 监听歌词滚动
watch(firstActiveIndex, (val, oldVal) => {
  lyricsScroll(val);
  if (typeof oldVal === "number" && oldVal >= 0 && oldVal !== val) {
    yrcFadingLineIndex.value = oldVal;
    yrcFadingUntilAt.value = Date.now() + YRC_LINE_FADE_MS;
  }
});

onMounted(() => {
  nextTick().then(() => {
    lyricsScroll(firstActiveIndex.value);
  });
  if (isElectron) {
    window.electron.ipcRenderer.on("lyricsScroll", () => lyricsScroll(firstActiveIndex.value));
  }
});

onBeforeUnmount(() => {
  // 清理滚动动画
  if (scrollAnimationId !== null) {
    cancelAnimationFrame(scrollAnimationId);
    scrollAnimationId = null;
  }
  // 清理用户滚动超时
  if (userScrollTimeoutId !== null) {
    clearTimeout(userScrollTimeoutId);
    userScrollTimeoutId = null;
  }
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
  .lyric-scroll-container {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding-left: var(--lrc-left-padding, 10px);
    padding-right: 80px;
    box-sizing: border-box;
    /* 隐藏滚动条 */
    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar {
      display: none;
    }
    @media (max-width: 990px) {
      padding-right: 20px;
    }
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
  }

  /* 倒计时行 */
  .countdown-line {
    margin: 6px 0;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    min-height: 48px;
    .count-down {
      display: flex;
      flex-direction: row-reverse;
      align-items: center;
      animation: breathe 4s ease-in-out infinite;
      .point {
        width: 28px;
        height: 28px;
        margin-right: 12px;
        border-radius: 50%;
        background-color: rgb(var(--main-cover-color));
        transition: opacity 0.5s;
        @media (max-width: 900px) {
          width: 24px;
          height: 24px;
        }
        @media (max-width: 700px) {
          width: 20px;
          height: 20px;
        }
      }
    }
  }

  .lrc-line {
    position: relative;
    display: flex;
    flex-direction: column;
    margin: 6px 0;
    padding: 10px 16px;
    transform: scale(0.95);
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
      overflow-wrap: anywhere;
      word-break: break-word;
      white-space: normal;
      hyphens: auto;
      .content-text {
        position: relative;
        display: inline-block;
        overflow: visible;
        overflow-wrap: anywhere;
        word-break: break-word;
        white-space: normal;
        .yrc-word {
          display: inline-block;
          box-sizing: border-box;
          padding-block: 0.2em;
          margin-block: -0.2em;
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
      overflow-wrap: anywhere;
      word-break: break-word;
      white-space: normal;
      hyphens: auto;
    }
    .roma {
      margin-top: 4px;
      opacity: 0.5;
      font-size: var(--lrc-roma-size);
      transition: opacity 0.35s;
      width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
      white-space: normal;
      hyphens: auto;
    }
    &.is-lrc {
      opacity: 0.3;
    }
    &.is-yrc {
      .content {
        display: flex;
        flex-wrap: wrap;
        width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
        white-space: normal;
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
  }
  @media (hover: hover) and (pointer: fine) {
    &.meta-show {
      .lrc-line:hover {
        opacity: 1;
        &::before {
          transform: scale(1);
          opacity: 1;
        }
      }
      .lrc-line:active {
        &::before {
          transform: scale(0.95);
        }
      }
    }
  }
  &.flex-end,
  &.align-right {
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
      &.is-duet {
        transform-origin: left;
        .content,
        .tran,
        .roma {
          text-align: left;
          justify-content: flex-start;
        }
      }
    }
    .countdown-line {
      justify-content: flex-end;
      .count-down {
        flex-direction: row;
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
    }
    .countdown-line {
      justify-content: center;
    }
  }
  &.pure {
    .lyric-scroll-container {
      padding: 0 80px;
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
  &.meta-show:hover {
    .lrc-line {
      filter: blur(0) !important;
    }
  }

  /* 逐字歌词：激活行启用 mask 动画 */
  .lrc-line.is-yrc.on {
    .content-text {
      .yrc-word {
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
