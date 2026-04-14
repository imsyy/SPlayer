/**
 * @fileoverview 音频效果管理器
 * 负责均衡器、频谱分析，以及空间音效 (8D / 3D)、混响、
 * 超重低音、清澈人声等多种音效的处理。
 *
 * 音频链路：
 * Input
 *   → HighPass → LowPass (AutoMIX 专用)
 *   → EQ[10 段]
 *   → BassShelf (超重低音)
 *   → VocalPeak (清澈人声)
 *   → Analyser (频谱/低频分析)
 *   → StereoPanner (8D 左右摇摆)
 *   → Panner (3D HRTF 环绕)
 *   → ReverbMix (dry/wet 混响)
 *   → Output
 */

export type ReverbType = "hall" | "ktv" | "room";

export class AudioEffectManager {
  private audioCtx: AudioContext;

  /** 分析节点 */
  private analyserNode: AnalyserNode | null = null;
  /** 均衡器节点数组 */
  private filters: BiquadFilterNode[] = [];

  /** AutoMIX 专用滤波器：高通 */
  private highPassFilter: BiquadFilterNode | null = null;
  /** AutoMIX 专用滤波器：低通 */
  private lowPassFilter: BiquadFilterNode | null = null;

  /** 超重低音滤波器 (lowshelf @ 80Hz) */
  private bassBoost: BiquadFilterNode | null = null;
  /** 清澈人声滤波器 (peaking @ 2.5kHz) */
  private vocalEnhance: BiquadFilterNode | null = null;

  /** 8D 声像节点 */
  private stereoPanner: StereoPannerNode | null = null;
  /** 8D LFO 振荡器 */
  private effect8dLfo: OscillatorNode | null = null;
  /** 8D LFO 深度增益 */
  private effect8dDepthGain: GainNode | null = null;

  /** 3D HRTF 声像节点 */
  private panner3d: PannerNode | null = null;
  /** 3D X 轴 LFO (正弦) */
  private effect3dLfoX: OscillatorNode | null = null;
  /** 3D Z 轴 LFO (余弦，和 X 相差 90°) */
  private effect3dLfoZ: OscillatorNode | null = null;
  /** 3D X 轴半径增益 */
  private effect3dRadiusGainX: GainNode | null = null;
  /** 3D Z 轴半径增益 */
  private effect3dRadiusGainZ: GainNode | null = null;
  /** 3D Z 轴基准偏移 (让声源默认在前方，避免居中时静音) */
  private effect3dBaseZ: ConstantSourceNode | null = null;

  /** 混响输入分接点 (同时连到 dry 和 convolver) */
  private reverbInput: GainNode | null = null;
  /** 混响 dry 通道增益 */
  private reverbDryGain: GainNode | null = null;
  /** 混响 wet 通道增益 */
  private reverbWetGain: GainNode | null = null;
  /** 混响卷积节点 */
  private reverbConvolver: ConvolverNode | null = null;
  /** 混响输出汇总点 (dry + wet 相加) */
  private reverbOutput: GainNode | null = null;

  /** LFO 启动标志 (OscillatorNode 只能 start 一次) */
  private lfosStarted: boolean = false;

  /** 平滑后的低频音量 */
  private smoothedLowFreqVolume: number = 0;

  /** 均衡器频段 (10段) */
  private readonly eqFrequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

  constructor(context: AudioContext) {
    this.audioCtx = context;
    this.initNodes();
  }

