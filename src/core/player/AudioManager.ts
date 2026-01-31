import { useSettingStore } from "@/stores";
import { checkIsolationSupport, isElectron } from "@/utils/env";
import { TypedEventTarget } from "@/utils/TypedEventTarget";
import { AudioElementPlayer } from "../audio-player/AudioElementPlayer";
import { AUDIO_EVENTS, type AudioEventMap } from "../audio-player/BaseAudioPlayer";
import { FFmpegAudioPlayer } from "../audio-player/ffmpeg-engine/FFmpegAudioPlayer";
import type {
  EngineCapabilities,
  IPlaybackEngine,
  PauseOptions,
  PlayOptions,
} from "../audio-player/IPlaybackEngine";
import { MpvPlayer, useMpvPlayer } from "../audio-player/MpvPlayer";

/**
 * 音频管理器
 *
 * 统一的音频播放接口，根据设置选择播放引擎
 */
class AudioManager extends TypedEventTarget<AudioEventMap> implements IPlaybackEngine {
  /** 当前活动的播放引擎 */
  private engine: IPlaybackEngine;
  /** 用于清理当前引擎的事件监听器 */
  private cleanupListeners: (() => void) | null = null;

  /** 当前引擎类型：element | ffmpeg | mpv */
  public readonly engineType: "element" | "ffmpeg" | "mpv";

  /** 引擎能力描述 */
  public readonly capabilities: EngineCapabilities;

  constructor(playbackEngine: "web-audio" | "mpv", audioEngine: "element" | "ffmpeg") {
    super();

    // 根据设置选择引擎
    if (isElectron && playbackEngine === "mpv") {
      const mpvPlayer = useMpvPlayer();
      mpvPlayer.init();
      this.engine = mpvPlayer;
      this.engineType = "mpv";
    } else if (audioEngine === "ffmpeg" && checkIsolationSupport()) {
      this.engine = new FFmpegAudioPlayer();
      this.engineType = "ffmpeg";
    } else {
      if (audioEngine === "ffmpeg" && !checkIsolationSupport()) {
        console.warn("[AudioManager] 环境未隔离，从 FFmpeg 回退到 Web Audio");
      }

      this.engine = new AudioElementPlayer();
      this.engineType = "element";
    }

    this.capabilities = this.engine.capabilities;
    this.bindEngineEvents();
  }

  /**
   * 绑定引擎事件，转发到 AudioManager
   */
  private bindEngineEvents() {
    if (this.cleanupListeners) {
      this.cleanupListeners();
    }

    const events = Object.values(AUDIO_EVENTS);
    const handlers: Map<string, EventListener> = new Map();

    events.forEach((eventType) => {
      const handler = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        this.dispatch(eventType, detail);
      };
      handlers.set(eventType, handler);
      this.engine.addEventListener(eventType, handler);
    });

    this.cleanupListeners = () => {
      handlers.forEach((handler, eventType) => {
        this.engine.removeEventListener(eventType, handler);
      });
    };
  }

  /**
   * 初始化
   */
  public init(): void {
    this.engine.init();
  }

  /**
   * 销毁引擎
   */
  public destroy(): void {
    if (this.cleanupListeners) {
      this.cleanupListeners();
      this.cleanupListeners = null;
    }
    this.engine.destroy();
  }

  /**
   * 加载并播放音频
   */
  public async play(url?: string, options?: PlayOptions): Promise<void> {
    await this.engine.play(url, options);
  }

  /**
   * 恢复播放
   */
  public async resume(options?: { fadeIn?: boolean; fadeDuration?: number }): Promise<void> {
    await this.engine.resume(options);
  }

  /**
   * 暂停音频
   */
  public pause(options?: PauseOptions): void {
    this.engine.pause(options);
  }

  /**
   * 停止播放并将时间重置为 0
   */
  public stop(): void {
    this.engine.stop();
  }

  /**
   * 跳转到指定时间
   * @param time 时间（秒）
   */
  public seek(time: number): void {
    this.engine.seek(time);
  }

  /**
   * 设置音量
   * @param value 音量值 (0.0 - 1.0)
   */
  public setVolume(value: number): void {
    this.engine.setVolume(value);
  }

  /**
   * 获取当前音量
   */
  public getVolume(): number {
    return this.engine.getVolume();
  }

  /**
   * 设置播放速率
   * @param value 速率 (0.5 - 2.0)
   */
  public setRate(value: number): void {
    this.engine.setRate(value);
  }

  /**
   * 获取当前播放速率
   */
  public getRate(): number {
    return this.engine.getRate();
  }

  /**
   * 设置输出设备
   */
  public async setSinkId(deviceId: string): Promise<void> {
    await this.engine.setSinkId(deviceId);
  }

  /**
   * 获取频谱数据 (用于可视化)
   */
  public getFrequencyData(): Uint8Array {
    return this.engine.getFrequencyData?.() ?? new Uint8Array(0);
  }

  /**
   * 获取低频音量 [0.0-1.0]
   */
  public getLowFrequencyVolume(): number {
    return this.engine.getLowFrequencyVolume?.() ?? 0;
  }

  /**
   * 设置均衡器增益
   */
  public setFilterGain(index: number, value: number): void {
    this.engine.setFilterGain?.(index, value);
  }

  /**
   * 获取当前均衡器设置
   */
  public getFilterGains(): number[] {
    return this.engine.getFilterGains?.() ?? [];
  }

  /**
   * 获取音频总时长（秒）
   */
  public get duration(): number {
    return this.engine.duration;
  }

  /**
   * 获取当前播放时间（秒）
   */
  public get currentTime(): number {
    return this.engine.currentTime;
  }

  /**
   * 获取是否暂停状态
   */
  public get paused(): boolean {
    return this.engine.paused;
  }

  /**
   * 获取当前播放地址
   */
  public get src(): string {
    return this.engine.src;
  }

  /**
   * 获取音频错误码
   */
  public getErrorCode(): number {
    return this.engine.getErrorCode();
  }

  /**
   * 解除 MPV 强制暂停状态
   * 仅在 MPV 引擎下有效
   */
  public clearForcePaused(): void {
    if (this.engine instanceof MpvPlayer) {
      this.engine.clearForcePaused();
    }
  }

  /**
   * 设置 MPV 期望的 Seek 位置
   * 仅在 MPV 引擎下有效
   */
  public setPendingSeek(seconds: number | null): void {
    if (this.engine instanceof MpvPlayer) {
      this.engine.setPendingSeek(seconds);
    }
  }

  /**
   * 切换播放/暂停
   */
  public togglePlayPause(): void {
    if (this.paused) {
      this.resume();
    } else {
      this.pause();
    }
  }
}

const AUDIO_MANAGER_KEY = "__SPLAYER_AUDIO_MANAGER__";

/**
 * 获取 AudioManager 实例
 * @returns AudioManager
 */
export const useAudioManager = (): AudioManager => {
  const win = window as Window & { [AUDIO_MANAGER_KEY]?: AudioManager };
  if (!win[AUDIO_MANAGER_KEY]) {
    const settingStore = useSettingStore();
    win[AUDIO_MANAGER_KEY] = new AudioManager(
      settingStore.playbackEngine,
      settingStore.audioEngine,
    );
    console.log(`[AudioManager] 创建新实例, engine: ${win[AUDIO_MANAGER_KEY].engineType}`);
  }
  return win[AUDIO_MANAGER_KEY];
};
