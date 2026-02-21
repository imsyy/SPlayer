import { AudioErrorCode } from "@/core/audio-player/BaseAudioPlayer";
import { AudioScheduler } from "@/core/audio-player/AudioScheduler";
import type { AutomationPoint } from "@/core/audio-player/IPlaybackEngine";
import { getSharedAudioContext } from "@/core/audio-player/SharedAudioContext";
import { useDataStore, useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import type { AudioSourceType, QualityType, SongType } from "@/types/main";
import type { RepeatModeType, ShuffleModeType } from "@/types/shared/play-mode";
import { calculateLyricIndex } from "@/utils/calc";
import { getCoverColor } from "@/utils/color";
import { isElectron, isMac } from "@/utils/env";
import { getPlayerInfoObj, getPlaySongData } from "@/utils/format";
import { handleSongQuality, shuffleArray, sleep } from "@/utils/helper";
import lastfmScrobbler from "@/utils/lastfmScrobbler";
import { DJ_MODE_KEYWORDS } from "@/utils/meta";
import { calculateProgress, msToTime } from "@/utils/time";
import type { LyricLine } from "@applemusic-like-lyrics/lyric";
import { type DebouncedFunc, throttle } from "lodash-es";
import { useBlobURLManager } from "../resource/BlobURLManager";
import { useAudioManager } from "./AudioManager";
import { useLyricManager } from "./LyricManager";
import { mediaSessionManager } from "./MediaSessionManager";
import * as playerIpc from "./PlayerIpc";
import { PlayModeManager } from "./PlayModeManager";
import { useSongManager } from "./SongManager";

interface AudioAnalysis {
  duration: number;
  bpm?: number;
  bpm_confidence?: number;
  fade_in_pos: number;
  fade_out_pos: number;
  first_beat_pos?: number;
  loudness?: number;
  drop_pos?: number;
  version?: number;
  analyze_window?: number;
  cut_in_pos?: number;
  cut_out_pos?: number;
  mix_center_pos?: number;
  mix_start_pos?: number;
  mix_end_pos?: number;
  energy_profile?: number[];
  vocal_in_pos?: number;
  vocal_out_pos?: number;
  vocal_last_in_pos?: number;
  outro_energy_level?: number;
  key_root?: number;
  key_mode?: number;
  key_confidence?: number;
  camelot_key?: string;
}

interface TransitionProposal {
  duration: number;
  current_track_mix_out: number;
  next_track_mix_in: number;
  mix_type: string;
  filter_strategy: string;
  compatibility_score: number;
  key_compatible: boolean;
  bpm_compatible: boolean;
}

interface AdvancedTransition {
  start_time_current: number;
  start_time_next: number;
  duration: number;
  pitch_shift_semitones: number;
  playback_rate: number;
  automation_current: AutomationPoint[];
  automation_next: AutomationPoint[];
  strategy: string;
}

const isAdvancedTransition = (value: unknown): value is AdvancedTransition => {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.start_time_current === "number" &&
    typeof obj.start_time_next === "number" &&
    typeof obj.duration === "number" &&
    typeof obj.pitch_shift_semitones === "number" &&
    typeof obj.playback_rate === "number" &&
    Array.isArray(obj.automation_current) &&
    Array.isArray(obj.automation_next) &&
    typeof obj.strategy === "string"
  );
};

type AutomixState = "IDLE" | "MONITORING" | "SCHEDULED" | "TRANSITIONING" | "COOLDOWN";

type AutomixPlan = {
  token: number;
  nextSong: SongType;
  nextIndex: number;
  triggerTime: number;
  crossfadeDuration: number;
  startSeek: number;
  initialRate: number;
  uiSwitchDelay: number;
  mixType: "default" | "bassSwap";
  pitchShift: number;
  playbackRate: number;
  automationCurrent: AutomationPoint[];
  automationNext: AutomationPoint[];
};

const isAudioAnalysis = (value: unknown): value is AudioAnalysis => {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.duration === "number" &&
    typeof obj.fade_in_pos === "number" &&
    typeof obj.fade_out_pos === "number"
  );
};

const isTransitionProposal = (value: unknown): value is TransitionProposal => {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.duration === "number" &&
    typeof obj.current_track_mix_out === "number" &&
    typeof obj.next_track_mix_in === "number" &&
    typeof obj.mix_type === "string" &&
    typeof obj.filter_strategy === "string" &&
    typeof obj.compatibility_score === "number" &&
    typeof obj.key_compatible === "boolean" &&
    typeof obj.bpm_compatible === "boolean"
  );
};

/**
 * 播放器核心类
 * 职责：负责音频生命周期管理、与 AudioManager 交互、调度 Store
 */
class PlayerController {
  /** 自动关闭定时器 */
  private autoCloseInterval: ReturnType<typeof setInterval> | undefined;
  /** 最大重试次数 */
  private readonly MAX_RETRY_COUNT = 3;
  /** 当前曲目重试信息（按歌曲维度） */
  private retryInfo: { songId: number | string; count: number } = { songId: 0, count: 0 };
  /** 当前播放请求标识 */
  private currentRequestToken = 0;
  /** 连续跳过计数 */
  private failSkipCount = 0;
  /** 是否正在进行 Automix 过渡 */
  private isTransitioning = false;
  /** 负责管理播放模式相关的逻辑 */
  private playModeManager = new PlayModeManager();

  private onTimeUpdate: DebouncedFunc<() => void> | null = null;
  /** 上次错误处理时间 */
  private lastErrorTime = 0;
  /** 当前歌曲分析结果 */
  private currentAnalysis: AudioAnalysis | null = null;
  private currentAnalysisKey: string | null = null;
  private currentAnalysisKind: "none" | "head" | "full" = "none";
  private currentAudioSource: {
    url: string;
    quality: QualityType | undefined;
    source: AudioSourceType | undefined;
  } | null = null;
  /** 速率重置定时器 */
  private rateResetTimer: ReturnType<typeof setTimeout> | undefined;
  /** 速率渐变动画帧 */
  private rateRampFrame: number | undefined;

  /** 下一首歌分析结果 (AutoMIX Cache) */
  private nextAnalysis: AudioAnalysis | null = null;
  private nextAnalysisKey: string | null = null;
  private nextAnalysisSongId: number | null = null;
  private nextAnalysisKind: "none" | "head" | "full" = "none";
  private nextAnalysisInFlight: Promise<void> | null = null;
  private nextTransitionKey: string | null = null;
  private nextTransitionInFlight: Promise<void> | null = null;
  private nextTransitionProposal: TransitionProposal | null = null;
  private nextAdvancedTransition: AdvancedTransition | null = null;
  private ensureAutomixAnalysisKey: string | null = null;
  private ensureAutomixAnalysisInFlight: Promise<void> | null = null;
  /** Automix 增益调整 (LUFS Normalization) */
  private automixGain = 1.0;
  private automixState: AutomixState = "IDLE";
  private automixScheduler: AudioScheduler | null = null;
  private automixScheduleGroupId: string | null = null;
  private automixScheduledCtxTime: number | null = null;
  private automixScheduledToken: number | null = null;
  private automixScheduledNextId: number | string | null = null;
  private automixLogTimestamps = new Map<string, number>();

  private formatAutomixTime(seconds: number): string {
    if (!Number.isFinite(seconds)) return "--:--";
    return msToTime(Math.max(0, Math.round(seconds * 1000)));
  }

  private fileUrlToPath(url: string): string | null {
    if (!url.startsWith("file://")) return null;
    const raw = url.slice("file://".length);
    const normalized = raw.startsWith("/") && /^[A-Za-z]:/.test(raw.slice(1)) ? raw.slice(1) : raw;
    try {
      return decodeURIComponent(normalized);
    } catch {
      return normalized;
    }
  }

  private getAutomixAnalyzeTimeSec(): number {
    const settingStore = useSettingStore();
    const raw = settingStore.automixMaxAnalyzeTime || 60;
    return Math.max(10, Math.min(300, raw));
  }

  private snapToBeat(
    time: number,
    bpm: number,
    firstBeat: number,
    snapToBar: boolean = true,
  ): number {
    if (bpm <= 0) return time;
    const spb = 60 / bpm;
    const interval = snapToBar ? spb * 4 : spb;
    const offset = time - firstBeat;
    const units = Math.round(offset / interval);
    return firstBeat + units * interval;
  }

  private getSongIdForCache(song: SongType): number | null {
    if (song.type === "radio") return song.dj?.id ?? null;
    return song.id || null;
  }

  private ensureAutomixAnalysisReady(): void {
    if (!isElectron) return;
    if (this.ensureAutomixAnalysisInFlight) return;

    const settingStore = useSettingStore();
    if (!settingStore.enableAutomix || settingStore.playbackEngine !== "web-audio") return;

    const musicStore = useMusicStore();
    const currentSong = musicStore.playSong;
    if (!currentSong) return;

    const nextInfo = this.getNextSongForAutomix();
    if (!nextInfo) return;

    const currentId = this.getSongIdForCache(currentSong);
    const nextId = this.getSongIdForCache(nextInfo.song);
    const key = `${this.currentRequestToken}:${currentId ?? "x"}:${nextId ?? "x"}`;

    if (this.ensureAutomixAnalysisKey === key) {
      if (this.currentAnalysis && this.currentAnalysisKind === "full" && this.nextAnalysis) return;
    }

    this.ensureAutomixAnalysisKey = key;
    const token = this.currentRequestToken;
    const analyzeTime = this.getAutomixAnalyzeTimeSec();

    this.ensureAutomixAnalysisInFlight = (async () => {
      const songManager = useSongManager();

      let currentPath =
        this.currentAnalysisKey ||
        currentSong.path ||
        (this.currentAudioSource ? this.fileUrlToPath(this.currentAudioSource.url) : null);

      if (!currentPath && currentId !== null) {
        const quality = this.currentAudioSource?.quality;
        const url = this.currentAudioSource?.url;
        if (url && url.startsWith("http")) {
          currentPath = await songManager.ensureMusicCachePath(currentId, url, quality);
        } else {
          currentPath = await songManager.getMusicCachePath(currentId, quality);
        }
      }

      if (token !== this.currentRequestToken) return;

      if (currentPath) {
        this.currentAnalysisKey = currentPath;
        if (!this.currentAnalysis || this.currentAnalysisKind !== "full") {
          const raw = await window.electron.ipcRenderer.invoke("analyze-audio", currentPath, {
            maxAnalyzeTimeSec: analyzeTime,
          });
          if (token !== this.currentRequestToken) return;
          if (isAudioAnalysis(raw)) {
            this.currentAnalysis = raw;
            this.currentAnalysisKind = "full";
          }
        }
      }

      let nextPath = nextInfo.song.path || null;
      if (!nextPath && nextId !== null) {
        const cached = await songManager.getMusicCachePath(nextId);
        if (cached) {
          nextPath = cached;
        } else {
          const prefetch = songManager.peekPrefetch(nextId);
          if (!prefetch && settingStore.useNextPrefetch) {
            await songManager.prefetchNextSong();
          }
          const updatedPrefetch = songManager.peekPrefetch(nextId);
          const url = updatedPrefetch?.url;
          const quality = updatedPrefetch?.quality;
          if (url && url.startsWith("file://")) {
            nextPath = this.fileUrlToPath(url);
          } else if (url && url.startsWith("http")) {
            nextPath = await songManager.ensureMusicCachePath(nextId, url, quality);
          }
        }
      }

      if (token !== this.currentRequestToken) return;

      if (nextPath) {
        if (this.nextAnalysisKey !== nextPath) {
          this.nextAnalysisKey = nextPath;
          this.nextAnalysisSongId = nextId;
          this.nextAnalysis = null;
          this.nextAnalysisKind = "none";
          this.nextAnalysisInFlight = null;
        }
        if (!this.nextAnalysis) {
          const raw = await window.electron.ipcRenderer.invoke("analyze-audio-head", nextPath, {
            maxAnalyzeTimeSec: analyzeTime,
          });
          if (token !== this.currentRequestToken) return;
          if (this.nextAnalysisKey === nextPath && isAudioAnalysis(raw)) {
            this.nextAnalysis = raw;
            this.nextAnalysisKind = "head";
          }
        }
      }
    })().finally(() => {
      if (this.ensureAutomixAnalysisKey === key) {
        this.ensureAutomixAnalysisInFlight = null;
      }
    });
  }

