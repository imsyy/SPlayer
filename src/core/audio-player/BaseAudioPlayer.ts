import { TypedEventTarget } from "@/utils/TypedEventTarget";
import { AudioEffectManager } from "./AudioEffectManager";
import type { EngineCapabilities, IPlaybackEngine, FadeCurve } from "./IPlaybackEngine";
import { getSharedAudioContext, getSharedMasterInput } from "./SharedAudioContext";

/** 扩充 AudioContext 接口以支持 setSinkId (实验性 API) */
export interface IExtendedAudioContext extends AudioContext {
  setSinkId(deviceId: string): Promise<void>;
}

export interface AudioErrorDetail {
  originalEvent: Event;
  errorCode: number;
}

export const AUDIO_EVENTS = {
  PLAY: "play",
  PAUSE: "pause",
  ENDED: "ended",
  TIME_UPDATE: "timeupdate",
  ERROR: "error",
  CAN_PLAY: "canplay",
  LOAD_START: "loadstart",
  SEEKED: "seeked",
  WAITING: "waiting",
  VOLUME_CHANGE: "volumechange",
  PLAYING: "playing",
  SEEKING: "seeking",
  EMPTIED: "emptied",
} as const;

export type AudioEventType = (typeof AUDIO_EVENTS)[keyof typeof AUDIO_EVENTS];

export type AudioEventMap = {
  [K in AudioEventType]: K extends typeof AUDIO_EVENTS.ERROR
    ? CustomEvent<AudioErrorDetail>
    : CustomEvent<undefined>;
};

export enum AudioErrorCode {
  /** 用户中止 */
  ABORTED = 1,
  /** 网络错误 */
  NETWORK = 2,
  /** 解码错误 */
  DECODE = 3,
  /** 格式不支持 */
  SRC_NOT_SUPPORTED = 4,
  /** DOMException: AbortError */
  DOM_ABORT = 20,
}

const SEEK_FADE_TIME = 0.05;

/**
 * 音频播放器抽象基类
 *
 * 管理 AudioContext、音量增益、EQ连接、以及通用的淡入淡出/Seek逻辑
 * 实现 IPlaybackEngine 接口
 */
