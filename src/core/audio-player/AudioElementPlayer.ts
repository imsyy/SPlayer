import {
  AUDIO_EVENTS,
  AudioErrorCode,
  BaseAudioPlayer,
  type AudioEventType,
} from "./BaseAudioPlayer";
import type { EngineCapabilities } from "./IPlaybackEngine";

/**
 * 基于 HTMLAudioElement 的播放器实现
 *
 * 使用原生 HTML5 Audio 元素进行音频播放，支持大多数常见格式
 * 通过 MediaElementAudioSourceNode 连接到 Web Audio API 音频图谱
 */
export class AudioElementPlayer extends BaseAudioPlayer {
  /** 内部 Audio 元素 */
  private audioElement: HTMLAudioElement;
  /** MediaElementAudioSourceNode 用于连接 Web Audio API */
  private sourceNode: MediaElementAudioSourceNode | null = null;

  /** Seek 锁，用于在 seek 过程中返回稳定的 currentTime */
  private isInternalSeeking = false;
  /** 目标时间缓存，用于在 seek 过程中返回稳定的 currentTime */
  private targetSeekTime = 0;

  /** 引擎能力描述 */
  public override readonly capabilities: EngineCapabilities = {
    supportsRate: true,
    supportsSinkId: true,
    supportsEqualizer: true,
    supportsSpectrum: true,
  };

  constructor() {
    super();
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = "anonymous";
    this.bindInternalEvents();

    this.audioElement.addEventListener("seeked", () => {
      this.isInternalSeeking = false;
    });
  }

  /**
   * 当音频图谱初始化完成时调用
   * 创建 MediaElementAudioSourceNode 并连接到输入节点
   */
  protected onGraphInitialized(): void {
    if (!this.audioCtx || !this.inputNode) return;

    try {
      if (!this.sourceNode) {
        this.sourceNode = this.audioCtx.createMediaElementSource(this.audioElement);
      } else {
        this.sourceNode.disconnect();
      }

      // 连接: Source -> Input
      this.sourceNode.connect(this.inputNode);
    } catch (error) {
      console.error("[AudioElementPlayer] SourceNode 创建失败", error);
    }
  }

  /**
   * 加载音频资源
   * @param url 音频地址
   */
  public async load(url: string): Promise<void> {
    this.audioElement.src = url;
    this.audioElement.load();
  }

  /**
   * 执行底层播放
   * @returns 播放 Promise
   */
  protected async doPlay(): Promise<void> {
    return this.audioElement.play();
  }

  /**
   * 执行底层暂停
   */
  protected doPause(): void {
    this.audioElement.pause();
  }

  /**
   * 跳转到指定时间
   * @param time 目标时间（秒）
   */
  public async seek(time: number): Promise<void> {
    this.isInternalSeeking = true;
    this.targetSeekTime = time;

    this.cancelPendingPause();
    this.doSeek(time);
  }

  /**
   * 执行底层 Seek
   * @param time 目标时间（秒）
   */
  protected doSeek(time: number): void {
    if (Number.isFinite(time)) {
      this.audioElement.currentTime = time;
    }
  }

  /**
   * 设置播放速率
   * @param value 速率值 (0.5 - 2.0)
   */
  public setRate(value: number): void {
    this.audioElement.playbackRate = value;
    this.audioElement.defaultPlaybackRate = value;
  }

  /**
   * 设置音高偏移
   * @param semitones 半音偏移量
   */
  public setPitchShift(semitones: number): void {
    // HTML5 Audio preservesPitch property
    // true (default) = time stretch (pitch constant, speed changes)
    // false = pitch shift (pitch changes with speed)

    // We want to change pitch without changing speed?
    // No, standard Web Audio doesn't support independent pitch shift natively without libraries like SoundTouch.
    // However, if we want to change pitch to match keys:
    // If we use playbackRate to change pitch, speed also changes.
    // If preservesPitch = false, playbackRate changes both pitch and speed (like a vinyl record).

    // If the request is to SHIFT pitch while keeping speed constant: NOT SUPPORTED by HTML5 Audio directly.
    // But if the request is "we have set playbackRate to sync BPM, now we want to correct Pitch":
    // That's complex.

    // For now, let's assume 'preservesPitch' control.
    // If semitones != 0, we might want to disable pitch preservation if we are using rate to shift pitch?
    // Actually, 'preservesPitch' only affects what happens when playbackRate != 1.

    // If we want independent pitch shifting, we can't do it with just AudioElement.
    // But we can implement the interface method to avoid crashes.

    if ("preservesPitch" in this.audioElement) {
      const el = this.audioElement as HTMLAudioElement & { preservesPitch: boolean };
      el.preservesPitch = semitones === 0;
    }
  }

  /**
   * 获取当前播放速率
   * @returns 当前速率值
   */
  public getRate(): number {
    return this.audioElement.playbackRate;
  }

  /**
   * 设置音频输出设备
   * @param deviceId 设备 ID
   */
  protected async doSetSinkId(deviceId: string): Promise<void> {
    if (typeof this.audioElement.setSinkId === "function") {
      await this.audioElement.setSinkId(deviceId);
    }
  }

  /** 获取当前音频源地址 */
  public get src(): string {
    return this.audioElement.src || "";
  }

  /** 获取音频总时长（秒） */
  public get duration(): number {
    return this.audioElement.duration || 0;
  }

  /**
   * 获取当前播放时间（秒）
   * 如果正在 Seek，返回目标时间以避免进度跳回
   */
  public get currentTime(): number {
    if (this.isInternalSeeking) {
      return this.targetSeekTime;
    }
    return this.audioElement.currentTime || 0;
  }

  /** 获取是否暂停状态 */
  public get paused(): boolean {
    return this.audioElement.paused;
  }

  /**
   * 获取错误码
   * @returns 错误码 (0: 无错误, 1: ABORTED, 2: NETWORK, 3: DECODE, 4: SRC_NOT_SUPPORTED)
   */
  public getErrorCode(): number {
    if (!this.audioElement.error) return 0;
    switch (this.audioElement.error.code) {
      case MediaError.MEDIA_ERR_ABORTED:
        return AudioErrorCode.ABORTED;
      case MediaError.MEDIA_ERR_NETWORK:
        return AudioErrorCode.NETWORK;
      case MediaError.MEDIA_ERR_DECODE:
        return AudioErrorCode.DECODE;
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        return AudioErrorCode.SRC_NOT_SUPPORTED;
      default:
        return 0;
    }
  }

  /**
   * 监听原生 DOM 事件并转发为标准事件
   * 将 HTMLAudioElement 的事件转换为 BaseAudioPlayer 的统一事件格式
   */
  private bindInternalEvents() {
    const events: AudioEventType[] = Object.values(AUDIO_EVENTS);

    events.forEach((eventType) => {
      this.audioElement.addEventListener(eventType, (e) => {
        if (eventType === AUDIO_EVENTS.ERROR) {
          this.dispatch(AUDIO_EVENTS.ERROR, {
            originalEvent: e,
            errorCode: this.getErrorCode(),
          });
        } else {
          this.dispatch(eventType);
        }
      });
    });
  }
}