  private automixLog(
    level: "log" | "warn",
    key: string,
    message: string,
    intervalMs: number = 5000,
    detail?: unknown,
  ): void {
    const now = Date.now();
    const scopedKey = `${this.currentRequestToken}:${key}`;
    const lastAt = this.automixLogTimestamps.get(scopedKey) ?? 0;
    if (intervalMs > 0 && now - lastAt < intervalMs) return;
    this.automixLogTimestamps.set(scopedKey, now);
    if (level === "warn") {
      if (detail === undefined) console.warn(message);
      else console.warn(message, detail);
      return;
    }
    if (detail === undefined) console.log(message);
    else console.log(message, detail);
  }

  constructor() {
    // 初始化 AudioManager（会根据设置自动选择引擎）
    const audioManager = useAudioManager();
    const settingStore = useSettingStore();

    // 应用已保存的输出设备
    if (settingStore.playDevice) {
      audioManager.setSinkId(settingStore.playDevice).catch(console.warn);
    }

    // 监听设置变化以更新 ReplayGain
    settingStore.$subscribe((mutation) => {
      const events = Array.isArray(mutation.events) ? mutation.events : [mutation.events];
      const shouldUpdate = events.some((event) => {
        // 安全检查 event 是否为包含 key 的对象
        if (!event || typeof event !== "object" || !("key" in event)) return false;
        const key = (event as { key: string }).key;
        return ["enableReplayGain", "replayGainMode"].includes(key);
      });

      if (shouldUpdate) {
        this.applyReplayGain();
      }
    });

    this.bindAudioEvents();
  }

  /**
   * 应用 ReplayGain (音量平衡)
   * @param songOverride 强制指定歌曲 (不从 store 读取)
   * @param apply 是否立即应用到当前引擎
   * @returns 计算出的增益值
   */
  private applyReplayGain(songOverride?: SongType, apply: boolean = true): number {
    const musicStore = useMusicStore();
    const settingStore = useSettingStore();
    const audioManager = useAudioManager();

    if (!settingStore.enableReplayGain) {
      if (apply) audioManager.setReplayGain(1);
      return 1;
    }

    const song = songOverride || musicStore.playSong;
    if (!song || !song.replayGain) {
      if (apply) audioManager.setReplayGain(1);
      return 1;
    }

    const { trackGain, albumGain, trackPeak, albumPeak } = song.replayGain;
    let targetGain = 1;

    // 优先使用指定模式的增益，如果不存在则回退到另一种
    // 注意：music-metadata 提取的 gain 通常是 dB 值，需要转换，但我们在 ipc-file.ts 中使用了 .ratio
    // 如果 .ratio 存在，则直接使用线性值
    if (settingStore.replayGainMode === "album") {
      targetGain = albumGain ?? trackGain ?? 1;
    } else {
      targetGain = trackGain ?? albumGain ?? 1;
    }

    // 简单防削波保护
    const peak =
      settingStore.replayGainMode === "album" ? (albumPeak ?? trackPeak) : (trackPeak ?? albumPeak);

    // 应用 Automix 增益
    targetGain *= this.automixGain;

    if (peak && peak > 0) {
      if (targetGain * peak > 1.0) {
        targetGain = 1.0 / peak;
      }
    }

    console.log(
      `🔊 [ReplayGain] Applied: ${targetGain.toFixed(4)} (Mode: ${settingStore.replayGainMode})`,
    );
    if (apply) audioManager.setReplayGain(targetGain);
    return targetGain;
  }

