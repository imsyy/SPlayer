<template>
  <n-card
    id="lyrics-show"
    :content-style="{
      'flex-direction': 'column',
      'align-items': settingStore.lyricsPosition,
      '--font-weight': settingStore.lyricFontWeight,
      '--font-size': getFontSize(settingStore.lyricFontSize, settingStore.lyricFontSizeMode),
      '--font-tran-size': getFontSize(tranFontSize, settingStore.lyricFontSizeMode),
      '--font-roma-size': getFontSize(romaFontSize, settingStore.lyricFontSizeMode),
      '--transform-origin':
        settingStore.lyricsPosition === 'center'
          ? 'center'
          : settingStore.lyricsPosition === 'flex-start'
            ? 'left'
            : 'right',
      '--font-family': settingStore.LyricFont !== 'follow' ? settingStore.LyricFont : '',
    }"
    class="set-item"
  >
    <n-card class="warning" v-if="settingStore.useAMLyrics">
      <n-text> 正在使用 Apple Music-like Lyrics，实际显示效果可能与此处的预览有较大差别 </n-text>
    </n-card>
    <div v-for="item in 2" :key="item" :class="['lrc-item', { on: item === 2 }]">
      <n-text>我是一句歌词</n-text>
      <template v-if="settingStore.swapTranRoma">
        <n-text v-if="settingStore.showRoma">wo shi yi ju ge ci</n-text>
        <n-text v-if="settingStore.showTran">I'm the lyric</n-text>
      </template>
      <template v-else>
        <n-text v-if="settingStore.showTran">I'm the lyric</n-text>
        <n-text v-if="settingStore.showRoma">wo shi yi ju ge ci</n-text>
      </template>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
import { getFontSize } from "@/utils/style";

const settingStore = useSettingStore();

const fontSizeComputed = (key: string) =>
  computed({
    get: () =>
      settingStore.useAMLyrics
        ? // AMLL 会为翻译和音译设置 `font-size: max(.5em, 10px);`
          Math.max(0.5 * settingStore.lyricFontSize, 10)
        : settingStore[key],
    set: (value) => (settingStore[key] = value),
  });

const tranFontSize = fontSizeComputed("lyricTranFontSize");
const romaFontSize = fontSizeComputed("lyricRomaFontSize");
</script>

<style scoped lang="scss">
#lyrics-show {
  .lrc-item {
    display: flex;
    flex-direction: column;
    opacity: 0.3;
    transform-origin: var(--transform-origin);
    transform: scale(0.86);
    transition: all 0.3s;
    &.on {
      opacity: 1;
      transform: scale(1);
    }
    .n-text {
      font-family: var(--font-family);

      &:nth-of-type(1) {
        font-weight: var(--font-weight);
        font-size: var(--font-size);
      }
      &:nth-of-type(2) {
        opacity: 0.6;
        font-size: var(--font-tran-size);
      }
      &:nth-of-type(3) {
        opacity: 0.6;
        font-size: var(--font-roma-size);
      }
    }
  }
  .warning {
    border-radius: 8px;
    font-size: 16px;
    background-color: rgba(255, 255, 255, 0.1);
    margin-bottom: 4px;
    width: 100%;
    box-sizing: border-box;
  }
}
</style>
