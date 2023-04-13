<template>
  <!-- 歌词滚动 -->
  <div
    v-if="music.getPlaySongLyric.lrc[0]"
    :class="
      setting.playerStyle === 'cover' ? 'lrc-all cover' : 'lrc-all record'
    "
    :style="
      setting.lyricsPosition === 'center'
        ? { textAlign: 'center', paddingRight: '0' }
        : null
    "
  >
    <div class="placeholder" id="lrc-1"></div>
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
            music.getPlaySongLyric.hasTran && setting.getShowTransl && item.tran
          "
          :style="{ fontSize: setting.lyricsFontSize - 0.4 + 'vh' }"
          class="lyric-fy"
        >
          {{ item.tran }}</span
        >
      </div>
    </div>
    <div class="placeholder"></div>
  </div>
</template>

<script setup>
import { musicStore, settingStore } from "@/store";

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
</style>