  /**
   * 准备音频源与分析数据
   */
  private async prepareAudioSource(
    song: SongType,
    requestToken: number,
    options?: { forceCacheForOnline?: boolean; analysis?: "none" | "head" | "full" },
  ): Promise<{
    audioSource: {
      url: string;
      quality: QualityType | undefined;
      source: AudioSourceType | undefined;
    };
    analysis: AudioAnalysis | null;
    analysisKind: "none" | "head" | "full";
  }> {
    const songManager = useSongManager();
    const settingStore = useSettingStore();

    const audioSource = await songManager.getAudioSource(song);
    // 检查请求是否过期
    if (requestToken !== this.currentRequestToken) {
      throw new Error("EXPIRED");
    }
    if (!audioSource.url) throw new Error("AUDIO_SOURCE_EMPTY");

    // 确保 url 存在
    const safeAudioSource = {
      ...audioSource,
      url: audioSource.url!,
      quality: audioSource.quality,
      source: audioSource.source,
    };

    if (
      isElectron &&
      settingStore.enableAutomix &&
      settingStore.playbackEngine === "web-audio" &&
      options?.forceCacheForOnline &&
      safeAudioSource.url.startsWith("http")
    ) {
      const songId = this.getSongIdForCache(song);
      if (songId !== null) {
        const cachedPath = await songManager.ensureMusicCachePath(
          songId,
          safeAudioSource.url,
          safeAudioSource.quality,
        );
        if (requestToken !== this.currentRequestToken) {
          throw new Error("EXPIRED");
        }
        if (cachedPath) {
          const encodedPath = cachedPath.replace(/#/g, "%23").replace(/\?/g, "%3F");
          safeAudioSource.url = `file://${encodedPath}`;
        }
      }
    }
    this.currentAudioSource = safeAudioSource;

    let analysis: AudioAnalysis | null = null;
    let analysisKind: "none" | "head" | "full" = "none";
    const analysisKey = song.path || this.fileUrlToPath(safeAudioSource.url);
    this.currentAnalysisKey = analysisKey;
    const analysisMode = options?.analysis ?? "full";
    if (
      analysisMode !== "none" &&
      isElectron &&
      settingStore.enableAutomix &&
      settingStore.playbackEngine === "web-audio" &&
      analysisKey
    ) {
      try {
        const channel = analysisMode === "head" ? "analyze-audio-head" : "analyze-audio";
        const raw = await window.electron.ipcRenderer.invoke(channel, analysisKey, {
          maxAnalyzeTimeSec: this.getAutomixAnalyzeTimeSec(),
        });
        if (requestToken !== this.currentRequestToken) {
          throw new Error("EXPIRED");
        }
        if (isAudioAnalysis(raw)) {
          analysis = raw;
          analysisKind = analysisMode;
        }
      } catch (e: any) {
        if (e.message === "EXPIRED") throw e;
        console.warn("[Automix] 分析失败:", e);
      }
    }
    return { audioSource: safeAudioSource, analysis, analysisKind };
  }

  /**
   * 设置歌曲 UI 状态 (不含播放)
   */
  private setupSongUI(
    song: SongType,
    audioSource: {
      url: string;
      quality: QualityType | undefined;
      source: AudioSourceType | undefined;
    },
    startSeek: number,
  ) {
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    const lyricManager = useLyricManager();

    musicStore.playSong = song;
    statusStore.currentTime = startSeek;
    // 重置进度
    statusStore.progress = 0;
    statusStore.lyricIndex = -1;
    // 重置重试计数
    const sid = song.type === "radio" ? song.dj?.id : song.id;
    if (this.retryInfo.songId !== sid) {
      this.retryInfo = { songId: sid || 0, count: 0 };
    }
    statusStore.lyricLoading = true;
    // 重置 AB 循环
    statusStore.abLoop.enable = false;
    statusStore.abLoop.pointA = null;
    statusStore.abLoop.pointB = null;
    // 通知桌面歌词
    if (isElectron) {
      window.electron.ipcRenderer.send("desktop-lyric:update-data", {
        lyricLoading: true,
      });
    }
    // 更新任务栏歌词窗口的元数据
    // 注意：getPlayerInfoObj 内部读取 musicStore.playSong，所以上面必须先赋值
    const { name, artist, album } = getPlayerInfoObj() || {};
    const coverUrl = song.coverSize?.s || song.cover || "";
    playerIpc.sendTaskbarMetadata({
      title: name || "",
      artist: artist || "",
      cover: coverUrl,
    });

    // 主动通知桌面歌词和 macOS 状态栏歌词 确保 AutoMix 平滑过渡时也触发更新
    if (isElectron) {
      const playTitle = `${name} - ${artist}`;
      playerIpc.sendSongChange(playTitle, name || "", artist || "", album || "");

      if (isMac) {
        playerIpc.sendTaskbarProgressData({
          currentTime: startSeek,
          duration: song.duration,
          offset: statusStore.getSongOffset(song.id),
        });
      }
    }

    // 获取歌词
    lyricManager.handleLyric(song);
    console.log(`🎧 [${song.id}] 最终播放信息:`, audioSource);
    // 更新音质和解锁状态
    statusStore.songQuality = audioSource.quality;
    statusStore.audioSource = audioSource.source;
  }

  /**
   * 初始化并播放歌曲
   * @param options 配置
   * @param options.autoPlay 是否自动播放
   * @param options.seek 初始播放进度（毫秒）
   */
  public async playSong(
    options: {
      autoPlay?: boolean;
      seek?: number;
      crossfade?: boolean;
      crossfadeDuration?: number;
      song?: SongType;
    } = { autoPlay: true, seek: 0 },
  ) {
    const statusStore = useStatusStore();
    const audioManager = useAudioManager();

    // 重置过渡状态
    this.isTransitioning = false;
    this.nextAnalysis = null;
    this.nextAnalysisKey = null;
    this.nextAnalysisSongId = null;
    this.nextAnalysisInFlight = null;
    this.nextAnalysisKind = "none";
    this.nextTransitionKey = null;
    this.nextTransitionInFlight = null;
    this.nextTransitionProposal = null;
    this.automixLogTimestamps.clear();
    this.currentAnalysisKey = null;
    this.currentAudioSource = null;

    // 生成新的请求标识
    this.currentRequestToken++;
    const requestToken = this.currentRequestToken;

    const { autoPlay = true, seek = 0 } = options;
    // 要播放的歌曲对象
    const playSongData = options.song || getPlaySongData();
    if (!playSongData) {
      statusStore.playLoading = false;
      // 初始化或无歌曲时
      if (!statusStore.playStatus && !autoPlay) return;
      throw new Error("SONG_NOT_FOUND");
    }

    // Fuck DJ Mode
    if (this.shouldSkipSong(playSongData)) {
      console.log(`[Fuck DJ] Skipping: ${playSongData.name}`);
      window.$message.warning(`已跳过 DJ/抖音 歌曲: ${playSongData.name}`);
      this.nextOrPrev("next");
      return;
    }

    try {
      // 立即停止当前播放 (除非是 Crossfade)
      if (!options.crossfade) {
        audioManager.stop();
      }

      statusStore.playLoading = true;

      const { audioSource, analysis, analysisKind } = await this.prepareAudioSource(
        playSongData,
        requestToken,
        { analysis: options.crossfade ? "head" : "none" },
      );

      // Automix 分析应用
      let startSeek = seek ?? 0;
      const lastAnalysis = this.currentAnalysis;
      this.currentAnalysis = analysis;
      this.currentAnalysisKind = analysis ? analysisKind : "none";
      let initialRate = 1.0;

      if (analysis) {
        // Smart Cut: Skip silence at start
        if (analysis.fade_in_pos && startSeek === 0) {
          // 如果有 cut_in_pos，优先使用
          const cutIn = analysis.cut_in_pos ?? analysis.fade_in_pos;
          startSeek = Math.max(startSeek, cutIn * 1000);
          console.log(`✨ [Automix] Smart Cut Start: ${this.formatAutomixTime(cutIn)}`);
        }

        // BPM Alignment
        if (options.crossfade && lastAnalysis && lastAnalysis.bpm && analysis.bpm) {
          const bpmA = lastAnalysis.bpm;
          const bpmB = analysis.bpm;
          const confidenceA = lastAnalysis.bpm_confidence ?? 0;
          const confidenceB = analysis.bpm_confidence ?? 0;

          if (confidenceA > 0.4 && confidenceB > 0.4) {
            const ratio = bpmA / bpmB;
            if (ratio >= 0.97 && ratio <= 1.03) {
              initialRate = ratio;
              console.log(
                `✨ [Automix] BPM Align: ${bpmA.toFixed(1)} -> ${bpmB.toFixed(1)} (Rate: ${ratio.toFixed(4)})`,
              );
            }
          }
        }
      }

      // 设置 UI 状态
      this.setupSongUI(playSongData, audioSource, startSeek);

      // 执行底层播放
      await this.loadAndPlay(
        audioSource.url,
        autoPlay,
        startSeek,
        options.crossfade ? { duration: options.crossfadeDuration ?? 5 } : undefined,
        initialRate,
      );
      if (requestToken !== this.currentRequestToken) return;
      // 后置处理
      await this.afterPlaySetup(playSongData);
    } catch (error) {
      if (requestToken === this.currentRequestToken) {
        console.error("❌ 播放初始化失败:", error);
        this.handlePlaybackError(undefined);
      }
    }
  }

  /**
   * 切换音质（仅切换音频源，不重新加载歌词）
   * @param seek 当前播放进度（毫秒）
   * @param autoPlay 是否自动播放（默认保持当前状态）
   */
  async switchQuality(seek: number = 0, autoPlay?: boolean) {
    const statusStore = useStatusStore();
    const songManager = useSongManager();
    const audioManager = useAudioManager();

    const playSongData = getPlaySongData();
    if (!playSongData || playSongData.path) return;

    // 如果未指定 autoPlay，则保持当前播放状态
    const shouldAutoPlay = autoPlay ?? statusStore.playStatus;

    try {
      statusStore.playLoading = true;
      // 清除预取缓存，强制重新获取
      songManager.clearPrefetch();
      // 获取新音频源
      const audioSource = await songManager.getAudioSource(playSongData);
      if (!audioSource.url) {
        window.$message.error("切换音质失败");
        statusStore.playLoading = false;
        return;
      }
      console.log(`🔄 [${playSongData.id}] 切换音质:`, audioSource);
      // 更新音质和解锁状态
      statusStore.songQuality = audioSource.quality;
      statusStore.audioSource = audioSource.source;
      // 停止当前播放
      audioManager.stop();
      // 执行底层播放，保持进度，保持原播放状态
      await this.loadAndPlay(audioSource.url, shouldAutoPlay, seek);
    } catch (error) {
      console.error("❌ 切换音质失败:", error);
      statusStore.playLoading = false;
      window.$message.error("切换音质失败");
    }
  }

  /**
   * 切换音频源
   * @param source 音频源标识
   */
  public async switchAudioSource(source: string) {
    const statusStore = useStatusStore();
    const songManager = useSongManager();
    const musicStore = useMusicStore();
    const audioManager = useAudioManager();
    const playSongData = musicStore.playSong;
    if (!playSongData || playSongData.path) return;
    try {
      statusStore.playLoading = true;
      // 清除预取缓存
      songManager.clearPrefetch();
      // 获取新音频源
      const audioSource = await songManager.getAudioSource(playSongData, source);
      if (!audioSource.url) {
        window.$message.error("切换音频源失败：无法获取播放链接");
        statusStore.playLoading = false;
        return;
      }
      console.log(`🔄 [${playSongData.id}] 切换音频源:`, audioSource);
      // 更新状态
      statusStore.songQuality = audioSource.quality;
      statusStore.audioSource = audioSource.source;
      // 保持当前进度和播放状态
      const seek = statusStore.currentTime;
      const shouldAutoPlay = statusStore.playStatus;
      // 停止当前播放
      audioManager.stop();
      await this.loadAndPlay(audioSource.url, shouldAutoPlay, seek);
    } catch (error) {
      console.error("❌ 切换音频源失败:", error);
      statusStore.playLoading = false;
      window.$message.error("切换音频源失败");
    }
  }

  /**
   * 加载音频流并播放
   */
  private async loadAndPlay(
    url: string,
    autoPlay: boolean,
    seek: number,
    crossfadeOptions?: {
      duration: number;
      uiSwitchDelay?: number;
      onSwitch?: () => void;
      deferStateSync?: boolean;
      mixType?: "default" | "bassSwap";
      pitchShift?: number;
      playbackRate?: number;
      automationCurrent?: AutomationPoint[];
      automationNext?: AutomationPoint[];
      replayGain?: number;
    },
    initialRate: number = 1.0,
  ) {
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    const audioManager = useAudioManager();

    // Reset rate timer
    if (this.rateResetTimer) {
      clearTimeout(this.rateResetTimer);
      this.rateResetTimer = undefined;
    }
    if (this.rateRampFrame) {
      cancelAnimationFrame(this.rateRampFrame);
      this.rateRampFrame = undefined;
    }

    // 设置基础参数
    audioManager.setVolume(statusStore.playVolume);
    // 仅当引擎支持倍速时设置
    if (audioManager.capabilities.supportsRate) {
      const baseRate = statusStore.playRate;
      // 仅在非 Crossfade 时直接设置速率，否则会导致上一首歌变调
      if (!crossfadeOptions) {
        audioManager.setRate(baseRate * initialRate);
      }

      // Schedule reset
      if (initialRate !== 1.0 && crossfadeOptions) {
        this.rateResetTimer = setTimeout(() => {
          this.rampRateTo(baseRate, 2000);
        }, crossfadeOptions.duration * 1000);
      }
    }

    // 应用 ReplayGain
    const replayGain =
      crossfadeOptions?.replayGain ?? this.applyReplayGain(undefined, !crossfadeOptions);

    // 切换输出设备（非 MPV 引擎且未开启频谱时）
    if (audioManager.engineType !== "mpv" && !settingStore.showSpectrums) {
      this.toggleOutputDevice();
    }

    // 播放新音频
    try {
      const updateSeekState = () => {
        statusStore.currentTime = seek;
        const duration = this.getDuration() || statusStore.duration;
        if (duration > 0) {
          statusStore.progress = calculateProgress(seek, duration);
        } else {
          statusStore.progress = 0;
        }
        return duration;
      };

      const shouldDeferStateSync = !!(crossfadeOptions?.deferStateSync && autoPlay);

      // 设置期望的 seek 位置（MPV 引擎特有）
      if (seek > 0) {
        audioManager.setPendingSeek(seek / 1000);
      }

      if (crossfadeOptions) {
        const onSwitch = crossfadeOptions.onSwitch;
        const wrappedOnSwitch = shouldDeferStateSync
          ? () => {
              onSwitch?.();
              updateSeekState();
            }
          : onSwitch;
        await audioManager.crossfadeTo(url, {
          duration: crossfadeOptions.duration,
          seek: seek / 1000,
          autoPlay,
          uiSwitchDelay: crossfadeOptions.uiSwitchDelay,
          onSwitch: wrappedOnSwitch,
          mixType: crossfadeOptions.mixType,
          pitchShift: crossfadeOptions.pitchShift,
          playbackRate: crossfadeOptions.playbackRate,
          automationCurrent: crossfadeOptions.automationCurrent,
          automationNext: crossfadeOptions.automationNext,
          rate: audioManager.capabilities.supportsRate
            ? statusStore.playRate * initialRate
            : undefined,
          replayGain,
        });
      } else {
        // 计算渐入时间
        const fadeTime = settingStore.getFadeTime ? settingStore.getFadeTime / 1000 : 0;
        await audioManager.play(url, {
          fadeIn: !!fadeTime,
          fadeDuration: fadeTime,
          autoPlay,
          seek: seek / 1000,
        });
      }

      // 更新进度到状态
      const duration = !crossfadeOptions || !shouldDeferStateSync ? updateSeekState() : 0;

      // 如果不自动播放，设置任务栏暂停状态
      if (!autoPlay) {
        // 立即将 UI 置为暂停，防止事件竞态导致短暂显示为播放
        statusStore.playStatus = false;
        playerIpc.sendPlayStatus(false);
        playerIpc.sendTaskbarState({ isPlaying: false });
        playerIpc.sendTaskbarMode("paused");
        if (seek > 0) {
          const safeDuration = duration || this.getDuration() || statusStore.duration;
          const progress = calculateProgress(seek, safeDuration);
          playerIpc.sendTaskbarProgress(progress);
        }
      }
    } catch (error) {
      console.error("❌ 音频播放失败:", error);
      throw error;
    }
  }

  /**
   * 平滑过渡播放速率
   */
  private rampRateTo(targetRate: number, duration: number) {
    const audioManager = useAudioManager();
    const startRate = audioManager.getRate();
    const startTime = Date.now();

    const tick = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1.0);
      const current = startRate + (targetRate - startRate) * progress;
      audioManager.setRate(current);

      if (progress < 1.0) {
        this.rateRampFrame = requestAnimationFrame(tick);
      } else {
        this.rateRampFrame = undefined;
        this.rateResetTimer = undefined;
      }
    };
    this.rateRampFrame = requestAnimationFrame(tick);
  }

  /**
   * 播放成功后的后续设置
   * @param song 歌曲
   */
  private async afterPlaySetup(song: SongType) {
    const dataStore = useDataStore();
    const musicStore = useMusicStore();
    const settingStore = useSettingStore();
    const songManager = useSongManager();
    // 记录播放历史 (非电台)
    if (song.type !== "radio") dataStore.setHistory(song);
    // 更新歌曲数据
    if (!song.path || song.type === "streaming") {
      mediaSessionManager.updateMetadata();
      getCoverColor(musicStore.songCover);
    }
    // 本地文件额外处理
    else {
      await this.parseLocalMusicInfo(song.path);
    }

    // 预载下一首
    if (settingStore.useNextPrefetch) songManager.prefetchNextSong();

    // Last.fm Scrobbler
    if (settingStore.lastfm.enabled && settingStore.isLastfmConfigured) {
      const { name, artist, album } = getPlayerInfoObj() || {};
      const durationInSeconds = song.duration > 0 ? Math.floor(song.duration / 1000) : undefined;
      lastfmScrobbler.startPlaying(name || "", artist || "", album, durationInSeconds);
    }
  }

  /**
   * 解析本地歌曲元信息
   * @param path 歌曲路径
   */
  private async parseLocalMusicInfo(path: string) {
    try {
      const musicStore = useMusicStore();
      if (musicStore.playSong.type === "streaming") return;
      const statusStore = useStatusStore();
      const blobURLManager = useBlobURLManager();
      // Blob URL 清理
      const oldCover = musicStore.playSong.cover;
      let shouldFetchCover = !oldCover || oldCover === "/images/song.jpg?asset";

      if (oldCover && oldCover.startsWith("blob:")) {
        blobURLManager.revokeBlobURL(musicStore.playSong.path || "");
        shouldFetchCover = true;
      }

      let coverBuffer: Uint8Array | undefined;

      // 获取封面数据
      if (shouldFetchCover) {
        console.log("获取封面数据");
        const coverData = await window.electron.ipcRenderer.invoke("get-music-cover", path);
        if (coverData) {
          const blobURL = blobURLManager.createBlobURL(coverData.data, coverData.format, path);
          if (blobURL) musicStore.playSong.cover = blobURL;
          if (coverData.data) {
            coverBuffer = new Uint8Array(coverData.data);
          }
        } else {
          musicStore.playSong.cover = "/images/song.jpg?asset";
        }
      }
      // 获取元数据
      const infoData = await window.electron.ipcRenderer.invoke("get-music-metadata", path);
      statusStore.songQuality = handleSongQuality(infoData.format?.bitrate ?? 0, "local");
      // 获取主色
      getCoverColor(musicStore.playSong.cover);
      // 更新媒体会话
      mediaSessionManager.updateMetadata(coverBuffer);
      // 更新任务栏歌词
      const { name, artist } = getPlayerInfoObj() || {};
      playerIpc.sendTaskbarMetadata({
        title: name || "",
        artist: artist || "",
        cover: musicStore.playSong.cover || "",
      });
    } catch (error) {
      console.error("❌ 解析本地歌曲元信息失败:", error);
    }
  }

  /**
   * Automix 调度状态更新（非时间敏感）
   */
  private updateAutomixMonitoring(): void {
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    const audioManager = useAudioManager();

    const shouldMonitor =
      settingStore.enableAutomix &&
      !statusStore.personalFmMode &&
      statusStore.playStatus &&
      !this.isTransitioning &&
      audioManager.engineType !== "mpv";

    if (!shouldMonitor) {
      this.resetAutomixScheduling("IDLE");
      this.stopAutomixScheduler();
      return;
    }

    this.ensureAutomixScheduler();
    if (this.automixState === "IDLE") {
      this.automixState = "MONITORING";
    }
  }

  private ensureAutomixScheduler(): void {
    if (this.automixScheduler) return;
    const audioContext = getSharedAudioContext();
    this.automixScheduler = new AudioScheduler(audioContext);
    this.automixScheduler.setTickHandler(() => this.onAutomixSchedulerTick());
    this.automixScheduler.start();
  }

  private stopAutomixScheduler(): void {
    if (!this.automixScheduler) return;
    this.automixScheduler.setTickHandler(null);
    this.automixScheduler.stop();
    this.automixScheduler = null;
  }

  private resetAutomixScheduling(state: AutomixState): void {
    if (this.automixScheduler && this.automixScheduleGroupId) {
      this.automixScheduler.clearGroup(this.automixScheduleGroupId);
    }
    this.automixScheduleGroupId = null;
    this.automixScheduledCtxTime = null;
    this.automixScheduledToken = null;
    this.automixScheduledNextId = null;
    this.automixState = state;
  }

  private onAutomixSchedulerTick(): void {
    if (!this.automixScheduler) return;

    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    const audioManager = useAudioManager();

    if (
      this.isTransitioning ||
      !statusStore.playStatus ||
      !settingStore.enableAutomix ||
      statusStore.personalFmMode ||
      audioManager.engineType === "mpv"
    ) {
      if (this.automixState !== "IDLE") {
        this.resetAutomixScheduling("IDLE");
      }
      return;
    }

    const duration = audioManager.duration;
    if (!(duration > 0)) return;

    const rawTime = audioManager.currentTime;
    const remaining = duration - rawTime;

    const analyzeWindowSec = settingStore.automixMaxAnalyzeTime || 60;
    const monitorWindowSec = Math.max(30, Math.min(300, analyzeWindowSec));

    if (remaining > monitorWindowSec) {
      if (this.automixState === "SCHEDULED") {
        this.resetAutomixScheduling("MONITORING");
      } else if (this.automixState === "IDLE") {
        this.automixState = "MONITORING";
      }
      return;
    }

    this.ensureAutomixAnalysisReady();
    if (this.automixState === "COOLDOWN") return;

    this.maybeScheduleAutomix(rawTime);
  }

  private maybeScheduleAutomix(rawTime: number): void {
    const scheduler = this.automixScheduler;
    if (!scheduler) return;

    const plan = this.computeAutomixPlan(rawTime);
    if (!plan) return;

    if (plan.triggerTime <= rawTime) {
      this.beginAutomix(plan);
      return;
    }

    const audioContext = getSharedAudioContext();
    const ctxTriggerTime = audioContext.currentTime + (plan.triggerTime - rawTime);

    if (
      this.automixState === "SCHEDULED" &&
      this.automixScheduledCtxTime !== null &&
      this.automixScheduledToken === plan.token &&
      this.automixScheduledNextId === plan.nextSong.id &&
      Math.abs(this.automixScheduledCtxTime - ctxTriggerTime) < 0.1
    ) {
      return;
    }

    if (this.automixScheduleGroupId) {
      scheduler.clearGroup(this.automixScheduleGroupId);
    }

    const groupId = scheduler.createGroupId("automix");
    this.automixScheduleGroupId = groupId;
    this.automixScheduledCtxTime = ctxTriggerTime;
    this.automixScheduledToken = plan.token;
    this.automixScheduledNextId = plan.nextSong.id;
    this.automixState = "SCHEDULED";

    scheduler.runAt(groupId, ctxTriggerTime, () => this.beginAutomix(plan));
    this.automixLog(
      "log",
      `schedule:${plan.nextSong.id}:${Math.round(plan.triggerTime * 10)}:${Math.round(plan.crossfadeDuration * 10)}:${Math.round(plan.startSeek)}`,
      `[Automix] 已调度：触发 ${this.formatAutomixTime(plan.triggerTime)}，时长 ${this.formatAutomixTime(plan.crossfadeDuration)}，Seek ${this.formatAutomixTime(plan.startSeek / 1000)}，Rate ${plan.initialRate.toFixed(4)}，类型 ${plan.mixType}`,
      0,
    );
  }

  private beginAutomix(plan: AutomixPlan): void {
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    const audioManager = useAudioManager();

    if (
      this.isTransitioning ||
      !statusStore.playStatus ||
      !settingStore.enableAutomix ||
      statusStore.personalFmMode ||
      audioManager.engineType === "mpv"
    ) {
      this.resetAutomixScheduling("IDLE");
      return;
    }

    if (plan.token !== this.currentRequestToken) {
      this.resetAutomixScheduling("MONITORING");
      return;
    }

    if (this.automixScheduleGroupId && this.automixScheduler) {
      this.automixScheduler.clearGroup(this.automixScheduleGroupId);
    }
    this.automixScheduleGroupId = null;
    this.automixScheduledCtxTime = null;
    this.automixScheduledToken = null;
    this.automixScheduledNextId = null;

    statusStore.triggerAutomixFx();
    this.isTransitioning = true;
    this.automixState = "TRANSITIONING";

    void this.automixPlay(plan.nextSong, plan.nextIndex, {
      autoPlay: true,
      crossfadeDuration: plan.crossfadeDuration,
      startSeek: plan.startSeek,
      initialRate: plan.initialRate,
      uiSwitchDelay: plan.uiSwitchDelay,
      mixType: plan.mixType,
      pitchShift: plan.pitchShift,
      playbackRate: plan.playbackRate,
      automationCurrent: plan.automationCurrent,
      automationNext: plan.automationNext,
    });
  }

  /**
   * 计算智能过渡时长
   * 基于 BPM、结构空间和能量差异
   */
  // private calculateSmartDuration(
  //   bpm: number,
  //   introLen: number,
  //   outroLen: number,
  //   energyDiff: number = 0,
  // ): number {
  //   const beatTime = 60 / bpm;

  //   // 1. 基础时长：默认 32 拍 (8小节)，约 15秒 @ 128BPM
  //   let targetBeats = 32;

  //   // 2. 空间受限检查
  //   // 如果下一首的前奏少于 32 拍，就降级到 16 拍
  //   if (introLen < beatTime * 32) {
  //     targetBeats = 16;
  //   }
  //   // 如果还是不够，降级到 8 拍
  //   if (introLen < beatTime * 16) {
  //     targetBeats = 8;
  //   }

  //   // 3. 同样的逻辑检查当前歌的 Outro
  //   // outroLen 是当前歌 vocal_out 之后剩余的空间
  //   if (outroLen < beatTime * targetBeats) {
  //     targetBeats = Math.floor(outroLen / beatTime / 4) * 4; // 向下取整到 4 拍倍数
  //   }

  //   // 4. 能量差异调整
  //   // 如果能量差异过大 (> 6dB)，强制缩短过渡
  //   if (energyDiff > 6.0) {
  //     targetBeats = Math.min(targetBeats, 8);
  //   }

  //   // 5. 兜底：最少 4 拍 (1小节)
  //   return Math.max(beatTime * 4, beatTime * targetBeats);
  // }

  private prefetchAutomixNextData(nextSong: SongType) {
    const settingStore = useSettingStore();
    const musicStore = useMusicStore();
    if (!isElectron || !settingStore.enableAutomix) return;

    const nextSongId = this.getSongIdForCache(nextSong);
    const nextKey =
      nextSong.path ||
      (nextSongId !== null && this.nextAnalysisSongId === nextSongId ? this.nextAnalysisKey : null);
    if (!nextKey) return;
    if (this.nextAnalysisKey !== nextKey) {
      this.nextAnalysisKey = nextKey;
      this.nextAnalysisSongId = nextSongId;
      this.nextAnalysis = null;
      this.nextAnalysisInFlight = null;
    }

    if (!this.nextAnalysis && !this.nextAnalysisInFlight) {
      this.nextAnalysisInFlight = window.electron.ipcRenderer
        .invoke("analyze-audio-head", nextKey, {
          maxAnalyzeTimeSec: this.getAutomixAnalyzeTimeSec(),
        })
        .then((raw) => {
          if (this.nextAnalysisKey !== nextKey) return;
          if (isAudioAnalysis(raw)) {
            this.nextAnalysis = raw;
          }
        })
        .catch((e) => {
          if (this.nextAnalysisKey !== nextKey) return;
          console.warn("[Automix] 下一首分析失败:", e);
        })
        .finally(() => {
          if (this.nextAnalysisKey === nextKey) {
            this.nextAnalysisInFlight = null;
          }
        });
    }

    const currentPath =
      this.currentAnalysisKey ||
      musicStore.playSong?.path ||
      (this.currentAudioSource ? this.fileUrlToPath(this.currentAudioSource.url) : null);
    if (!currentPath) return;

    const transitionKey = `${currentPath}>>${nextKey}`;
    if (this.nextTransitionKey !== transitionKey) {
      this.nextTransitionKey = transitionKey;
      this.nextTransitionProposal = null;
      this.nextAdvancedTransition = null;
      this.nextTransitionInFlight = null;
    }

    if (
      !this.nextTransitionProposal &&
      !this.nextAdvancedTransition &&
      !this.nextTransitionInFlight
    ) {
      this.nextTransitionInFlight = Promise.all([
        window.electron.ipcRenderer.invoke("suggest-transition", currentPath, nextKey),
        window.electron.ipcRenderer.invoke("suggest-long-mix", currentPath, nextKey),
      ])
        .then(([raw, rawLong]) => {
          if (this.nextTransitionKey !== transitionKey) return;
          if (isTransitionProposal(raw)) {
            this.nextTransitionProposal = raw;
          }
          if (isAdvancedTransition(rawLong)) {
            this.nextAdvancedTransition = rawLong;
          }
        })
        .catch((e) => {
          if (this.nextTransitionKey !== transitionKey) return;
          console.warn("[Automix] 原生过渡建议失败:", e);
        })
        .finally(() => {
          if (this.nextTransitionKey === transitionKey) {
            this.nextTransitionInFlight = null;
          }
        });
    }
  }

  /**
   * 核心 Automix 触发检测逻辑 (每帧运行)
   */
  private computeAutomixPlan(_rawTime: number): AutomixPlan | null {
    // 1. 获取下一首歌
    const nextInfo = this.getNextSongForAutomix();
    if (!nextInfo) return null;
    this.prefetchAutomixNextData(nextInfo.song);

    const currentAnalysis = this.currentAnalysis;
    const nextAnalysis = this.nextAnalysis;
    const duration = this.getDuration() / 1000;

    // 2. 确定基础退出点 (Exit Point)
    // 优先级: Cut Out > Fade Out > End of File
    const canTrustExitPoint = !!currentAnalysis && this.currentAnalysisKind === "full";
    const vocalOut = canTrustExitPoint ? currentAnalysis.vocal_out_pos : undefined;
    let rawFadeOut = canTrustExitPoint ? currentAnalysis.fade_out_pos || duration : duration;
    rawFadeOut = Math.min(rawFadeOut, duration);
    if (vocalOut !== undefined && rawFadeOut < vocalOut - 0.1) {
      this.automixLog(
        "warn",
        "fade_out_early",
        `Fade out ${rawFadeOut} < Vocal out ${vocalOut}`,
        5000,
      );
      rawFadeOut = duration;
    }
    let exitPoint = rawFadeOut;

    if (canTrustExitPoint && currentAnalysis.cut_out_pos !== undefined) {
      const cutOut = currentAnalysis.cut_out_pos;
      const cutIn = currentAnalysis.cut_in_pos ?? currentAnalysis.fade_in_pos ?? 0;
      // 只有当有效时长足够时才使用 cut_out
      if (Number.isFinite(cutOut) && cutOut > 0 && cutOut <= duration && cutOut - cutIn > 30) {
        exitPoint = cutOut;
        if (vocalOut !== undefined && exitPoint < vocalOut - 0.1) {
          this.automixLog(
            "warn",
            "cut_out_early",
            `Cut out ${exitPoint} < Vocal out ${vocalOut}`,
            5000,
          );
          exitPoint = rawFadeOut;
        }
      }
    }

    // 3. 初始化默认计划
    let triggerTime = exitPoint - 8.0; // 默认 8s Crossfade
    let crossfadeDuration = 8.0;
    let startSeek = 0;
    let mixType: "default" | "bassSwap" = "default";
    let pitchShift = 0;
    let playbackRate = 1.0;
    let initialRate = 1.0;
    let uiSwitchDelay = 0;
    let automationCurrent: AutomationPoint[] = [];
    let automationNext: AutomationPoint[] = [];

    // 4. 获取过渡建议 (Native / Mashup)
    const musicStore = useMusicStore();
    const nextSongId = this.getSongIdForCache(nextInfo.song);
    const currentPath = this.currentAnalysisKey || musicStore.playSong?.path;
    const nextPath =
      nextInfo.song.path ||
      (nextSongId !== null && this.nextAnalysisSongId === nextSongId ? this.nextAnalysisKey : null);
    const transitionKey = currentPath && nextPath ? `${currentPath}>>${nextPath}` : null;

    const advancedTransition =
      transitionKey && this.nextTransitionKey === transitionKey
        ? this.nextAdvancedTransition
        : null;
    const transition =
      transitionKey && this.nextTransitionKey === transitionKey
        ? this.nextTransitionProposal
        : null;

    // 策略 A: Mashup / Advanced Transition
    if (advancedTransition) {
      triggerTime = advancedTransition.start_time_current;
      crossfadeDuration = advancedTransition.duration;
      startSeek = advancedTransition.start_time_next * 1000;
      pitchShift = advancedTransition.pitch_shift_semitones;
      playbackRate = advancedTransition.playback_rate;
      automationCurrent = advancedTransition.automation_current;
      automationNext = advancedTransition.automation_next;
      mixType = advancedTransition.strategy.includes("Bass Swap") ? "bassSwap" : "default";
      initialRate = playbackRate;
      uiSwitchDelay = crossfadeDuration * 0.5;

      return this.createAutomixPlan(
        nextInfo,
        triggerTime,
        crossfadeDuration,
        startSeek,
        initialRate,
        uiSwitchDelay,
        mixType,
        pitchShift,
        playbackRate,
        automationCurrent,
        automationNext,
      );
    }

    // 策略 B: Native Transition Proposal
    if (transition && transition.duration > 0.5) {
      // 信任 Native 建议，仅做基本边界检查
      const safeTrigger = Math.min(transition.current_track_mix_out, duration - 1.0);
      const safeDuration = Math.min(transition.duration, duration - safeTrigger);

      triggerTime = safeTrigger;
      crossfadeDuration = safeDuration;
      startSeek = transition.next_track_mix_in * 1000;
      mixType = transition.filter_strategy.includes("Bass Swap") ? "bassSwap" : "default";
    } else {
      // 策略 C: Fallback (简单 Crossfade)
      // 如果没有 Native 建议，使用默认的 8s 混音，但尝试对齐小节
      if (currentAnalysis && nextAnalysis) {
        crossfadeDuration = 8.0;
        let rawTrigger = exitPoint - crossfadeDuration;

        // 尝试对齐到最近的小节 (Bar)
        if (currentAnalysis.bpm && currentAnalysis.first_beat_pos !== undefined) {
          rawTrigger = this.snapToBeat(
            rawTrigger,
            currentAnalysis.bpm,
            currentAnalysis.first_beat_pos,
            true,
          );
        }

        triggerTime = rawTrigger;
        startSeek = (nextAnalysis.fade_in_pos || 0) * 1000;

        // 如果对齐导致触发点太晚（剩余时间不足 4s），则放弃对齐，优先保证过渡时长
        if (duration - triggerTime < 4.0) {
          triggerTime = exitPoint - crossfadeDuration;
        }
      }
    }

    // 5. 后处理: Ultra Aggressive Mode (超激进尾奏快切)
    // 这是一个特定的业务规则，保留并简化
    if (!advancedTransition && canTrustExitPoint && currentAnalysis.vocal_out_pos) {
      const plan = this.applyAggressiveOutro(
        currentAnalysis,
        triggerTime,
        crossfadeDuration,
        exitPoint,
      );
      if (plan) {
        triggerTime = plan.triggerTime;
        crossfadeDuration = plan.crossfadeDuration;
      }
    }

    // 6. 最终安全检查
    if (triggerTime + crossfadeDuration > duration) {
      crossfadeDuration = Math.max(0.5, duration - triggerTime);
    }
    uiSwitchDelay = uiSwitchDelay || crossfadeDuration * 0.5;

    return this.createAutomixPlan(
      nextInfo,
      triggerTime,
      crossfadeDuration,
      startSeek,
      initialRate,
      uiSwitchDelay,
      mixType,
      pitchShift,
      playbackRate,
      automationCurrent,
      automationNext,
    );
  }

  private createAutomixPlan(
    nextInfo: { song: SongType; index: number },
    triggerTime: number,
    crossfadeDuration: number,
    startSeek: number,
    initialRate: number,
    uiSwitchDelay: number,
    mixType: "default" | "bassSwap",
    pitchShift: number,
    playbackRate: number,
    automationCurrent: AutomationPoint[],
    automationNext: AutomationPoint[],
  ): AutomixPlan {
    return {
      token: this.currentRequestToken,
      nextSong: nextInfo.song,
      nextIndex: nextInfo.index,
      triggerTime,
      crossfadeDuration,
      startSeek,
      initialRate,
      uiSwitchDelay,
      mixType,
      pitchShift,
      playbackRate,
      automationCurrent,
      automationNext,
    };
  }

  private applyAggressiveOutro(
    analysis: AudioAnalysis,
    currentTrigger: number,
    currentDuration: number,
    exitPoint: number,
  ): { triggerTime: number; crossfadeDuration: number } | null {
    const vocalOut = analysis.vocal_out_pos!;
    const tailLength = exitPoint - vocalOut;

    // 只有长尾奏 (>8s) 才介入
    if (tailLength <= 8.0) return null;

    const outroEnergy = analysis.outro_energy_level ?? -70;
    const isHighEnergy = outroEnergy > -12.0;

    // 高能: 等 8 拍 (约 2 小节); 低能: 等 1 拍
    const beatsToWait = isHighEnergy ? 8 : 1;
    let newTrigger = currentTrigger;

    if (analysis.bpm && analysis.first_beat_pos !== undefined) {
      const spb = 60 / analysis.bpm;
      const relVocal = vocalOut - analysis.first_beat_pos;
      let beatIndex = Math.floor(relVocal / spb);

      // 如果 vocalOut 离下一拍很近 (>90%)，视为下一拍
      if (relVocal % spb > spb * 0.9) beatIndex++;

      let targetBeat = beatIndex + beatsToWait;
      // 高能尾奏对齐到 4 拍 (小节)
      if (isHighEnergy) targetBeat = Math.ceil(targetBeat / 4) * 4;

      newTrigger = analysis.first_beat_pos + targetBeat * spb;
    } else {
      newTrigger = vocalOut + (isHighEnergy ? 4.0 : 0.5);
    }

    // 如果新触发点比原计划更早，且合理
    if (newTrigger < currentTrigger && newTrigger < exitPoint - 1.0) {
      const maxFade = isHighEnergy ? 8.0 : 5.0;
      const newDuration = Math.min(currentDuration, maxFade, exitPoint - newTrigger);
      this.automixLog(
        "log",
        "aggressive_outro",
        `Aggressive Outro: ${tailLength.toFixed(1)}s tail, trigger ${newTrigger.toFixed(1)}`,
        5000,
      );
      return { triggerTime: newTrigger, crossfadeDuration: newDuration };
    }
    return null;
  }

  /**
   * 统一音频事件绑定
   */
  private bindAudioEvents() {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();
    const musicStore = useMusicStore();
    const settingStore = useSettingStore();

    const audioManager = useAudioManager();

    // 加载状态
    audioManager.addEventListener("loadstart", () => {
      statusStore.playLoading = true;
      // Watchdog: 如果 10秒后仍未 canplay/playing/error，强制取消 loading
      const token = this.currentRequestToken;
      setTimeout(() => {
        if (
          statusStore.playLoading &&
          token === this.currentRequestToken &&
          !statusStore.playStatus
        ) {
          console.warn("⚠️ [Watchdog] Loading timeout, resetting state");
          statusStore.playLoading = false;
        }
      }, 10000);
    });

    // 播放中 (兜底)
    audioManager.addEventListener("playing", () => {
      if (statusStore.playLoading) statusStore.playLoading = false;
    });

    // 加载完成
    audioManager.addEventListener("canplay", () => {
      const playSongData = getPlaySongData();

      // 结束加载
      statusStore.playLoading = false;

      // 恢复 EQ
      if (isElectron && statusStore.eqEnabled) {
        const bands = statusStore.eqBands;
        if (bands && bands.length === 10) {
          bands.forEach((val, idx) => audioManager.setFilterGain(idx, val));
        }
      }
      if (isElectron) {
        // 更新喜欢状态
        playerIpc.sendLikeStatus(dataStore.isLikeSong(playSongData?.id || 0));
        // 更新信息
        const { name, artist, album } = getPlayerInfoObj() || {};
        const playTitle = `${name} - ${artist}`;
        playerIpc.sendSongChange(playTitle, name || "", artist || "", album || "");
      }
    });

    // 播放开始
    audioManager.addEventListener("play", () => {
      const { name, artist } = getPlayerInfoObj() || {};
      const playTitle = `${name} - ${artist}`;
      // 更新状态
      statusStore.playStatus = true;
      playerIpc.sendMediaPlayState("Playing");
      mediaSessionManager.updatePlaybackStatus(true);
      window.document.title = `${playTitle} | SPlayer`;
      // 只有真正播放了才重置重试计数
      if (this.retryInfo.count > 0) this.retryInfo.count = 0;
      // 注意：failSkipCount 的重置移至 onTimeUpdate，确保有实际进度
      // Last.fm Scrobbler
      lastfmScrobbler.resume();
      // IPC 通知
      playerIpc.sendPlayStatus(true);
      playerIpc.sendTaskbarState({ isPlaying: true });
      playerIpc.sendTaskbarMode("normal");
      playerIpc.sendTaskbarProgress(statusStore.progress);
      console.log(`▶️ [${musicStore.playSong?.id}] 歌曲播放:`, name);
    });

    // 暂停
    audioManager.addEventListener("pause", () => {
      statusStore.playStatus = false;
      this.resetAutomixScheduling("IDLE");
      playerIpc.sendMediaPlayState("Paused");
      mediaSessionManager.updatePlaybackStatus(false);
      if (!isElectron) window.document.title = "SPlayer";
      playerIpc.sendPlayStatus(false);
      playerIpc.sendTaskbarState({ isPlaying: false });
      playerIpc.sendTaskbarMode("paused");
      playerIpc.sendTaskbarProgress(statusStore.progress);
      lastfmScrobbler.pause();
      console.log(`⏸️ [${musicStore.playSong?.id}] 歌曲暂停`);
    });

    audioManager.addEventListener("seeking", () => {
      this.resetAutomixScheduling("MONITORING");
    });

    // 播放结束
    audioManager.addEventListener("ended", () => {
      if (this.isTransitioning) return;
      this.resetAutomixScheduling("IDLE");
      console.log(`⏹️ [${musicStore.playSong?.id}] 歌曲结束`);
      lastfmScrobbler.stop();
      // 检查定时关闭
      if (this.checkAutoClose()) return;
      // 自动播放下一首
      this.nextOrPrev("next", true, true);
    });

    // 进度更新
    this.onTimeUpdate = throttle(() => {
      // 1. AB 循环 (200ms 精度)
      const { enable, pointA, pointB } = statusStore.abLoop;
      if (enable && pointA !== null && pointB !== null) {
        if (audioManager.currentTime >= pointB) {
          audioManager.seek(pointA);
        }
      }

      const rawTime = audioManager.currentTime;
      const currentTime = Math.floor(rawTime * 1000);
      const duration = Math.floor(audioManager.duration * 1000) || statusStore.duration;

      this.updateAutomixMonitoring();

      // 计算歌词索引
      const songId = musicStore.playSong?.id;
      const offset = statusStore.getSongOffset(songId);
      const useYrc = !!(settingStore.showYrc && musicStore.songLyric.yrcData?.length);
      let rawLyrics: LyricLine[] = [];
      if (useYrc) {
        rawLyrics = toRaw(musicStore.songLyric.yrcData);
      } else {
        rawLyrics = toRaw(musicStore.songLyric.lrcData);
      }
      const lyricIndex = calculateLyricIndex(currentTime, rawLyrics, offset);
      // 更新状态
      statusStore.$patch({
        currentTime,
        duration,
        progress: calculateProgress(currentTime, duration),
        lyricIndex,
      });
      // 成功播放一段距离后，重置失败跳过计数
      if (currentTime > 500 && this.failSkipCount > 0) {
        this.failSkipCount = 0;
      }
      // 更新系统 MediaSession
      mediaSessionManager.updateState(duration, currentTime);
      // 更新桌面歌词
      playerIpc.sendLyric({
        currentTime,
        songId: musicStore.playSong?.id,
        songOffset: statusStore.getSongOffset(musicStore.playSong?.id),
      });
      // 任务栏进度
      if (settingStore.showTaskbarProgress) {
        playerIpc.sendTaskbarProgress(statusStore.progress);
      } else {
        playerIpc.sendTaskbarProgress("none");
      }
      // 任务栏歌词进度
      playerIpc.sendTaskbarProgressData({
        currentTime,
        duration,
        offset,
      });

      // macOS 状态栏歌词进度
      if (isMac) {
        window.electron.ipcRenderer.send("mac-statusbar:update-progress", {
          currentTime,
          duration,
          offset,
        });
      }

      // Socket 进度
      playerIpc.sendSocketProgress(currentTime, duration);
    }, 200);
    audioManager.addEventListener("timeupdate", this.onTimeUpdate);

    // 错误处理
    audioManager.addEventListener("error", (e) => {
      const errCode = e.detail.errorCode;
      this.handlePlaybackError(errCode, this.getSeek());
    });
  }

  /**
   * 统一错误处理策略
   * @param errCode 错误码
   * @param currentSeek 当前播放位置 (用于恢复)
   */
  private async handlePlaybackError(errCode: number | undefined, currentSeek: number = 0) {
    // 错误防抖
    const now = Date.now();
    if (now - this.lastErrorTime < 200) return;
    this.lastErrorTime = now;
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    const songManager = useSongManager();
    // 清除预加载缓存
    songManager.clearPrefetch();
    // 当前歌曲 ID
    const currentSongId = musicStore.playSong?.id || 0;
    // 检查是否为同一首歌
    if (this.retryInfo.songId !== currentSongId) {
      // 新歌曲，重置重试计数
      this.retryInfo = { songId: currentSongId, count: 0 };
    }
    // 防止无限重试
    const ABSOLUTE_MAX_RETRY = 3;
    if (this.retryInfo.count >= ABSOLUTE_MAX_RETRY) {
      console.error(`❌ 歌曲 ${currentSongId} 已重试 ${this.retryInfo.count} 次，强制跳过`);
      window.$message.error("播放失败，已自动跳过");
      statusStore.playLoading = false;
      this.retryInfo.count = 0;
      await this.skipToNextWithDelay();
      return;
    }
    // 用户主动中止
    if (errCode === AudioErrorCode.ABORTED || errCode === AudioErrorCode.DOM_ABORT) {
      statusStore.playLoading = false;
      this.retryInfo.count = 0;
      return;
    }
    // 格式不支持
    if (errCode === AudioErrorCode.SRC_NOT_SUPPORTED || errCode === 9) {
      console.warn(`⚠️ 音频格式不支持 (Code: ${errCode}), 跳过`);
      window.$message.error("该歌曲无法播放，已自动跳过");
      statusStore.playLoading = false;
      this.retryInfo.count = 0;
      await this.skipToNextWithDelay();
      return;
    }
    // 本地文件错误
    if (musicStore.playSong.path && musicStore.playSong.type !== "streaming") {
      console.error("❌ 本地文件加载失败");
      window.$message.error("本地文件无法播放");
      statusStore.playLoading = false;
      this.retryInfo.count = 0;
      await this.skipToNextWithDelay();
      return;
    }
    // 在线/流媒体错误处理
    this.retryInfo.count++;
    console.warn(
      `⚠️ 播放出错 (Code: ${errCode}), 重试: ${this.retryInfo.count}/${this.MAX_RETRY_COUNT}`,
    );
    // 未超过重试次数 -> 尝试重新获取 URL（可能是过期）
    if (this.retryInfo.count <= this.MAX_RETRY_COUNT) {
      await sleep(1000);
      if (this.retryInfo.count === 1) {
        statusStore.playLoading = true;
        window.$message.warning("播放异常，正在尝试恢复...");
      }
      await this.playSong({ autoPlay: true, seek: currentSeek });
      return;
    }
    // 超过重试次数 -> 跳下一首
    console.error("❌ 超过最大重试次数，跳过当前歌曲");
    this.retryInfo.count = 0;
    window.$message.error("播放失败，已自动跳过");
    await this.skipToNextWithDelay();
  }

  /**
   * 带延迟的跳转下一首
   */
  private async skipToNextWithDelay() {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();
    this.failSkipCount++;
    // 连续跳过 3 首 -> 停止播放
    if (this.failSkipCount >= 3) {
      window.$message.error("播放失败次数过多，已停止播放");
      statusStore.playLoading = false;
      this.pause(true);
      this.failSkipCount = 0;
      return;
    }
    // 列表只有一首 -> 停止播放
    if (dataStore.playList.length <= 1) {
      window.$message.error("当前已无可播放歌曲");
      this.cleanPlayList();
      this.failSkipCount = 0;
      return;
    }
    // 添加延迟，避免快速切歌导致卡死
    await sleep(500);
    await this.nextOrPrev("next");
  }

  /** 播放 */
  async play() {
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    const audioManager = useAudioManager();

    // 如果已经在播放，直接返回
    if (statusStore.playStatus) return;

    // 清除 MPV 强制暂停状态（如果是 MPV 引擎）
    audioManager.clearForcePaused();

    // 如果没有源，尝试重新初始化当前歌曲
    if (!audioManager.src) {
      await this.playSong({
        autoPlay: true,
        seek: statusStore.currentTime,
      });
      return;
    }

    // 如果已经在播放，直接返回
    if (!audioManager.paused) {
      statusStore.playStatus = true;
      return;
    }

    const fadeTime = settingStore.getFadeTime ? settingStore.getFadeTime / 1000 : 0;
    try {
      await audioManager.resume({ fadeIn: !!fadeTime, fadeDuration: fadeTime });
      statusStore.playStatus = true;
    } catch (error) {
      console.error("❌ 播放失败:", error);
      // 如果是 AbortError，尝试重新加载
      if (error instanceof Error && error.name === "AbortError") {
        await this.playSong({ autoPlay: true });
      }
    }
  }

  /** 暂停 */
  async pause(changeStatus: boolean = true) {
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    const audioManager = useAudioManager();

    // 计算渐出时间
    const fadeTime = settingStore.getFadeTime ? settingStore.getFadeTime / 1000 : 0;
    audioManager.pause({ fadeOut: !!fadeTime, fadeDuration: fadeTime });

    if (changeStatus) statusStore.playStatus = false;
  }

  /** 播放/暂停切换 */
  async playOrPause() {
    const statusStore = useStatusStore();
    if (statusStore.playStatus) await this.pause();
    else await this.play();
  }

  /**
   * 切歌：上一首/下一首
   * @param type 方向
   * @param play 是否立即播放
   * @param autoEnd 是否是自动结束触发的
   */
  public async nextOrPrev(
    type: "next" | "prev" = "next",
    play: boolean = true,
    autoEnd: boolean = false,
  ) {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();
    const songManager = useSongManager();

    // 先暂停当前播放
    const audioManager = useAudioManager();
    audioManager.stop();

    // 私人FM
    if (statusStore.personalFmMode) {
      await songManager.initPersonalFM(true);
      await this.playSong({ autoPlay: play });
      return;
    }

    // 播放列表是否为空
    const playListLength = dataStore.playList.length;
    if (playListLength === 0) {
      window.$message.error("播放列表为空，请添加歌曲");
      return;
    }

    // 单曲循环
    // 如果是自动结束触发的单曲循环，则重播当前歌曲
    // 注意：如果开启了 Automix，monitorAutomix 应该已经提前触发了过渡（支持自循环）
    // 如果运行到这里，说明 Automix 未触发（如歌曲太短或分析失败），则执行硬切重播
    if (statusStore.repeatMode === "one" && autoEnd) {
      await this.playSong({ autoPlay: play, seek: 0 });
      return;
    }

    // 计算索引
    let nextIndex = statusStore.playIndex;
    let attempts = 0;
    const maxAttempts = playListLength;

    // Fuck DJ Mode: 寻找下一个不被跳过的歌曲
    while (attempts < maxAttempts) {
      nextIndex += type === "next" ? 1 : -1;

      // 边界处理 (索引越界)
      if (nextIndex >= playListLength) nextIndex = 0;
      if (nextIndex < 0) nextIndex = playListLength - 1;

      const nextSong = dataStore.playList[nextIndex];
      if (!this.shouldSkipSong(nextSong)) {
        break;
      }
      attempts++;
    }

    if (attempts >= maxAttempts) {
      window.$message.warning("播放列表中没有可播放的歌曲 (Fuck DJ Mode)");
      audioManager.stop();
      statusStore.playStatus = false;
      return;
    }

    // 更新状态并播放
    statusStore.playIndex = nextIndex;
    await this.playSong({ autoPlay: play });
  }

  /**
   * Automix 智能切歌逻辑
   */
  private async automixPlay(
    targetSong: SongType,
    targetIndex: number,
    options: {
      autoPlay?: boolean;
      crossfadeDuration: number;
      startSeek: number;
      initialRate: number;
      uiSwitchDelay?: number;
      mixType?: "default" | "bassSwap";
      pitchShift?: number;
      playbackRate?: number;
      automationCurrent?: AutomationPoint[];
      automationNext?: AutomationPoint[];
    },
  ) {
    const statusStore = useStatusStore();

    // 生成新的 requestToken
    this.automixLogTimestamps.clear();
    this.currentRequestToken++;
    const requestToken = this.currentRequestToken;

    try {
      // 1. 准备数据
      const { audioSource } = await this.prepareAudioSource(targetSong, requestToken, {
        forceCacheForOnline: true,
        analysis: "none",
      });

      const analysisKey = targetSong.path || this.fileUrlToPath(audioSource.url);
      const analysis =
        analysisKey && this.nextAnalysisKey === analysisKey && this.nextAnalysis
          ? this.nextAnalysis
          : null;
      const analysisKind: "none" | "head" | "full" = analysis ? this.nextAnalysisKind : "none";

      // Automix Gain Calculation (LUFS)
      if (this.currentAnalysis?.loudness && analysis?.loudness) {
        const currentLoudness = this.currentAnalysis.loudness;
        const nextLoudness = analysis.loudness;
        const gainDb = currentLoudness - nextLoudness;
        // Limit gain to avoiding extreme changes (+/- 9dB)
        const safeGainDb = Math.max(-9, Math.min(gainDb, 9));
        this.automixGain = Math.pow(10, safeGainDb / 20);
        console.log(
          `🔊 [Automix] Loudness Match: ${currentLoudness.toFixed(2)} -> ${nextLoudness.toFixed(2)} LUFS (Gain: ${safeGainDb.toFixed(2)}dB)`,
        );
      } else {
        this.automixGain = 1.0;
      }

      // 更新当前分析结果
      this.currentAnalysis = analysis;
      this.currentAnalysisKind = analysis ? analysisKind : "none";
      // 重置下一首分析缓存
      this.nextAnalysis = null;
      this.nextAnalysisKind = "none";

      // 2. 启动 Crossfade
      const uiSwitchDelay = options.uiSwitchDelay ?? options.crossfadeDuration * 0.5;

      // 计算 ReplayGain
      const replayGain = this.applyReplayGain(targetSong, false);

      // 提示用户
      // const nextTitle = targetSong.name || "Unknown";
      // window.$message.info(`🔀 AutoMIX: ${nextTitle}`, {
      //   duration: 3000,
      // });

      await this.loadAndPlay(
        audioSource.url,
        options.autoPlay ?? true,
        options.startSeek,
        {
          duration: options.crossfadeDuration,
          uiSwitchDelay,
          mixType: options.mixType,
          pitchShift: options.pitchShift,
          playbackRate: options.playbackRate,
          automationCurrent: options.automationCurrent,
          automationNext: options.automationNext,
          replayGain,
          deferStateSync: true,
          onSwitch: () => {
            console.log("🔀 [Automix] Switching UI to new song");
            this.isTransitioning = false;
            this.automixState = "MONITORING";
            // 提交状态切换
            statusStore.playIndex = targetIndex;
            statusStore.endAutomixFx();
            this.setupSongUI(targetSong, audioSource, options.startSeek);
            this.afterPlaySetup(targetSong);
          },
        },
        options.initialRate,
      );
    } catch (e) {
      console.error("Automix failed, fallback to normal play", e);
      if (requestToken === this.currentRequestToken) {
        this.isTransitioning = false;
        this.resetAutomixScheduling("IDLE");
        statusStore.playIndex = targetIndex;
        statusStore.endAutomixFx();
        this.playSong({ autoPlay: true });
      }
    }
  }

  /** 获取总时长 (ms) */
  public getDuration(): number {
    const statusStore = useStatusStore();
    const audioManager = useAudioManager();
    // MPV 引擎 duration 在 statusStore 中（通过事件更新），Web Audio 从 audioManager 获取
    const duration = audioManager.duration;
    return duration > 0 ? Math.floor(duration * 1000) : statusStore.duration;
  }

  /** 获取当前播放位置 (ms) */
  public getSeek(): number {
    const statusStore = useStatusStore();
    const audioManager = useAudioManager();
    // MPV 引擎 currentTime 在 statusStore 中（通过事件更新），Web Audio 从 audioManager 获取
    const currentTime = audioManager.currentTime;
    return currentTime > 0 ? Math.floor(currentTime * 1000) : statusStore.currentTime;
  }

  /**
   * 获取下一首要播放的歌曲 (用于 Automix 预判)
   */
  private getNextSongForAutomix(): { song: SongType; index: number } | null {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();

    if (dataStore.playList.length === 0) return null;

    // 单曲循环模式下，下一首就是当前这首
    if (statusStore.repeatMode === "one") {
      const currentSong = dataStore.playList[statusStore.playIndex];
      if (currentSong) {
        return { song: currentSong, index: statusStore.playIndex };
      }
    }

    if (dataStore.playList.length <= 1) return null;

    let nextIndex = statusStore.playIndex;
    let attempts = 0;
    const maxAttempts = dataStore.playList.length;

    while (attempts < maxAttempts) {
      nextIndex++;
      if (nextIndex >= dataStore.playList.length) nextIndex = 0;

      const nextSong = dataStore.playList[nextIndex];
      if (!this.shouldSkipSong(nextSong)) {
        return { song: nextSong, index: nextIndex };
      }
      attempts++;
    }
    return null;
  }

  /**
   * 设置进度
   * @param time 时间 (ms)
   */
  public setSeek(time: number) {
    if (this.onTimeUpdate) {
      this.onTimeUpdate.cancel();
    }
    const statusStore = useStatusStore();
    const audioManager = useAudioManager();
    const safeTime = Math.max(0, Math.min(time, this.getDuration()));
    audioManager.seek(safeTime / 1000);
    statusStore.currentTime = safeTime;
    mediaSessionManager.updateState(this.getDuration(), safeTime, true);
  }

  /**
   * 快进/快退指定时间
   * @param delta 时间增量 (ms)，正数快进，负数快退
   */
  public seekBy(delta: number) {
    const currentTime = this.getSeek();
    this.setSeek(currentTime + delta);
  }

  /**
   * 设置音量
   * @param actions 音量值或滚动事件
   */
  public setVolume(actions: number | "up" | "down" | WheelEvent) {
    const statusStore = useStatusStore();
    const audioManager = useAudioManager();
    // 增量
    const increment = 0.05;
    // 直接设置音量
    if (typeof actions === "number") {
      actions = Math.max(0, Math.min(actions, 1));
      statusStore.playVolume = actions;
    }
    // 音量加减
    else if (actions === "up" || actions === "down") {
      statusStore.playVolume = Math.max(
        0,
        Math.min(statusStore.playVolume + (actions === "up" ? increment : -increment), 1),
      );
    }
    // 滚动事件
    else {
      const deltaY = actions.deltaY;
      const volumeChange = deltaY > 0 ? -increment : increment;
      statusStore.playVolume = Math.max(0, Math.min(statusStore.playVolume + volumeChange, 1));
    }

    // 统一调用 audioManager
    audioManager.setVolume(statusStore.playVolume);
  }

  /** 切换静音 */
  public toggleMute() {
    const statusStore = useStatusStore();
    const audioManager = useAudioManager();

    // 是否静音
    const isMuted = statusStore.playVolume === 0;

    if (isMuted) {
      statusStore.playVolume = statusStore.playVolumeMute;
    } else {
      statusStore.playVolumeMute = statusStore.playVolume;
      statusStore.playVolume = 0;
    }

    // 统一调用 audioManager
    audioManager.setVolume(statusStore.playVolume);
  }

  /**
   * 设置播放速率
   * @param rate 速率 (0.2 - 2.0)
   */
  public setRate(rate: number) {
    const statusStore = useStatusStore();
    const audioManager = useAudioManager();

    if (!Number.isFinite(rate)) {
      console.warn("⚠️ 无效的播放速率:", rate);
      return;
    }

    if (!audioManager.capabilities.supportsRate) {
      console.warn("⚠️ 当前引擎不支持倍速播放");
      return;
    }
    const safeRate = Math.max(0.2, Math.min(rate, 2.0));

    statusStore.playRate = safeRate;

    // 统一调用 audioManager
    audioManager.setRate(safeRate);

    // 更新系统播放速率
    mediaSessionManager.updatePlaybackRate(safeRate);
  }

  /**
   * 检查是否需要跳过歌曲 (Fuck DJ Mode)
   * @param song 歌曲信息
   */
  private shouldSkipSong(song: SongType): boolean {
    const settingStore = useSettingStore();
    if (!settingStore.disableDjMode) return false;
    // 是否包含 DJ 关键词
    const name = (song.name || "").toUpperCase();
    const alia = song.alia;
    const aliaStr = (Array.isArray(alia) ? alia.join("") : alia || "").toUpperCase();
    const fullText = name + aliaStr;
    return DJ_MODE_KEYWORDS.some((k) => fullText.includes(k.toUpperCase()));
  }

  /**
   * 更新播放列表并播放
   * @param data 歌曲列表
   * @param song 指定播放的歌曲
   * @param pid 歌单 ID
   * @param options 配置项
   * @param options.showTip 是否显示提示
   * @param options.play 是否播放
   * @param options.keepHeartbeatMode 是否保持心动模式
   */
  public async updatePlayList(
    data: SongType[],
    song?: SongType,
    pid?: number,
    options: {
      showTip?: boolean;
      play?: boolean;
      keepHeartbeatMode?: boolean;
    } = { showTip: true, play: true },
  ) {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();
    const musicStore = useMusicStore();

    if (!data || !data.length) return;

    // 处理随机模式
    let processedData = [...data]; // 浅拷贝
    if (statusStore.shuffleMode === "on") {
      await dataStore.setOriginalPlayList([...data]);
      processedData = shuffleArray(processedData);
    }
    // 更新列表
    await dataStore.setPlayList(processedData);
    // 关闭心动模式
    if (!options.keepHeartbeatMode && statusStore.shuffleMode === "heartbeat") {
      statusStore.shuffleMode = "off";
    }
    if (statusStore.personalFmMode) statusStore.personalFmMode = false;
    // 确定播放索引
    if (song && song.id) {
      const newIndex = processedData.findIndex((s) => s.id === song.id);
      if (musicStore.playSong.id === song.id) {
        // 如果是同一首歌，仅更新索引
        if (newIndex !== -1) statusStore.playIndex = newIndex;
        // 如果需要播放
        if (options.play) await this.play();
      } else {
        // 在开始请求之前就设置加载状态
        statusStore.playLoading = true;
        statusStore.playIndex = newIndex;
        await this.playSong({ autoPlay: options.play });
      }
    } else {
      // 默认播放第一首
      statusStore.playLoading = true;
      statusStore.playIndex = 0;
      await this.playSong({ autoPlay: options.play });
    }
    musicStore.playPlaylistId = pid ?? 0;
    if (options.showTip) window.$message.success("已开始播放");
  }

  /**
   * 清空播放列表
   */
  public async cleanPlayList() {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();
    const musicStore = useMusicStore();
    const audioManager = useAudioManager();
    // 重置状态
    audioManager.stop();
    statusStore.resetPlayStatus();
    musicStore.resetMusicData();
    // 清空播放列表
    await dataStore.setPlayList([]);
    await dataStore.clearOriginalPlayList();
    playerIpc.sendTaskbarProgress("none");
  }

  /**
   * 添加下一首歌曲
   * @param song 歌曲
   * @param play 是否立即播放
   */
  public async addNextSong(song: SongType, play: boolean = false) {
    const dataStore = useDataStore();
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();

    const wasPersonalFm = statusStore.personalFmMode;
    // 关闭特殊模式
    if (statusStore.personalFmMode) statusStore.personalFmMode = false;

    if (!wasPersonalFm && musicStore.playSong.id === song.id) {
      await this.play();
      window.$message.success("已开始播放");
      return;
    }

    // 尝试添加
    const currentSongId = musicStore.playSong.id;
    const songIndex = await dataStore.setNextPlaySong(song, statusStore.playIndex);

    // 修正当前播放索引
    const newCurrentIndex = dataStore.playList.findIndex((s) => s.id === currentSongId);
    if (newCurrentIndex !== -1 && newCurrentIndex !== statusStore.playIndex) {
      statusStore.playIndex = newCurrentIndex;
    }

    // 播放歌曲
    if (songIndex < 0) return;
    if (play) {
      await this.togglePlayIndex(songIndex, true);
    } else {
      window.$message.success("已添加至下一首播放");
    }
  }

  /**
   * 切换播放索引
   * @param index 播放索引
   * @param play 是否立即播放
   */
  public async togglePlayIndex(index: number, play: boolean = false) {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();
    const audioManager = useAudioManager();

    try {
      // 获取数据
      const { playList } = dataStore;

      // 若超出播放列表
      if (index >= playList.length) return;

      // 先停止当前播放
      audioManager.stop();

      // 相同歌曲且需要播放
      if (statusStore.playIndex === index) {
        if (play) await this.play();
        return;
      }

      // 更改状态
      statusStore.playIndex = index;
      // 重置播放进度（切换歌曲时必须重置）
      statusStore.currentTime = 0;
      statusStore.progress = 0;
      statusStore.lyricIndex = -1;

      await this.playSong({ autoPlay: play });
    } catch (error) {
      console.error("Error in togglePlayIndex:", error);
      statusStore.playLoading = false;
      throw error;
    }
  }

  /**
   * 移除指定歌曲
   * @param index 歌曲索引
   */
  public removeSongIndex(index: number) {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();

    // 获取数据
    const { playList } = dataStore;

    // 若超出播放列表
    if (index >= playList.length) return;

    // 仅剩一首
    if (playList.length === 1) {
      this.cleanPlayList();
      return;
    }

    // 是否为当前播放歌曲
    const isCurrentPlay = statusStore.playIndex === index;

    // 若将移除最后一首
    if (index === playList.length - 1) {
      statusStore.playIndex = 0;
    }
    // 若为当前播放之后
    else if (statusStore.playIndex > index) {
      statusStore.playIndex--;
    }

    // 移除指定歌曲
    const newPlaylist = [...playList];
    newPlaylist.splice(index, 1);
    dataStore.setPlayList(newPlaylist);

    // 若为当前播放
    if (isCurrentPlay) {
      this.playSong({ autoPlay: statusStore.playStatus });
    }
  }

  /**
   * 开启定时关闭
   * @param time 自动关闭时间（分钟）
   * @param remainTime 剩余时间（秒）
   */
  public startAutoCloseTimer(time: number, remainTime: number) {
    const statusStore = useStatusStore();
    if (!time || !remainTime) return;
    // 清除已有定时器
    if (this.autoCloseInterval) {
      clearInterval(this.autoCloseInterval);
    }
    // 计算目标结束时间戳
    const endTime = Date.now() + remainTime * 1000;
    statusStore.autoClose.enable = true;
    statusStore.autoClose.time = time;
    statusStore.autoClose.endTime = endTime;
    statusStore.autoClose.remainTime = remainTime;
    // 定时器仅用于 UI 更新，实际计时基于系统时间
    this.autoCloseInterval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((statusStore.autoClose.endTime - now) / 1000));
      statusStore.autoClose.remainTime = remaining;
      // 到达时间
      if (remaining <= 0) {
        clearInterval(this.autoCloseInterval);
        if (!statusStore.autoClose.waitSongEnd) {
          this.pause();
          statusStore.autoClose.enable = false;
          statusStore.autoClose.remainTime = statusStore.autoClose.time * 60;
          statusStore.autoClose.endTime = 0;
        }
      }
    }, 1000);
  }

  /** 检查并执行自动关闭 */
  private checkAutoClose(): boolean {
    const statusStore = useStatusStore();
    const { enable, waitSongEnd, remainTime } = statusStore.autoClose;

    if (enable && waitSongEnd && remainTime <= 0) {
      console.log("🔄 执行自动关闭");
      this.pause();
      statusStore.autoClose.enable = false;
      // 重置时间
      statusStore.autoClose.remainTime = statusStore.autoClose.time * 60;
      statusStore.autoClose.endTime = 0;
      return true;
    }
    return false;
  }

  /**
   * 切换输出设备
   * @param deviceId 设备 ID
   */
  public async toggleOutputDevice(deviceId?: string) {
    const settingStore = useSettingStore();
    const audioManager = useAudioManager();
    const device = deviceId ?? settingStore.playDevice;
    await audioManager.setSinkId(device);
  }

  /**
   * 切换循环模式
   * @param mode 可选，直接设置目标模式。如果不传，则按 List -> One -> Off 顺序轮转
   */
  public toggleRepeat(mode?: RepeatModeType) {
    this.playModeManager.toggleRepeat(mode);
  }

  /**
   * 切换随机模式
   * @param mode 可选，直接设置目标模式。如果不传则按 Off -> On -> Off 顺序轮转
   * @note 心跳模式只能通过菜单开启（传入 "heartbeat" 参数），点击随机按钮不会进入心跳模式
   * @note 当播放列表包含本地歌曲时，跳过心动模式，只在 Off 和 On 之间切换
   */
  public async toggleShuffle(mode?: ShuffleModeType) {
    const statusStore = useStatusStore();
    const currentMode = statusStore.shuffleMode;
    // 预判下一个模式
    const nextMode = mode ?? this.playModeManager.calculateNextShuffleMode(currentMode);
    // 如果模式确实改变了，才让 Manager 进行繁重的数据处理
    if (currentMode !== nextMode) {
      await this.playModeManager.toggleShuffle(nextMode);
    }
  }

  /**
   * 同步当前的播放模式到媒体控件
   */
  public syncMediaPlayMode() {
    this.playModeManager.syncMediaPlayMode();
  }

  /**
   * 获取频谱数据
   */
  public getSpectrumData(): Uint8Array | null {
    const audioManager = useAudioManager();
    return audioManager.getFrequencyData();
  }

  /**
   * 获取低频音量 [0.0-1.0]
   * 用于驱动背景动画等视觉效果
   */
  public getLowFrequencyVolume(): number {
    const audioManager = useAudioManager();
    return audioManager.getLowFrequencyVolume();
  }

  public getCurrentAnalysis(): AudioAnalysis | null {
    return this.currentAnalysis;
  }

  /**
   * 更新均衡器
   * @param options 均衡器选项
   * @param options.bands 频带增益
   * @param options.preamp 预放大
   * @param options.q Q 值
   * @param options.frequencies 频率
   */
  public updateEq(options?: {
    bands?: number[];
    preamp?: number;
    q?: number;
    frequencies?: number[];
  }) {
    const audioManager = useAudioManager();
    // 暂未完全适配 preamp 和 q 的动态调整，仅处理 bands
    if (options?.bands) {
      options.bands.forEach((val, idx) => audioManager.setFilterGain(idx, val));
    }
  }

  /**
   * 禁用均衡器
   */
  public disableEq() {
    const audioManager = useAudioManager();
    for (let i = 0; i < 10; i++) audioManager.setFilterGain(i, 0);
  }

  /**
   * 切换桌面歌词
   */
  public toggleDesktopLyric() {
    const statusStore = useStatusStore();
    this.setDesktopLyricShow(!statusStore.showDesktopLyric);
  }

  /**
   * 桌面歌词控制
   * @param show 是否显示
   */
  public setDesktopLyricShow(show: boolean) {
    const statusStore = useStatusStore();
    if (statusStore.showDesktopLyric === show) return;
    statusStore.showDesktopLyric = show;
    playerIpc.toggleDesktopLyric(show);
    window.$message.success(`${show ? "已开启" : "已关闭"}桌面歌词`);
  }

  public toggleTaskbarLyric() {
    const statusStore = useStatusStore();
    this.setTaskbarLyricShow(!statusStore.showTaskbarLyric);
  }

  public setTaskbarLyricShow(show: boolean) {
    const statusStore = useStatusStore();
    if (statusStore.showTaskbarLyric === show) return;
    statusStore.showTaskbarLyric = show;
    playerIpc.updateTaskbarConfig({ enabled: show });
    window.$message.success(`${show ? "已开启" : "已关闭"}任务栏歌词`);
  }

  /**
   * 同步播放模式给托盘
   */
  public playModeSyncIpc() {
    this.playModeManager.playModeSyncIpc();
  }
}

const PLAYER_CONTROLLER_KEY = "__SPLAYER_PLAYER_CONTROLLER__";

/**
 * 获取 PlayerController 实例
 * @returns PlayerController
 */
export const usePlayerController = (): PlayerController => {
  const win = window as Window & { [PLAYER_CONTROLLER_KEY]?: PlayerController };
  if (!win[PLAYER_CONTROLLER_KEY]) {
    win[PLAYER_CONTROLLER_KEY] = new PlayerController();
    console.log("[PlayerController] 创建新实例");
  }
  return win[PLAYER_CONTROLLER_KEY];
};
