<template>
  <n-config-provider :theme="null">
    <div :class="['desktop-lyric', { locked: lyricConfig.isLock, hovered: isHovered }]">
      <div class="header" align="center" justify="space-between">
        <n-flex :wrap="false" align="center" justify="flex-start" size="small" @pointerdown.stop>
          <div class="menu-btn" @click.stop="sendToMain('win-show')">
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
          <div class="menu-btn" @click.stop="sendToMain('open-setting', 'lyrics', 'desktop')">
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
          <div class="menu-btn" @click.stop="sendToMain('close-desktop-lyric')">
            <SvgIcon name="Close" />
          </div>
        </n-flex>
        <!-- 歌曲信息 -->
        <n-flex
          v-if="lyricConfig.alwaysShowPlayInfo"
          :size="0"
          :class="['play-title', lyricConfig.position]"
          :style="{ fontFamily: lyricConfig.fontFamily }"
          vertical
        >
          <span class="name">{{ lyricData.playName }}</span>
          <span class="artist">{{ lyricData.artistName }}</span>
        </n-flex>
      </div>
      <n-flex
        :style="{
          fontSize: lyricConfig.fontSize + 'px',
          fontFamily: lyricConfig.fontFamily,
          fontWeight: lyricConfig.fontIsBold ? 'bold' : 'normal',
          textShadow: `0 0 4px ${lyricConfig.shadowColor}`,
        }"
        :class="['lyric-container', lyricConfig.position]"
        :size="0"
        justify="space-around"
        vertical
      >
        <span
          v-for="line in renderLyricLines"
          :key="line.key"
          :class="[
            'lyric-line',
            {
              active: line.active,
              'is-yrc': Boolean(lyricData?.yrcData?.length && line.line?.words?.length > 1),
              'has-background-mask': lyricConfig.textBackgroundMask,
            },
          ]"
          :style="{
            color: line.active ? lyricConfig.playedColor : lyricConfig.unplayedColor,
          }"
          :ref="(el) => line.active && (currentLineRef = el as HTMLElement)"
        >
          <!-- 逐字歌词渲染 -->
          <template
            v-if="lyricConfig.showYrc && lyricData?.yrcData?.length && line.line?.words?.length > 1"
          >
            <span
              class="scroll-content"
              :style="getScrollStyle(line)"
              :ref="(el) => line.active && (currentContentRef = el as HTMLElement)"
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
              :ref="(el) => line.active && (currentContentRef = el as HTMLElement)"
            >
              {{ line.line?.words?.[0]?.word || "" }}
            </span>
          </template>
        </span>
        <!-- 占位 -->
        <span v-if="renderLyricLines.length === 1" class="lyric-line"> &nbsp; </span>
      </n-flex>
    </div>
  </n-config-provider>
</template>

<script setup lang="ts">
import { useRafFn, useTimeoutFn, useThrottleFn } from "@vueuse/core";
import { LyricLine, LyricWord } from "@applemusic-like-lyrics/lyric";
import { LyricConfig, LyricData, RenderLine } from "@/types/desktop-lyric";
import defaultDesktopLyricConfig from "@/assets/data/lyricConfig";

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

// 实时歌词索引
const currentLyricIndex = computed(() => {
  if (
    (lyricConfig.showYrc && lyricData?.yrcData?.length) ||
    (!lyricData?.yrcData?.length && lyricData?.lrcData?.length)
  ) {
    return lyricData.lyricIndex ?? -1;
  }
  // 自行计算
  if (!lyricData.lrcData?.length) return -1;
  let idx = -1;
  for (let i = 0; i < lyricData.lrcData.length; i++) {
    const line = lyricData.lrcData[i];
    if (playSeekMs.value >= Number(line.startTime) && playSeekMs.value <= Number(line.endTime)) {
      idx = i;
      break;
    }
  }
  return idx;
});

// 桌面歌词配置
const lyricConfig = reactive<LyricConfig>({
  ...defaultDesktopLyricConfig,
});

// hover 状态控制
const isHovered = ref<boolean>(false);

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
 * 渲染的歌词行
 * @returns 渲染的歌词行数组
 */
