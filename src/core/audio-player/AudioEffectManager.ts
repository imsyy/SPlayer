/**
 * @fileoverview 负责均衡器、空间音效和频谱分析的管理器
 */

export type SpatialWaveform = "sine" | "triangle" | "square";

export class AudioEffectManager {
  private audioCtx: AudioContext;

  /** 分析节点 */
  private analyserNode: AnalyserNode | null = null;
  /** 均衡器节点数组 */
  private filters: BiquadFilterNode[] = [];

  /** AutoMIX 专用滤波器：高通 (用于切入时过滤低频) */
  private highPassFilter: BiquadFilterNode | null = null;
  /** AutoMIX 专用滤波器：低通 (用于切出时过滤低频) */
  private lowPassFilter: BiquadFilterNode | null = null;

  /** 空间音效：声像节点 */
  private pannerNode: StereoPannerNode | null = null;
  /** 空间音效：LFO 振荡器 (驱动 pan 参数) */
  private spatialLfo: OscillatorNode | null = null;
  /** 空间音效：LFO 深度增益 (0 = 关闭直通，1 = 完全左右摇摆) */
  private spatialDepthGain: GainNode | null = null;
  /** 空间音效：LFO 是否已启动 (OscillatorNode 只能 start 一次) */
  private spatialLfoStarted: boolean = false;

  /** 平滑后的低频音量 */
  private smoothedLowFreqVolume: number = 0;

  /** 均衡器频段 (10段) */
  private readonly eqFrequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

  constructor(context: AudioContext) {
    this.audioCtx = context;
    this.initNodes();
  }

  /**
   * 初始化节点
   */
  private initNodes() {
    // 创建分析器
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 512;

    // 创建均衡器滤波器
    this.filters = this.eqFrequencies.map((freq) => {
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.value = freq;
      filter.Q.value = 1;
      filter.gain.value = 0; // 默认平坦
      return filter;
    });

    // 创建 AutoMIX 滤波器
    this.highPassFilter = this.audioCtx.createBiquadFilter();
    this.highPassFilter.type = "highpass";
    this.highPassFilter.frequency.value = 0; // 默认关闭 (直通)
    this.highPassFilter.Q.value = 0.707;

    this.lowPassFilter = this.audioCtx.createBiquadFilter();
    this.lowPassFilter.type = "lowpass";
    this.lowPassFilter.frequency.value = 22000; // 默认关闭 (直通)
    this.lowPassFilter.Q.value = 0.707;

    // 创建空间音效节点
    // pan = 0 为居中，LFO 通过 spatialDepthGain 调制 pan 参数实现左右摇摆
    // 初始 depthGain = 0 表示不施加调制（直通）
    this.pannerNode = this.audioCtx.createStereoPanner();
    this.spatialDepthGain = this.audioCtx.createGain();
    this.spatialDepthGain.gain.value = 0;
    this.spatialLfo = this.audioCtx.createOscillator();
    this.spatialLfo.type = "sine";
    this.spatialLfo.frequency.value = 0.25; // 默认 0.25 Hz (4 秒一圈)
    this.spatialLfo.connect(this.spatialDepthGain);
    this.spatialDepthGain.connect(this.pannerNode.pan);
  }

  /**
   * 将效果链连接到音频管线中
   * 链路: Input -> HighPass -> LowPass -> Filter[0]... -> Analyser -> Panner -> Output
   * 频谱分析放在 Panner 之前，使频谱显示不受左右摇摆影响。
   * @param inputNode 输入音频节点 (通常是 SourceNode)
   * @returns 链条的最后一个节点 (StereoPannerNode)，供调用者连接到 GainNode 或 Destination
   */
  public connect(inputNode: AudioNode): AudioNode {
    let currentNode = inputNode;

    // 连接 AutoMIX 滤波器
    if (this.highPassFilter) {
      currentNode.connect(this.highPassFilter);
      currentNode = this.highPassFilter;
    }
    if (this.lowPassFilter) {
      currentNode.connect(this.lowPassFilter);
      currentNode = this.lowPassFilter;
    }

    // 串联所有滤波器
    for (const filter of this.filters) {
      currentNode.connect(filter);
      currentNode = filter;
    }

    // 连接到分析器
    if (this.analyserNode) {
      currentNode.connect(this.analyserNode);
      currentNode = this.analyserNode;
    }

    // 连接到空间音效 (StereoPanner)
    if (this.pannerNode) {
      currentNode.connect(this.pannerNode);
      currentNode = this.pannerNode;
    }

    return currentNode;
  }

