import { BrowserWindow } from "electron";
import { createWindow } from "./index";
import { visualizerWinUrl } from "../utils/config";

class VisualizerWindow {
  private leftWin: BrowserWindow | null = null;
  private rightWin: BrowserWindow | null = null;

  constructor() {}

  private getMainWin(): BrowserWindow | null {
    const allWins = BrowserWindow.getAllWindows();
    return allWins.find(w => {
      try {
        const url = w.webContents.getURL();
        return url && !url.includes("audio-visualizer") && !url.includes("desktop-lyric") && !url.includes("loading");
      } catch (e) { return false; }
    }) || null;
  }

  create(side: "left" | "right"): BrowserWindow | null {
    const win = createWindow({
      width: 40,
      height: 400,
      transparent: true,
      backgroundColor: "#00000000",
      alwaysOnTop: true,
      resizable: false,
      movable: false,
      show: false,
      frame: false,
      skipTaskbar: true,
      hasShadow: false,
    });

    if (!win) return null;

    const mainWin = this.getMainWin();
    if (mainWin) {
      const bounds = mainWin.getBounds();
      const x = Math.round(side === "left" ? bounds.x - 50 : bounds.x + bounds.width + 10);
      const y = Math.round(bounds.y + (bounds.height - 400) / 2);
      win.setPosition(x, y);
    }

    win.loadURL(`${visualizerWinUrl}?side=${side}`);

    win.once("ready-to-show", () => {
      win.showInactive();
    });

    if (side === "left") this.leftWin = win;
    else this.rightWin = win;

    return win;
  }

  closeAll() {
    if (this.leftWin && !this.leftWin.isDestroyed()) this.leftWin.close();
    if (this.rightWin && !this.rightWin.isDestroyed()) this.rightWin.close();
    this.leftWin = null;
    this.rightWin = null;
  }

  setVisibility(visible: boolean) {
    if (this.leftWin && !this.leftWin.isDestroyed()) {
      if (visible) this.leftWin.showInactive();
      else this.leftWin.hide();
    }
    if (this.rightWin && !this.rightWin.isDestroyed()) {
      if (visible) this.rightWin.showInactive();
      else this.rightWin.hide();
    }
  }

  broadcast(channel: string, data: any) {
    if (this.leftWin && !this.leftWin.isDestroyed()) this.leftWin.webContents.send(channel, data);
    if (this.rightWin && !this.rightWin.isDestroyed()) this.rightWin.webContents.send(channel, data);
  }

  updatePosition() {
    const mainWin = this.getMainWin();
    if (!mainWin || mainWin.isDestroyed()) return;
    const bounds = mainWin.getBounds();
    if (this.leftWin && !this.leftWin.isDestroyed()) {
      this.leftWin.setPosition(Math.round(bounds.x - 50), Math.round(bounds.y + (bounds.height - 400) / 2));
    }
    if (this.rightWin && !this.rightWin.isDestroyed()) {
      this.rightWin.setPosition(Math.round(bounds.x + bounds.width + 10), Math.round(bounds.y + (bounds.height - 400) / 2));
    }
  }
}

export default new VisualizerWindow();
