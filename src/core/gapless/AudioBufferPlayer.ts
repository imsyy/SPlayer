import { AUDIO_EVENTS, BaseAudioPlayer } from "../audio-player/BaseAudioPlayer";
import type { EngineCapabilities } from "../audio-player/IPlaybackEngine";

/**
 * 基于 AudioBuffer 的播放器
 *
 * 用于无缝播放场景，播放预解码的 AudioBuffer
 * 通过 AudioBufferSourceNode 实现采样级精确调度
 */
export class AudioBufferPlayer extends BaseAudioPlayer {
  /** 预解码的音频缓冲区 */
  private buffer: AudioBuffer | null = null;
  /** 当前活动的 SourceNode */
  private sourceNode: AudioBufferSourceNode | null = null;
  /** 是否处于暂停状态 */
  private _paused = true;
  /** 播放速率 */
  private _rate = 1.0;

  /** 锚点偏移量（秒） */
  private anchorOffset = 0;
  /** 锚点时刻的 AudioContext 时间 */
  private anchorContextTime = 0;

  /** timeupdate 定时器 */
  private timeupdateTimer: ReturnType<typeof setInterval> | null = null;

  /** 引擎能力描述 */
  public override readonly capabilities: EngineCapabilities = {
    supportsRate: true,
    supportsSinkId: false,
    supportsEqualizer: true,
    supportsSpectrum: true,
  };

  constructor() {
    super();
  }

  /**
   * 注入预解码的 AudioBuffer
   */
  public setBuffer(buffer: AudioBuffer) {
    this.buffer = buffer;
  }

  // 音频图谱初始化回调（无需创建 MediaElement）
  protected onGraphInitialized(): void {
    // 空实现
  }

  // AudioBufferPlayer 不支持 URL 加载
  public async load(_url: string): Promise<void> {
    // 空实现，buffer 通过 setBuffer 注入
  }

  /**
   * 创建并启动 SourceNode
   */
  protected async doPlay(): Promise<void> {
    if (!this.audioCtx) return;

    this.stopSource();
    if (!this.createAndStartSource(this.anchorOffset)) return;

    this.anchorContextTime = this.audioCtx.currentTime;
    this._paused = false;
    this.startTimeupdateTimer();
    this.dispatch(AUDIO_EVENTS.PLAY);
  }

  /**
   * 精确调度播放（无缝衔接时使用）
   * @param offset 音频偏移量（秒）
   * @param when AudioContext 时间点
   */
  public scheduleStart(offset: number, when: number) {
    this.stopSource();

    this.anchorOffset = offset;
    this.anchorContextTime = when;
    if (!this.createAndStartSource(offset, when)) return;

    this._paused = false;
    this.startTimeupdateTimer();
  }

  protected doPause(): void {
    if (this._paused) return;
    // 记录当前位置
    this.anchorOffset = this.currentTime;
    this.stopSource();
    this._paused = true;
    this.stopTimeupdateTimer();
    this.dispatch(AUDIO_EVENTS.PAUSE);
  }

  protected doSeek(time: number): void {
    this.anchorOffset = Math.max(0, Math.min(time, this.duration));
    if (this.audioCtx) {
      this.anchorContextTime = this.audioCtx.currentTime;
    }

    // 如果正在播放，重新创建 source
    if (!this._paused) {
      this.stopSource();
      this.createAndStartSource(this.anchorOffset);
    }

    this.dispatch(AUDIO_EVENTS.SEEKED);
  }

  public setRate(value: number): void {
    // 先用旧速率计算当前位置，再更新锚点
    if (this.audioCtx && !this._paused) {
      const wallDelta = this.audioCtx.currentTime - this.anchorContextTime;
      this.anchorOffset = Math.max(0, Math.min(this.anchorOffset + wallDelta * this._rate, this.duration));
      this.anchorContextTime = this.audioCtx.currentTime;
    }

    this._rate = value;

    if (this.sourceNode) {
      this.sourceNode.playbackRate.value = value;
    }
  }

  public getRate(): number {
    return this._rate;
  }

  protected async doSetSinkId(_deviceId: string): Promise<void> {
    // AudioBufferPlayer 不支持独立设备切换，依赖共享 AudioContext
  }

  public get src(): string {
    return "";
  }

  public get duration(): number {
    return this.buffer?.duration ?? 0;
  }

  public get currentTime(): number {
    if (this._paused || !this.audioCtx) return this.anchorOffset;
    const wallDelta = this.audioCtx.currentTime - this.anchorContextTime;
    return Math.max(0, Math.min(this.anchorOffset + wallDelta * this._rate, this.duration));
  }

  public get paused(): boolean {
    return this._paused;
  }

  public getErrorCode(): number {
    return 0;
  }

  /**
   * 在指定的 AudioContext 时间点设置增益值
   * 用于 GaplessManager 在调度时预设音量，避免直接访问 protected gainNode
   */
  public setGainAtTime(value: number, when: number): void {
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(value, when);
    }
  }

  /**
   * 销毁引擎，释放内存
   */
  public override destroy(): void {
    this.stopSource();
    this.stopTimeupdateTimer();
    this.buffer = null;
    this._paused = true;
    super.destroy();
  }

  /**
   * 创建、连接并启动 SourceNode，同时设置 onended 回调
   * @param offset 音频偏移量（秒）
   * @param when AudioContext 时间点（0 表示立即播放）
   * @returns 创建的 source，如果前置条件不满足则返回 null
   */
  private createAndStartSource(offset: number, when: number = 0): AudioBufferSourceNode | null {
    if (!this.buffer || !this.audioCtx || !this.inputNode) return null;

    const source = this.audioCtx.createBufferSource();
    source.buffer = this.buffer;
    source.playbackRate.value = this._rate;
    source.connect(this.inputNode);
    source.start(when, offset);

    source.onended = () => {
      if (this.sourceNode === source && !this._paused) {
        const elapsed = this.currentTime;
        const dur = this.duration;
        if (dur > 0 && elapsed < dur - 0.5) {
          console.warn(
            `[AudioBufferPlayer] source.onended 提前触发 (elapsed=${elapsed.toFixed(2)}, duration=${dur.toFixed(2)})`,
          );
          return;
        }
        this._paused = true;
        this.stopTimeupdateTimer();
        this.dispatch(AUDIO_EVENTS.ENDED);
      }
    };

    this.sourceNode = source;
    return source;
  }

  /** 停止当前 SourceNode */
  private stopSource() {
    if (this.sourceNode) {
      try {
        this.sourceNode.onended = null;
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // 可能已经停止
      }
      this.sourceNode = null;
    }
  }

  /** 启动 timeupdate 定时器 */
  private startTimeupdateTimer() {
    this.stopTimeupdateTimer();
    this.timeupdateTimer = setInterval(() => {
      if (!this._paused) {
        this.dispatch(AUDIO_EVENTS.TIME_UPDATE);
      }
    }, 200);
  }

  /** 停止 timeupdate 定时器 */
  private stopTimeupdateTimer() {
    if (this.timeupdateTimer) {
      clearInterval(this.timeupdateTimer);
      this.timeupdateTimer = null;
    }
  }
}
