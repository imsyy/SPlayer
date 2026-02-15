<template>
  <n-config-provider :theme="null">
    <div
      :class="[
        'desktop-lyric',
        {
          locked: lyricConfig.isLock,
          hovered: isHovered,
          'no-animation': !lyricConfig.animation,
        },
      ]"
      :style="{ '--mask-bg-color': lyricConfig.backgroundMaskColor }"
    >
      <div class="header" align="center" justify="space-between">
        <n-flex :wrap="false" align="center" justify="flex-start" size="small" @pointerdown.stop>
          <div class="menu-btn" @click.stop="sendToMain('win-show-main')">
            <SvgIcon name="Music" />
          </div>
          <span class="song-name">{{ lyricData.playName }} - {{ lyricData.artistName }}</span>
        </n-flex>
        <n-flex :wrap="false" align="center" justify="center" size="small" @pointerdown.stop>
          <div class="menu-btn" @click.stop="sendToMainWin('playPrev')">
            <SvgIcon name="SkipPrev" />
          </div>
          <div
            class="menu-btn"
            :title="lyricData.playStatus ? '暂停' : '播放'"
            @click.stop="sendToMainWin('playOrPause')"
          >
            <SvgIcon :name="lyricData.playStatus ? 'Pause' : 'Play'" />
          </div>
          <div class="menu-btn" @click.stop="sendToMainWin('playNext')">
            <SvgIcon name="SkipNext" />
          </div>
        </n-flex>
        <n-flex :wrap="false" align="center" justify="flex-end" size="small" @pointerdown.stop>
          <div
            class="menu-btn"
            @click.stop="sendToMain('open-setting', 'lyrics', 'showDesktopLyric')"
          >
            <SvgIcon name="Settings" />
          </div>
          <div
            class="menu-btn lock-btn"
            @mouseenter.stop="tempToggleLyricLock(false)"
            @mouseleave.stop="tempToggleLyricLock(true)"
            @click.stop="toggleLyricLock"
          >
            <SvgIcon :name="lyricConfig.isLock ? 'LockOpen' : 'Lock'" />
          </div>
          <div class="menu-btn" @click.stop="sendToMain('desktop-lyric:close')">
            <SvgIcon name="Close" />
          </div>
        </n-flex>
        <!-- 歌曲信息 -->
        <n-flex
          v-if="lyricConfig.alwaysShowPlayInfo"
          :size="0"
          :class="[
            'play-title',
            lyricConfig.position,
            { 'has-background-mask': lyricConfig.textBackgroundMask },
          ]"
          :style="{ fontFamily: lyricConfig.fontFamily }"
          vertical
        >
          <span class="name">{{ lyricData.playName }}</span>
          <span class="artist">{{ lyricData.artistName }}</span>
        </n-flex>
      </div>
      <TransitionGroup
        tag="div"
        :name="transitionName"
        :style="{
          fontSize: lyricConfig.fontSize + 'px',
          fontFamily: lyricConfig.fontFamily,
          fontWeight: lyricConfig.fontWeight,
          textShadow: `0 0 4px ${lyricConfig.shadowColor}`,
        }"
        :class="['lyric-container', lyricConfig.position]"
      >
        <div
          v-for="(line, index) in renderLyricLines"
          :key="line.key"
          :class="[
            'lyric-line',
            {
              active: line.active,
              'is-yrc': Boolean(lyricData?.yrcData?.length && line.line?.words?.length > 1),
              'has-background-mask': lyricConfig.textBackgroundMask,
              'is-next': !line.active && lyricConfig.isDoubleLine,
              'align-left': lyricConfig.position === 'both' && line.index % 2 === 0,
              'align-right': lyricConfig.position === 'both' && line.index % 2 !== 0,
            },
          ]"
          :style="{
            color: line.active ? lyricConfig.playedColor : lyricConfig.unplayedColor,
            top: getLineTop(index),
            fontSize: index > 0 ? '0.8em' : '1em',
            '--line-index': index,
          }"
          :ref="(el) => setLineRef(el, line.key)"
        >
          <!-- 逐字歌词渲染 -->
          <template
            v-if="lyricConfig.showYrc && lyricData?.yrcData?.length && line.line?.words?.length > 1"
          >
            <span
              class="scroll-content"
              :style="getScrollStyle(line)"
              :ref="(el) => setContentRef(el, line.key)"
            >
              <span class="content">
                <span
                  v-for="(text, textIndex) in line.line.words"
                  :key="textIndex"
                  :class="{
                    'content-text': true,
                    'end-with-space': text.word.endsWith(' ') || text.startTime === 0,
                  }"
                >
                  <span
                    class="word"
                    :style="[
                      {
                        backgroundImage: `linear-gradient(to right, ${lyricConfig.playedColor} 50%, ${lyricConfig.unplayedColor} 50%)`,
                        textShadow: 'none',
                        filter: `drop-shadow(0 0 1px ${lyricConfig.shadowColor}) drop-shadow(0 0 2px ${lyricConfig.shadowColor})`,
                      },
                      getYrcStyle(text, line.index),
                    ]"
                  >
                    {{ text.word }}
                  </span>
                </span>
              </span>
            </span>
          </template>
          <!-- 普通歌词保持原样 -->
          <template v-else>
            <span
              class="scroll-content"
              :style="getScrollStyle(line)"
              :ref="(el) => setContentRef(el, line.key)"
            >
              {{ line.line?.words?.[0]?.word || "" }}
            </span>
          </template>
        </div>
        <!-- 占位 -->
        <span v-if="renderLyricLines.length === 0" class="lyric-line" key="placeholder">
          &nbsp;
        </span>
      </TransitionGroup>
    </div>
  </n-config-provider>
