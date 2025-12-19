import { ipcMain } from "electron";
import visualizerWindow from "../windows/visualizer-window";
import mainWindow from "../windows/main-window";

const IPC_CHANNELS = {
  TOGGLE: "toggle-visualizer",
  READY: "visualizer-ready",
  SHOW: "visualizer-show",
  AUDIO_DATA: "audio-data",
  THEME: "update-visualizer-theme",
  OPACITY: "update-visualizer-opacity",
  WIDTH: "update-visualizer-width",
  SHAPE: "update-visualizer-shape",
  GRADIENT: "update-visualizer-gradient",
  BORDER: "update-visualizer-border",
  DIRECTION: "update-visualizer-direction",
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

  ipcMain.on(IPC_CHANNELS.THEME, (_, color: string) => {
    visualizerWindow.broadcast("update-theme", color);
  });

  ipcMain.on(IPC_CHANNELS.OPACITY, (_, opacity: number) => {
    visualizerWindow.broadcast("update-visualizer-opacity", opacity);
  });

  ipcMain.on(IPC_CHANNELS.WIDTH, (_, width: number) => {
    visualizerWindow.updateWidth(width);
  });

  ipcMain.on(IPC_CHANNELS.SHAPE, (_, shape: string) => {
    visualizerWindow.broadcast("update-visualizer-shape", shape);
  });

  ipcMain.on(IPC_CHANNELS.GRADIENT, (_, gradient: boolean) => {
    visualizerWindow.broadcast("update-visualizer-gradient", gradient);
  });

  ipcMain.on(IPC_CHANNELS.BORDER, (_, border: boolean) => {
    visualizerWindow.broadcast("update-visualizer-border", border);
  });

  ipcMain.on(IPC_CHANNELS.DIRECTION, (_, direction: string) => {
    visualizerWindow.broadcast("update-visualizer-direction", direction);
  });
};

export default initVisualizerIpc;