  /**
   * 初始化所有音频节点
   */
  private initNodes() {
    // 分析器
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 512;

    // 均衡器
    this.filters = this.eqFrequencies.map((freq) => {
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.value = freq;
      filter.Q.value = 1;
      filter.gain.value = 0;
      return filter;
    });

    // AutoMIX 滤波器
    this.highPassFilter = this.audioCtx.createBiquadFilter();
    this.highPassFilter.type = "highpass";
    this.highPassFilter.frequency.value = 0;
    this.highPassFilter.Q.value = 0.707;

    this.lowPassFilter = this.audioCtx.createBiquadFilter();
    this.lowPassFilter.type = "lowpass";
    this.lowPassFilter.frequency.value = 22000;
    this.lowPassFilter.Q.value = 0.707;

    // 超重低音 (lowshelf 在 80Hz 以下提升)
    this.bassBoost = this.audioCtx.createBiquadFilter();
    this.bassBoost.type = "lowshelf";
    this.bassBoost.frequency.value = 80;
    this.bassBoost.gain.value = 0;

    // 清澈人声 (peaking 在 2.5kHz 附近提升)
    this.vocalEnhance = this.audioCtx.createBiquadFilter();
    this.vocalEnhance.type = "peaking";
    this.vocalEnhance.frequency.value = 2500;
    this.vocalEnhance.Q.value = 0.9;
    this.vocalEnhance.gain.value = 0;

    // 8D: StereoPanner + LFO (正弦波驱动 pan 参数)
    this.stereoPanner = this.audioCtx.createStereoPanner();
    this.effect8dDepthGain = this.audioCtx.createGain();
    this.effect8dDepthGain.gain.value = 0;
    this.effect8dLfo = this.audioCtx.createOscillator();
    this.effect8dLfo.type = "sine";
    this.effect8dLfo.frequency.value = 0.25;
    this.effect8dLfo.connect(this.effect8dDepthGain);
    this.effect8dDepthGain.connect(this.stereoPanner.pan);

    // 3D: PannerNode (HRTF) + 两个 LFO 做圆周运动
    // 默认 panningModel="equalpower" 近似直通，启用时切到 HRTF
    this.panner3d = this.audioCtx.createPanner();
    this.panner3d.panningModel = "equalpower";
    this.panner3d.distanceModel = "inverse";
    this.panner3d.refDistance = 1;
    this.panner3d.maxDistance = 10000;
    this.panner3d.rolloffFactor = 0;
    this.panner3d.positionX.value = 0;
    this.panner3d.positionY.value = 0;
    this.panner3d.positionZ.value = -1;

    // X 轴使用正弦相位
    this.effect3dLfoX = this.audioCtx.createOscillator();
    const sineWave = this.audioCtx.createPeriodicWave(
      new Float32Array([0, 0]),
      new Float32Array([0, 1]),
    );
    this.effect3dLfoX.setPeriodicWave(sineWave);
    this.effect3dLfoX.frequency.value = 0.25;

    // Z 轴使用余弦相位 (与 X 相差 90°)
    this.effect3dLfoZ = this.audioCtx.createOscillator();
    const cosineWave = this.audioCtx.createPeriodicWave(
      new Float32Array([0, 1]),
      new Float32Array([0, 0]),
    );
    this.effect3dLfoZ.setPeriodicWave(cosineWave);
    this.effect3dLfoZ.frequency.value = 0.25;

    this.effect3dRadiusGainX = this.audioCtx.createGain();
    this.effect3dRadiusGainX.gain.value = 0;
    this.effect3dRadiusGainZ = this.audioCtx.createGain();
    this.effect3dRadiusGainZ.gain.value = 0;

    // Z 轴的基准值 (常数 -1，即"默认在前方 1 米")
    // 3D 启用时，positionZ = baseZ + radiusGainZ * -cos(wt)
    // 3D 关闭时，radiusGainZ = 0，只剩 baseZ = -1，即静态在前方
    this.effect3dBaseZ = this.audioCtx.createConstantSource();
    this.effect3dBaseZ.offset.value = -1;

    this.effect3dLfoX.connect(this.effect3dRadiusGainX);
    this.effect3dRadiusGainX.connect(this.panner3d.positionX);

    this.effect3dLfoZ.connect(this.effect3dRadiusGainZ);
    this.effect3dRadiusGainZ.connect(this.panner3d.positionZ);

    this.effect3dBaseZ.connect(this.panner3d.positionZ);

    // 混响：dry/wet 并行混合
    this.reverbInput = this.audioCtx.createGain();
    this.reverbInput.gain.value = 1;

    this.reverbDryGain = this.audioCtx.createGain();
    this.reverbDryGain.gain.value = 1;

    this.reverbWetGain = this.audioCtx.createGain();
    this.reverbWetGain.gain.value = 0;

    this.reverbConvolver = this.audioCtx.createConvolver();
    this.reverbConvolver.buffer = this.generateImpulseResponse("hall");

    this.reverbOutput = this.audioCtx.createGain();
    this.reverbOutput.gain.value = 1;

    // 混响内部连接
    this.reverbInput.connect(this.reverbDryGain);
    this.reverbInput.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbWetGain);
    this.reverbDryGain.connect(this.reverbOutput);
    this.reverbWetGain.connect(this.reverbOutput);
  }

  /**
   * 程序化生成脉冲响应 (白噪声 + 指数衰减)
   * 用于不同类型的混响
   */
  private generateImpulseResponse(type: ReverbType): AudioBuffer {
    const sampleRate = this.audioCtx.sampleRate;
    let duration: number;
    let decay: number;
    switch (type) {
      case "hall":
        duration = 2.8;
        decay = 2.5;
        break;
      case "ktv":
        duration = 1.2;
        decay = 3.5;
        break;
      case "room":
        duration = 0.5;
        decay = 4.5;
        break;
    }
    const length = Math.floor(sampleRate * duration);
    const impulse = this.audioCtx.createBuffer(2, length, sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  /**
   * 将效果链连接到音频管线中
   * @param inputNode 输入音频节点
   * @returns 链条的最后一个节点 (reverbOutput)
   */
  public connect(inputNode: AudioNode): AudioNode {
    let currentNode: AudioNode = inputNode;

    if (this.highPassFilter) {
      currentNode.connect(this.highPassFilter);
      currentNode = this.highPassFilter;
    }
    if (this.lowPassFilter) {
      currentNode.connect(this.lowPassFilter);
      currentNode = this.lowPassFilter;
    }

    for (const filter of this.filters) {
      currentNode.connect(filter);
      currentNode = filter;
    }

    if (this.bassBoost) {
      currentNode.connect(this.bassBoost);
      currentNode = this.bassBoost;
    }
    if (this.vocalEnhance) {
      currentNode.connect(this.vocalEnhance);
      currentNode = this.vocalEnhance;
    }

    if (this.analyserNode) {
      currentNode.connect(this.analyserNode);
      currentNode = this.analyserNode;
    }

    if (this.stereoPanner) {
      currentNode.connect(this.stereoPanner);
      currentNode = this.stereoPanner;
    }

    if (this.panner3d) {
      currentNode.connect(this.panner3d);
      currentNode = this.panner3d;
    }

    if (this.reverbInput && this.reverbOutput) {
      currentNode.connect(this.reverbInput);
      currentNode = this.reverbOutput;
    }

    return currentNode;
  }

  /**
   * 启动所有 LFO 和常量源 (只能调一次)
   */
  private ensureLfosStarted() {
    if (this.lfosStarted) return;
    try {
      this.effect8dLfo?.start();
      this.effect3dLfoX?.start();
      this.effect3dLfoZ?.start();
      this.effect3dBaseZ?.start();
    } catch {
      // 已经启动过
    }
    this.lfosStarted = true;
  }

  // ==================== 8D 环绕 ====================

  /**
   * 启用/禁用 8D 环绕
   * @param enabled 是否开启
   * @param depth 深度 (0-1)
   */
  public setEffect8dEnabled(enabled: boolean, depth: number = 1) {
    if (!this.effect8dDepthGain || !this.stereoPanner) return;
    this.ensureLfosStarted();
    const currentTime = this.audioCtx.currentTime;
    const rampEnd = currentTime + 0.05;
    const target = enabled ? Math.max(0, Math.min(1, depth)) : 0;
    this.effect8dDepthGain.gain.cancelScheduledValues(currentTime);
    this.effect8dDepthGain.gain.setValueAtTime(this.effect8dDepthGain.gain.value, currentTime);
    this.effect8dDepthGain.gain.linearRampToValueAtTime(target, rampEnd);

    if (!enabled) {
      this.stereoPanner.pan.cancelScheduledValues(currentTime);
      this.stereoPanner.pan.setValueAtTime(this.stereoPanner.pan.value, currentTime);
      this.stereoPanner.pan.linearRampToValueAtTime(0, rampEnd);
    }
  }

  /**
   * 设置 8D 速率 (Hz)
   */
  public setEffect8dRate(hz: number) {
    if (!this.effect8dLfo) return;
    const safeHz = Math.max(0.05, Math.min(4, hz));
    const currentTime = this.audioCtx.currentTime;
    this.effect8dLfo.frequency.cancelScheduledValues(currentTime);
    this.effect8dLfo.frequency.setValueAtTime(this.effect8dLfo.frequency.value, currentTime);
    this.effect8dLfo.frequency.linearRampToValueAtTime(safeHz, currentTime + 0.1);
  }

  /**
   * 设置 8D 深度 (0-1)
   */
  public setEffect8dDepth(depth: number) {
    if (!this.effect8dDepthGain) return;
    const safe = Math.max(0, Math.min(1, depth));
    const currentTime = this.audioCtx.currentTime;
    this.effect8dDepthGain.gain.cancelScheduledValues(currentTime);
    this.effect8dDepthGain.gain.setValueAtTime(this.effect8dDepthGain.gain.value, currentTime);
    this.effect8dDepthGain.gain.linearRampToValueAtTime(safe, currentTime + 0.1);
  }

  // ==================== 3D 环绕 ====================

  /**
   * 启用/禁用 3D HRTF 环绕
   * @param enabled 是否开启
   * @param radius 半径 (0-1，声源绕头转圈的幅度)
   */
  public setEffect3dEnabled(enabled: boolean, radius: number = 1) {
    if (!this.panner3d || !this.effect3dRadiusGainX || !this.effect3dRadiusGainZ) return;
    this.ensureLfosStarted();
    const currentTime = this.audioCtx.currentTime;
    const rampEnd = currentTime + 0.05;
    const target = enabled ? Math.max(0, Math.min(1, radius)) : 0;

    // 切换 HRTF 模式
    this.panner3d.panningModel = enabled ? "HRTF" : "equalpower";

    this.effect3dRadiusGainX.gain.cancelScheduledValues(currentTime);
    this.effect3dRadiusGainX.gain.setValueAtTime(
      this.effect3dRadiusGainX.gain.value,
      currentTime,
    );
    this.effect3dRadiusGainX.gain.linearRampToValueAtTime(target, rampEnd);

    this.effect3dRadiusGainZ.gain.cancelScheduledValues(currentTime);
    this.effect3dRadiusGainZ.gain.setValueAtTime(
      this.effect3dRadiusGainZ.gain.value,
      currentTime,
    );
    // Z 轴取反使圆周方向正确 (前→右→后→左)
    this.effect3dRadiusGainZ.gain.linearRampToValueAtTime(-target, rampEnd);
  }

  /**
   * 设置 3D 旋转速度 (Hz)
   */
  public setEffect3dRate(hz: number) {
    if (!this.effect3dLfoX || !this.effect3dLfoZ) return;
    const safeHz = Math.max(0.02, Math.min(3, hz));
    const currentTime = this.audioCtx.currentTime;
    const rampEnd = currentTime + 0.1;
    for (const lfo of [this.effect3dLfoX, this.effect3dLfoZ]) {
      lfo.frequency.cancelScheduledValues(currentTime);
      lfo.frequency.setValueAtTime(lfo.frequency.value, currentTime);
      lfo.frequency.linearRampToValueAtTime(safeHz, rampEnd);
    }
  }

  /**
   * 设置 3D 半径 (0-1，越大声源距离越远)
   */
  public setEffect3dRadius(radius: number) {
    if (!this.effect3dRadiusGainX || !this.effect3dRadiusGainZ) return;
    const safe = Math.max(0, Math.min(1, radius));
    const currentTime = this.audioCtx.currentTime;
    const rampEnd = currentTime + 0.1;
    this.effect3dRadiusGainX.gain.cancelScheduledValues(currentTime);
    this.effect3dRadiusGainX.gain.setValueAtTime(
      this.effect3dRadiusGainX.gain.value,
      currentTime,
    );
    this.effect3dRadiusGainX.gain.linearRampToValueAtTime(safe, rampEnd);

    this.effect3dRadiusGainZ.gain.cancelScheduledValues(currentTime);
    this.effect3dRadiusGainZ.gain.setValueAtTime(
      this.effect3dRadiusGainZ.gain.value,
      currentTime,
    );
    this.effect3dRadiusGainZ.gain.linearRampToValueAtTime(-safe, rampEnd);
  }

  // ==================== 混响 ====================

  /**
   * 启用/禁用混响
   * @param enabled 是否开启
   * @param wet 湿度 (0-1)
   */
  public setReverbEnabled(enabled: boolean, wet: number = 0.4) {
    if (!this.reverbDryGain || !this.reverbWetGain) return;
    const currentTime = this.audioCtx.currentTime;
    const rampEnd = currentTime + 0.08;
    const safeWet = Math.max(0, Math.min(1, wet));
    const targetWet = enabled ? safeWet : 0;
    const targetDry = enabled ? 1 - safeWet * 0.5 : 1; // 湿度大时适当降低 dry 避免过响

    this.reverbWetGain.gain.cancelScheduledValues(currentTime);
    this.reverbWetGain.gain.setValueAtTime(this.reverbWetGain.gain.value, currentTime);
    this.reverbWetGain.gain.linearRampToValueAtTime(targetWet, rampEnd);

    this.reverbDryGain.gain.cancelScheduledValues(currentTime);
    this.reverbDryGain.gain.setValueAtTime(this.reverbDryGain.gain.value, currentTime);
    this.reverbDryGain.gain.linearRampToValueAtTime(targetDry, rampEnd);
  }

  /**
   * 设置混响湿度 (0-1)
   */
  public setReverbWet(wet: number) {
    if (!this.reverbDryGain || !this.reverbWetGain) return;
    const safe = Math.max(0, Math.min(1, wet));
    const currentTime = this.audioCtx.currentTime;
    const rampEnd = currentTime + 0.1;
    this.reverbWetGain.gain.cancelScheduledValues(currentTime);
    this.reverbWetGain.gain.setValueAtTime(this.reverbWetGain.gain.value, currentTime);
    this.reverbWetGain.gain.linearRampToValueAtTime(safe, rampEnd);
    this.reverbDryGain.gain.cancelScheduledValues(currentTime);
    this.reverbDryGain.gain.setValueAtTime(this.reverbDryGain.gain.value, currentTime);
    this.reverbDryGain.gain.linearRampToValueAtTime(1 - safe * 0.5, rampEnd);
  }

  /**
   * 切换混响类型
   */
  public setReverbType(type: ReverbType) {
    if (!this.reverbConvolver) return;
    this.reverbConvolver.buffer = this.generateImpulseResponse(type);
  }

  // ==================== 超重低音 ====================

  /**
   * 启用/禁用超重低音
   * @param enabled 是否开启
   * @param gain 增益 dB (0-15，典型值 6~12)
   */
  public setBassBoostEnabled(enabled: boolean, gain: number = 8) {
    if (!this.bassBoost) return;
    const currentTime = this.audioCtx.currentTime;
    const rampEnd = currentTime + 0.08;
    const target = enabled ? Math.max(0, Math.min(15, gain)) : 0;
    this.bassBoost.gain.cancelScheduledValues(currentTime);
    this.bassBoost.gain.setValueAtTime(this.bassBoost.gain.value, currentTime);
    this.bassBoost.gain.linearRampToValueAtTime(target, rampEnd);
  }

  /**
   * 设置超重低音增益 dB
   */
  public setBassBoostGain(gain: number) {
    if (!this.bassBoost) return;
    const safe = Math.max(0, Math.min(15, gain));
    const currentTime = this.audioCtx.currentTime;
    const rampEnd = currentTime + 0.1;
    this.bassBoost.gain.cancelScheduledValues(currentTime);
    this.bassBoost.gain.setValueAtTime(this.bassBoost.gain.value, currentTime);
    this.bassBoost.gain.linearRampToValueAtTime(safe, rampEnd);
  }

  // ==================== 清澈人声 ====================

  /**
   * 启用/禁用清澈人声
   * @param enabled 是否开启
   * @param gain 增益 dB (0-12)
   */
  public setVocalEnhanceEnabled(enabled: boolean, gain: number = 6) {
    if (!this.vocalEnhance) return;
    const currentTime = this.audioCtx.currentTime;
    const rampEnd = currentTime + 0.08;
    const target = enabled ? Math.max(0, Math.min(12, gain)) : 0;
    this.vocalEnhance.gain.cancelScheduledValues(currentTime);
    this.vocalEnhance.gain.setValueAtTime(this.vocalEnhance.gain.value, currentTime);
    this.vocalEnhance.gain.linearRampToValueAtTime(target, rampEnd);
  }

  /**
   * 设置清澈人声增益 dB
   */
  public setVocalEnhanceGain(gain: number) {
    if (!this.vocalEnhance) return;
    const safe = Math.max(0, Math.min(12, gain));
    const currentTime = this.audioCtx.currentTime;
    const rampEnd = currentTime + 0.1;
    this.vocalEnhance.gain.cancelScheduledValues(currentTime);
    this.vocalEnhance.gain.setValueAtTime(this.vocalEnhance.gain.value, currentTime);
    this.vocalEnhance.gain.linearRampToValueAtTime(safe, rampEnd);
  }

  // ==================== 原有 EQ / 滤波器接口 ====================

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

  public getFilterGains(): number[] {
    return this.filters.map((f) => f.gain.value);
  }

  /**
   * 获取频谱数据
   */
  public getFrequencyData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(0);
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }

  /**
   * 获取低频音量
   */
  public getLowFrequencyVolume(): number {
    if (!this.analyserNode) return 0;

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);

    const lowFreqBins = dataArray.slice(0, 3);
    const sum = lowFreqBins.reduce((acc, val) => acc + val, 0);
    const avg = sum / lowFreqBins.length;

    const threshold = 180;
    const maxValue = 255;
    const normalized = Math.max(0, (avg - threshold) / (maxValue - threshold));
    const rawValue = Math.pow(normalized, 2);

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
    this.bassBoost?.disconnect();
    this.vocalEnhance?.disconnect();
    this.analyserNode?.disconnect();

    if (this.lfosStarted) {
      try {
        this.effect8dLfo?.stop();
        this.effect3dLfoX?.stop();
        this.effect3dLfoZ?.stop();
        this.effect3dBaseZ?.stop();
      } catch {
        // 已停止
      }
    }

    this.effect8dLfo?.disconnect();
    this.effect8dDepthGain?.disconnect();
    this.stereoPanner?.disconnect();

    this.effect3dLfoX?.disconnect();
    this.effect3dLfoZ?.disconnect();
    this.effect3dRadiusGainX?.disconnect();
    this.effect3dRadiusGainZ?.disconnect();
    this.effect3dBaseZ?.disconnect();
    this.panner3d?.disconnect();

    this.reverbInput?.disconnect();
    this.reverbDryGain?.disconnect();
    this.reverbWetGain?.disconnect();
    this.reverbConvolver?.disconnect();
    this.reverbOutput?.disconnect();

    this.lfosStarted = false;
  }
}