</template>

<script setup lang="ts">
import { LyricLine, LyricWord } from "@applemusic-like-lyrics/lyric";
import { calculateLyricIndex } from "@/utils/calc";
import { LyricConfig, LyricData, RenderLine } from "@/types/desktop-lyric";
import defaultDesktopLyricConfig from "@/assets/data/lyricConfig";

const FALLBACK_INITIALIZATION_TIMEOUT = 2000; // 歌词窗口初始化后备超时时间，用于防止无数据时无限期空白

// 桌面歌词数据
const lyricData = reactive<LyricData>({
  playName: "",
  artistName: "",
  playStatus: false,
  currentTime: 0,
  lyricLoading: false,
  songId: 0,
  songOffset: 0,
  lrcData: [],
  yrcData: [],
  lyricIndex: -1,
});

// 锚点时间（毫秒）与锚点帧时间，用于插值推进
let baseMs = 0;
let anchorTick = 0;

// 实时播放进度（毫秒），基于 currentTime 与播放状态做插值
const playSeekMs = ref<number>(0);

// 每帧推进播放游标：播放中则以锚点加上经过的毫秒数推进，暂停则保持锚点
const { pause: pauseSeek, resume: resumeSeek } = useRafFn(() => {
  if (lyricData.playStatus) {
    playSeekMs.value = baseMs + (performance.now() - anchorTick);
  } else {
    playSeekMs.value = baseMs;
  }
});

// 300ms 提前量，用于补偿动画和感知延迟
const LYRIC_LOOKAHEAD = 300;

// 实时歌词索引
const currentLyricIndex = computed(() => {
  const lyrics =
    lyricConfig.showYrc && lyricData?.yrcData?.length ? lyricData.yrcData : lyricData.lrcData;
  // 边界检查
  if (!lyrics || !lyrics.length) return -1;
  return calculateLyricIndex(playSeekMs.value, lyrics, 0, 2);
});

// 桌面歌词配置
const lyricConfig = reactive<LyricConfig>({
  ...defaultDesktopLyricConfig,
});

// hover 状态控制
const isHovered = ref<boolean>(false);

// 初始化状态
const isInitializing = ref(true);

const { start: startHoverTimer } = useTimeoutFn(
  () => {
    isHovered.value = false;
  },
  1000,
  { immediate: false },
);

/**
 * 处理鼠标移动，更新 hover 状态
 */
const handleMouseMove = () => {
  // 设置 hover 状态（锁定和非锁定状态都响应）
  isHovered.value = true;
  startHoverTimer();
};

/**
 * 处理鼠标移出窗口，重置 hover 状态
 */
const handleMouseLeave = () => {
  isHovered.value = false;
};

/**
 * 计算安全的结束时间
 * - 优先使用当前行的 `endTime`
 * - 若为空则使用下一行的 `time` 作为当前行的结束参照
 * @param lyrics 歌词数组
 * @param idx 当前行索引
 * @returns 安全的结束时间（秒）
 */
