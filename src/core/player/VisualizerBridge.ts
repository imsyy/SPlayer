import { useAudioManager } from "./AudioManager";
import { isElectron } from "@/utils/env";

/**
 * 拾音器配置
 * 
 * 🎯 参数说明：
 * - MIN_DECIBELS: 过滤弱音，越大过滤越多（-80 敏感，-60 迟钝）
 * - MIN_THRESHOLD: 最小显示阈值，低于此值归零（0.15 敏感，0.3 迟钝）
 * - CURVE_EXPONENT: 强弱对比度（1.0 平缓，2.0 极端）
 * - SMALL_CHANGE_THRESHOLD: 小变化平滑阈值（0.05 灵敏，0.2 平稳）
 * - LERP_DOWN: 下降速度（0.05 缓慢，0.5 快速）
 * - MIN_DIFF: 最小变化差值，发送到前端的最小变化量（5 灵敏，30 节能）
 */
const VISUALIZER_CONFIG = {
  // ===== 核心灵敏度配置 =====
  /** 最小分贝 (-100到0) - 控制灵敏度，越大过滤越多弱音 */
  MIN_DECIBELS: -65,
  /** 最小阈值 (0.0-1.0) - 低于此值归零，过滤小幅度跳动 */
  MIN_THRESHOLD: 0.1,
  
  // ===== 视觉效果配置 =====
  /** 曲线指数 (1.0-3.0) - 强弱对比度，越大对比越明显 */
  CURVE_EXPONENT: 1.2,
  /** 下降速度 (0.0-1.0) - 柱子下降速度，越大越快 */
  LERP_DOWN: 0.05,
  
  // ===== 平滑度配置 =====
  /** 小变化平滑阈值 (0.0-1.0) - 小于此值的变化会被平滑 */
  SMALL_CHANGE_THRESHOLD: 0.1,
  /** 最小变化差值 (0-100) - 发送到前端的最小变化量，越大越节省性能 */
  MIN_DIFF: 10,
  
  // ===== 内部固定参数（通常不需要调整） =====
  FFT_SIZE: 32,
  SMOOTHING_TIME_CONSTANT: 0.0,
  MAX_DECIBELS: -15,
  BASS_END_RATIO: 0.15,
  MID_END_RATIO: 0.4,
  BASS_WEIGHT: 0.7,
  MID_WEIGHT: 0.3,
  PEAKS_HISTORY_LENGTH: 30,
  MIN_REFERENCE_PEAK: 0.35,
  SMALL_CHANGE_SMOOTHING: 0.25,
  LERP_UP: 0.95,
};

/**
 * 拾音器桥接类
 * 负责从 AudioManager 获取频谱数据并发送到拾音器窗口
 */
class VisualizerBridge {
  private animationId: number | null = null;
  private audioManager = useAudioManager();
  private recentPeaks: number[] = [];
  private lastSentValue = 0;

  /** 开始音频分析 */
  start() {
    if (this.animationId || !isElectron) return;
    this.recentPeaks = [];
    this.lastSentValue = 0;
    
    // 应用配置到 AudioManager
    this.audioManager.setVisualizerConfig({
      fftSize: VISUALIZER_CONFIG.FFT_SIZE,
      smoothingTimeConstant: VISUALIZER_CONFIG.SMOOTHING_TIME_CONSTANT,
      minDecibels: VISUALIZER_CONFIG.MIN_DECIBELS,
      maxDecibels: VISUALIZER_CONFIG.MAX_DECIBELS,
    });
    
    // 发送前端动画配置
    this.sendFrontendConfig();
    this.update();
  }

  /** 发送前端配置 */
  private sendFrontendConfig() {
    window.electron?.ipcRenderer?.send("visualizer-config", {
      lerpUp: VISUALIZER_CONFIG.LERP_UP,
      lerpDown: VISUALIZER_CONFIG.LERP_DOWN,
      minDiff: VISUALIZER_CONFIG.MIN_DIFF,
    });
  }

  /** 同步配置（供外部调用） */
  syncConfig() {
    // 延迟发送，确保拾音器窗口已经准备好
    setTimeout(() => this.sendFrontendConfig(), 100);
  }

  /** 停止音频分析 */
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /** 更新循环 */
  private update = () => {
    const peak = this.calculatePeak();
    if (peak !== null) {
      window.electron?.ipcRenderer?.send("audio-data", peak);
    }
    this.animationId = requestAnimationFrame(this.update);
  };

  /** 计算音频峰值 */
  private calculatePeak(): number | null {
    const dataArray = this.audioManager.getVisualizerFrequencyData();
    if (!dataArray?.length) return null;

    const { BASS_END_RATIO, MID_END_RATIO, BASS_WEIGHT, MID_WEIGHT, PEAKS_HISTORY_LENGTH, MIN_REFERENCE_PEAK } = VISUALIZER_CONFIG;
    const bassEnd = Math.floor(dataArray.length * BASS_END_RATIO);
    const midEnd = Math.floor(dataArray.length * MID_END_RATIO);

    // 计算低频和中频峰值
    const bassPeak = Math.max(...Array.from(dataArray.slice(0, bassEnd)));
    const midPeak = Math.max(...Array.from(dataArray.slice(bassEnd, midEnd)));
    const rawValue = (bassPeak * BASS_WEIGHT + midPeak * MID_WEIGHT) / 255;

    // 更新峰值历史并归一化
    this.recentPeaks.push(rawValue);
    if (this.recentPeaks.length > PEAKS_HISTORY_LENGTH) this.recentPeaks.shift();
    const normalized = rawValue / Math.max(...this.recentPeaks, MIN_REFERENCE_PEAK);

    // 应用曲线和阈值
    return this.applyProcessing(normalized);
  }

  /** 应用曲线和阈值处理 */
  private applyProcessing(normalized: number): number {
    const { CURVE_EXPONENT, MIN_THRESHOLD, SMALL_CHANGE_THRESHOLD, SMALL_CHANGE_SMOOTHING } = VISUALIZER_CONFIG;
    const amplified = Math.pow(normalized, CURVE_EXPONENT);
    const clamped = Math.min(amplified, 0.95);
    const thresholded = clamped < MIN_THRESHOLD ? 0 : clamped;
    
    const changeMagnitude = Math.abs(thresholded - this.lastSentValue);
    
    // 小变化平滑处理，大变化或归零时直接使用新值
    if (changeMagnitude > 0 && changeMagnitude < SMALL_CHANGE_THRESHOLD && thresholded > 0 && this.lastSentValue > 0) {
      this.lastSentValue = this.lastSentValue * (1 - SMALL_CHANGE_SMOOTHING) + thresholded * SMALL_CHANGE_SMOOTHING;
    } else {
      this.lastSentValue = thresholded;
    }
    
    return this.lastSentValue;
  }
}

/** 单例工厂 */
export const useVisualizerBridge = (() => {
  let instance: VisualizerBridge | null = null;
  return () => (instance ??= new VisualizerBridge());
})();

/** 导出配置供外部查看 */
export { VISUALIZER_CONFIG };
