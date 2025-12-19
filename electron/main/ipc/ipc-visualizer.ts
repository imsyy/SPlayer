import { ipcMain } from "electron";
import visualizerWindow from "../windows/visualizer-window";
import mainWindow from "../windows/main-window";

/**
 * 拾音器 IPC 通道名称
 */
const IPC_CHANNELS = {
  // 控制类
  TOGGLE: "toggle-visualizer",
  READY: "visualizer-ready",
  // 数据类
  AUDIO_DATA: "audio-data",
  // 设置类（直接广播到拾音器窗口）
  THEME: "update-visualizer-theme",
  OPACITY: "update-visualizer-opacity",
  WIDTH: "update-visualizer-width",
  SHAPE: "update-visualizer-shape",
  GRADIENT: "update-visualizer-gradient",
} as const;

/**
 * 初始化拾音器相关的 IPC 处理
 */
const initVisualizerIpc = () => {
  // 开关拾音器
  ipcMain.on(IPC_CHANNELS.TOGGLE, (_, enabled: boolean) => {
    if (enabled) {
      visualizerWindow.create("left");
      visualizerWindow.create("right");
    } else {
      visualizerWindow.closeAll();
    }
  });

  // 拾音器窗口准备就绪，通知主窗口同步设置
  ipcMain.on(IPC_CHANNELS.READY, () => {
    const mainWin = mainWindow.getWin();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send("sync-visualizer-settings");
    }
  });

  // 音频数据转发
  ipcMain.on(IPC_CHANNELS.AUDIO_DATA, (_, data: number) => {
    visualizerWindow.broadcast("audio-data", data);
  });

  // 主题颜色
  ipcMain.on(IPC_CHANNELS.THEME, (_, color: string) => {
    visualizerWindow.broadcast("update-theme", color);
  });

  // 透明度
  ipcMain.on(IPC_CHANNELS.OPACITY, (_, opacity: number) => {
    visualizerWindow.broadcast("update-visualizer-opacity", opacity);
  });

  // 宽度（需要同时更新窗口大小）
  ipcMain.on(IPC_CHANNELS.WIDTH, (_, width: number) => {
    visualizerWindow.updateWidth(width);
  });

  // 形状
  ipcMain.on(IPC_CHANNELS.SHAPE, (_, shape: string) => {
    visualizerWindow.broadcast("update-visualizer-shape", shape);
  });

  // 渐变
  ipcMain.on(IPC_CHANNELS.GRADIENT, (_, gradient: boolean) => {
    visualizerWindow.broadcast("update-visualizer-gradient", gradient);
  });
};

export default initVisualizerIpc;