const getSafeEndTime = (lyrics: LyricLine[], idx: number) => {
  const cur = lyrics?.[idx];
  const next = lyrics?.[idx + 1];
  const curEnd = Number(cur?.endTime);
  const curStart = Number(cur?.startTime);
  if (Number.isFinite(curEnd) && curEnd > curStart) return curEnd;
  const nextStart = Number(next?.startTime);
  if (Number.isFinite(nextStart) && nextStart > curStart) return nextStart;
  // 无有效结束参照：返回 0（表示无时长，不滚动）
  return 0;
};

/**
 * 占位歌词行
 * @param word 占位词
 * @returns 占位歌词行数组
 */
const placeholder = (word: string): RenderLine[] => [
  {
    line: {
      startTime: 0,
      endTime: 0,
      words: [{ word, startTime: 0, endTime: 0, romanWord: "" }],
      translatedLyric: "",
      romanLyric: "",
      isBG: false,
      isDuet: false,
    },
    index: -1,
    key: "placeholder",
    active: true,
  },
];

/**
 * 渲染的歌词行 transition name
 */
const transitionName = computed(() => {
  if (!lyricConfig.animation) return "";
  return "lyric-slide";
});

/**
 * 根据索引计算 absolute top
 */
const getLineTop = (index: number) => {
  // 统一使用 px 单位，避免因字体大小不同导致的 em 计算差异
  // 1.9 倍行距，折中方案
  if (index === 0) return "0px";
  return `${lyricConfig.fontSize * 1.9}px`;
};

/**
 * 渲染的歌词行
 * @returns 渲染的歌词行数组
 */
const renderLyricLines = computed<RenderLine[]>(() => {
  // 在初始化阶段，不渲染任何内容
  if (isInitializing.value) {
    return [];
  }

  const lyrics =
    lyricConfig.showYrc && lyricData?.yrcData?.length ? lyricData.yrcData : lyricData.lrcData;
  // 无歌曲名且无歌词
  if (!lyricData.playName && !lyrics?.length) {
    return placeholder("SPlayer Desktop Lyric");
  }
  // 加载中
  if (lyricData.lyricLoading) return placeholder("歌词加载中...");
  // 纯音乐
  if (!lyrics?.length) return placeholder("纯音乐，请欣赏");
  // 获取当前歌词索引
  const idx = currentLyricIndex.value;
  // 索引小于 0，显示歌曲名称
  if (idx < 0) {
    const playTitle = `${lyricData.playName} - ${lyricData.artistName}`;
    return placeholder(playTitle);
  }
  const current = lyrics[idx];
  const next = lyrics[idx + 1];
  if (!current) return [];
  const safeEnd = getSafeEndTime(lyrics, idx);
  // 翻译模式：显示 原文 + 翻译
  if (lyricConfig.showTran && current.translatedLyric) {
    // 使用稳定的 Key，避免 update 时重建
    const lines: RenderLine[] = [
      { line: { ...current, endTime: safeEnd }, index: idx, key: `${idx}-orig`, active: true },
      {
        line: {
          startTime: current.startTime,
          endTime: safeEnd,
          words: [
            {
              word: current.translatedLyric,
              startTime: current.startTime,
              endTime: safeEnd,
              romanWord: "",
            },
          ],
          translatedLyric: "",
          romanLyric: "",
          isBG: false,
          isDuet: false,
        },
        index: idx,
        key: `${idx}-tran`,
        active: false,
      },
    ];
    return lines;
  }
  // 双行模式：显示 当前 + 下一句
  if (lyricConfig.isDoubleLine) {
    const lines: RenderLine[] = [];
    // 当前行
    lines.push({
      line: { ...current, endTime: safeEnd },
      index: idx,
      key: `${idx}-orig`,
      active: true,
    });
    // 下一句
    if (next) {
      lines.push({
        line: next,
        index: idx + 1,
        key: `${idx + 1}-orig`, // 保持 Key 唯一且稳定
        active: false,
      });
    }
    return lines;
  }
  // 单行模式
  return [{ line: { ...current, endTime: safeEnd }, index: idx, key: `${idx}-orig`, active: true }];
});

/**
 * 逐字歌词样式计算（基于毫秒游标插值）
 * @param wordData 逐字歌词数据
 * @param lyricIndex 歌词索引
 */
