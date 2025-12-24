/** 氛围灯配置选项 */
export interface AmbientLightConfig {
  // ===== 核心灵敏度 =====
  /** 最小分贝 (-100到0)，过滤弱音，越大过滤越多 */
  minDecibels: number;
  /** 最大分贝 (-100到0) */
  maxDecibels: number;
  /** 最小阈值 (0.0-1.0)，低于此值归零 */
  minThreshold: number;

  // ===== 视觉效果 =====
  /** 曲线指数 (1.0-3.0)，强弱对比度 */
  curveExponent: number;
  /** 下降插值系数 (0.0-1.0)，越大下降越快 */
  lerpDown: number;
  /** 上升插值系数 (0.0-1.0)，越大上升越快 */
  lerpUp: number;
  /** 最小变化差值 (0-100)，发送到前端的最小变化量，越大越节省性能 */
  minDiff: number;

  // ===== 平滑度 =====
  /** 小变化平滑阈值 (0.0-1.0) */
  smallChangeThreshold: number;
  /** 小变化平滑系数 (0.0-1.0) */
  smallChangeSmoothing: number;

  // ===== 峰值检测 =====
  /** RMS 权重，越高越平滑 */
  rmsWeight: number;
  /** Peak 权重，越高对瞬态响应越好 */
  peakWeight: number;

  // ===== 频谱分析 =====
  /** FFT 大小 (32, 64, 128...) */
  fftSize: number;
  /** 频谱平滑常数 (0.0-1.0) */
  smoothingTimeConstant: number;
  /** 低频区域比例 (0.0-1.0) */
  bassEndRatio: number;
  /** 中频区域比例 (0.0-1.0) */
  midEndRatio: number;
  /** 低频权重 */
  bassWeight: number;
  /** 中频权重 */
  midWeight: number;

  // ===== 归一化 =====
  /** 峰值历史长度 */
  peaksHistoryLength: number;
  /** 最小参考峰值 */
  minReferencePeak: number;
}

/** 分析器配置（传递给 AnalyserNode） */
export interface AnalyserConfig {
  fftSize: number;
  smoothingTimeConstant: number;
  minDecibels: number;
  maxDecibels: number;
}

/** 前端动画配置 */
export interface AnimationConfig {
  lerpUp: number;
  lerpDown: number;
  minDiff: number;
}

/** 频谱数据提供者接口 */
export interface FrequencyDataProvider {
  getFrequencyData(): Uint8Array | null;
  setAnalyserConfig?(config: AnalyserConfig): void;
}

/** 数据输出回调 */
export type DataOutputCallback = (value: number) => void;

/** 配置输出回调 */
export type ConfigOutputCallback = (config: AnimationConfig) => void;

// ============================================================================
// 默认配置
// ============================================================================

export const DEFAULT_CONFIG: AmbientLightConfig = {
  // 核心灵敏度
  minDecibels: -65,
  maxDecibels: -15,
  minThreshold: 0.1,

  // 视觉效果
  curveExponent: 1.2,
  lerpDown: 0.05,
  lerpUp: 0.95,
  minDiff: 10,

  // 平滑度
  smallChangeThreshold: 0.1,
  smallChangeSmoothing: 0.25,

  // 峰值检测
  rmsWeight: 0.5,
  peakWeight: 0.5,

  // 频谱分析
  fftSize: 32,
  smoothingTimeConstant: 0.2,
  bassEndRatio: 0.15,
  midEndRatio: 0.4,
  bassWeight: 0.7,
  midWeight: 0.3,

  // 归一化
  peaksHistoryLength: 30,
  minReferencePeak: 0.35,
};

/**
 * 氛围灯核心算法
 */
export class AmbientLightCore {
  private config: AmbientLightConfig;
  private recentPeaks: number[] = [];
  private lastValue = 0;

