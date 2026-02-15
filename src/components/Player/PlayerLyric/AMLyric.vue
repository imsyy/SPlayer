<template>
  <Transition name="fade" mode="out-in">
    <div
      :key="amLyricsData?.[0]?.words?.length"
      :class="[
        'lyric-am',
        {
          pure: statusStore.pureLyricMode,
          duet: hasDuet,
          'align-right': settingStore.lyricAlignRight,
        },
      ]"
      :style="{
        '--amll-lp-color': 'rgb(var(--main-cover-color, 239 239 239))',
        '--amll-lp-hover-bg-color': statusStore.playerMetaShow
          ? 'rgba(var(--main-cover-color), 0.08)'
          : 'transparent',
        '--amll-lyric-left-padding': settingStore.lyricAlignRight
          ? ''
          : `${settingStore.lyricHorizontalOffset}px`,
        '--amll-lyric-right-padding': settingStore.lyricAlignRight
          ? `${settingStore.lyricHorizontalOffset}px`
          : '',
      }"
    >
      <div v-if="statusStore.lyricLoading" class="lyric-loading">歌词正在加载中...</div>
      <LyricPlayer
        v-else
        ref="lyricPlayerRef"
        :lyricLines="amLyricsData"
        :currentTime="currentTime"
        :playing="statusStore.playStatus"
        :enableSpring="settingStore.useAMSpring"
        :enableScale="settingStore.useAMSpring"
        :alignPosition="settingStore.lyricsScrollOffset"
        :alignAnchor="settingStore.lyricsScrollOffset > 0.4 ? 'center' : 'top'"
        :enableBlur="settingStore.lyricsBlur"
        :hidePassedLines="settingStore.hidePassedLines"
        :wordFadeWidth="settingStore.wordFadeWidth"
        :style="{
          '--display-count-down-show': settingStore.countDownShow ? 'flex' : 'none',
          '--amll-lp-font-size': getFontSize(
            settingStore.lyricFontSize,
            settingStore.lyricFontSizeMode,
          ),
          'font-weight': settingStore.lyricFontWeight,
          'font-family': settingStore.LyricFont !== 'follow' ? settingStore.LyricFont : '',
          ...lyricLangFontStyle(settingStore),
        }"
        class="am-lyric"
        @line-click="jumpSeek"
      />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { LyricLineMouseEvent, type LyricLine } from "@applemusic-like-lyrics/core";
import { useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { getLyricLanguage } from "@/utils/format";
import { usePlayerController } from "@/core/player/PlayerController";
import { cloneDeep } from "lodash-es";
import { lyricLangFontStyle } from "@/utils/lyric/lyricFontConfig";
import { getFontSize } from "@/utils/style";

defineProps({
  currentTime: {
    type: Number,
    default: 0,
  },
});

const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();
const player = usePlayerController();

const lyricPlayerRef = ref<any | null>(null);

// 当前歌词
const amLyricsData = computed(() => {
  const { songLyric } = musicStore;
  if (!songLyric) return [];
  // 优先使用逐字歌词(YRC/TTML)
  const useYrc = songLyric.yrcData?.length && settingStore.showYrc;
  const lyrics = useYrc ? songLyric.yrcData : songLyric.lrcData;
  // 简单检查歌词有效性
  if (!Array.isArray(lyrics) || lyrics.length === 0) return [];
  // 此处cloneDeep 删除会暴毙 不要动
  const clonedLyrics = cloneDeep(lyrics) as LyricLine[];
  // 处理歌词内容
  const { showTran, showRoma, showWordsRoma, swapTranRoma, lyricAlignRight } = settingStore;
  clonedLyrics.forEach((line) => {
    // 处理显隐
    if (!showTran) line.translatedLyric = "";
    if (!showRoma) line.romanLyric = "";
    if (!showWordsRoma) line.words?.forEach((word) => (word.romanWord = ""));
    // 调换翻译与音译位置
    if (swapTranRoma) {
      const temp = line.translatedLyric;
      line.translatedLyric = line.romanLyric;
      line.romanLyric = temp;
    }
    // 处理对唱方向反转
    if (lyricAlignRight) {
      line.isDuet = !line.isDuet;
    }
  });
  return clonedLyrics;
});

// 是否有对唱行
const hasDuet = computed(() => amLyricsData.value?.some((line) => line.isDuet) ?? false);

// 进度跳转
const jumpSeek = (line: LyricLineMouseEvent) => {
  const lineContent = line.line.getLine();
  if (!lineContent?.startTime) return;
  const time = lineContent.startTime;
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
    // 跳过空行
    if (!content) continue;
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
</script>

<style lang="scss" scoped>
.lyric-am {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  isolation: isolate;

  :deep(.am-lyric) {
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    padding-left: var(--amll-lyric-left-padding, 10px);
    padding-right: 80px;
    div {
      div[class^="_interludeDots"] {
        display: var(--display-count-down-show);
      }
    }
    @media (max-width: 990px) {
      padding: 0;
      margin-left: 0;
      .amll-lyric-player {
        > div {
          padding-left: 20px;
          padding-right: 20px;
        }
      }
    }
  }

  &.align-right {
    :deep(.am-lyric) {
      padding-left: 80px;
      padding-right: var(--amll-lyric-right-padding, 10px);

      @media (max-width: 990px) {
        padding: 0;
        margin-right: -20px;
      }
      @media (max-width: 500px) {
        margin-right: 0;
      }
    }
  }
  &.pure {
    &:not(.duet) {
      text-align: center;

      :deep(.am-lyric) div {
        transform-origin: center;
      }
    }

    :deep(.am-lyric) {
      margin: 0;
      padding: 0 80px;
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

  :deep(.am-lyric div[class*="lyricMainLine"] span) {
    text-align: start;
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