const getYrcStyle = (wordData: LyricWord, lyricIndex: number) => {
  const currentLine = lyricData.yrcData?.[lyricIndex];
  if (!currentLine) return { backgroundPositionX: "100%" };
  // 应用提前量，使动画也能提前到位
  const seekSec = playSeekMs.value + LYRIC_LOOKAHEAD;
  const startSec = currentLine.startTime || 0;
  const endSec = currentLine.endTime || 0;
  const isLineActive =
    (seekSec >= startSec && seekSec < endSec) || currentLyricIndex.value === lyricIndex;

  if (!isLineActive) {
    const hasPlayed = seekSec >= (wordData.endTime || 0);
    return { backgroundPositionX: hasPlayed ? "0%" : "100%" };
  }
  const durationSec = Math.max((wordData.endTime || 0) - (wordData.startTime || 0), 0.001);
  const progress = Math.max(Math.min((seekSec - (wordData.startTime || 0)) / durationSec, 1), 0);
  return {
    backgroundPositionX: `${100 - progress * 100}%`,
  };
};

/** 当前激活的歌词行元素 Map */
const lineRefs = new Map<string, HTMLElement>();
/** 当前激活的逐字歌词内容元素 Map */
const contentRefs = new Map<string, HTMLElement>();

const setLineRef = (el: Element | ComponentPublicInstance | null, key: string) => {
  if (el) lineRefs.set(key, el as HTMLElement);
  else lineRefs.delete(key);
};

const setContentRef = (el: Element | ComponentPublicInstance | null, key: string) => {
  if (el) contentRefs.set(key, el as HTMLElement);
  else contentRefs.delete(key);
};
/** 滚动开始进度：从进度 0.3 开始，剩余时间内滚至末尾 */
const scrollStartAtProgress = 0.3;

/**
 * 歌词滚动样式计算
 * - 容器 `currentLineRef` 与内容 `currentContentRef` 分别记录当前激活行与其文本内容
 * - 当内容宽度超过容器宽度（overflow > 0）时，才会触发水平滚动
 * - 进度采用毫秒锚点插值（`playSeekMs`），并以当前行的 `time` 与有效 `endTime` 计算区间
 * - 为确保滚动在切到下一句前完成，这里对有效 `endTime` 应用 1 秒提前偏移
 * - 在 `scrollStartAtProgress`（默认 0.5）之前不滚动；之后按剩余进度线性映射至总溢出距离
 * - 未能计算出有效时长（如最后一句无下一句）时，不滚动，保持省略号显示
 * @param line 渲染的歌词行
 * @returns 滚动样式
 */
const getScrollStyle = (line: RenderLine) => {
  const container = lineRefs.get(line.key);
  const content = contentRefs.get(line.key);
  if (!container || !content || !line?.line) return {};
  const overflow = Math.max(0, content.scrollWidth - container.clientWidth);
  if (overflow <= 0) return { transform: "translateX(0px)" };
  // 计算进度：毫秒锚点插值（`playSeekMs`），并以当前行的 `time` 与有效 `endTime` 计算区间
  const seekSec = playSeekMs.value;
  const start = Number(line.line.startTime ?? 0);
  // 仅在滚动计算中提前 2 秒
  const END_MARGIN_SEC = 2;
  const endRaw = Number(line.line.endTime);
  // 若 endTime 仍为 0 或不大于 start，视为无时长：不滚动
  const hasSafeEnd = Number.isFinite(endRaw) && endRaw > 0 && endRaw > start;
  if (!hasSafeEnd) return { transform: "translateX(0px)" };
  const end = Math.max(start + 0.001, endRaw - END_MARGIN_SEC);
  const duration = Math.max(end - start, 0.001);
  const progress = Math.max(Math.min((seekSec - start) / duration, 1), 0);
  // 进度在滚动开始前，不滚动
  if (progress <= scrollStartAtProgress) return { transform: "translateX(0px)" };
  const ratio = (progress - scrollStartAtProgress) / (1 - scrollStartAtProgress);
  const offset = Math.round(overflow * ratio);
  return {
    transform: `translateX(-${offset}px)`,
    willChange: "transform",
  };
};

// 缓存的窗口和屏幕边界数据
const cachedBounds = reactive({
  x: 0,
  y: 0,
  width: 800,
  height: 180,
  screenMinX: -99999,
  screenMinY: -99999,
  screenMaxX: 99999,
  screenMaxY: 99999,
});

/**
 * 更新缓存的边界数据
 * 在组件挂载、拖拽结束、窗口大小变化后调用
 */
