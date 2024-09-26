<template>
  <Transition>
    <div
      :key="amLyricsData?.[0]?.startTime"
      :class="['lyric-am', { pure: statusStore.pureLyricMode }]"
    >
      <LyricPlayer
        ref="lyricPlayerRef"
        :lyricLines="amLyricsData"
        :currentTime="playSeek"
        :playing="statusStore.playStatus"
        :enableSpring="settingStore.useAMSpring"
        :enableScale="settingStore.useAMSpring"
        :alignPosition="settingStore.lyricsScrollPosition === 'center' ? 0.5 : 0.2"
        :enableBlur="settingStore.lyricsBlur"
        :style="{
          '--amll-lyric-view-color': mainColor,
          '--amll-lyric-player-font-size': settingStore.lyricFontSize + 'px',
          'font-weight': settingStore.lyricFontBold ? 'bold' : 'normal',
          'font-family': settingStore.LyricFont !== 'follow' ? settingStore.LyricFont : '',
        }"
        class="am-lyric"
        @line-click="jumpSeek"
      />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { LyricPlayer } from "@applemusic-like-lyrics/vue";
import { LyricLine } from "@applemusic-like-lyrics/core";
import { useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { msToS } from "@/utils/time";
import player from "@/utils/player";

const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();

const lyricPlayerRef = ref<any | null>(null);

// 实时播放进度
const playSeek = ref<number>(player.getSeek());

// 实时更新播放进度
const { pause: pauseSeek, resume: resumeSeek } = useRafFn(() => {
  const seekInSeconds = player.getSeek();
  playSeek.value = Math.floor(seekInSeconds * 1000);
});

// 歌词主色
const mainColor = computed(() => {
  const mainColor = statusStore.songCoverTheme?.main;
  if (!mainColor) return "rgb(239, 239, 239)";
  return `rgb(${mainColor.r}, ${mainColor.g}, ${mainColor.b})`;
});

// 当前歌词
const amLyricsData = computed<LyricLine[]>(() => {
  const isYrc = musicStore.songLyric.yrcData?.length && settingStore.showYrc;
  return isYrc ? musicStore.songLyric.yrcAMData : musicStore.songLyric.lrcAMData;
});

// 进度跳转
const jumpSeek = (line: any) => {
  if (!line?.line?.lyricLine?.startTime) return;
  const time = msToS(line.line.lyricLine.startTime);
  player.setSeek(time);
  player.play();
};

onMounted(() => {
  // 恢复进度
  resumeSeek();
});

onBeforeUnmount(() => {
  pauseSeek();
});
</script>

<style lang="scss" scoped>
.lyric-am {
  position: relative;
  width: 100%;
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
  :deep(.am-lyric) {
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    padding-left: 10px;
    padding-right: 80px;
    margin-left: -2rem;
  }
  &.pure {
    text-align: center;
    :deep(.am-lyric) {
      margin: 0;
      padding: 0 80px;
      div {
        transform-origin: center;
      }
    }
  }
}
</style>
