<template>
  <Transition name="fade" mode="out-in">
    <div
      :key="amLyricsData?.[0]?.words?.length"
      :class="['lyric-am', { pure: statusStore.pureLyricMode }]"
      :style="{
        '--amll-lp-color': 'rgb(var(--main-cover-color, 239 239 239))',
      }"
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
        :hidePassedLines="settingStore.hidePassedLines"
        :wordFadeWidth="settingStore.wordFadeWidth"
        :style="{
          '--amll-lp-font-size': settingStore.lyricFontSize + 'px',
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
import { type LyricLine } from "@applemusic-like-lyrics/core";
import { useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { getLyricLanguage } from "@/utils/format";
import { usePlayerController } from "@/core/player/PlayerController";
import { cloneDeep } from "lodash-es";
import "@applemusic-like-lyrics/core/style.css";

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
const amLyricsData = computed(() => {
  const { songLyric } = musicStore;
  if (!songLyric) return [];

  // 优先使用逐字歌词(YRC/TTML)
  const useYrc = songLyric.yrcData?.length && settingStore.showYrc;
  const lyrics = useYrc ? songLyric.yrcData : songLyric.lrcData;

  // 简单检查歌词有效性
  if (!Array.isArray(lyrics) || lyrics.length === 0) return [];

  return cloneDeep(lyrics) as LyricLine[];
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
  const lyricLineObjects = player?.lyricPlayer?.currentLyricLineObjects;
  if (!Array.isArray(lyricLineObjects) || lyricLineObjects.length === 0) {
    return;
  }
  // 遍历歌词行
  for (let e of lyricLineObjects) {
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

  /* 限定混合模式只作用于歌词区域，避免影响页面其它元素。 */
  isolation: isolate;

  :deep(.am-lyric) {
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    padding-left: 10px;
    padding-right: 80px;
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

  /* 对常见的“当前高亮行”类名应用加法混合模式，使其高亮更亮 */
  :deep(.am-lyric .current),
  :deep(.am-lyric .is-current),
  :deep(.am-lyric .active),
  :deep(.am-lyric .is-active),
  :deep(.am-lyric .lyric-line.current),
  :deep(.am-lyric .lyric-line.is-current) {
    /* 使用加法混合，叠加会更亮 */
    mix-blend-mode: plus-lighter;
    /* 更亮的文字颜色（半透明白），便于加法叠加效果 */
    color: rgba(255, 255, 255, 0.95);
    /* 轻微发光，配合混合模式效果更自然 */
    text-shadow: 0 2px 12px rgba(255, 255, 255, 0.06);
    /* 告诉浏览器该元素可能会变化，优化渲染 */
    will-change: transform, opacity, color;
  }

  /* 只对主歌词文本（非翻译/音译）启用混合，匹配带有 lang 属性的主元素 */
  :deep(.am-lyric [lang]) {
    /* 默认保持正常，但在高亮时会被上面的规则覆盖 */
    -webkit-font-smoothing: antialiased;
  }

  /* 若浏览器不支持 plus-lighter，使用 supports 提供降级样式 */
  @supports not (mix-blend-mode: plus-lighter) {
    :deep(.am-lyric .current),
    :deep(.am-lyric .is-current),
    :deep(.am-lyric .active),
    :deep(.am-lyric .is-active),
    :deep(.am-lyric .lyric-line.current),
    :deep(.am-lyric .lyric-line.is-current) {
      /* 降级为更明显的颜色与阴影（非混合） */
      color: #ffffff;
      text-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
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
  color: var(--amll-lp-color, #efefef);
  font-size: 22px;
}
</style>