const updateCachedBounds = async () => {
  try {
    const [winBounds, stored, screenBounds] = await Promise.all([
      window.electron.ipcRenderer.invoke("desktop-lyric:get-bounds"),
      window.api.store.get("lyric"),
      window.electron.ipcRenderer.invoke("desktop-lyric:get-virtual-screen-bounds"),
    ]);
    cachedBounds.x = winBounds?.x ?? 0;
    cachedBounds.y = winBounds?.y ?? 0;
    cachedBounds.width = Number(stored?.width) > 0 ? Number(stored.width) : 800;
    cachedBounds.height = Number(stored?.height) > 0 ? Number(stored.height) : 180;
    cachedBounds.screenMinX = screenBounds?.minX ?? -99999;
    cachedBounds.screenMinY = screenBounds?.minY ?? -99999;
    cachedBounds.screenMaxX = screenBounds?.maxX ?? 99999;
    cachedBounds.screenMaxY = screenBounds?.maxY ?? 99999;
  } catch (e) {
    console.warn("Failed to update cached bounds:", e);
  }
};

// 拖拽窗口状态
const dragState = reactive({
  isDragging: false,
  startX: 0,
  startY: 0,
  startWinX: 0,
  startWinY: 0,
  winWidth: 0,
  winHeight: 0,
  // 拖拽时使用的屏幕边界
  minX: -99999,
  minY: -99999,
  maxX: 99999,
  maxY: 99999,
});

/**
 * 桌面歌词拖动开始
 * @param event 指针事件
 */
const onDocPointerDown = (event: PointerEvent) => {
  if (lyricConfig.isLock) return;
  // 仅主按钮触发（鼠标左键或触摸）
  if (event.button !== 0) return;
  const target = event?.target as HTMLElement | null;
  if (!target) return;
  // 过滤 header 中的按钮：不触发拖拽
  if (target.closest(".menu-btn")) return;
  // 使用缓存数据
  const safeWidth = cachedBounds.width > 0 ? cachedBounds.width : 800;
  const safeHeight = cachedBounds.height > 0 ? cachedBounds.height : 180;
  dragState.isDragging = true;
  dragState.startX = event.screenX ?? 0;
  dragState.startY = event.screenY ?? 0;
  dragState.startWinX = cachedBounds.x;
  dragState.startWinY = cachedBounds.y;
  dragState.winWidth = safeWidth;
  dragState.winHeight = safeHeight;
  // 使用缓存的屏幕边界
  if (lyricConfig.limitBounds) {
    dragState.minX = cachedBounds.screenMinX;
    dragState.minY = cachedBounds.screenMinY;
    dragState.maxX = cachedBounds.screenMaxX;
    dragState.maxY = cachedBounds.screenMaxY;
  }
  // 固定最大尺寸以规避 DPI 缩放 bug
  sendToMain("desktop-lyric:toggle-fixed-size", {
    width: safeWidth,
    height: safeHeight,
    fixed: true,
  });
  document.addEventListener("pointermove", onDocPointerMove);
  document.addEventListener("pointerup", onDocPointerUp);
  event.preventDefault();
};

/**
 * 桌面歌词拖动移动
 * @param event 指针事件
 */
const onDocPointerMove = useThrottleFn((event: PointerEvent) => {
  if (!dragState.isDragging || lyricConfig.isLock) return;
  let newWinX = Math.round(dragState.startWinX + (event.screenX - dragState.startX));
  let newWinY = Math.round(dragState.startWinY + (event.screenY - dragState.startY));
  // 是否限制在屏幕边界（支持多屏）- 使用缓存的边界数据同步计算
  if (lyricConfig.limitBounds) {
    newWinX = Math.round(
      Math.max(dragState.minX, Math.min(dragState.maxX - dragState.winWidth, newWinX)),
    );
    newWinY = Math.round(
      Math.max(dragState.minY, Math.min(dragState.maxY - dragState.winHeight, newWinY)),
    );
  }
  sendToMain("desktop-lyric:move", newWinX, newWinY, dragState.winWidth, dragState.winHeight);
}, 16);

/**
 * 桌面歌词拖动结束
 * @param event 指针事件
 */
const onDocPointerUp = () => {
  if (!dragState.isDragging) return;
  // 关闭拖拽状态
  dragState.isDragging = false;
  // 移除全局监听
  document.removeEventListener("pointermove", onDocPointerMove);
  document.removeEventListener("pointerup", onDocPointerUp);
  requestAnimationFrame(() => {
    // 恢复拖拽前宽高
    sendToMain("desktop-lyric:resize", dragState.winWidth, dragState.winHeight);
    // 根据字体大小恢复一次高度
    const height = fontSizeToHeight(lyricConfig.fontSize);
    if (height) pushWindowHeight(height);
    // 恢复最大宽高
    sendToMain("desktop-lyric:toggle-fixed-size", {
      width: dragState.winWidth,
      height: dragState.winHeight,
      fixed: false,
    });
    // 更新缓存的边界数据
    updateCachedBounds();
  });
};

