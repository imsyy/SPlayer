<template>
  <div
    class="taskbar-lyric"
    :class="{ dark: state.isDark, 'layout-reverse': !state.isCenter }"
    :style="rootStyle"
    @mouseenter="isHovering = true"
    @mouseleave="isHovering = false"
  >
    <div class="cover-wrapper" v-if="coverSrc && settingStore.taskbarLyricShowCover">
      <Transition name="cross-fade">
        <img :key="coverSrc" :src="coverSrc" class="cover" alt="cover" @error="onCoverError" />
      </Transition>
    </div>

    <Transition name="controls-expand">
      <div class="media-controls" v-if="isHovering">
        <div class="control-btn" @click.stop="controlAction('playPrev')">
          <SvgIcon name="SkipPrev" />
        </div>
        <div class="control-btn" @click.stop="controlAction('playOrPause')">
          <SvgIcon :name="state.isPlaying ? 'Pause' : 'Play'" />
        </div>
        <div class="control-btn" @click.stop="controlAction('playNext')">
          <SvgIcon name="SkipNext" />
        </div>
      </div>
    </Transition>

    <div class="content" :style="contentStyle">
      <Transition name="content-switch">
        <div :key="viewKey" class="lyric-view-container">
          <Transition :name="settingStore.taskbarLyricAnimationMode" mode="out-in">
            <TransitionGroup
              tag="div"
              class="lyric-list-wrapper"
              :class="{ 'metadata-mode': isHovering }"
              name="lyric-list"
              :key="innerTransitionKey"
            >
              <div
                v-for="item in itemsToRender"
                :key="item.key"
                class="lyric-item"
                :class="{
                  'is-primary': item.isPrimary,
                  'is-sub': item.itemType === 'sub',
                  'is-next': item.itemType === 'next',
                }"
              >
                <LyricScroll
                  class="line-text"
                  :style="{ transformOrigin: state.isCenter ? 'center left' : 'center right' }"
                  :text="item.text"
                  :isActive="item.isPrimary"
                  :mode="
                    item.itemType === 'main' && !currentLyricText && !isHovering
                      ? 'line'
                      : state.lyricType
                  "
                  :progress="item.itemType === 'main' ? currentLineProgress : 0"
                  @resize-width="(w) => handleLyricResize(item.key, w)"
                />
              </div>
            </TransitionGroup>
          </Transition>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
import {
  TASKBAR_IPC_CHANNELS,
  type SyncStatePayload,
  type SyncTickPayload,
  type TaskbarConfig,
} from "@/types/shared";
import type { LyricLine } from "@applemusic-like-lyrics/lyric";
import type { CSSProperties } from "vue";
import LyricScroll from "./LyricScroll.vue";

const settingStore = useSettingStore();

/**
 * 只有当 IPC 时间与本地时间误差超过 250ms 时，才同步 IPC 的时间
 *
 * IPC 传来的时间有约 50ms 的延迟，可能导致 rAF 的时间抢跑了 50ms
 * 显示到了下一行歌词，而 IPC 传的时间又把歌词拉回到上一句
 */
const SYNC_THRESHOLD_MS = 250;

interface DisplayItem {
  key: string | number;
  text: string;
  isPrimary: boolean;
  itemType: "main" | "sub" | "next";
}

const state = reactive({
  title: "",
  artist: "",
  cover: "",

  isPlaying: false,
  currentTime: 0,
  duration: 0,
  offset: 0,

  lyrics: [] as LyricLine[],
  lyricType: "line" as "line" | "word",
  lyricIndex: -1,

  isDark: true,
  /**
   * 当前任务栏的对齐方式
   *
   * 只在 Win11 上可能会为 true，Win10 上总为 false
   */
  isCenter: false,
  themeColor: null as { light: string; dark: string } | null,
  opacity: 1,
  blurVal: 0,
});

// 默认封面图片
const DEFAULT_COVER = "/images/song.jpg?asset";

// 封面加载失败标记
const coverLoadFailed = ref(false);

// 计算实际显示的封面 URL
const coverSrc = computed(() => {
  if (coverLoadFailed.value || !state.cover) {
    return DEFAULT_COVER;
  }
  return state.cover;
});

// 封面加载失败处理
const onCoverError = () => {
  coverLoadFailed.value = true;
};

const rootStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {
    "--dynamic-opacity": state.opacity,
    "--dynamic-blur": `${state.blurVal}px`,
  };

  if (state.themeColor) {
    style.color = state.isDark ? state.themeColor.dark : state.themeColor.light;
  }

  return style;
});