const renderLyricLines = computed<RenderLine[]>(() => {
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
  if (
    lyricConfig.showTran &&
    current.translatedLyric &&
    current.translatedLyric.trim().length > 0
  ) {
    const lines: RenderLine[] = [
      { line: { ...current, endTime: safeEnd }, index: idx, key: `${idx}:orig`, active: true },
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
        key: `${idx}:tran`,
        active: false,
      },
    ];
    return lines.filter((l) => {
      const s = (l.line?.words || [])
        .map((w) => w.word)
        .join("")
        .trim();
      return s.length > 0;
    });
  }
  if (!lyricConfig.isDoubleLine) {
    return [
      { line: { ...current, endTime: safeEnd }, index: idx, key: `${idx}:orig`, active: true },
    ].filter((l) => {
      const s = (l.line?.words || [])
        .map((w) => w.word)
        .join("")
        .trim();
      return s.length > 0;
    });
  }
  const isEven = idx % 2 === 0;
  if (isEven) {
    const lines: RenderLine[] = [
      { line: { ...current, endTime: safeEnd }, index: idx, key: `${idx}:orig`, active: true },
      ...(next ? [{ line: next, index: idx + 1, key: `${idx + 1}:next`, active: false }] : []),
    ];
    return lines.filter((l) => {
      const s = (l.line?.words || [])
        .map((w) => w.word)
        .join("")
        .trim();
      return s.length > 0;
    });
  }
  const lines: RenderLine[] = [
    ...(next ? [{ line: next, index: idx + 1, key: `${idx + 1}:next`, active: false }] : []),
    { line: { ...current, endTime: safeEnd }, index: idx, key: `${idx}:orig`, active: true },
  ];
  return lines.filter((l) => {
    const s = (l.line?.words || [])
      .map((w) => w.word)
      .join("")
      .trim();
    return s.length > 0;
  });
});

/**
 * 逐字歌词样式计算（基于毫秒游标插值）
 * @param wordData 逐字歌词数据
 * @param lyricIndex 歌词索引
 */
const getYrcStyle = (wordData: LyricWord, lyricIndex: number) => {
  const currentLine = lyricData.yrcData?.[lyricIndex];
  if (!currentLine) return { backgroundPositionX: "100%" };
  const seekSec = playSeekMs.value;
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

/** 当前激活的歌词行元素 */
const currentLineRef = ref<HTMLElement | null>(null);
/** 当前激活的逐字歌词内容元素 */
const currentContentRef = ref<HTMLElement | null>(null);
/** 滚动开始进度：从进度 0.5 开始，剩余时间内滚至末尾 */
const scrollStartAtProgress = 0.5;

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
  const container = currentLineRef.value as HTMLElement | null;
  const content = currentContentRef.value as HTMLElement | null;
  if (!container || !content || !line?.line) return {};
  const overflow = Math.max(0, content.scrollWidth - container.clientWidth);
  if (overflow <= 0) return { transform: "translateX(0px)" };
  // 计算进度：毫秒锚点插值（`playSeekMs`），并以当前行的 `time` 与有效 `endTime` 计算区间
  const seekSec = playSeekMs.value;
  const start = Number(line.line.startTime ?? 0);
  // 仅在滚动计算中提前 1 秒
  const END_MARGIN_SEC = 1;
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

// 拖拽窗口状态
const dragState = reactive({
  isDragging: false,
  startX: 0,
  startY: 0,
  startWinX: 0,
  startWinY: 0,
  winWidth: 0,
  winHeight: 0,
  // 缓存屏幕边界
  minX: -99999,
  minY: -99999,
  maxX: 99999,
  maxY: 99999,
});

/**
 * 桌面歌词拖动开始
 * @param event 指针事件
 */
const onDocPointerDown = async (event: PointerEvent) => {
  if (lyricConfig.isLock) return;
  // 仅主按钮触发（鼠标左键或触摸）
  if (event.button !== 0) return;
  const target = event?.target as HTMLElement | null;
  if (!target) return;
  // 过滤 header 中的按钮：不触发拖拽
  if (target.closest(".menu-btn")) return;
  dragState.isDragging = true;
  const { x, y } = await window.electron.ipcRenderer.invoke("get-window-bounds");
  const { width, height } = await window.api.store.get("lyric");
  const safeWidth = Number(width) > 0 ? Number(width) : 800;
  const safeHeight = Number(height) > 0 ? Number(height) : 136;
  // 如果开启了限制边界，在拖拽开始时预先获取一次屏幕范围
  if (lyricConfig.limitBounds) {
    const bounds = await window.electron.ipcRenderer.invoke("get-virtual-screen-bounds");
    dragState.minX = bounds.minX ?? -99999;
    dragState.minY = bounds.minY ?? -99999;
    dragState.maxX = bounds.maxX ?? 99999;
    dragState.maxY = bounds.maxY ?? 99999;
  }
  window.electron.ipcRenderer.send("toggle-fixed-max-size", {
    width: safeWidth,
    height: safeHeight,
    fixed: true,
  });
  dragState.startX = event.screenX ?? 0;
  dragState.startY = event.screenY ?? 0;
  dragState.startWinX = x;
  dragState.startWinY = y;
  dragState.winWidth = safeWidth;
  dragState.winHeight = safeHeight;
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
  window.electron.ipcRenderer.send(
    "move-window",
    newWinX,
    newWinY,
    dragState.winWidth,
    dragState.winHeight,
  );
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
    window.electron.ipcRenderer.send("update-lyric-size", dragState.winWidth, dragState.winHeight);
    // 根据字体大小恢复一次高度
    const height = fontSizeToHeight(lyricConfig.fontSize);
    if (height) pushWindowHeight(height);
    // 恢复最大宽高
    window.electron.ipcRenderer.send("toggle-fixed-max-size", {
      width: dragState.winWidth,
      height: dragState.winHeight,
      fixed: false,
    });
  });
};

