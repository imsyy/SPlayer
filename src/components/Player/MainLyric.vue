<template>
  <div
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
      { pure: statusStore.pureLyricMode },
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
                    on:
                      (playSeek >= item.startTime && playSeek < item.endTime) ||
                      statusStore.lyricIndex === index,
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
                      'content-long':
                        settingStore.showYrcLongEffect &&
                        text.endTime - text.startTime >= 1500 &&
                        playSeek <= text.endTime,
                      'end-with-space': text.word.endsWith(' ') || text.startTime === 0,
                    }"
                  >
                    <span class="word" :lang="getLyricLanguage(text.word)">
                      {{ text.word }}
                    </span>
                    <span
                      class="filler"
                      :style="getYrcStyle(text, index)"
                      :lang="getLyricLanguage(text.word)"
                    >
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
 * 不活跃的普通歌词动画样式
 */
const INACTIVE_NO_ANIMATION_STYLE = { opacity: 0 } as const;

/**
 * 逐字歌词样式计算
 * @param wordData 逐字歌词数据
 * @param lyricIndex 歌词索引
 * @returns 逐字歌词动画样式
 */
const getYrcStyle = (wordData: LyricWord, lyricIndex: number) => {
  // 获取当前歌词行数据
  const currentLine = musicStore.songLyric.yrcData[lyricIndex];
  // 缓存 playSeek 值，避免多次访问响应式变量
  const currentSeek = playSeek.value;

  // 判断当前行是否处于激活状态
  const isLineActive =
    (currentSeek >= currentLine.startTime && currentSeek < currentLine.endTime) ||
    statusStore.lyricIndex === lyricIndex;

  // 如果当前歌词行不是激活状态，返回固定样式，避免不必要的计算
  if (!isLineActive) {
    if (settingStore.showYrcAnimation) {
      // 判断单词是否已经唱过：已唱过保持填充状态(0%)，未唱到保持未填充状态(100%)
      const hasPlayed = currentSeek >= wordData.endTime;
      return {
        WebkitMaskPositionX: hasPlayed ? "0%" : "100%",
      };
    } else {
      return INACTIVE_NO_ANIMATION_STYLE;
    }
  }

  // 激活状态的样式计算
  if (settingStore.showYrcAnimation) {
    // 如果播放状态不是加载中，且当前单词的时间加上持续时间减去播放进度大于 0
    if (statusStore.playLoading === false && wordData.endTime - currentSeek > 0) {
      return {
        transitionDuration: `0s, 0s, 0.35s`,
        transitionDelay: `0ms`,
        WebkitMaskPositionX: `${
          100 -
          Math.max(
            ((currentSeek - wordData.startTime) / (wordData.endTime - wordData.startTime)) * 100,
            0,
          )
        }%`,
      };
    }
    // 预计算时间差，避免重复计算
    const timeDiff = wordData.startTime - currentSeek;
    return {
      transitionDuration: `${wordData.endTime - wordData.startTime}ms, ${(wordData.endTime - wordData.startTime) * 0.8}ms, 0.35s`,
      transitionDelay: `${timeDiff}ms, ${timeDiff + (wordData.endTime - wordData.startTime) * 0.5}ms, 0ms`,
    };
  } else {
    // 无动画模式：根据单词时间判断透明度
    return statusStore.playLoading === false && wordData.startTime >= currentSeek
      ? { opacity: 0 }
      : { opacity: 1 };
  }
};

// 进度跳转
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
  (val) => lyricsScroll(val),
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
        overflow-wrap: anywhere; /* 新增：逐字歌词单词支持换行 */
        word-break: break-word; /* 新增：单词内换行 */
        white-space: normal; /* 新增：确保逐字歌词换行 */
        .word {
          opacity: 0.3;
          display: inline-block;
        }
        .filler {
          opacity: 0;
          position: absolute;
          left: 0;
          top: 0;
          transform: none;
          will-change: -webkit-mask-position-x, transform, opacity;
          // padding: 0.3em 0;
          // margin: -0.3em 0;
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
          transition:
            opacity 0.3s,
            filter 0.3s,
            margin 0.3s,
            padding 0.3s !important;
        }
        &.end-with-space {
          margin-right: 12px;
          &:last-child {
            margin-right: 0;
          }
        }
        &.content-long {
          .filler {
            margin: -40px;
            padding: 40px;
            filter: drop-shadow(0px 0px 14px rgba(255, 255, 255, 0.6));
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
      .content-text {
        .filler {
          opacity: 1;
          -webkit-mask-position-x: 0%;
          transition-property: -webkit-mask-position-x, transform, opacity;
          transition-timing-function: linear, ease, ease;
        }
      }
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
