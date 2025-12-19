/**
 * @file AudioManager.ts
 * @description 封装原生 AudioContext 与 HTMLAudioElement 的高级音频管理器
 * @author imsyy
 */

/** 扩充 AudioContext 接口以支持 setSinkId (实验性 API) */
interface IExtendedAudioContext extends AudioContext {
  setSinkId(deviceId: string): Promise<void>;
}

/**
 * 音频事件类型定义
 */
export type AudioEventType =
  | "play"
  | "pause"
  | "ended"
  | "timeupdate"
  | "error"
  | "waiting"
  | "canplay"
  | "loadedmetadata"
  | "loadstart"
  | "volumechange"
  | "seeking"
  | "seeked";

/**
 * 音频管理器类
 */
class AudioManager {
  /** 核心上下文 */
  private audioCtx: IExtendedAudioContext | null = null;
  /** 音频元素 */
  private audioElement: HTMLAudioElement | null = null;

  /** 音频源节点 */
  private sourceNode: MediaElementAudioSourceNode | null = null;
  /** 增益节点 */
  private gainNode: GainNode | null = null;
  /** 分析节点 */
  private analyserNode: AnalyserNode | null = null;
  /** 均衡器节点数组 */
  private filters: BiquadFilterNode[] = [];

  /** 初始化状态 */
  private isInitialized = false;
  /** 音量 (0-1) */
  private volume: number = 1;
  /** 事件监听器集合 */
  private eventListeners: Map<string, Set<(e: Event) => void>> = new Map();

  /** 均衡器频段 (10段) */
  private readonly eqFrequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

  /**
   * 构造函数
   */
  constructor() {
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = "anonymous";
    this.bindInternalEvents();
  }