const lyricFontFamily = computed(() => {
  const font =
    settingStore.LyricFont === "follow" ? settingStore.globalFont : settingStore.LyricFont;
  return font === "default" ? "inherit" : font;
});

const isHovering = ref(false);

const controlAction = (action: "playPrev" | "playOrPause" | "playNext") => {
  const ipc = window.electron?.ipcRenderer;
  if (!ipc) return;

  if (action === "playOrPause") {
    state.isPlaying = !state.isPlaying;
  }

  ipc.send("send-to-main-win", action);
};

const transitionKey = computed(() => {
  if (!currentLyricText.value) {
    return `meta-${state.title}-${state.artist}`;
  }

  return `lyric-group-${jumpCount.value}`;
});

const createMetadataItems = (title: string, artist: string): DisplayItem[] => {
  const items: DisplayItem[] = [
    {
      key: `meta-title-${title}`,
      text: title || "SPlayer",
      isPrimary: true,
      itemType: "main",
    },
  ];

  if (artist) {
    items.push({
      key: `meta-artist-${artist}`,
      text: artist,
      isPrimary: false,
      itemType: "sub",
    });
  }

  return items;
};

const itemsToRender = computed(() => {
  if (isHovering.value) {
    return createMetadataItems(state.title, state.artist);
  }
  return displayItems.value;
});

const viewKey = computed(() => (isHovering.value ? "metadata-view" : "lyric-view"));

const innerTransitionKey = computed(() => {
  if (isHovering.value) {
    return `meta-${state.title}-${state.artist}`;
  }
  return transitionKey.value;
});

const displayItems = computed<DisplayItem[]>(() => {
  if (!currentLyricText.value) {
    return createMetadataItems(state.title, state.artist);
  }

  if (!state.lyrics.length || state.lyricIndex < 0) return [];

  const currentLine = state.lyrics[state.lyricIndex];
  const currentText =
    currentLine.words
      ?.map((w) => w.word)
      .join("")
      .trim() || "";

  let subText = "";
  if (settingStore.showTran && currentLine.translatedLyric) {
    subText = currentLine.translatedLyric;
  } else if (settingStore.showRoma && currentLine.romanLyric) {
    subText = currentLine.romanLyric;
  }

  const items: DisplayItem[] = [];

  items.push({
    key: `${currentLine.startTime}-${state.lyricIndex}-main`,
    text: currentText,
    isPrimary: true,
    itemType: "main",
  });

  if (subText) {
    items.push({
      key: `${currentLine.startTime}-${state.lyricIndex}-sub`,
      text: subText,
      isPrimary: false,
      itemType: "sub",
    });
  } else if (!settingStore.taskbarLyricSingleLineMode) {
    const nextLine = state.lyrics[state.lyricIndex + 1];
    if (nextLine) {
      const nextText =
        nextLine.words
          ?.map((w) => w.word)
          .join("")
          .trim() || "";
      items.push({
        key: `${nextLine.startTime}-${state.lyricIndex + 1}-main`,
        text: nextText,
        isPrimary: false,
        itemType: "next",
      });
    }
  }

  return items;
});

const currentLineProgress = computed(() => {
  if (!state.lyrics.length || state.lyricIndex < 0) return 0;
  if (state.lyricType !== "word") return 0;

  const currentLine = state.lyrics[state.lyricIndex];
  const startTime = currentLine.startTime;
  const endTime = currentLine.endTime;
  const totalDuration = endTime - startTime;

  if (totalDuration <= 0) return 1;

  const BUFFER_RATIO = 0.2;

  const activeScrollDuration = totalDuration * (1 - BUFFER_RATIO);

  const elapsed = state.currentTime - startTime;

  if (activeScrollDuration <= 10) {
    return elapsed >= activeScrollDuration ? 1 : 0;
  }

  const rawProgress = elapsed / activeScrollDuration;

  return Math.max(0, Math.min(rawProgress, 1));
});

const lyricsWidthMap = new Map<string | number, number>();
const lastRequestedWidth = ref(0);

const handleLyricResize = (key: string | number, width: number) => {
  lyricsWidthMap.set(key, width);
  calculateAndResizeWindow();
};

