<template>
  <div
    :style="{
      '--lrc-size': settingStore.lyricFontSize + 'px',
      '--lrc-tran-size': settingStore.lyricTranFontSize + 'px',
      '--lrc-roma-size': settingStore.lyricRomaFontSize + 'px',
      '--lrc-bold': settingStore.lyricFontBold ? 'bold' : 'normal',
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
    <Transition name="fade" mode="out-in">
      <div
        :key="musicStore.songLyric.lrcData?.[0]?.content"
        class="lyric-content"
        @after-enter="lyricsScroll(statusStore.lyricIndex)"
        @after-leave="lyricsScroll(statusStore.lyricIndex)"
      >
        <n-scrollbar ref="lyricScroll" class="lyric-scroll">
          <!-- 逐字歌词 -->
          <template v-if="settingStore.showYrc && musicStore.isHasYrc">
            <div id="lrc-placeholder" class="placeholder">
              <!-- 倒计时 -->
              <CountDown
                v-if="settingStore.countDownShow"
                :start="0"
                :duration="musicStore.songLyric.yrcData[0].time || 0"
                :seek="playSeek"
                :playing="statusStore.playStatus"
              />
            </div>
            <div
              v-for="(item, index) in musicStore.songLyric.yrcData"
              :key="index"
              :id="`lrc-${index}`"
              :class="['lrc-line', 'is-yrc', { on: statusStore.lyricIndex === index }]"
              :style="{
                filter: settingStore.lyricsBlur
                  ? `blur(${Math.min(Math.abs(statusStore.lyricIndex - index) * 1.8, 10)}px)`
                  : 'blur(0)',
              }"
              @click="jumpSeek(item.time)"
            >
              <!-- 歌词 -->
              <div class="content">
                <div
                  v-for="(text, textIndex) in item.contents"
                  :key="textIndex"
                  :class="{
                    'content-text': true,
                    'content-long': text.duration >= 1.5 && playSeek <= text.endTime,
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
              <span v-if="item.tran" class="tran">{{ item.tran }}</span>
              <!-- 音译 -->
              <span v-if="item.roma" class="roma">{{ item.roma }}</span>
              <!-- 倒计时 -->
              <div
                v-if="
                  settingStore.countDownShow &&
                  musicStore.songLyric.yrcData[index + 1]?.time - item.endTime >= 10
                "
                class="count-down-content"
              >
                <CountDown
                  :start="item.endTime"
                  :duration="musicStore.songLyric.yrcData[index + 1]?.time - item.endTime || 0"
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
                v-if="settingStore.countDownShow"
                :start="0"
                :duration="musicStore.songLyric.lrcData[0].time || 0"
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
              @click="jumpSeek(item.time)"
            >
              <!-- 歌词 -->
              <span class="content">{{ item.content }}</span>
              <!-- 翻译 -->
              <span v-if="item.tran" class="tran">{{ item.tran }}</span>
              <!-- 音译 -->
              <span v-if="item.roma" class="roma">{{ item.roma }}</span>
            </div>
            <div class="placeholder" />
          </template>
        </n-scrollbar>
      </div>
    </Transition>
    <!-- 歌词菜单 -->
    <n-flex class="menu" justify="center" vertical>
      <!-- 进度微调 -->
      <div class="menu-icon" @click="statusStore.currentTimeOffset -= 0.5">
        <SvgIcon name="Replay5" />
      </div>
      <span class="time" @click="statusStore.currentTimeOffset = 0">
        {{ currentTimeOffsetValue }}
      </span>
      <div class="menu-icon" @click="statusStore.currentTimeOffset += 0.5">
        <SvgIcon name="Forward5" />
      </div>
      <div class="divider" />
      <!-- 更多设置 -->
      <div class="menu-icon" @click="openSetting('lyrics')">
        <SvgIcon name="Settings" />
      </div>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import type { LyricContentType } from "@/types/main";