// 监听窗口大小变化
const { height: winHeight, width: winWidth } = useWindowSize();

// 更新缓存边界
watch([winWidth, winHeight], ([w, h]) => {
  // 仅在非拖拽移动状态下更新
  if (!dragState.isDragging) {
    cachedBounds.width = w;
    cachedBounds.height = h;
  }
});

/**
 * 根据窗口高度计算字体大小
 * 线性映射并取整，范围 20-96
 */
const computedFontSize = computed(() => {
  const h = dragState.isDragging ? dragState.winHeight : Math.round(Number(winHeight?.value ?? 0));
  const minH = 140;
  const maxH = 360;
  const minF = 20;
  const maxF = 96;
  if (!Number.isFinite(h) || h <= minH) return minF;
  if (h >= maxH) return maxF;
  const ratio = (h - minH) / (maxH - minH);
  return Math.round(minF + ratio * (maxF - minF));
});

// 保存配置
const debouncedSaveConfig = useDebounceFn((size: number) => {
  sendToMain("desktop-lyric:set-option", { fontSize: size }, true);
}, 500);

// 监听字体大小变化
watch(computedFontSize, (size) => {
  if (!Number.isFinite(size)) return;
  if (dragState.isDragging) return;
  if (isInitializing.value) return;

  // 容差判断：差异 > 1 才更新
  if (Math.abs(lyricConfig.fontSize - size) > 1) {
    lyricConfig.fontSize = size;
    // 防抖保存
    debouncedSaveConfig(size);
  }
});

/**
 * 根据字体大小计算窗口高度（20-96 <-> 140-360）
 * @param size 字体大小
 * @returns 窗口高度
 */
const fontSizeToHeight = (size: number) => {
  const minH = 140;
  const maxH = 360;
  const minF = 20;
  const maxF = 96;
  const s = Math.min(Math.max(Math.round(size), minF), maxF);
  const ratio = (s - minF) / (maxF - minF);
  return Math.round(minH + ratio * (maxH - minH));
};

// 推送窗口高度更新
const pushWindowHeight = (nextHeight: number) => {
  if (!Number.isFinite(nextHeight)) return;
  if (dragState.isDragging) return;
  sendToMain("desktop-lyric:set-height", nextHeight);
};

// 监听配置中的字体大小变化，同步更新窗口高度
watch(
  () => lyricConfig.fontSize,
  (size) => {
    const height = fontSizeToHeight(size);
    // 只有当当前高度与目标高度差异较大时才调整（防止循环触发）
    if (height && Math.abs(height - winHeight.value) > 2) {
      pushWindowHeight(height);
    }
  },
  { immediate: true },
);

// 发送至主进程
const sendToMain = (eventName: string, ...args: any[]) => {
  window.electron.ipcRenderer.send(eventName, ...args);
};

// 发送至主窗口
const sendToMainWin = (eventName: string, ...args: any[]) => {
  window.electron.ipcRenderer.send("send-to-main-win", eventName, ...args);
};

// 切换桌面歌词锁定状态
const toggleLyricLock = () => {
  sendToMain("desktop-lyric:toggle-lock", { lock: !lyricConfig.isLock });
  lyricConfig.isLock = !lyricConfig.isLock;
};

/**
 * 临时切换桌面歌词锁定状态
 * @param isLock 是否锁定
 */
const tempToggleLyricLock = (isLock: boolean) => {
  // 是否已经解锁
  if (!lyricConfig.isLock) return;
  sendToMain("desktop-lyric:toggle-lock", { lock: isLock, temp: true });
};

