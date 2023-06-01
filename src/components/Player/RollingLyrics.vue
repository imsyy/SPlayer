<template>
  <!-- 滚动歌词 -->
  <div
    v-if="music.getPlaySongLyric.lrc[0]"
    :class="[
      setting.playerStyle === 'cover' ? 'lrc-all cover' : 'lrc-all record',
      setting.lyricsBlock === 'center' ? 'center' : 'top',
    ]"
  >
    <div
      class="placeholder"
      :id="
        !music.getPlaySongLyric.hasYrc || !setting.showYrc ? 'lrc-1' : 'yrc-1'
      "
      :style="
        setting.lyricsPosition === 'center'
          ? { justifyContent: 'center', padding: '0' }
          : null
      "
    >
      <CountDown
        v-if="setting.countDownShow"
        :style="{ fontSize: setting.lyricsFontSize + 'vh' }"
      />
    </div>
    <!-- 普通歌词 -->
    <template v-if="!music.getPlaySongLyric.hasYrc || !setting.showYrc">
      <div
        class="lrc"
        v-for="(item, index) in music.getPlaySongLyric.lrc"
        :class="{
          on: music.getPlaySongLyricIndex == index,
          blur: setting.lyricsBlur,
        }"
        :style="{
          marginBottom: setting.lyricsFontSize - 1.6 + 'vh',
          transformOrigin:
            setting.lyricsPosition === 'center' ? 'center' : null,
          filter: setting.lyricsBlur
            ? `blur(${getFilter(music.getPlaySongLyricIndex, index)}px)`
            : 'none',
          alignItems:
            setting.lyricsPosition === 'center' ? 'center' : 'flex-start',
        }"
        :key="item"
        :id="'lrc' + index"
        @click="lrcTextClick(item.time)"
      >
        <span
          class="lyric"
          :style="{ fontSize: setting.lyricsFontSize + 'vh' }"
        >
          {{ item.content }}
        </span>
        <span
          v-if="
            music.getPlaySongLyric.hasLrcTran && setting.showTransl && item.tran
          "
          :style="{ fontSize: setting.lyricsFontSize - 1 + 'vh' }"
          class="lyric-fy"
        >
          {{ item.tran }}</span
        >
        <span
          v-if="
            music.getPlaySongLyric.hasLrcRoma && setting.showRoma && item.roma
          "
          :style="{ fontSize: setting.lyricsFontSize - 1.5 + 'vh' }"
          class="lyric-roma"
        >
          {{ item.roma }}</span
        >
      </div>
    </template>
    <!-- 逐字歌词 -->
    <template v-else>
      <div
        class="yrc"
        v-for="(item, index) in music.getPlaySongLyric.yrc"
        :class="{
          on: music.getPlaySongLyricIndex === index,
          blur: setting.lyricsBlur,
        }"
        :style="{
          marginBottom: setting.lyricsFontSize - 1.6 + 'vh',
          transformOrigin:
            setting.lyricsPosition === 'center' ? 'center' : null,
          filter: setting.lyricsBlur
            ? `blur(${getFilter(music.getPlaySongLyricIndex, index)}px)`
            : 'none',
          alignItems:
            setting.lyricsPosition === 'center' ? 'center' : 'flex-start',
        }"
        :key="item"
        :id="'yrc' + index"
        @click="lrcTextClick(item.time)"
      >
        <div class="lyric" :style="{ fontSize: setting.lyricsFontSize + 'vh' }">
          <div
            class="text"
            v-for="(v, i) in item.content"
            :class="{
              fill:
                music.getPlaySongLyricIndex === index &&
                music.getPlaySongTime.currentTime + 0.2 >= v.time,
              transform: setting.showYrcTransform,
            }"
            :key="i"
            :style="{
              '--dur': `${Math.max(v.duration - 0.2, 0.1)}s`,
            }"
          >
            <span class="word" v-html="v.content.replace(/ /g, '&nbsp;')" />
            <span
              class="filler"
              :class="{
                long: i === item.content.length - 1 && v.duration > 1,
                animation: setting.showYrcAnimation,
                paused: !music.playState,
              }"
              v-html="v.content.replace(/ /g, '&nbsp;')"
            />
          </div>
        </div>
        <span
          v-if="
            music.getPlaySongLyric.hasYrcTran && setting.showTransl && item.tran
          "
          :style="{ fontSize: setting.lyricsFontSize - 1 + 'vh' }"
          class="lyric-fy"
        >
          {{ item.tran }}
        </span>
        <span
          v-if="
            music.getPlaySongLyric.hasYrcRoma && setting.showRoma && item.roma
          "
          :style="{ fontSize: setting.lyricsFontSize - 1.5 + 'vh' }"
          class="lyric-roma"
        >
          {{ item.roma }}
        </span>
      </div>
    </template>
    <div class="placeholder" />
  </div>