const calculateAndResizeWindow = () => {
  const ipc = window.electron?.ipcRenderer;
  if (!ipc) return;
  if (isHovering.value) return;

  const activeKeys = new Set(itemsToRender.value.map((i) => i.key));
  let maxTextWidth = 0;

  for (const [key, width] of lyricsWidthMap) {
    if (activeKeys.has(key)) {
      if (width > maxTextWidth) maxTextWidth = width;
    } else {
      lyricsWidthMap.delete(key);
    }
  }

  const BASE_WIDTH = 200; // Cover, controls, padding, etc.
  const requiredWidth = BASE_WIDTH + maxTextWidth;

  if (requiredWidth !== lastRequestedWidth.value) {
    lastRequestedWidth.value = requiredWidth;
    ipc.send("taskbar:set-width", requiredWidth);
  }
};

watch(isHovering, (newVal) => {
  if (!newVal) {
    calculateAndResizeWindow();
  }
});

watch(
  () => state.title,
  () => {
    lyricsWidthMap.clear();
    lastRequestedWidth.value = 0;
  },
);

const currentLyricText = computed(() => {
  if (!state.lyrics.length || state.lyricIndex < 0) return "";
  return state.lyrics[state.lyricIndex]?.words?.map((w) => w.word).join("") || "";
});