  /**
   * 初始化 AudioContext 和音频图谱
   * 可以在用户交互时手动调用，或者在播放时自动调用
   */
  public init() {
    if (this.isInitialized) return;

    try {
      // 使用标准 AudioContext
      this.audioCtx = new AudioContext() as IExtendedAudioContext;

      // 创建节点
      this.sourceNode = this.audioCtx.createMediaElementSource(this.audioElement!);
      this.gainNode = this.audioCtx.createGain();
      this.analyserNode = this.audioCtx.createAnalyser();

      // 配置分析器 - 扩大动态范围
      this.analyserNode.fftSize = 128;
      this.analyserNode.smoothingTimeConstant = 0.15;
      this.analyserNode.minDecibels = -80; // 更大的动态范围
      this.analyserNode.maxDecibels = -10;

      // 创建均衡器滤波器
      this.filters = this.eqFrequencies.map((freq) => {
        const filter = this.audioCtx!.createBiquadFilter();
        filter.type = "peaking";
        filter.frequency.value = freq;
        filter.Q.value = 1;
        filter.gain.value = 0; // 默认平坦
        return filter;
      });

      // 连接图谱: Source -> EQ[0] -> ... -> EQ[9] -> Analyser -> Gain -> Destination
      let currentNode: AudioNode = this.sourceNode;

      for (const filter of this.filters) {
        currentNode.connect(filter);
        currentNode = filter;
      }

      currentNode.connect(this.analyserNode);
      this.analyserNode.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);

      // 同步音量
      this.gainNode.gain.value = this.volume;

      this.isInitialized = true;
    } catch (error) {
      console.error("AudioManager: 初始化 AudioContext 失败", error);
    }
  }

  /**
   * 加载并播放音频
   * @param url 音频地址
   * @param options 播放选项 (fadeIn: 是否渐入, fadeDuration: 渐入时长, autoPlay: 是否自动播放)
   */
  public async play(
    url?: string,
    options: { fadeIn?: boolean; fadeDuration?: number; autoPlay?: boolean } = {},
  ) {
    if (!this.isInitialized) this.init();

    // 如果上下文被挂起，则恢复
    if (this.audioCtx?.state === "suspended") {
      await this.audioCtx.resume();
    }

    if (url && this.audioElement) {
      this.audioElement.src = url;
      this.audioElement.load();
    }

    // 自动播放控制
    const shouldPlay = options.autoPlay ?? true;

    // 处理渐入
    if (shouldPlay && options.fadeIn && this.gainNode && this.audioCtx) {
      this.gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(
        this.volume,
        this.audioCtx.currentTime + (options.fadeDuration || 1),
      );
    } else if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }

    if (shouldPlay) {
      try {
        await this.audioElement?.play();
      } catch (error) {
        console.error("AudioManager: 播放失败", error);
        throw error;
      }
    }
  }

  /**
   * 暂停音频
   * @param options 暂停选项 (fadeOut: 是否渐出, fadeDuration: 渐出时长)
   */
  public pause(options: { fadeOut?: boolean; fadeDuration?: number } = {}) {
    if (options.fadeOut && this.gainNode && this.audioCtx) {
      const currentTime = this.audioCtx.currentTime;
      // 从当前值线性降低到 0
      this.gainNode.gain.cancelScheduledValues(currentTime);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, currentTime);
      this.gainNode.gain.linearRampToValueAtTime(0, currentTime + (options.fadeDuration || 1));
      // 等待渐出完成后暂停
      setTimeout(
        () => {
          this.audioElement?.pause();
        },
        (options.fadeDuration || 1) * 1000,
      );
    } else {
      this.audioElement?.pause();
    }
  }

  /**
   * 切换播放/暂停状态
   */
  public toggle() {
    if (this.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  /**
   * 停止播放并将时间重置为 0
   */
  public stop() {
    if (this.audioElement) {
      this.pause();
      this.audioElement.currentTime = 0;
    }
  }

  /**
   * 跳转到指定时间
   * @param time 时间（秒）
   */
  public seek(time: number) {
    if (this.audioElement) {
      this.audioElement.currentTime = time;
    }
  }

  /**
   * 设置音量
   * @param value 音量值 (0.0 - 1.0)
   */
  public setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  /**
   * 设置播放速率
   * @param value 速率 (0.5 - 2.0)
   */
  public setRate(value: number) {
    if (this.audioElement) {
      this.audioElement.playbackRate = value;
    }
  }

  /**
   * 获取当前播放速率
   * @returns 当前速率
   */
  public getRate(): number {
    return this.audioElement?.playbackRate || 1;
  }

  /**
   * 获取当前音量
   * @returns 当前音量值 (0.0 - 1.0)
   */
  public getVolume(): number {
    return this.volume;
  }

  /**
   * 监听音频事件
   * @param event 事件名称
   * @param callback 回调函数
   */
  public on(event: AudioEventType, callback: (e: Event) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * 移除事件监听
   * @param event 事件名称
   * @param callback 回调函数
   */
  public off(event: AudioEventType, callback: (e: Event) => void) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * 移除所有事件监听
   */
  public offAll() {
    this.eventListeners.clear();
  }

  /**
   * 绑定内部音频元素事件并转发
   * @param event 事件名称
   */
  private bindInternalEvents() {
    if (!this.audioElement) return;

    const events: AudioEventType[] = [
      "play",
      "pause",
      "ended",
      "timeupdate",
      "error",
      "waiting",
      "canplay",
      "loadedmetadata",
      "loadstart",
      "volumechange",
      "seeking",
      "seeked",
    ];

    events.forEach((event) => {
      this.audioElement!.addEventListener(event, (e) => {
        // 传递错误码
        if (event === "error" && this.audioElement) {
          const errCode = this.getErrorCode();
          const customEvent = new CustomEvent("error", {
            detail: { originalEvent: e, errorCode: errCode },
          });
          const listeners = this.eventListeners.get(event);
          if (listeners) {
            listeners.forEach((cb) => cb(customEvent));
          }
        } else {
          const listeners = this.eventListeners.get(event);
          if (listeners) {
            listeners.forEach((cb) => cb(e));
          }
        }
      });
    });
  }

  /**
   * 获取频谱数据 (用于可视化)
   * @returns Uint8Array 频谱数据
   */
  public getFrequencyData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(0);
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }

  /**
   * 设置音频输出设备
   * @param deviceId 设备 ID
   */
  public async setSinkId(deviceId: string) {
    if (deviceId === "default") return;
    try {
      // 优先在 Context 上设置
      if (this.isInitialized && this.audioCtx && typeof this.audioCtx.setSinkId === "function") {
        await this.audioCtx.setSinkId(deviceId);
        return;
      }
      // 回退到在 HTMLAudioElement 上设置
      if (this.audioElement && typeof this.audioElement.setSinkId === "function") {
        await this.audioElement.setSinkId(deviceId);
      }
    } catch (error) {
      console.error("AudioManager: 设置输出设备失败", error);
    }
  }

  /**
   * 设置均衡器增益
   * @param index 频段索引 (0-9)
   * @param value 增益值 (-40 to 40)
   */
  public setFilterGain(index: number, value: number) {
    if (this.filters[index]) {
      this.filters[index].gain.value = value;
    }
  }

  /**
   * 获取当前均衡器设置
   * @returns 各频段增益值数组
   */
  public getFilterGains(): number[] {
    return this.filters.map((f) => f.gain.value);
  }

  /**
   * 获取音频总时长
   * @returns 总时长（秒）
   */
  public get duration() {
    return this.audioElement?.duration || 0;
  }

  /**
   * 获取当前播放时间
   * @returns 当前播放时间（秒）
   */
  public get currentTime() {
    return this.audioElement?.currentTime || 0;
  }

  /**
   * 获取是否暂停状态
   * @returns 是否暂停
   */
  public get paused() {
    return this.audioElement?.paused ?? true;
  }

  /**
   * 获取当前播放地址
   * @returns 当前播放地址
   */
  public get src() {
    return this.audioElement?.src || "";
  }

  /**
   * 获取音频错误码
   * @returns 错误码
   */
  public getErrorCode(): number {
    if (!this.audioElement?.error) return 0;

    // 参考 HTML Audio Element 错误码
    // MEDIA_ERR_ABORTED (1): 用户中止了加载
    // MEDIA_ERR_NETWORK (2): 网络错误或资源过期
    // MEDIA_ERR_DECODE (3): 解码错误
    // MEDIA_ERR_SRC_NOT_SUPPORTED (4): 不支持的格式
    switch (this.audioElement.error.code) {
      case MediaError.MEDIA_ERR_ABORTED:
        return 1;
      case MediaError.MEDIA_ERR_NETWORK:
        return 2; // 网络错误或资源过期
      case MediaError.MEDIA_ERR_DECODE:
        return 3;
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        return 4;
      default:
        return 0;
    }
  }
}

let instance: AudioManager | null = null;

/**
 * 获取 AudioManager 实例
 * @returns AudioManager
 */
export const useAudioManager = (): AudioManager => {
  if (!instance) instance = new AudioManager();
  return instance;
};