  /**
   * 确保 LFO 已启动 (OscillatorNode 的 start 只能调用一次)
   */
  private ensureSpatialLfoStarted() {
    if (this.spatialLfo && !this.spatialLfoStarted) {
      try {
        this.spatialLfo.start();
        this.spatialLfoStarted = true;
      } catch {
        // 已经启动过，忽略
        this.spatialLfoStarted = true;
      }
    }
  }

  /**
   * 设置空间音效启用状态
   * 通过将 LFO 深度增益渐变到 0 或指定深度实现启停，避免爆音
   * @param enabled 是否开启
   * @param depth 深度 (0.0 - 1.0)，关闭时该值忽略
   * @param rampTime 渐变时间 (秒)，默认 0.05s
   */
  public setSpatialEnabled(enabled: boolean, depth: number = 1, rampTime: number = 0.05) {
    if (!this.spatialDepthGain || !this.pannerNode) return;

    this.ensureSpatialLfoStarted();

    const currentTime = this.audioCtx.currentTime;
    const safeRamp = Math.max(0.01, rampTime);
    const targetGain = enabled ? Math.max(0, Math.min(1, depth)) : 0;

    this.spatialDepthGain.gain.cancelScheduledValues(currentTime);
    this.spatialDepthGain.gain.setValueAtTime(this.spatialDepthGain.gain.value, currentTime);
    this.spatialDepthGain.gain.linearRampToValueAtTime(targetGain, currentTime + safeRamp);

    // 关闭时把 panner 的固定 pan 拉回 0 (居中)，防止 LFO 停止瞬间卡在某一侧
    if (!enabled) {
      this.pannerNode.pan.cancelScheduledValues(currentTime);
      this.pannerNode.pan.setValueAtTime(this.pannerNode.pan.value, currentTime);
      this.pannerNode.pan.linearRampToValueAtTime(0, currentTime + safeRamp);
    }
  }

  /**
   * 设置空间音效速率 (LFO 频率)
   * @param hz 左右摇摆速率 (Hz)，推荐范围 0.05 ~ 4
   * @param rampTime 渐变时间 (秒)
   */
  public setSpatialRate(hz: number, rampTime: number = 0.1) {
    if (!this.spatialLfo) return;
    const safeHz = Math.max(0.05, Math.min(20, hz));
    const currentTime = this.audioCtx.currentTime;
    const safeRamp = Math.max(0.01, rampTime);
    this.spatialLfo.frequency.cancelScheduledValues(currentTime);
    this.spatialLfo.frequency.setValueAtTime(this.spatialLfo.frequency.value, currentTime);
    this.spatialLfo.frequency.linearRampToValueAtTime(safeHz, currentTime + safeRamp);
  }

  /**
   * 设置空间音效深度 (LFO 摆动幅度)
   * @param depth 深度 (0.0 - 1.0)，0 = 无摇摆，1 = 完全左右
   * @param rampTime 渐变时间 (秒)
   */
  public setSpatialDepth(depth: number, rampTime: number = 0.1) {
    if (!this.spatialDepthGain) return;
    const safeDepth = Math.max(0, Math.min(1, depth));
    const currentTime = this.audioCtx.currentTime;
    const safeRamp = Math.max(0.01, rampTime);
    this.spatialDepthGain.gain.cancelScheduledValues(currentTime);
    this.spatialDepthGain.gain.setValueAtTime(this.spatialDepthGain.gain.value, currentTime);
    this.spatialDepthGain.gain.linearRampToValueAtTime(safeDepth, currentTime + safeRamp);
  }

