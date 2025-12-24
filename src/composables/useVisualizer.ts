import { watch, onMounted } from "vue";
import { useStatusStore, useSettingStore } from "@/stores";
import { useVisualizerBridge } from "@/core/player/VisualizerBridge";
import { isElectron } from "@/utils/env";

/**
 * 氛围灯 Composable
 * 管理氛围灯的外观同步、生命周期和 IPC 通信
 */
export function useVisualizer() {
  if (!isElectron) return;

  const statusStore = useStatusStore();
  const settingStore = useSettingStore();
  const visualizerBridge = useVisualizerBridge();

  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
    }
    return "255, 255, 255";
  };

  /** 获取处理后的颜色值 */
  const getColorValue = (): string => {
    if (settingStore.visualizerColor === "theme") {
      return statusStore.mainColor;
    }
    if (settingStore.visualizerColor.startsWith("gradient-")) {
      return settingStore.visualizerColor;
    }
    return hexToRgb(settingStore.visualizerColor);
  };

  /** 同步外观设置 */
  const syncVisualizerAppearance = () => {
    if (!statusStore.showVisualizer) return;

    // 打包所有外观设置
    const appearance = {
      color: getColorValue(),
      opacity: settingStore.visualizerOpacity,
      shape: settingStore.visualizerShape,
      gradient: settingStore.visualizerGradient,
      border: settingStore.visualizerBorder,
      direction: settingStore.visualizerDirection,
    };

    window.electron.ipcRenderer.send("update-visualizer-appearance", appearance);
    window.electron.ipcRenderer.send("update-visualizer-width", settingStore.visualizerWidth);

    // 同步氛围灯配置（来自 VisualizerBridge）
    visualizerBridge.syncConfig();
  };

  watch(
    [
      () => statusStore.mainColor,
      () => settingStore.visualizerColor,
      () => settingStore.visualizerOpacity,
      () => settingStore.visualizerWidth,
      () => settingStore.visualizerShape,
      () => settingStore.visualizerGradient,
      () => settingStore.visualizerBorder,
      () => settingStore.visualizerDirection,
      () => statusStore.showVisualizer,
    ],
    syncVisualizerAppearance,
    { immediate: true },
  );

  watch(
    () => statusStore.showVisualizer,
    (enabled) => {
      window.electron.ipcRenderer.send("toggle-visualizer", enabled);
      enabled ? visualizerBridge.start() : visualizerBridge.stop();
    },
    { immediate: true },
  );

  onMounted(() => {
    window.electron.ipcRenderer.on("sync-visualizer-settings", syncVisualizerAppearance);
  });
}