  constructor(config: Partial<AmbientLightConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** 更新配置 */
  updateConfig(config: Partial<AmbientLightConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** 获取当前配置 */
  getConfig(): Readonly<AmbientLightConfig> {
    return this.config;
  }

  /** 获取分析器配置 */
  getAnalyserConfig(): AnalyserConfig {
    return {
      fftSize: this.config.fftSize,
      smoothingTimeConstant: this.config.smoothingTimeConstant,
      minDecibels: this.config.minDecibels,
      maxDecibels: this.config.maxDecibels,
    };
  }

  /** 获取动画配置 */
  getAnimationConfig(): AnimationConfig {
    return {
      lerpUp: this.config.lerpUp,
      lerpDown: this.config.lerpDown,
      minDiff: this.config.minDiff,
    };
  }

  /** 重置状态 */
  reset(): void {
    this.recentPeaks = [];
    this.lastValue = 0;
  }

  /**
   * 处理频谱数据，返回 0-1 的输出值
   * @param frequencyData 频谱数据 (Uint8Array)
   * @returns 处理后的值 (0-1)，null 表示无效数据
   */
  process(frequencyData: Uint8Array | null): number | null {
    if (!frequencyData?.length) return null;

    const { bassEndRatio, midEndRatio, bassWeight, midWeight, rmsWeight, peakWeight, peaksHistoryLength, minReferencePeak } = this.config;

    const bassEnd = Math.floor(frequencyData.length * bassEndRatio);
    const midEnd = Math.floor(frequencyData.length * midEndRatio);

    // 提取频段数据
    const bassData = Array.from(frequencyData.slice(0, bassEnd));
    const midData = Array.from(frequencyData.slice(bassEnd, midEnd));

    // 计算 RMS 和 Peak
    const bassRMS = this.calculateRMS(bassData) / 255;
    const midRMS = this.calculateRMS(midData) / 255;
    const bassPeak = Math.max(0, ...bassData) / 255;
    const midPeak = Math.max(0, ...midData) / 255;

    // 混合算法
    const bassValue = bassRMS * rmsWeight + bassPeak * peakWeight;
    const midValue = midRMS * rmsWeight + midPeak * peakWeight;
    const rawValue = bassValue * bassWeight + midValue * midWeight;

    // 动态归一化
    this.recentPeaks.push(rawValue);
    if (this.recentPeaks.length > peaksHistoryLength) {
      this.recentPeaks.shift();
    }
    const maxPeak = Math.max(...this.recentPeaks, minReferencePeak);
    const normalized = rawValue / maxPeak;

    // 后处理
    return this.postProcess(normalized);
  }

  /** 计算 RMS（均方根） */
  private calculateRMS(data: number[]): number {
    if (data.length === 0) return 0;
    const sumOfSquares = data.reduce((sum, val) => sum + val * val, 0);
    return Math.sqrt(sumOfSquares / data.length);
  }

  /** 后处理：曲线、阈值、平滑 */
  private postProcess(normalized: number): number {
    const { curveExponent, minThreshold, smallChangeThreshold, smallChangeSmoothing } = this.config;

    // 应用曲线
    const amplified = Math.pow(normalized, curveExponent);
    const clamped = Math.min(amplified, 0.95);

    // 应用阈值
    const thresholded = clamped < minThreshold ? 0 : clamped;

    // 平滑小变化
    const changeMagnitude = Math.abs(thresholded - this.lastValue);
    if (changeMagnitude > 0 && changeMagnitude < smallChangeThreshold && thresholded > 0 && this.lastValue > 0) {
      this.lastValue = this.lastValue * (1 - smallChangeSmoothing) + thresholded * smallChangeSmoothing;
    } else {
      this.lastValue = thresholded;
    }

    return this.lastValue;
  }
}

// ============================================================================
// 桥接类（连接数据源和输出）
// ============================================================================

/**
 * 氛围灯桥接器
 * 负责调度：获取数据 → 处理 → 输出
 */
export class AmbientLightBridge {
  private core: AmbientLightCore;
  private dataProvider: FrequencyDataProvider;
  private onData: DataOutputCallback;
  private onConfig?: ConfigOutputCallback;
  private animationId: number | null = null;
  private isRunning = false;

  constructor(options: {
    dataProvider: FrequencyDataProvider;
    onData: DataOutputCallback;
    onConfig?: ConfigOutputCallback;
    config?: Partial<AmbientLightConfig>;
  }) {
    this.core = new AmbientLightCore(options.config);
    this.dataProvider = options.dataProvider;
    this.onData = options.onData;
    this.onConfig = options.onConfig;
  }

  /** 获取核心实例（用于配置调整） */
  getCore(): AmbientLightCore {
    return this.core;
  }

  /** 是否正在运行 */
  get running(): boolean {
    return this.isRunning;
  }

  /** 启动 */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // 重置状态
    this.core.reset();

    // 配置分析器
    this.dataProvider.setAnalyserConfig?.(this.core.getAnalyserConfig());

    // 发送动画配置
    this.onConfig?.(this.core.getAnimationConfig());

    // 启动更新循环
    this.update();
  }

  /** 停止 */
  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /** 同步配置到输出端 */
  syncConfig(): void {
    this.onConfig?.(this.core.getAnimationConfig());
  }

  /** 更新配置 */
  updateConfig(config: Partial<AmbientLightConfig>): void {
    this.core.updateConfig(config);
  }

  /** 更新循环 */
  private update = (): void => {
    if (!this.isRunning) return;

    const data = this.dataProvider.getFrequencyData();
    const value = this.core.process(data);

    if (value !== null) {
      this.onData(value);
    }

    this.animationId = requestAnimationFrame(this.update);
  };
}

// ============================================================================
// 项目适配层（SPlayer 专用）
// ============================================================================

import { useAudioManager } from "./AudioManager";
import { isElectron } from "@/utils/env";

/** SPlayer 适配的数据提供者 */
class SPlayerDataProvider implements FrequencyDataProvider {
  private audioManager = useAudioManager();

  getFrequencyData(): Uint8Array | null {
    return this.audioManager.getVisualizerFrequencyData();
  }

  setAnalyserConfig(config: AnalyserConfig): void {
    this.audioManager.setVisualizerConfig(config);
  }
}

/** SPlayer 适配的桥接器 */
class SPlayerVisualizerBridge {
  private bridge: AmbientLightBridge | null = null;

  start(): void {
    if (!isElectron || this.bridge?.running) return;

    this.bridge = new AmbientLightBridge({
      dataProvider: new SPlayerDataProvider(),
      onData: (value) => {
        window.electron?.ipcRenderer?.send("audio-data", value);
      },
      onConfig: (config) => {
        window.electron?.ipcRenderer?.send("visualizer-config", config);
      },
    });

    this.bridge.start();
  }

  stop(): void {
    this.bridge?.stop();
  }

  syncConfig(): void {
    // 直接同步配置，无需延迟
    // 外观设置和配置通过同一 IPC 通道按顺序发送，由 visualizer-ready 事件触发
    this.bridge?.syncConfig();
  }

  /** 更新配置并同步到前端 */
  updateConfig(config: Partial<AmbientLightConfig>): void {
    this.bridge?.updateConfig(config);
    this.syncConfig();
  }

  getCore(): AmbientLightCore | undefined {
    return this.bridge?.getCore();
  }
}

/** 单例工厂（兼容原有 API） */
export const useVisualizerBridge = (() => {
  let instance: SPlayerVisualizerBridge | null = null;
  return () => (instance ??= new SPlayerVisualizerBridge());
})();

/** 导出配置（兼容原有 API） */
export const VISUALIZER_CONFIG = DEFAULT_CONFIG;
