<template>
  <!-- 歌词滚动 -->
  <div
    v-if="music.getPlaySongLyric.lrc[0]"
    :class="[
      setting.playerStyle === 'cover' ? 'lrc-all cover' : 'lrc-all record',
      setting.lyricsBlock === 'center' ? 'center' : 'top',
    ]"
    :style="
      setting.lyricsPosition === 'center'
        ? { textAlign: 'center', paddingRight: '0' }
        : null
    "
  >
    <div
      class="placeholder"
      :id="
        !music.getPlaySongLyric.hasYrc || !setting.showYrc ? 'lrc-1' : 'yrc-1'
      "
    >
      <CountDown :style="{ fontSize: setting.lyricsFontSize + 'vh' }" />
    </div>
    <template v-if="!music.getPlaySongLyric.hasYrc || !setting.showYrc">
      <div
        v-for="(item, index) in music.getPlaySongLyric.lrc"
        :class="music.getPlaySongLyricIndex == index ? 'lrc on' : 'lrc'"
        :style="{ marginBottom: setting.lyricsFontSize - 1.6 + 'vh' }"
        :key="item"
        :id="'lrc' + index"
        @click="lrcTextClick(item.time)"
      >
        <div
          :class="setting.lyricsBlur ? 'lrc-text blur' : 'lrc-text'"
          :style="{
            transformOrigin:
              setting.lyricsPosition === 'center' ? 'center' : null,
            filter: setting.lyricsBlur
              ? `blur(${getFilter(music.getPlaySongLyricIndex, index)}px)`
              : null,
          }"
        >
          <span
            class="lyric"
            :style="{ fontSize: setting.lyricsFontSize + 'vh' }"
          >
            {{ item.content }}
          </span>
          <span
            v-show="
              music.getPlaySongLyric.hasTran &&
              setting.getShowTransl &&
              item.tran
            "
            :style="{ fontSize: setting.lyricsFontSize - 1 + 'vh' }"
            class="lyric-fy"
          >
            {{ item.tran }}</span
          >
        </div>
      </div>
    </template>
    <template v-else>
      <div
        v-for="(item, index) in music.getPlaySongLyric.yrc"
        :class="music.getPlaySongLyricIndex == index ? 'yrc on' : 'yrc'"
        :key="item"
        :id="'yrc' + index"
        @click="lrcTextClick(item.time)"
      >
        <div
          :class="setting.lyricsBlur ? 'yrc-text blur' : 'yrc-text'"
          :style="{
            transformOrigin:
              setting.lyricsPosition === 'center' ? 'center' : null,
            filter: setting.lyricsBlur
              ? `blur(${getFilter(music.getPlaySongLyricIndex, index)}px)`
              : null,
          }"
        >
          <div
            class="lyric"
            :style="{ fontSize: setting.lyricsFontSize + 'vh' }"
          >
            <span
              v-for="(v, i) in item.content"
              :key="i"
              :style="{
                '--dur': v.duration - 0.15 + 's',
              }"
              :class="
                music.getPlaySongLyricIndex == index &&
                music.getPlaySongTime.currentTime + 0.15 >= v.time
                  ? 'text fill'
                  : 'text'
              "
            >
              {{ v.content }}
            </span>
          </div>
          <span
            v-show="
              music.getPlaySongLyric.hasTran &&
              setting.getShowTransl &&
              item.tran
            "
            :style="{ fontSize: setting.lyricsFontSize - 1 + 'vh' }"
            class="lyric-fy"
          >
            {{ item.tran }}</span
          >
        </div>
      </div>
    </template>
    <div class="placeholder"></div>
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
  margin-right: 20%;
  scrollbar-width: none;
  // max-width: 460px;
  max-width: 52vh;
  overflow: auto;
  &::-webkit-scrollbar {
    display: none;
  }
  &.cover {
    height: 80vh;
  }
  &.record {
    height: 60vh;
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
        height: 16%;
      }
    }
  }
  &:hover {
    .lrc-text {
      &.blur {
        filter: blur(0) !important;
      }
    }
  }
  @media (max-width: 768px) {
    height: 70vh;
    margin-right: 0;
  }
  .placeholder {
    width: 100%;
    height: 50%;
    &:nth-of-type(1) {
      display: flex;
      align-items: flex-end;
      padding: 0 0 0.8vh 3vh;
    }
  }
  .lrc,
  .yrc {
    opacity: 0.4;
    transition: all 0.3s;
    margin-bottom: 0.8vh;
    padding: 1.8vh 4vh 1.8vh 3vh;
    border-radius: 8px;
    transition: all 0.3s;
    transform-origin: left bottom;
    cursor: pointer;
    .lrc-text,
    .yrc-text {
      display: flex;
      flex-direction: column;
      transition: all 0.35s ease-in-out;
      transform: scale(0.95);
      transform-origin: left bottom;
      .lyric {
        font-weight: bold;
        transition: all 0.3s;
        .text {
          transition: all var(--dur);
          color: #ffffff66;
          &.fill {
            text-shadow: 0px 0px 30px #ffffff40;
            background-image: linear-gradient(to right, #fff 0%, #fff 0%);
            background-repeat: no-repeat;
            background-size: 0% 100%;
            background-clip: text;
            -webkit-background-clip: text;
            color: #ffffff66;
            animation: toRight var(--dur) forwards linear;
          }
          @keyframes toRight {
            to {
              background-size: 100% 100%;
            }
          }
        }
      }
      .lyric-fy {
        margin-top: 4px;
        transition: all 0.3s;
        opacity: 0.6;
      }
    }
    &.on {
      opacity: 1;
      .lrc-text {
        transform: scale(1.05);
        .lyric {
          text-shadow: 0px 0px 30px #ffffff40;
        }
      }
      .yrc-text {
        transform: scale(1.05);
        .lyric {
          font-weight: bold;
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
  .yrc {
    opacity: 0.6;
  }
}
</style>
