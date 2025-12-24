import { ipcMain } from "electron";
import visualizerWindow from "../windows/visualizer-window";
import mainWindow from "../windows/main-window";

/** 氛围灯外观设置 */
interface VisualizerAppearance {
  color?: string;
  opacity?: number;
  shape?: string;
  gradient?: boolean;
  border?: boolean;
  direction?: string;
}

const IPC_CHANNELS = {
  TOGGLE: "toggle-visualizer",
  READY: "visualizer-ready",
  SHOW: "visualizer-show",
  AUDIO_DATA: "audio-data",
  CONFIG: "visualizer-config",
  APPEARANCE: "update-visualizer-appearance",
  WIDTH: "update-visualizer-width",
} as const;

const initVisualizerIpc = () => {
  ipcMain.on(IPC_CHANNELS.TOGGLE, (_, enabled: boolean) => {
    if (enabled) {
      visualizerWindow.create("left");
      visualizerWindow.create("right");
    } else {
      visualizerWindow.closeAll();
    }
  });

  ipcMain.on(IPC_CHANNELS.READY, () => {
    const mainWin = mainWindow.getWin();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send("sync-visualizer-settings");
    }
  });

  ipcMain.on(IPC_CHANNELS.SHOW, (_, side: "left" | "right") => {
    visualizerWindow.showWindow(side);
  });

  ipcMain.on(IPC_CHANNELS.AUDIO_DATA, (_, data: number) => {
    visualizerWindow.broadcast("audio-data", data);
  });

  ipcMain.on(IPC_CHANNELS.CONFIG, (_, config: { lerpUp: number; lerpDown: number }) => {
    visualizerWindow.broadcast("visualizer-config", config);
  });

  // 统一的外观设置通道
  ipcMain.on(IPC_CHANNELS.APPEARANCE, (_, appearance: VisualizerAppearance) => {
    visualizerWindow.broadcast("update-visualizer-appearance", appearance);
  });

  // 宽度单独处理（需要更新窗口尺寸）
  ipcMain.on(IPC_CHANNELS.WIDTH, (_, width: number) => {
    visualizerWindow.updateWidth(width);
  });
};

export default initVisualizerIpc;