onMounted(() => {
  // 接收歌词数据
  window.electron.ipcRenderer.on(
    "desktop-lyric:update-data",
    (_event, data: LyricData & { sendTimestamp?: number }) => {
      Object.assign(lyricData, data);
      // 首次接收到歌词数据时，立即结束初始化状态
      if (isInitializing.value) {
        isInitializing.value = false;
      }
      // 更新锚点：以传入的 currentTime + songOffset 建立毫秒级基准，并重置帧时间
      if (typeof lyricData.currentTime === "number") {
        const offset = Number(lyricData.songOffset ?? 0);
        let newBaseMs = Math.floor(lyricData.currentTime + offset);
        // 补偿传输延迟
        if (typeof data.sendTimestamp === "number") {
          const ipcDelay = performance.now() - data.sendTimestamp;
          // 正延迟才补偿
          if (ipcDelay > 0 && ipcDelay < 1000) {
            newBaseMs += ipcDelay;
          }
        }
        // 阈值检测：只有当新时间与当前插值时间差距超过阈值时才重置锚点
        // 这样可以避免在正常播放时频繁重置导致的微小抖动
        const SYNC_THRESHOLD = 300; // 300ms 阈值
        const drift = Math.abs(newBaseMs - playSeekMs.value);
        if (drift > SYNC_THRESHOLD) {
          baseMs = newBaseMs;
          anchorTick = performance.now();
        }
      }
      // 按播放状态节能：暂停时暂停 RAF，播放时恢复 RAF
      if (typeof lyricData.playStatus === "boolean") {
        if (lyricData.playStatus) {
          resumeSeek();
        } else {
          // 重置锚点到当前毫秒游标，避免因暂停后时间推进造成误差
          baseMs = playSeekMs.value;
          anchorTick = performance.now();
          pauseSeek();
        }
      }
    },
  );
  window.electron.ipcRenderer.on("desktop-lyric:update-option", (_event, config: LyricConfig) => {
    Object.assign(lyricConfig, config);
    // 根据文字大小改变一次高度
    const height = fontSizeToHeight(config.fontSize);
    if (height) pushWindowHeight(height);
    // 是否锁定
    sendToMain("desktop-lyric:toggle-lock", { lock: config.isLock });
  });
  // 请求歌词数据及配置
  sendToMain("desktop-lyric:request-data");
  window.electron.ipcRenderer.invoke("desktop-lyric:get-option");

  // 初始化缓存边界数据
  updateCachedBounds();

  // 后备超时结束初始化状态：如果 IPC 事件未触发，则在超时后结束初始化
  useTimeoutFn(() => {
    if (isInitializing.value) {
      isInitializing.value = false;
    }
  }, FALLBACK_INITIALIZATION_TIMEOUT);

  // 启动 RAF 插值
  if (lyricData.playStatus) {
    resumeSeek();
  } else {
    pauseSeek();
  }
  // 拖拽入口（支持鼠标和触摸）
  document.addEventListener("pointerdown", onDocPointerDown);
  // 监听鼠标移动，控制 hover 状态
  document.addEventListener("mousemove", handleMouseMove);
  // 监听鼠标移出窗口，重置 hover 状态
  document.addEventListener("mouseleave", handleMouseLeave);
});

onBeforeUnmount(() => {
  // 关闭 RAF
  pauseSeek();
  // 解绑事件
  document.removeEventListener("pointerdown", onDocPointerDown);
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseleave", handleMouseLeave);
  if (dragState.isDragging) onDocPointerUp();
});
</script>

