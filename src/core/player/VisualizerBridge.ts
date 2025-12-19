import { useAudioManager } from "./AudioManager";
import { isElectron } from "@/utils/env";

/**
 * 音频分析配置
 */
const AUDIO_CONFIG = {
  /** 低频段结束位置（相对于 FFT 数据长度） */
  BASS_END_RATIO: 0.15,
  /** 中频段结束位置 */
  MID_END_RATIO: 0.4,
  /** 低频权重 */
  BASS_WEIGHT: 0.7,
  /** 中频权重 */
  MID_WEIGHT: 0.3,
  /** 峰值历史记录长度（约 0.5 秒） */
  PEAKS_HISTORY_LENGTH: 30,
  /** 最小参考峰值 */
  MIN_REFERENCE_PEAK: 0.35,
  /** 曲线指数（用于增强对比度，越大越陡峭） */
  CURVE_EXPONENT: 1.2,
  /** 放大系数 */
  AMPLIFICATION: 0.85,
  /** 最小阈值（过滤小幅度跳动） */
  MIN_THRESHOLD: 0.12,
};

/**
 * 拾音器桥接类
 * 负责从 AudioManager 获取频谱数据并发送到拾音器窗口
 */
class VisualizerBridge {
  private animationId: number | null = null;
  private audioManager = useAudioManager();
  private recentPeaks: number[] = [];

  /** 开始音频分析 */
  start() {
    if (this.animationId || !isElectron) return;
    this.recentPeaks = [];
    this.update();
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
      this.sendAudioData(peak);
    }
    this.animationId = requestAnimationFrame(this.update);
  };

  /** 计算音频峰值 */
  private calculatePeak(): number | null {
    const dataArray = this.audioManager.getFrequencyData();
    if (!dataArray || dataArray.length === 0) return null;

    const { BASS_END_RATIO, MID_END_RATIO, BASS_WEIGHT, MID_WEIGHT } = AUDIO_CONFIG;
    const bassEnd = Math.floor(dataArray.length * BASS_END_RATIO);
    const midEnd = Math.floor(dataArray.length * MID_END_RATIO);

    // 计算低频和中频峰值
    const bassPeak = this.getMaxInRange(dataArray, 0, bassEnd);
    const midPeak = this.getMaxInRange(dataArray, bassEnd, midEnd);

    // 混合并归一化
    const rawValue = (bassPeak * BASS_WEIGHT + midPeak * MID_WEIGHT) / 255;

    // 自适应增益控制
    this.updatePeaksHistory(rawValue);
    const normalized = this.normalizeWithAdaptiveGain(rawValue);

    // 应用曲线和阈值
    return this.applyProcessing(normalized);
  }

  /** 获取数组指定范围内的最大值 */
  private getMaxInRange(array: Uint8Array, start: number, end: number): number {
    let max = 0;
    for (let i = start; i < end; i++) {
      if (array[i] > max) max = array[i];
    }
    return max;
  }

  /** 更新峰值历史记录 */
  private updatePeaksHistory(value: number) {
    this.recentPeaks.push(value);
    if (this.recentPeaks.length > AUDIO_CONFIG.PEAKS_HISTORY_LENGTH) {
      this.recentPeaks.shift();
    }
  }

  /** 使用自适应增益进行归一化 */
  private normalizeWithAdaptiveGain(rawValue: number): number {
    const recentMax = Math.max(...this.recentPeaks, AUDIO_CONFIG.MIN_REFERENCE_PEAK);
    return rawValue / recentMax;
  }

  /** 应用曲线和阈值处理 */
  private applyProcessing(normalized: number): number {
    const { CURVE_EXPONENT, AMPLIFICATION, MIN_THRESHOLD } = AUDIO_CONFIG;
    const amplified = Math.pow(normalized, CURVE_EXPONENT) * AMPLIFICATION;
    const clamped = Math.min(amplified, 0.95);
    return clamped < MIN_THRESHOLD ? 0 : clamped;
  }

  /** 发送音频数据到拾音器窗口 */
  private sendAudioData(peak: number) {
    // @ts-ignore
    window.electron?.ipcRenderer?.send("audio-data", peak);
  }
}

/** 单例工厂 */
export const useVisualizerBridge = (() => {
  let instance: VisualizerBridge | null = null;
  return () => {
    if (!instance) instance = new VisualizerBridge();
    return instance;
  };
})();