  /**
   * 设置空间音效波形
   * sine = 平滑摇摆；triangle = 匀速左右；square = 硬切换（跳跃式）
   */
  public setSpatialWaveform(waveform: SpatialWaveform) {
    if (!this.spatialLfo) return;
    this.spatialLfo.type = waveform;
  }

  /**
   * 设置高通滤波器频率
   * @param frequency 截止频率 (Hz)
   * @param rampTime 渐变时间 (s)
   */
  public setHighPassFilter(frequency: number, rampTime: number = 0) {
    if (!this.highPassFilter) return;
    const currentTime = this.audioCtx.currentTime;
    this.highPassFilter.frequency.cancelScheduledValues(currentTime);

    if (frequency <= 0) {
      this.highPassFilter.type = "allpass";
      this.highPassFilter.frequency.setValueAtTime(10, currentTime);
      return;
    }

    this.highPassFilter.type = "highpass";
    const targetFreq = Math.max(10, Math.min(22000, frequency));

    if (rampTime > 0) {
      this.highPassFilter.frequency.exponentialRampToValueAtTime(
        targetFreq,
        currentTime + rampTime,
      );
    } else {
      this.highPassFilter.frequency.setValueAtTime(targetFreq, currentTime);
    }
  }

  public setHighPassFilterAt(frequency: number, when: number) {
    if (!this.highPassFilter) return;
    const time = Math.max(when, this.audioCtx.currentTime);
    const targetFreq = frequency <= 0 ? 10 : Math.max(10, Math.min(22000, frequency));

    this.highPassFilter.type = "highpass";
    this.highPassFilter.frequency.cancelScheduledValues(time);
    this.highPassFilter.frequency.setValueAtTime(targetFreq, time);
  }

  public rampHighPassFilterToAt(frequency: number, when: number) {
    if (!this.highPassFilter) return;
    const time = Math.max(when, this.audioCtx.currentTime);
    const targetFreq = frequency <= 0 ? 10 : Math.max(10, Math.min(22000, frequency));

    this.highPassFilter.type = "highpass";
    this.highPassFilter.frequency.exponentialRampToValueAtTime(targetFreq, time);
  }

  /**
   * 设置低通滤波器频率
   * @param frequency 截止频率 (Hz)
   * @param rampTime 渐变时间 (s)
   */
  public setLowPassFilter(frequency: number, rampTime: number = 0) {
    if (!this.lowPassFilter) return;
    const currentTime = this.audioCtx.currentTime;
    this.lowPassFilter.frequency.cancelScheduledValues(currentTime);

    if (frequency <= 0 || frequency >= 22000) {
      this.lowPassFilter.type = "allpass";
      this.lowPassFilter.frequency.setValueAtTime(22000, currentTime);
      return;
    }

    this.lowPassFilter.type = "lowpass";
    const targetFreq = Math.max(10, Math.min(22000, frequency));

    if (rampTime > 0) {
      this.lowPassFilter.frequency.exponentialRampToValueAtTime(targetFreq, currentTime + rampTime);
    } else {
      this.lowPassFilter.frequency.setValueAtTime(targetFreq, currentTime);
    }
  }

  public setLowPassFilterAt(frequency: number, when: number) {
    if (!this.lowPassFilter) return;
    const time = Math.max(when, this.audioCtx.currentTime);
    const targetFreq =
      frequency <= 0 || frequency >= 22000 ? 22000 : Math.max(10, Math.min(22000, frequency));

    this.lowPassFilter.type = "lowpass";
    this.lowPassFilter.frequency.cancelScheduledValues(time);
    this.lowPassFilter.frequency.setValueAtTime(targetFreq, time);
  }

  public rampLowPassFilterToAt(frequency: number, when: number) {
    if (!this.lowPassFilter) return;
    const time = Math.max(when, this.audioCtx.currentTime);
    const targetFreq =
      frequency <= 0 || frequency >= 22000 ? 22000 : Math.max(10, Math.min(22000, frequency));

    this.lowPassFilter.type = "lowpass";
    this.lowPassFilter.frequency.exponentialRampToValueAtTime(targetFreq, time);
  }

