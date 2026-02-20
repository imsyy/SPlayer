/**
 * 播放引擎能力描述
 */
export interface EngineCapabilities {
  /** 是否支持倍速播放 */
  supportsRate: boolean;
  /** 是否支持切换输出设备 */
  supportsSinkId: boolean;
  /** 是否支持均衡器 */
  supportsEqualizer: boolean;
  /** 是否支持频谱分析 */
  supportsSpectrum: boolean;
}

/**
 * 音频错误详情
 */
export interface AudioErrorDetail {
  originalEvent?: Event;
  errorCode: number;
  message?: string;
}

export interface AutomationPoint {
  timeOffset: number;
  volume: number;
  lowCut: number;
  highCut: number;
}

export type FadeCurve = "linear" | "exponential" | "equalPower";

/**
 * 播放选项
 */
export interface PlayOptions {
  /** 是否自动播放 */
  autoPlay?: boolean;
  /** 是否渐入 */
  fadeIn?: boolean;
  /** 渐入时长（秒） */
  fadeDuration?: number;
  /** 淡入曲线类型 */
  fadeCurve?: FadeCurve;
  /** 初始播放位置（秒） */
  seek?: number;
}

/**
 * 暂停选项
 */
export interface PauseOptions {
  /** 是否渐出 */
  fadeOut?: boolean;
  /** 渐出时长（秒） */
  fadeDuration?: number;
  /** 淡出曲线类型 */
  fadeCurve?: FadeCurve;
  /** 是否保持 Context 运行（用于 Crossfade） */
  keepContextRunning?: boolean;
}

/**
 * 统一播放引擎接口
 */
export interface IPlaybackEngine {
  /** 初始化引擎 */
  init(): void;
  /** 销毁引擎，释放资源 */
  destroy(): void;

  /**
   * 加载并播放音频
   * @param url 音频地址
   * @param options 播放选项
   */
  play(url?: string, options?: PlayOptions): Promise<void>;

  /**
   * 恢复播放
   * @param options 播放选项
   */
  resume(options?: { fadeIn?: boolean; fadeDuration?: number }): Promise<void>;

  /**
   * 暂停播放
   * @param options 暂停选项
   */
  pause(options?: PauseOptions): void;

  /** 停止播放并重置进度 */
  stop(): void;

  /**
   * 跳转到指定时间
   * @param time 时间（秒）
   */
  seek(time: number): void;

  // ========== 状态属性 ==========

  /** 音频总时长（秒） */
  readonly duration: number;

  /** 当前播放位置（秒） */
  readonly currentTime: number;

  /** 是否处于暂停状态 */
  readonly paused: boolean;

  /** 当前音频源地址 */
  readonly src: string;

  /**
   * 设置音量
   * @param value 音量值 (0.0 - 1.0)
   */
  setVolume(value: number): void;

  rampVolumeTo?(value: number, duration: number, curve?: FadeCurve): void;

  /**
   * 获取当前音量
   * @returns 音量值 (0.0 - 1.0)
   */
  getVolume(): number;

  /**
   * 设置播放速率
   * @param rate 速率 (0.5 - 2.0)
   */
  setRate(rate: number): void;

  /**
   * 获取当前播放速率
   */
  getRate(): number;

  /**
   * 设置音频输出设备
   * @param deviceId 设备 ID
   */
  setSinkId(deviceId: string): Promise<void>;

  /**
   * 设置均衡器增益
   * @param index 频段索引 (0-9)
   * @param value 增益值 (-40 to 40)
   */
  setFilterGain?(index: number, value: number): void;

  /**
   * 获取均衡器各频段增益
   */
  getFilterGains?(): number[];

  /**
   * 设置高通滤波器频率
   * @param frequency 截止频率 (Hz)
   * @param rampTime 渐变时间 (s)
   */
  setHighPassFilter?(frequency: number, rampTime?: number): void;

  setHighPassQ?(q: number): void;

  setHighPassFilterAt?(frequency: number, when: number): void;

  rampHighPassFilterToAt?(frequency: number, when: number): void;

  setHighPassQAt?(q: number, when: number): void;

  /**
   * 设置低通滤波器频率
   * @param frequency 截止频率 (Hz)
   * @param rampTime 渐变时间 (s)
   */
  setLowPassFilter?(frequency: number, rampTime?: number): void;

  setLowPassQ?(q: number): void;

  setLowPassFilterAt?(frequency: number, when: number): void;

  rampLowPassFilterToAt?(frequency: number, when: number): void;

  setLowPassQAt?(q: number, when: number): void;

  /**
   * 获取频谱数据
   */
  getFrequencyData?(): Uint8Array;

  /**
   * 获取低频音量
   */
  getLowFrequencyVolume?(): number;

  /**
   * 设置 ReplayGain 增益
   * @param gain 线性增益值 (1.0 为原始音量)
   */
  setReplayGain?(gain: number): void;

  /**
   * 设置音高偏移
   * @param semitones 半音偏移量
   */
  setPitchShift?(semitones: number): void;

  /**
   * 获取最后一次错误码
   */
  getErrorCode(): number;

  /**
   * 添加事件监听
   */
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;

  /**
   * 移除事件监听
   */
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;

  /** 引擎能力描述 */
  readonly capabilities: EngineCapabilities;
}
