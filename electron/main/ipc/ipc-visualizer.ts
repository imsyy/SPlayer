import { ipcMain } from "electron";
import visualizerWindow from "../windows/visualizer-window";

const initVisualizerIpc = () => {
  ipcMain.on("toggle-visualizer", (_event, enabled: boolean) => {
    if (enabled) {
      visualizerWindow.create("left");
      visualizerWindow.create("right");
    } else {
      visualizerWindow.closeAll();
    }
  });

  ipcMain.on("audio-data", (_event, data: number) => {
    visualizerWindow.broadcast("audio-data", data);
  });

  ipcMain.on("update-visualizer-theme", (_event, color: string) => {
    visualizerWindow.broadcast("update-theme", color);
  });

  ipcMain.on("update-visualizer-opacity", (_event, opacity: number) => {
    visualizerWindow.broadcast("update-visualizer-opacity", opacity);
  });
};

export default initVisualizerIpc;
