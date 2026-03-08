<template>
  <div
    class="taskbar-lyric"
    :class="{ dark: state.isDark, 'layout-reverse': !state.isCenter, floating: isFloating }"
    :style="rootStyle"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="cover-wrapper" v-if="coverSrc && taskbarConfig.showCover">
      <Transition name="cross-fade">
        <img :key="coverSrc" :src="coverSrc" class="cover" alt="cover" @error="onCoverError" />
      </Transition>
    </div>

    <Transition name="controls-expand">
      <div class="media-controls" v-if="showControls">
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
      <div class="lyric-view-container">
        <Transition :name="taskbarConfig.animationMode" mode="out-in">
          <TransitionGroup
            tag="div"
            class="lyric-list-wrapper"
            :class="{ 'metadata-mode': isHovering }"
            name="lyric-list"
            :key="transitionKey"
            @before-leave="onBeforeLeave"
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
                :words="item.words"
                :currentTime="state.currentTime"
                :isActive="item.isActive"
                :mode="
                  isHovering
                    ? 'line'
                    : item.itemType === 'main' && !currentLyricText
                      ? 'line'
                      : state.lyricType
                "
                :progress="item.progress"
                @resize-width="(w) => handleLyricResize(item.key, w)"
              />
            </div>
          </TransitionGroup>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  DEFAULT_TASKBAR_CONFIG,
  TASKBAR_IPC_CHANNELS,
  type SyncStatePayload,
  type SyncTickPayload,
  type TaskbarConfig,
} from "@/types/shared";
import { calculateLyricIndex, getSafeEndTime } from "@/utils/calc";
import { getLineText } from "@/utils/lyric/parseTTML";
import type { LyricLine, LyricWord } from "@applemusic-like-lyrics/lyric";
import type { CSSProperties } from "vue";
import { useRoute } from "vue-router";
import LyricScroll from "./LyricScroll.vue";

const route = useRoute();
const taskbarConfig = reactive<TaskbarConfig>({ ...DEFAULT_TASKBAR_CONFIG });
const isFloating = computed(() => route.query.mode === "floating");
const isHovering = ref(false);
const showControls = computed(() => !isFloating.value && isHovering.value);

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
  isActive: boolean;
  itemType: "main" | "sub" | "next";
  words?: LyricWord[];
  progress: number;
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
    "--lyric-font-family": lyricFontFamily.value,
    "--lyric-font-weight": String(taskbarConfig.fontWeight),
    "--lyric-font-scale": String(taskbarConfig.fontScale),
    "--lyric-line-height": String(taskbarConfig.lineHeight),
    "--lyric-main-scale": String(taskbarConfig.mainScale),
    "--lyric-sub-scale": String(taskbarConfig.subScale),
  };

  if (state.themeColor) {
    style.color = state.isDark ? state.themeColor.dark : state.themeColor.light;
  }

  return style;
});

const lyricFontFamily = computed(() => {
  const raw = taskbarConfig.fontFamily || "system-ui";
  if (raw === "follow") return "system-ui";
  if (raw === "default") return "inherit";
  return raw;
});

const handleMouseEnter = () => {
  if (!isFloating.value) isHovering.value = true;
};

const handleMouseLeave = () => {
  isHovering.value = false;
};

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

const onBeforeLeave = (el: Element) => {
  const element = el as HTMLElement;
  const parent = element.parentElement;
  if (!parent) return;

  const elementRect = element.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  const top = elementRect.top - parentRect.top;
  const left = elementRect.left - parentRect.left;

  element.style.position = "absolute";
  element.style.top = `${top}px`;
  element.style.left = `${left}px`;
  element.style.width = `${elementRect.width}px`;
  element.style.height = `${elementRect.height}px`;
};