const findLyricIndex = (currentTime: number, lyrics: LyricLine[], offset: number = 0): number => {
  const targetTime = currentTime - offset;
  let low = 0;
  let high = lyrics.length - 1;
  let index = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const lineTime = lyrics[mid].startTime;
    if (lineTime <= targetTime) {
      index = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return index;
};

let rafId: number | null = null;
let lastTimestamp = 0;
const LYRIC_LOOKAHEAD = 300;
const jumpCount = ref(0);

const updateLyric = () => {
  if (state.lyrics.length) {
    // 提前 0.4s 以便让歌词进场动画跑完
    const firstLineCompensation = state.lyricIndex === -1 ? 400 : 0;

    const newIndex = findLyricIndex(
      state.currentTime + LYRIC_LOOKAHEAD + firstLineCompensation,
      state.lyrics,
      state.offset,
    );
    if (newIndex !== state.lyricIndex) {
      state.lyricIndex = newIndex;
    }
  }
};

const loop = (timestamp: number) => {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const delta = timestamp - lastTimestamp;
  if (state.isPlaying) {
    state.currentTime += delta;
    updateLyric();
  }
  lastTimestamp = timestamp;
  rafId = requestAnimationFrame(loop);
};

const startLoop = () => {
  if (rafId) return;
  lastTimestamp = performance.now();
  rafId = requestAnimationFrame(loop);
};

const stopLoop = () => {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
};

watch(
  () => state.lyricIndex,
  (newIndex, oldIndex) => {
    if (oldIndex === -1 || newIndex === -1) return;
    if (newIndex !== oldIndex + 1) {
      jumpCount.value++;
    }
  },
);

const contentStyle = computed<CSSProperties>(() => ({
  textAlign: state.isCenter ? "left" : "right",
}));

const configMap: Partial<Record<keyof TaskbarConfig, keyof typeof settingStore>> = {
  showCover: "taskbarLyricShowCover",
  animationMode: "taskbarLyricAnimationMode",
  singleLineMode: "taskbarLyricSingleLineMode",
  fontFamily: "LyricFont",
  globalFont: "globalFont",
  fontWeight: "taskbarLyricFontWeight",
  showTranslation: "showTran",
  showRomaji: "showRoma",
  showWhenPaused: "taskbarLyricShowWhenPaused",
};

const applyConfigToStore = (config: Partial<TaskbarConfig>) => {
  const patches: Record<string, unknown> = {};

  (Object.keys(config) as Array<keyof TaskbarConfig>).forEach((key) => {
    const storeKey = configMap[key];
    const value = config[key];

    if (storeKey && value !== undefined) {
      patches[storeKey] = value;
    }
  });

  if (Object.keys(patches).length > 0) {
    settingStore.$patch(patches);
  }

  if (config.themeMode !== undefined) {
    state.isDark =
      config.themeMode === "auto"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : config.themeMode === "dark";
  }
};

onMounted(() => {
  const ipc = window.electron?.ipcRenderer;
  if (!ipc) return;

  ipc.on(TASKBAR_IPC_CHANNELS.SYNC_STATE, (_, payload: SyncStatePayload) => {
    switch (payload.type) {
      case "full-hydration": {
        const { track, lyrics, playback, config, themeColor } = payload.data;
        state.title = track.title;
        state.artist = track.artist;
        state.cover = track.cover;
        state.duration = playback.tick[1] || 0;

        state.lyrics = lyrics.lines;
        state.lyricType = lyrics.type;
        state.lyricIndex = -1;
        jumpCount.value = 0;

        state.isPlaying = playback.isPlaying;
        state.currentTime = playback.tick[0];
        state.offset = playback.tick[2] || 0;

        applyConfigToStore(config);
        state.themeColor = themeColor;

        lastTimestamp = performance.now();
        state.isPlaying ? startLoop() : stopLoop();
        updateLyric();
        break;
      }

      case "track-change": {
        const data = payload.data;

        state.title = data.title;
        state.artist = data.artist;
        state.cover = data.cover || "";

        state.currentTime = 0;
        jumpCount.value = 0;
        coverLoadFailed.value = false;
        break;
      }

      case "lyrics-loaded": {
        const data = payload.data;

        state.lyrics = data.lines;
        state.lyricType = data.type;
        state.lyricIndex = -1;
        state.currentTime = 0;
        jumpCount.value = 0;
        coverLoadFailed.value = false;

        updateLyric();
        break;
      }

      case "playback-state": {
        state.isPlaying = payload.data.isPlaying;
        state.isPlaying ? startLoop() : stopLoop();
        break;
      }

      case "config-update": {
        applyConfigToStore(payload.data);
        break;
      }

      case "theme-color": {
        state.themeColor = payload.data;
        break;
      }

      case "system-theme": {
        state.isDark = payload.data.isDark;
        break;
      }
    }
  });

  ipc.on(TASKBAR_IPC_CHANNELS.SYNC_TICK, (_, [currentTime, duration, offset]: SyncTickPayload) => {
    state.duration = duration;
    state.offset = offset || 0;

    const diff = Math.abs(currentTime - state.currentTime);

    if (diff <= SYNC_THRESHOLD_MS && state.isPlaying) {
      return;
    }

    state.currentTime = currentTime;
    lastTimestamp = performance.now();
    updateLyric();
  });

  ipc.on("taskbar:update-layout", (_, { isCenter }: { isCenter: boolean }) => {
    state.isCenter = isCenter;
  });

  ipc.on("taskbar:fade-out", () => {
    state.opacity = 0;
    state.blurVal = 12;

    setTimeout(() => {
      ipc.send("taskbar:fade-done");
    }, 500);
  });

  ipc.on("taskbar:fade-in", () => {
    setTimeout(() => {
      state.opacity = 1;
      state.blurVal = 0;
    }, 200);
  });

  ipc.send(TASKBAR_IPC_CHANNELS.REQUEST_DATA);
});

onUnmounted(() => {
  stopLoop();
});
</script>

<style scoped lang="scss">
$base-color: #333639;
$dark-color: #ffffffd1;
$radius: 4px;

.taskbar-lyric {
  width: 100vw;
  height: 100vh;
  margin: 5px 0;
  padding: 0 10px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  overflow: hidden;
  opacity: var(--dynamic-opacity, 1);
  filter: blur(var(--dynamic-blur, 0px));

  color: $base-color;
  border-radius: $radius;
  user-select: none;
  font-family: v-bind(lyricFontFamily);
  font-weight: v-bind("settingStore.taskbarLyricFontWeight");

  will-change: opacity, filter;
  transition:
    background-color 0.15s,
    opacity 0.4s ease,
    filter 0.4s ease;

  --lyric-ease: cubic-bezier(0.4, 0, 0.2, 1);

  &.layout-reverse {
    flex-direction: row-reverse;

    .cover-wrapper {
      margin-right: 0;
      margin-left: 8px;
    }
  }

  &.dark {
    color: $dark-color;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    &:not(:has(.control-btn:active)):active {
      background-color: rgba(255, 255, 255, 0.2);
    }

    .control-btn:hover {
      background-color: rgba(255, 255, 255, 0.15);
    }
  }

  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }

  &:not(:has(.control-btn:active)):active {
    background-color: rgba(0, 0, 0, 0.2);
  }
}

.cover-wrapper {
  position: relative;
  height: 80%;
  aspect-ratio: 1 / 1;
  margin-right: 8px;
  border-radius: $radius;
  overflow: hidden;
  flex-shrink: 0;

  .cover {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 1;
  }
}

.cross-fade {
  &-enter-active,
  &-leave-active {
    transition: opacity 0.8s ease;
  }

  &-enter-active {
    z-index: 2;
  }

  &-enter-from,
  &-leave-to {
    opacity: 0;
  }
}