// 监听窗口大小变化
const { height: winHeight } = useWindowSize();

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

// 监听字体大小变化，同步更新窗口高度
watchThrottled(
  computedFontSize,
  (size) => {
    if (!Number.isFinite(size)) return;
    if (dragState.isDragging) return;
    if (size === lyricConfig.fontSize) return;
    const next = { fontSize: size };
    window.electron.ipcRenderer.send("update-desktop-lyric-option", next, true);
  },
  {
    leading: true,
    immediate: true,
    throttle: 100,
  },
);

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
  window.electron.ipcRenderer.send("update-window-height", nextHeight);
};

// 监听配置中的字体大小变化，同步更新窗口高度
watch(
  () => lyricConfig.fontSize,
  (size) => {
    const height = fontSizeToHeight(size);
    if (height) pushWindowHeight(height);
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
  sendToMain("toggle-desktop-lyric-lock", !lyricConfig.isLock);
  lyricConfig.isLock = !lyricConfig.isLock;
};

/**
 * 临时切换桌面歌词锁定状态
 * @param isLock 是否锁定
 */
const tempToggleLyricLock = (isLock: boolean) => {
  // 是否已经解锁
  if (!lyricConfig.isLock) return;
  window.electron.ipcRenderer.send("toggle-desktop-lyric-lock", isLock, true);
};

onMounted(() => {
  // 接收歌词数据
  window.electron.ipcRenderer.on("update-desktop-lyric-data", (_event, data: LyricData) => {
    Object.assign(lyricData, data);
    // 更新锚点：以传入的 currentTime + songOffset 建立毫秒级基准，并重置帧时间
    if (typeof lyricData.currentTime === "number") {
      const offset = Number(lyricData.songOffset ?? 0);
      baseMs = Math.floor(lyricData.currentTime + offset);
      anchorTick = performance.now();
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
  });
  window.electron.ipcRenderer.on("update-desktop-lyric-option", (_event, config: LyricConfig) => {
    Object.assign(lyricConfig, config);
    // 根据文字大小改变一次高度
    const height = fontSizeToHeight(config.fontSize);
    if (height) pushWindowHeight(height);
    // 是否锁定
    sendToMain("toggle-desktop-lyric-lock", config.isLock);
  });
  // 请求歌词数据及配置
  window.electron.ipcRenderer.send("request-desktop-lyric-data");
  window.electron.ipcRenderer.invoke("request-desktop-lyric-option");

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
    }
  }
  .lyric-container {
    height: 100%;
    padding: 0 8px;
    cursor: move;
    .lyric-line {
      width: 100%;
      line-height: normal;
      padding: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      position: relative;
      &.has-background-mask {
        .scroll-content {
          background-color: rgba(0, 0, 0, 0.5);
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
      align-items: center;
      .lyric-line {
        text-align: center;
        &.is-yrc {
          .content {
            justify-content: center;
          }
        }
      }
    }
    &.right {
      align-items: flex-end;
      .lyric-line {
        text-align: right;
        &.is-yrc {
          .content {
            justify-content: flex-end;
          }
        }
      }
    }
    &.both {
      .lyric-line {
        &:nth-child(2n) {
          text-align: right;
        }
      }
      .lyric-line.is-yrc:nth-child(2n) {
        .content {
          justify-content: flex-end;
        }
      }
    }
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
  /* background-image: url("https://picsum.photos/1920/1080"); */
}
</style>