import { NScrollbar } from "naive-ui";
import { useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { openSetting } from "@/utils/modal";
import player from "@/utils/player";

const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();

const lrcMouseStatus = ref<boolean>(false);
const lyricScroll = ref<InstanceType<typeof NScrollbar> | null>(null);

// 实时播放进度
const playSeek = ref<number>(player.getSeek());

// 实时更新播放进度
const { pause: pauseSeek, resume: resumeSeek } = useRafFn(() => {
  playSeek.value = player.getSeek() + statusStore.currentTimeOffset;
});

// 歌词偏移值
const currentTimeOffsetValue = computed(() => {
  const currentTimeOffset = statusStore.currentTimeOffset;
  return currentTimeOffset > 0 ? `+${currentTimeOffset}` : currentTimeOffset;
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
    const scrollDistance = lrcItemDom.offsetTop - container.offsetTop - 80;
    // 开始滚动
    if (settingStore.lyricsScrollPosition === "center") {
      lrcItemDom?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      lyricScroll.value?.scrollTo({ top: scrollDistance, behavior: "smooth" });
    }
  }
};

// 逐字歌词样式计算
const getYrcStyle = (wordData: LyricContentType, lyricIndex: number) => {
  if (settingStore.showYrcAnimation) {
    // 如果当前歌词索引与播放歌曲的歌词索引不匹配
    if (statusStore.lyricIndex !== lyricIndex) {
      return {
        transitionDuration: `0ms, 0ms, 0.35s`,
        transitionDelay: `0ms`,
      };
    }
    // 如果播放状态不是加载中，且当前单词的时间加上持续时间减去播放进度大于 0
    if (
      statusStore.playLoading === false &&
      wordData.time + wordData.duration - playSeek.value > 0
    ) {
      return {
        transitionDuration: `0s, 0s, 0.35s`,
        transitionDelay: `0ms`,
        WebkitMaskPositionX: `${
          100 - Math.max(((playSeek.value - wordData.time) / wordData.duration) * 100, 0)
        }%`,
        // 最大上移2px
        // transform: `translateY(-${Math.min(
        //   ((playSeek.value - wordData.time) / wordData.duration) * 2,
        //   2,
        // )}px)`,
      };
    }
    // 如果以上条件都不满足
    return {
      transitionDuration: `${wordData.duration}ms, ${wordData.duration * 0.8}ms, 0.35s`,
      transitionDelay: `${wordData.time - playSeek.value}ms, ${
        wordData.time - playSeek.value + wordData.duration * 0.5
      }ms, 0ms`,
      // transform: "translateY(-2px)",
    };
  } else {
    // 如果当前歌词索引与播放歌曲的歌词索引不匹配，或者播放状态不是加载中且当前单词的时间大于等于播放进度
    if (
      statusStore.lyricIndex !== lyricIndex ||
      (statusStore.playLoading === false && wordData.time >= playSeek.value)
    ) {
      return { opacity: 0 };
    }
    // 如果以上条件都不满足
    return { opacity: 1 };
  }
};

// 进度跳转
const jumpSeek = (time: number) => {
  if (!time) return;
  lrcMouseStatus.value = false;
  player.setSeek(time);
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
});

onBeforeUnmount(() => {
  console.log("离开歌词");
  pauseSeek();
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
      transform 0.5s cubic-bezier(0.25, 0.1, 0.25, 1);
    cursor: pointer;
    // 歌词
    .content {
      display: block;
      font-size: var(--lrc-size);
      font-weight: var(--lrc-bold);
      word-wrap: break-word;
      // 逐字歌词
      .content-text {
        position: relative;
        display: inline-block;
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
            filter 0.5s,
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
    }
    // 翻译
    .tran {
      margin-top: 8px;
      opacity: 0.6;
      font-size: var(--lrc-tran-size);
      transition: opacity 0.35s;
    }
    // 音译
    .roma {
      margin-top: 4px;
      opacity: 0.5;
      font-size: var(--lrc-roma-size);
      transition: opacity 0.35s;
    }
    // 倒计时
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
      }
      .tran,
      .roma {
        opacity: 0.3;
      }
    }
    &.on {
      opacity: 1;
      transform: scale(1);
      // 逐字歌词
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
      background-color: rgba(var(--main-color), 0.14);
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
  .menu {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    width: 80px;
    padding: 20% 0;
    opacity: 0;
    transition: opacity 0.3s;
    .divider {
      height: 2px;
      width: 40px;
      background-color: rgba(var(--main-color), 0.12);
    }
    .time {
      width: 40px;
      margin: 8px 0;
      padding: 4px 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      background-color: rgba(var(--main-color), 0.14);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      border: 1px solid rgba(var(--main-color), 0.12);
      transition: background-color 0.3s;
      cursor: pointer;
      &::after {
        content: "s";
        margin-left: 2px;
      }
      &:hover {
        background-color: rgba(var(--main-color), 0.28);
      }
    }
    .menu-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
      border-radius: 8px;
      transition:
        background-color 0.3s,
        transform 0.3s;
      cursor: pointer;
      .n-icon {
        font-size: 30px;
        color: rgb(var(--main-color));
      }
      &:hover {
        transform: scale(1.1);
        background-color: rgba(var(--main-color), 0.14);
      }
      &:active {
        transform: scale(1);
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
      align-items: flex-end;
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
      align-items: center !important;
      .content {
        text-align: center !important;
      }
      .count-down {
        transform-origin: center;
        justify-content: center;
      }
    }
  }
  &.record,
  &.pure {
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
  &.pure {
    :deep(.n-scrollbar-content) {
      padding: 0 80px;
    }
  }
  &:hover {
    .lrc-line {
      filter: blur(0) !important;
    }
    .menu {
      opacity: 0.6;
    }
  }
}
</style>
