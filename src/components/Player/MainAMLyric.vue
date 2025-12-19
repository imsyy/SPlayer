<template>
  <Transition name="fade" mode="out-in">
    <div
      :key="amLyricsData?.[0]?.words?.length"
      :class="['lyric-am', { pure: statusStore.pureLyricMode }]"
    >
      <div v-if="statusStore.lyricLoading" class="lyric-loading">歌词正在加载中...</div>
      <LyricPlayer
        v-else
        ref="lyricPlayerRef"
        :lyricLines="amLyricsData"
        :currentTime="playSeek"
        :playing="statusStore.playStatus"
        :enableSpring="settingStore.useAMSpring"
        :enableScale="settingStore.useAMSpring"
        :alignPosition="settingStore.lyricsScrollPosition === 'center' ? 0.5 : 0.2"
        :enableBlur="settingStore.lyricsBlur"
        :style="{
          '--amll-lyric-view-color': 'rgb(var(--main-cover-color))',
          '--amll-lyric-player-font-size': settingStore.lyricFontSize + 'px',
          '--ja-font-family':
            settingStore.japaneseLyricFont !== 'follow' ? settingStore.japaneseLyricFont : '',
          '--en-font-family':
            settingStore.englishLyricFont !== 'follow' ? settingStore.englishLyricFont : '',
          '--ko-font-family':
            settingStore.koreanLyricFont !== 'follow' ? settingStore.koreanLyricFont : '',
          'font-weight': settingStore.lyricFontBold ? 'bold' : 'normal',
          'font-family': settingStore.LyricFont !== 'follow' ? settingStore.LyricFont : '',
        }"
        class="am-lyric"
        @line-click="jumpSeek"
      />
      <!-- 歌词菜单组件 -->
      <LyricMenu />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { LyricPlayer } from "@applemusic-like-lyrics/vue";
import { type LyricLine } from "@applemusic-like-lyrics/lyric";
import { useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { getLyricLanguage } from "@/utils/format";
import { usePlayerController } from "@/core/player/PlayerController";

const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();
const player = usePlayerController();

const lyricPlayerRef = ref<any | null>(null);

// 实时播放进度
const playSeek = ref<number>(player.getSeek() + statusStore.getSongOffset(musicStore.playSong?.id));

// 实时更新播放进度
const { pause: pauseSeek, resume: resumeSeek } = useRafFn(() => {
  const songId = musicStore.playSong?.id;
  const offsetTime = statusStore.getSongOffset(songId);
  playSeek.value = player.getSeek() + offsetTime;
});

// 当前歌词
const amLyricsData = computed<LyricLine[]>(() => {
  const { songLyric } = musicStore;
  if (!songLyric) return [];

  // 优先使用逐字歌词(YRC/TTML)
  const useYrc = songLyric.yrcData?.length && settingStore.showYrc;
  const lyrics = useYrc ? songLyric.yrcData : songLyric.lrcData;

  // 简单检查歌词有效性
  if (!Array.isArray(lyrics) || lyrics.length === 0) return [];

  return lyrics;
});

// 进度跳转
const jumpSeek = (line: any) => {
  if (!line?.line?.lyricLine?.startTime) return;
  const time = line.line.lyricLine.startTime;
  const offsetMs = statusStore.getSongOffset(musicStore.playSong?.id);
  player.setSeek(time - offsetMs);
  player.play();
};

// 处理歌词语言
const processLyricLanguage = (player = lyricPlayerRef.value) => {
  const lyricLinesEl = player?.lyricPlayer?.lyricLinesEl;
  if (!lyricLinesEl || lyricLinesEl.length === 0) {
    return;
  }
  // 遍历歌词行
  for (let e of lyricLinesEl) {
    // 获取歌词行内容 (合并逐字歌词为一句)
    const content = e.lyricLine.words.map((word: any) => word.word).join("");
    // 获取歌词语言
    const lang = getLyricLanguage(content);
    // 为主歌词设置 lang 属性 (firstChild 获取主歌词 不为翻译和音译设置属性)
    e.element.firstChild.setAttribute("lang", lang);
  }
};

// 切换歌曲时处理歌词语言
watch(amLyricsData, (data) => {
  if (data) nextTick(() => processLyricLanguage());
});
watch(lyricPlayerRef, (player) => {
  if (player) nextTick(() => processLyricLanguage(player));
});

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
    --amll-lyric-view-color: rgb(239, 239, 239);
    // margin-left: -2rem;
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
  :lang(ja) {
    font-family: var(--ja-font-family);
  }
  :lang(en) {
    font-family: var(--en-font-family);
  }
  :lang(ko) {
    font-family: var(--ko-font-family);
  }
}

.lyric-loading {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--amll-lyric-view-color, #efefef);
  font-size: 22px;
}
</style>