<style scoped lang="scss">
.n-config-provider {
  width: 100%;
  height: 100%;
}
.desktop-lyric {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: #fff;
  background-color: transparent;
  padding: 12px;
  border-radius: 12px;
  overflow: hidden;
  transition: background-color 0.3s;
  cursor: default;
  .header {
    position: relative;
    margin-bottom: 12px;
    cursor: default;
    // 子内容三等分grid
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-gap: 12px;
    > * {
      min-width: 0;
    }
    .song-name {
      font-size: 1em;
      text-align: left;
      flex: 1 1 auto;
      line-height: 36px;
      padding: 0 8px;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      transition: opacity 0.3s;
    }
    .menu-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      padding: 6px;
      border-radius: 8px;
      will-change: transform;
      transition:
        opacity 0.3s,
        background-color 0.3s,
        transform 0.3s;
      cursor: pointer;
      .n-icon {
        font-size: 24px;
      }
      &.lock-btn {
        pointer-events: auto;
        .n-icon {
          filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.8));
        }
      }
      &:hover {
        background-color: rgba(255, 255, 255, 0.3);
      }
      &:active {
        transform: scale(0.98);
      }
    }
    // 隐藏与显示
    .song-name,
    .menu-btn {
      opacity: 0;
    }
    .play-title {
      position: absolute;
      padding: 0 12px;
      width: 100%;
      text-align: left;
      transition: opacity 0.3s;
      pointer-events: none;
      z-index: 0;
      span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
        padding: 0 4px;
      }
      .name {
        line-height: normal;
      }
      .artist {
        font-size: 12px;
        opacity: 0.6;
      }
      &.center,
      &.both {
        text-align: center;
      }
      &.right {
        text-align: right;
      }
      &.has-background-mask {
        background-color: var(--mask-bg-color);
        border-radius: 8px;
        padding: 4px 12px;
        width: fit-content;
        max-width: 100%;

        &.center,
        &.both {
          left: 50%;
          transform: translateX(-50%);
        }

        &.right {
          right: 0;
          left: auto;
        }

        span {
          background-color: transparent;
          padding: 0;
        }
      }
    }
  }
  .lyric-container {
    height: 100%;
    padding: 0 8px;
    cursor: move;
    position: relative; // 相对定位，供子元素绝对定位参考

    .lyric-line {
      position: absolute; // 绝对定位
      width: 100%;
      left: 0;
      line-height: normal;
      padding: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      transition:
        top 0.6s cubic-bezier(0.55, 0, 0.1, 1),
        font-size 0.6s cubic-bezier(0.55, 0, 0.1, 1),
        color 0.6s cubic-bezier(0.55, 0, 0.1, 1),
        opacity 0.6s cubic-bezier(0.55, 0, 0.1, 1),
        transform 0.6s cubic-bezier(0.55, 0, 0.1, 1);
      will-change: top, font-size, transform;
      transform-origin: left center;

      &.has-background-mask {
        .scroll-content {
          background-color: var(--mask-bg-color);
          border-radius: 6px;
          padding: 2px 8px;
          display: inline-block;
        }
      }
      .scroll-content {
        display: inline-block;
        white-space: nowrap;
        will-change: transform;
      }
      &.is-yrc {
        .content {
          display: inline-flex;
          flex-wrap: nowrap;
          width: auto;
          overflow-wrap: normal;
          word-break: normal;
          white-space: nowrap;
          text-align: inherit;
        }
        .content-text {
          position: relative;
          display: inline-block;
          .word {
            display: inline-block;
            background-clip: text;
            -webkit-background-clip: text;
            color: transparent;
            background-size: 200% 100%;
            background-repeat: no-repeat;
            background-position-x: 100%;
            will-change: background-position-x;
          }
          &.end-with-space {
            margin-right: 5vh;
            &:last-child {
              margin-right: 0;
            }
          }
        }
      }
    }
    &.center {
      .lyric-line {
        text-align: center;
        transform-origin: center center;
        &.is-yrc {
          .content {
            justify-content: center;
          }
        }
      }
    }
    &.right {
      .lyric-line {
        text-align: right;
        transform-origin: right center;
        &.is-yrc {
          .content {
            justify-content: flex-end;
          }
        }
      }
    }
    &.both {
      .lyric-line {
        &.align-right {
          text-align: right;
          transform-origin: right center;
        }
        &.align-left {
          text-align: left;
          transform-origin: left center;
        }
      }
      .lyric-line.is-yrc.align-right {
        .content {
          justify-content: flex-end;
        }
      }
    }
  }
  &.no-animation {
    .lyric-line {
      transition: none !important;
    }
  }
  // Slide Mode
  .lyric-slide-move,
  .lyric-slide-enter-active,
  .lyric-slide-leave-active {
    transition:
      transform 0.6s cubic-bezier(0.55, 0, 0.1, 1),
      opacity 0.6s cubic-bezier(0.55, 0, 0.1, 1);
    will-change: transform, opacity;
  }
  .lyric-slide-enter-from {
    opacity: 0;
    transform: translateY(100%);
  }
  .lyric-slide-leave-to {
    opacity: 0;
    transform: translateY(-100%);
  }
  .lyric-slide-leave-active {
    position: absolute;
  }
  &.hovered {
    &:not(.locked) {
      background-color: rgba(0, 0, 0, 0.6);
      .song-name,
      .menu-btn {
        opacity: 1;
      }
      .play-title {
        opacity: 0;
      }
    }
  }
  &.locked {
    cursor: default;
    .song-name,
    .menu-btn,
    .lyric-container {
      pointer-events: none;
    }
    &.hovered {
      .lock-btn {
        opacity: 1;
        pointer-events: auto;
      }
      .song-title {
        opacity: 0;
      }
    }
  }
}
</style>

<style>
body {
  background-color: transparent !important;
}
</style>