</template>

<script setup>
import { musicStore, settingStore } from "@/store";
import CountDown from "./CountDown.vue";

const music = musicStore();
const setting = settingStore();

// 发送方法
const emit = defineEmits(["lrcTextClick"]);

// 歌词模糊数值
const getFilter = (lrcIndex, index) => {
  if (lrcIndex >= index) {
    return lrcIndex - index;
  } else {
    return index - lrcIndex;
  }
};

// 歌词文本点击
const lrcTextClick = (time) => {
  emit("lrcTextClick", time);
};
</script>

<style lang="scss" scoped>
.lrc-all {
  display: flex;
  flex-direction: column;
  // margin-right: 20%;
  scrollbar-width: none;
  max-width: 52vh;
  overflow: auto;
  padding: 0 10px;
  .placeholder {
    width: 100%;
    &:nth-of-type(1) {
      min-height: 50%;
      display: flex;
      align-items: flex-end;
      padding: 0 0 0.8vh 3vh;
    }
    &:nth-last-of-type(1) {
      min-height: 80%;
    }
  }
  .lrc,
  .yrc {
    display: flex;
    flex-direction: column;
    position: relative;
    padding: 1.8vh 4vh 1.8vh 3vh;
    box-sizing: border-box;
    border-radius: 8px;
    opacity: 0.3;
    transform: scale(0.9);
    transform-origin: left bottom;
    transition: transform 0.3s ease, opacity 0.3s ease;
    cursor: pointer;
    .lyric {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      font-weight: bold;
      .text {
        position: relative;
        transition: transform 0.3s ease;
        .filler {
          transition: color 0.3s ease, opacity 0.3s ease;
          position: absolute;
          top: 0;
          left: 0;
          opacity: 0;
          &.animation {
            color: white;
            background: linear-gradient(to right, white, white) no-repeat 0 0;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            -webkit-background-clip: text;
            background-size: 0 100%;
          }
        }
        &.fill {
          &.transform {
            transform: translateY(-1.5px);
          }
          .word {
            opacity: 0.3;
          }
          .filler {
            opacity: 1 !important;
            &.long {
              animation: shine calc var(--dur) ease-in-out;
            }
            &.animation {
              background-size: 100% 100%;
              animation: progress var(--dur) linear forwards;
            }
            &.paused {
              animation-play-state: paused;
              -webkit-animation-play-state: paused;
            }
          }
        }
      }
    }
    .lyric-fy,
    .lyric-roma {
      margin-top: 4px;
      opacity: 0.6;
    }
    &.on {
      opacity: 1;
      transform: scale(1);
      .lyric {
        .text {
          .word,
          .filler {
            opacity: 0.3;
          }
        }
      }
    }
    &::before {
      @media (min-width: 768px) {
        content: "";
        display: block;
        position: absolute;
        left: 0px;
        top: 0;
        width: 100%;
        height: 100%;
        border-radius: 8px;
        background-color: #ffffff20;
        opacity: 0;
        z-index: 0;
        transform: scale(1.05);
        transition: transform 0.3s ease, opacity 0.3s ease;
        pointer-events: none;
      }
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
  &::-webkit-scrollbar {
    display: none;
  }
  &.cover {
    height: 80vh;
  }
  &.record {
    height: 70vh;
  }
  &.center {
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
  }
  &.top {
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
    .placeholder {
      &:nth-of-type(1) {
        min-height: 16%;
      }
    }
  }
  @media (max-width: 768px) {
    height: 70vh;
    margin-right: 0;
    padding: 0;
  }
}
@keyframes progress {
  0% {
    background-size: 0 100%;
  }
  100% {
    background-size: 100% 100%;
  }
}
@keyframes shine {
  0% {
    text-shadow: 0 0 0.1em rgba(255, 255, 255, 0);
  }
  25% {
    text-shadow: 0 0 0.3em rgba(255, 255, 255, 0.5);
  }
  50% {
    text-shadow: 0 0 0.5em rgba(255, 255, 255, 0.7);
  }
  75% {
    text-shadow: 0 0 0.3em rgba(255, 255, 255, 0.5);
  }
  100% {
    text-shadow: 0 0 0.1em rgba(255, 255, 255, 0);
  }
}
</style>