const createMetadataItems = (title: string, artist: string): DisplayItem[] => {
  const items: DisplayItem[] = [
    {
      key: `meta-title-${title}`,
      text: title || "SPlayer",
      isPrimary: true,
      isActive: true,
      itemType: "main",
      progress: 0,
    },
  ];

  if (artist) {
    items.push({
      key: `meta-artist-${artist}`,
      text: artist,
      isPrimary: false,
      isActive: false,
      itemType: "sub",
      progress: 0,
    });
  }

  return items;
};

const mainLyrics = ref<LyricLine[]>([]);
const mainToRawIndex = ref<number[]>([]);
const mainSafeEnds = ref<number[]>([]);
const mainLyricIndex = ref(-1);
const bgCache = ref<{ line: LyricLine; rawIndex: number } | null>(null);
const mainBgMap = ref<Map<number, { line: LyricLine; rawIndex: number }>>(new Map());

const rebuildMainLyrics = (lyrics: LyricLine[]) => {
  const mains: LyricLine[] = [];
  const map: number[] = [];
  const bgMap = new Map<number, { line: LyricLine; rawIndex: number }>();

  let currentMainIdx = -1;
  lyrics.forEach((line, rawIdx) => {
    if (!line.isBG) {
      mains.push(line);
      map.push(rawIdx);
      currentMainIdx = mains.length - 1;
    } else if (currentMainIdx >= 0 && !bgMap.has(currentMainIdx)) {
      bgMap.set(currentMainIdx, { line, rawIndex: rawIdx });
    }
  });

  const safeEnds = mains.map((_, idx) => {
    const v = getSafeEndTime(mains, idx);
    return v > 0 ? v : Infinity;
  });

  mainLyrics.value = mains;
  mainToRawIndex.value = map;
  mainSafeEnds.value = safeEnds;
  mainBgMap.value = bgMap;
  mainLyricIndex.value = -1;
  state.lyricIndex = -1;
  bgCache.value = null;
};

watch(
  () => state.lyrics,
  (lyrics) => rebuildMainLyrics(lyrics),
  { immediate: true },
);

/**
 * 解析歌词行的安全结束时间
 * 优先使用行内 endTime，无效时回退到安全结束时间计算
 */
const resolveLineSafeEnd = (line: LyricLine, lineIndex?: number): number | null => {
  const startTime = Number(line.startTime);
  if (!Number.isFinite(startTime)) return null;
  const endTime = Number(line.endTime);
  if (Number.isFinite(endTime) && endTime > startTime) return endTime;
  const idx = lineIndex ?? state.lyrics.indexOf(line);
  if (idx < 0) return null;
  const safeEnd = getSafeEndTime(state.lyrics, idx);
  return Number.isFinite(safeEnd) && safeEnd > startTime ? safeEnd : null;
};

/**
 * 计算逐字滚动进度
 * 仅在有效时长内返回 0~1 的进度值
 */
const calcScrollProgress = (startTime: number, endTime: number | null, currentTime: number) => {
  if (endTime === null) return 0;
  const totalDuration = endTime - startTime;
  if (totalDuration <= 0) return 0;
  const BUFFER_RATIO = 0.2;
  const activeScrollDuration = totalDuration * (1 - BUFFER_RATIO);
  const elapsed = currentTime - startTime;
  if (activeScrollDuration <= 10) {
    return elapsed >= activeScrollDuration ? 1 : 0;
  }
  const rawProgress = elapsed / activeScrollDuration;
  return Math.max(0, Math.min(rawProgress, 1));
};

/**
 * 获取指定歌词行的滚动进度
 * 非逐字模式或无有效时间窗口时返回 0
 */
const getLineProgress = (line: LyricLine | undefined, lineIndex?: number) => {
  if (!line) return 0;
  if (state.lyricType !== "word") return 0;
  const safeEnd = resolveLineSafeEnd(line, lineIndex);
  return calcScrollProgress(Number(line.startTime), safeEnd, state.currentTime);
};

