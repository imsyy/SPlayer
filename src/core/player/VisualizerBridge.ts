import { useAudioManager } from "./AudioManager";
import { isElectron } from "@/utils/env";

class VisualizerBridge {
  private animationId: number | null = null;
  private audioManager = useAudioManager();
  // 自适应增益控制
  private recentPeaks: number[] = [];
  private maxPeaksHistory = 30; // 约0.5秒的历史

  start() {
    if (this.animationId || !isElectron) return;
    this.recentPeaks = [];

    const update = () => {
      const dataArray = this.audioManager.getFrequencyData();
      if (dataArray && dataArray.length > 0) {
        // 取低频到中频段（对节奏更敏感）
        const bassEnd = Math.floor(dataArray.length * 0.15);
        const midEnd = Math.floor(dataArray.length * 0.4);

        // 计算低频峰值（权重更高）
        let bassPeak = 0;
        for (let i = 0; i < bassEnd; i++) {
          bassPeak = Math.max(bassPeak, dataArray[i]);
        }

        // 计算中频峰值
        let midPeak = 0;
        for (let i = bassEnd; i < midEnd; i++) {
          midPeak = Math.max(midPeak, dataArray[i]);
        }

        // 原始混合值
        const rawValue = (bassPeak * 0.7 + midPeak * 0.3) / 255;

        // 自适应增益控制：跟踪最近峰值
        this.recentPeaks.push(rawValue);
        if (this.recentPeaks.length > this.maxPeaksHistory) {
          this.recentPeaks.shift();
        }

        // 计算最近的最大峰值作为参考
        const recentMax = Math.max(...this.recentPeaks, 0.3); // 最小参考值0.3
        
        // 相对于最近峰值的归一化，保持动态范围
        const normalized = rawValue / recentMax;
        
        // 应用曲线增强对比度，然后限制范围
        const peak = Math.min(Math.pow(normalized, 0.85) * 0.9, 0.92);
        
        // @ts-ignore
        window.electron.ipcRenderer.send("audio-data", peak);
      }
      this.animationId = requestAnimationFrame(update);
    };
    update();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

export const useVisualizerBridge = (() => {
  let instance: VisualizerBridge | null = null;
  return () => {
    if (!instance) instance = new VisualizerBridge();
    return instance;
  };
})();