.media-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  max-width: 120px;
  gap: 6px;
  overflow: hidden;
  z-index: 10;

  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 62px;
    height: 32px;
    font-size: 18px;
    color: inherit;
    border-radius: $radius;
    border: 1px solid rgba(128, 128, 128, 0.4);
    box-sizing: border-box;
    transition:
      background-color 0.2s,
      transform 0.1s,
      border-color 0.2s;

    &:hover {
      background-color: rgba(128, 128, 128, 0.2);
      border-color: rgba(128, 128, 128, 0.7);
      opacity: 1;
    }

    &:active {
      transform: scale(0.92);
      background-color: rgba(128, 128, 128, 0.3);
      border-color: rgba(128, 128, 128, 0.9);
    }
  }
}

.controls-expand {
  &-enter-active,
  &-leave-active {
    transition: all 0.4s var(--lyric-ease);
  }

  &-enter-from,
  &-leave-to {
    max-width: 0;
    opacity: 0;
    margin: 0;
  }

  &-enter-to,
  &-leave-from {
    max-width: 120px;
    opacity: 1;
  }
}

.content {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-width: 0;
  box-sizing: border-box;
  transition: opacity 0.3s ease;

  --mask-gap: 6px;
  --mask-vertical: linear-gradient(
    to bottom,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );
  --mask-horizontal: linear-gradient(
    to right,
    transparent 0,
    black var(--mask-gap),
    black calc(100% - var(--mask-gap)),
    transparent 100%
  );

  mask-image: var(--mask-vertical), var(--mask-horizontal);
  mask-composite: intersect;
  -webkit-mask-image: var(--mask-vertical), var(--mask-horizontal);
  -webkit-mask-composite: source-in;
}

.lyric-view-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.lyric-list-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  height: 100%;
  margin-top: 1px;

  &.metadata-mode {
    justify-content: center;
  }
}

.lyric-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  min-height: 15px;
  padding: 0 4px;
  box-sizing: border-box;
  line-height: 1.1;
  transition: all 0.4s var(--lyric-ease);

  .line-text {
    display: block;
    width: 100%;
    font-size: 14px;
    transition:
      transform 0.4s var(--lyric-ease),
      opacity 0.4s var(--lyric-ease);
    will-change: transform, opacity;
    transform: scale(1);

    &.single {
      font-size: 14px;
    }
  }

  &.is-sub {
    .line-text {
      opacity: 0.7;
      transform: scale(0.8);
    }
  }

  &.is-next {
    .line-text {
      opacity: 0.7;
      transform: scale(0.8);
    }
  }
}

.content-switch {
  &-enter-active,
  &-leave-active {
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    pointer-events: none;
    transition: 0.4s var(--lyric-ease);
  }

  &-enter-from,
  &-leave-to {
    opacity: 0;
  }
}

.lyric-list {
  &-move {
    transition: transform 0.4s var(--lyric-ease);
  }

  &-enter-active,
  &-leave-active {
    transition: all 0.4s var(--lyric-ease);
  }

  &-enter-from {
    opacity: 0;
    transform: translateY(100%);
  }

  &-leave-active {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 0;
  }

  &-leave-to {
    &.lyric-item {
      opacity: 0;
      filter: blur(3px);
      transform: translateY(-100%);
    }
  }
}

.slide-blur {
  &-move,
  &-enter-active,
  &-leave-active {
    transition: all 0.4s var(--lyric-ease);
  }

  &-leave-active {
    position: absolute;
    width: 100%;
    z-index: 0;
  }

  &-enter-from {
    opacity: 0;
    filter: blur(4px);
    transform: translateY(12px);

    &.lyric-item {
      opacity: 0;
      filter: blur(4px);
      transform: translateY(12px) scale(1);
    }
  }

  &-leave-to {
    opacity: 0;
    filter: blur(4px);
    transform: translateY(-12px);

    &.lyric-item {
      opacity: 0;
      filter: blur(4px);
      transform: translateY(-12px) scale(1);
    }
  }
}

.left-sm {
  &-enter-active,
  &-leave-active {
    transition:
      transform 0.4s ease,
      opacity 0.4s ease;
  }

  &-enter-from,
  &-leave-to {
    opacity: 0;
    transform: translate3d(-5px, 0, 0);
  }
}
</style>

<style lang="scss">
body {
  background-color: transparent !important;
  margin: 0;
  overflow: hidden;
}
</style>