/**
 * 更新当前主歌词对应的 BG 行缓存
 * 直接从预计算的 mainBgMap 中 O(1) 查找
 */
const updateBgCache = () => {
  const idx = mainLyricIndex.value;
  if (idx < 0 || idx >= mainLyrics.value.length) {
    bgCache.value = null;
    return;
  }
  bgCache.value = mainBgMap.value.get(idx) ?? null;
};

watch(mainLyricIndex, updateBgCache);

const displayItems = computed<DisplayItem[]>(() => {
  if (!currentLyricText.value) {
    return createMetadataItems(state.title, state.artist);
  }

  if (!mainLyrics.value.length || mainLyricIndex.value < 0) return [];

  const currentLine = mainLyrics.value[mainLyricIndex.value];
  const currentRawIndex = mainToRawIndex.value[mainLyricIndex.value] ?? -1;
  if (currentRawIndex < 0) return [];
  const currentText = getLineText(currentLine);

  const shouldShowWords = taskbarConfig.showWordLyrics && state.lyricType === "word";
  const bgLine = bgCache.value?.line;
  const hasBg = !!bgLine;
  let subText = "";
  if (!hasBg) {
    if (taskbarConfig.showTranslation && currentLine.translatedLyric) {
      subText = currentLine.translatedLyric;
    }
  }

  const items: DisplayItem[] = [];

  items.push({
    key: `${currentLine.startTime}-${currentRawIndex}-main`,
    text: currentText,
    isPrimary: true,
    isActive: true,
    itemType: "main",
    words: shouldShowWords ? currentLine.words : undefined,
    progress: currentLineProgress.value,
  });

  if (hasBg) {
    items.push({
      key: `${currentLine.startTime}-${currentRawIndex}-sub`,
      text: getLineText(bgLine),
      isPrimary: false,
      isActive: shouldShowWords && !!bgLine?.words?.length,
      itemType: "sub",
      words: shouldShowWords ? bgLine?.words : undefined,
      progress: getLineProgress(bgLine, bgCache.value?.rawIndex),
    });
  } else if (subText) {
    items.push({
      key: `${currentLine.startTime}-${currentRawIndex}-sub`,
      text: subText,
      isPrimary: false,
      isActive: false,
      itemType: "sub",
      progress: 0,
    });
  } else if (!taskbarConfig.singleLineMode) {
    const nextLine = mainLyrics.value[mainLyricIndex.value + 1];
    if (nextLine) {
      const nextRawIndex = mainToRawIndex.value[mainLyricIndex.value + 1] ?? -1;
      const nextText = getLineText(nextLine);
      items.push({
        key: `${nextLine.startTime}-${nextRawIndex}-main`,
        text: nextText,
        isPrimary: false,
        isActive: false,
        itemType: "next",
        progress: 0,
      });
    }
  }

  return items;
});

const itemsToRender = computed<DisplayItem[]>(() => {
  if (isHovering.value) {
    return createMetadataItems(state.title, state.artist);
  }
  return displayItems.value;
});