  /**
   * 设置均衡器增益
   * @param index 频段索引 (0-9)
   * @param value 增益值 (-40 ~ 40)
   */
  public setFilterGain(index: number, value: number) {
    if (this.filters[index]) {
      this.filters[index].gain.value = value;
    }
  }

  public setHighPassQ(q: number) {
    if (!this.highPassFilter) return;
    const safeQ = Math.max(0.1, Math.min(10, q));
    const currentTime = this.audioCtx.currentTime;
    this.highPassFilter.Q.cancelScheduledValues(currentTime);
    this.highPassFilter.Q.setValueAtTime(safeQ, currentTime);
  }

  public setHighPassQAt(q: number, when: number) {
    if (!this.highPassFilter) return;
    const time = Math.max(when, this.audioCtx.currentTime);
    const safeQ = Math.max(0.1, Math.min(10, q));
    this.highPassFilter.Q.cancelScheduledValues(time);
    this.highPassFilter.Q.setValueAtTime(safeQ, time);
  }

  public setLowPassQ(q: number) {
    if (!this.lowPassFilter) return;
    const safeQ = Math.max(0.1, Math.min(10, q));
    const currentTime = this.audioCtx.currentTime;
    this.lowPassFilter.Q.cancelScheduledValues(currentTime);
    this.lowPassFilter.Q.setValueAtTime(safeQ, currentTime);
  }

  public setLowPassQAt(q: number, when: number) {
    if (!this.lowPassFilter) return;
    const time = Math.max(when, this.audioCtx.currentTime);
    const safeQ = Math.max(0.1, Math.min(10, q));
    this.lowPassFilter.Q.cancelScheduledValues(time);
    this.lowPassFilter.Q.setValueAtTime(safeQ, time);
  }

  /**
   * 获取当前均衡器设置
   */
  public getFilterGains(): number[] {
    return this.filters.map((f) => f.gain.value);
  }

  /**
   * 获取频谱数据 (用于可视化)
   */
  public getFrequencyData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(0);
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }

  /**
   * 获取低频音量
   * @returns 低频音量 (0-1)
   */
  public getLowFrequencyVolume(): number {
    if (!this.analyserNode) return 0;

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);

    // 低频范围：前 3 个 bin (约 0-280Hz，基于 512 FFT 和约 48kHz 采样率)
    const lowFreqBins = dataArray.slice(0, 3);
    const sum = lowFreqBins.reduce((acc, val) => acc + val, 0);
    const avg = sum / lowFreqBins.length;

    // 使用阈值和幂函数扩展动态范围
    // 通常低频能量较高（约 200-255），我们需要将其映射到更有意义的范围
    const threshold = 180; // 低于此值视为静音
    const maxValue = 255;

    // 计算超过阈值的部分
    const normalized = Math.max(0, (avg - threshold) / (maxValue - threshold));

    // 应用幂函数扩展动态范围 (使低值更低，高值保持)
    const rawValue = Math.pow(normalized, 2);

    // 应用指数移动平均 (EMA) 平滑处理
    // smoothFactor 越小平滑效果越明显，0.1-0.3 较为平缓
    const smoothFactor = 0.28;
    this.smoothedLowFreqVolume =
      this.smoothedLowFreqVolume + smoothFactor * (rawValue - this.smoothedLowFreqVolume);

    return this.smoothedLowFreqVolume;
  }

  /**
   * 清理资源，断开连接
   */
  public disconnect() {
    this.filters.forEach((f) => f.disconnect());
    this.highPassFilter?.disconnect();
    this.lowPassFilter?.disconnect();
    this.analyserNode?.disconnect();
    if (this.spatialLfo && this.spatialLfoStarted) {
      try {
        this.spatialLfo.stop();
      } catch {
        // 可能已经停止过
      }
    }
    this.spatialLfo?.disconnect();
    this.spatialDepthGain?.disconnect();
    this.pannerNode?.disconnect();
    this.spatialLfoStarted = false;
  }
}