export abstract class BaseAudioPlayer
  extends TypedEventTarget<AudioEventMap>
  implements IPlaybackEngine
{
  /** 核心上下文 */
  protected audioCtx: IExtendedAudioContext | null = null;
  /** 主输出增益节点 (控制音量) */
  protected gainNode: GainNode | null = null;
  /** 输入节点 (子类将源连接到此处) */
  protected inputNode: GainNode | null = null;

  protected effectManager: AudioEffectManager | null = null;

  /** 初始化状态 */
  protected isInitialized = false;
  /** 目标音量 (0-1) */
  protected volume: number = 1;
  /** ReplayGain 增益 (1.0 = 0dB) */
  protected replayGain: number = 1.0;
  /** 存储淡出暂停的定时器 ID */
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;

  /** 引擎能力描述 */
  public abstract readonly capabilities: EngineCapabilities;

  constructor() {
    super();
  }

  /**
   * 初始化音频图谱
   * 链路: InputNode(子类 Source) -> EffectManager -> GainNode -> Destination
   */
  public init() {
    if (this.isInitialized) return;

    try {
      this.audioCtx = getSharedAudioContext();

      // 在共享 Context 环境下，初始化不应挂起上下文
      // if (this.audioCtx.state === "running") {
      //   this.audioCtx.suspend().catch(console.warn);
      // }

      this.inputNode = this.audioCtx.createGain();
      this.inputNode.gain.value = 1; // 直通

      this.gainNode = this.audioCtx.createGain();

      this.effectManager = new AudioEffectManager(this.audioCtx);

      // 连接链路: Input -> EQ/Spectrum -> MasterGain -> Speaker
      // AudioEffectManager.connect 接受输入节点，内部串联后返回输出节点
      const processedNode = this.effectManager.connect(this.inputNode);
      processedNode.connect(this.gainNode);
      this.gainNode.connect(getSharedMasterInput());

      // 应用初始音量
      this.gainNode.gain.value = this.volume;

      this.isInitialized = true;

      // 通知子类连接其特定的源
      this.onGraphInitialized();
    } catch (e) {
      console.error("初始化 AudioContext 失败", e);
    }
  }

  /**
   * 销毁引擎，释放资源
   */
  public destroy(): void {
    if (this.audioCtx) {
      // 共享 Context，不要关闭
      // this.audioCtx.close().catch(console.warn);
      this.audioCtx = null;
    }
    // 断开节点连接
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.inputNode) {
      this.inputNode.disconnect();
      this.inputNode = null;
    }
    if (this.effectManager) {
      this.effectManager.disconnect();
      this.effectManager = null;
    }
    this.isInitialized = false;
  }

  /**
   * 供子类重写，当 AudioContext 初始化完成时调用
   *
   * 子类应在此处创建 SourceNode 并连接到 this.inputNode
   */
  protected abstract onGraphInitialized(): void;

  /**
   * 播放音频
   * @throws 如果播放失败，则抛出原始错误
   */
  public async play(
    url?: string,
    options: {
      fadeIn?: boolean;
      fadeDuration?: number;
      fadeCurve?: FadeCurve;
      autoPlay?: boolean;
      seek?: number;
    } = {},
  ) {
    this.cancelPendingPause();
    const shouldPlay = options.autoPlay ?? true;

    if (url) {
      await this.load(url);
    }

    if (!this.isInitialized) this.init();

    // 恢复播放位置
    if (options.seek && options.seek > 0) {
      this.doSeek(options.seek);
    }

    if (!shouldPlay) return;

    if (this.audioCtx?.state === "suspended") {
      await this.audioCtx.resume();
    }

    const duration = options.fadeIn ? (options.fadeDuration ?? 0.5) : 0;

    // 修复：如果是渐入，强制从 0 开始
    if (duration > 0 && this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
    }

    this.applyFadeTo(this.volume * this.replayGain, duration, options.fadeCurve);

    try {
      await this.doPlay();
    } catch (e) {
      console.error("播放失败", e);
      throw e;
    }
  }

  public async resume(options?: {
    fadeIn?: boolean;
    fadeDuration?: number;
    fadeCurve?: FadeCurve;
  }): Promise<void> {
    await this.play(undefined, options);
  }

  public async pause(
    options: {
      fadeOut?: boolean;
      fadeDuration?: number;
      fadeCurve?: FadeCurve;
      keepContextRunning?: boolean;
    } = {},
  ) {
    this.cancelPendingPause();

    const duration = options.fadeOut ? (options.fadeDuration ?? 0.5) : 0;

    const performPause = async () => {
      await this.doPause();

      if (this.audioCtx && this.audioCtx.state === "running" && !options.keepContextRunning) {
        try {
          await this.audioCtx.suspend();
        } catch (e) {
          console.warn("挂起 AudioContext 失败", e);
        }
      }

      this.fadeTimer = null;
    };

    if (duration > 0) {
      this.applyFadeTo(0, duration, options.fadeCurve);

      this.fadeTimer = setTimeout(() => {
        performPause();
      }, duration * 1000);
    } else {
      await performPause();
    }
  }

  /**
   * 跳转进度
   * @param time 目标时间 (秒)
   */
  public async seek(time: number, immediate = false) {
    this.cancelPendingPause();
    // 如果已经暂停，直接跳转
    if (this.paused) {
      this.doSeek(time);
      return;
    }

    if (!immediate) {
      this.applyFadeTo(0, SEEK_FADE_TIME);
      await new Promise((resolve) => setTimeout(resolve, SEEK_FADE_TIME * 1000));
    }

    await this.doSeek(time);

    if (!immediate) {
      this.applyFadeTo(this.volume * this.replayGain, SEEK_FADE_TIME);
    } else {
      this.applyFadeTo(this.volume * this.replayGain, 0);
    }
  }

  /**
   * 停止播放并重置
   */
  public stop() {
    this.cancelPendingPause();
    // 捕获可能产生的异步错误
    Promise.resolve(this.pause({ fadeOut: false })).catch(() => {});
    Promise.resolve(this.doSeek(0)).catch(() => {});
  }

  /**
   * 切换播放/暂停
   */
  public togglePlayPause() {
    if (this.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  /**
   * 设置音量
   * @param value 0.0 - 1.0
   */
  public setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    this.applyFadeTo(this.volume * this.replayGain, 0);
  }

  public rampVolumeTo(value: number, duration: number, curve?: FadeCurve) {
    this.volume = Math.max(0, Math.min(1, value));
    this.applyFadeTo(this.volume * this.replayGain, duration, curve);
  }

  /**
   * 设置 ReplayGain 增益
   * @param gain 线性增益值
   */
  public setReplayGain(gain: number) {
    this.replayGain = gain;
    this.applyFadeTo(this.volume * this.replayGain, 0.1);
  }

  /**
   * 获取当前音量
   * @returns 当前音量值 (0.0 - 1.0)
   */
  public getVolume(): number {
    return this.volume;
  }

  /**
   * 应用音量渐变
   * @param targetValue 目标音量
   * @param duration 持续时间 (秒)
   * @param curve 渐变曲线
   */
  protected applyFadeTo(targetValue: number, duration: number, curve: FadeCurve = "linear") {
    if (!this.gainNode || !this.audioCtx) return;

    const currentTime = this.audioCtx.currentTime;
    // 取消之前计划的音量变化
    this.gainNode.gain.cancelScheduledValues(currentTime);

    // 设定当前值为起点 ，防止爆音
    const currentValue = this.gainNode.gain.value;
    this.gainNode.gain.setValueAtTime(currentValue, currentTime);

    if (duration <= 0) {
      const safeStartTime = currentTime + 0.02;
      if (Number.isFinite(safeStartTime) && safeStartTime > currentTime) {
        this.gainNode.gain.linearRampToValueAtTime(targetValue, safeStartTime);
      } else {
        this.gainNode.gain.setValueAtTime(targetValue, currentTime);
      }
      return;
    }

    // 稍微延后一点点开始 Ramp，给 AudioContext 内部队列一点喘息时间
    const safeStartTime = currentTime + 0.02;
    this.gainNode.gain.setValueAtTime(currentValue, safeStartTime);

    if (curve === "equalPower") {
      const steps = Math.max(2, Math.floor(duration * 60));
      const curveData = new Float32Array(steps);

      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        let val = 0;

        if (targetValue > currentValue) {
          const factor = Math.sin((t * Math.PI) / 2);
          val = currentValue + (targetValue - currentValue) * factor;
        } else {
          const factor = Math.cos((t * Math.PI) / 2);
          val = targetValue + (currentValue - targetValue) * factor;
        }
        curveData[i] = val;
      }
      this.gainNode.gain.setValueCurveAtTime(curveData, safeStartTime, duration);
    } else if (curve === "exponential") {
      let safeTarget = targetValue;
      if (safeTarget <= 0.001) safeTarget = 0.001;

      if (currentValue < 0.001) {
        this.gainNode.gain.linearRampToValueAtTime(targetValue, safeStartTime + duration);
      } else {
        this.gainNode.gain.exponentialRampToValueAtTime(safeTarget, safeStartTime + duration);
        if (targetValue === 0) {
          this.gainNode.gain.setValueAtTime(0, safeStartTime + duration);
        }
      }
    } else {
      this.gainNode.gain.linearRampToValueAtTime(targetValue, safeStartTime + duration);
    }
  }

  /**
   * 设置输出设备
   */
  public async setSinkId(deviceId: string) {
    if (deviceId === "default") return;
    // 优先尝试 AudioContext 级设置
    if (this.audioCtx && typeof this.audioCtx.setSinkId === "function") {
      try {
        await this.audioCtx.setSinkId(deviceId);
        return;
      } catch (e) {
        console.warn("AudioContext setSinkId 失败, 尝试后备", e);
      }
    }
    // 回退逻辑由子类实现，例如设置 HTMLAudioElement.setSinkId
    await this.doSetSinkId(deviceId);
  }

  /**
   * 取消正在进行的暂停计划
   * 用于在淡出期间点击了播放或跳转，取消之前的暂停指令
   */
  protected cancelPendingPause() {
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  /** 获取频率数据 */
  public getFrequencyData(): Uint8Array {
    return this.effectManager ? this.effectManager.getFrequencyData() : new Uint8Array(0);
  }

  /** 获取低频音量 */
  public getLowFrequencyVolume(): number {
    return this.effectManager ? this.effectManager.getLowFrequencyVolume() : 0;
  }

  /** 设置滤波器增益 */
  public setFilterGain(index: number, value: number) {
    this.effectManager?.setFilterGain(index, value);
  }

  /** 设置高通滤波器频率 */
  public setHighPassFilter(frequency: number, rampTime: number = 0) {
    this.effectManager?.setHighPassFilter(frequency, rampTime);
  }

  public setHighPassQ(q: number) {
    this.effectManager?.setHighPassQ(q);
  }

  public setHighPassFilterAt(frequency: number, when: number) {
    this.effectManager?.setHighPassFilterAt(frequency, when);
  }

  public rampHighPassFilterToAt(frequency: number, when: number) {
    this.effectManager?.rampHighPassFilterToAt(frequency, when);
  }

  public setHighPassQAt(q: number, when: number) {
    this.effectManager?.setHighPassQAt(q, when);
  }

  /** 设置低通滤波器频率 */
  public setLowPassFilter(frequency: number, rampTime: number = 0) {
    this.effectManager?.setLowPassFilter(frequency, rampTime);
  }

  public setLowPassQ(q: number) {
    this.effectManager?.setLowPassQ(q);
  }

  public setLowPassFilterAt(frequency: number, when: number) {
    this.effectManager?.setLowPassFilterAt(frequency, when);
  }

  public rampLowPassFilterToAt(frequency: number, when: number) {
    this.effectManager?.rampLowPassFilterToAt(frequency, when);
  }

  public setLowPassQAt(q: number, when: number) {
    this.effectManager?.setLowPassQAt(q, when);
  }

  /** 获取滤波器增益 */
  public getFilterGains(): number[] {
    return this.effectManager ? this.effectManager.getFilterGains() : [];
  }

  /** 加载资源 */
  public abstract load(url: string): Promise<void>;

  /** 执行底层播放 */
  protected abstract doPlay(): Promise<void>;

  /** 执行底层暂停 */
  protected abstract doPause(): void | Promise<void>;

  /** 执行底层 Seek */
  protected abstract doSeek(time: number): void | Promise<void>;

  /** 设置播放速率 */
  public abstract setRate(value: number): void;

  /** 获取当前播放速率 */
  public abstract getRate(): number;

  /** 子类回退实现：设置输出设备 */
  protected abstract doSetSinkId(deviceId: string): Promise<void>;

  public abstract get src(): string;
  public abstract get duration(): number;
  public abstract get currentTime(): number;
  public abstract get paused(): boolean;
  public abstract getErrorCode(): number;
}