const currentLineProgress = computed(() => {
  if (!state.lyrics.length || state.lyricIndex < 0) return 0;
  if (state.lyricType !== "word") return 0;

  const currentLine = state.lyrics[state.lyricIndex];
  const safeEnd = resolveLineSafeEnd(currentLine, state.lyricIndex);
  return calcScrollProgress(Number(currentLine.startTime), safeEnd, state.currentTime);
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

  const activeKeys = new Set(displayItems.value.map((i) => i.key));
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

let rafId: number | null = null;
let lastTimestamp = 0;
const jumpCount = ref(0);

const updateLyric = () => {
  if (!mainLyrics.value.length) {
    mainLyricIndex.value = -1;
    state.lyricIndex = -1;
    return;
  }
  const firstLineCompensation = mainLyricIndex.value === -1 ? 400 : 0;
  const newMainIndex = calculateLyricIndex(
    state.currentTime + firstLineCompensation,
    mainLyrics.value,
    state.offset,
    1,
  );
  if (newMainIndex !== mainLyricIndex.value) {
    mainLyricIndex.value = newMainIndex;
    state.lyricIndex = newMainIndex >= 0 ? (mainToRawIndex.value[newMainIndex] ?? -1) : -1;
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
  () => mainLyricIndex.value,
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

const applyConfig = (config: Partial<TaskbarConfig>) => {
  if (Object.keys(config).length === 0) return;

  Object.assign(taskbarConfig, config);

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
        mainLyricIndex.value = -1;
        jumpCount.value = 0;

        state.isPlaying = playback.isPlaying;
        state.currentTime = playback.tick[0];
        state.offset = playback.tick[2] || 0;

        applyConfig(config);
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
        mainLyricIndex.value = -1;
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
        applyConfig(payload.data);
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
  padding: 0 0.9em;
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
  font-family: var(--lyric-font-family, inherit);
  font-weight: var(--lyric-font-weight, 400);
  font-size: calc(clamp(12px, 30vh, 16px) * var(--lyric-font-scale, 1));

  will-change: opacity, filter;
  transition:
    background-color 0.15s,
    opacity 0.4s ease,
    filter 0.4s ease;

  --lyric-ease: cubic-bezier(0.4, 0, 0.2, 1);

  &.layout-reverse {
    flex-direction: row-reverse;
  }

  &.dark {
    color: $dark-color;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }

  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.2);
  }

  &.floating {
    font-size: calc(clamp(12px, 29vh, 26px) * var(--lyric-font-scale, 1));
    -webkit-app-region: drag;

    .media-controls,
    .control-btn {
      -webkit-app-region: no-drag;
    }

    &:hover,
    &:active {
      background-color: transparent;
    }

    .cover-wrapper,
    .content {
      pointer-events: none;
    }
  }
}

.cover-wrapper {
  position: relative;
  height: 80%;
  aspect-ratio: 1 / 1;
  margin-left: 0.4em;
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

.content {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1 1 auto;
  width: auto;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  box-sizing: border-box;
  transition: opacity 0.3s ease;

  --mask-gap: 0.4em;
  --mask-vertical: linear-gradient(
    to bottom,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );
  --mask-horizontal: linear-gradient(
    to right,
    transparent 0%,
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

    .line-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}

.lyric-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  min-height: 1.1em;
  padding: 0 0.3em;
  box-sizing: border-box;
  line-height: var(--lyric-line-height, 1.1);
  transition: all 0.4s var(--lyric-ease);

  .line-text {
    display: block;
    width: 100%;
    font-size: 1em;
    transition:
      transform 0.4s var(--lyric-ease),
      opacity 0.4s var(--lyric-ease);
    will-change: transform, opacity;
    transform: scale(var(--lyric-main-scale, 1));

    &.single {
      font-size: 1em;
    }
  }

  &.is-sub {
    .line-text {
      opacity: 0.7;
      transform: scale(var(--lyric-sub-scale, 0.8));
    }
  }

  &.is-next {
    .line-text {
      opacity: 0.7;
      transform: scale(var(--lyric-sub-scale, 0.8));
    }
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

.media-controls {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  height: auto;
  max-width: 6.6em;
  gap: 0.25em;
  overflow: hidden;
  margin: 0 0.2em;
  z-index: 10;

  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2em;
    height: 2em;
    aspect-ratio: 1 / 1;
    font-size: 1em;
    color: inherit;
    border-radius: 4px;
    border: 1px solid rgba(128, 128, 128, 0.4);
    box-sizing: border-box;
    transition:
      background-color 0.2s,
      border-color 0.2s;

    &:hover {
      background-color: rgba(128, 128, 128, 0.2);
      border-color: rgba(128, 128, 128, 0.7);
    }

    &:active {
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
    max-width: 6.6em;
    opacity: 1;
    margin: 0 0.2em;
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
