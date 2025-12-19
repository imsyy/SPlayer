import { BrowserWindow } from "electron";
import { createWindow } from "./index";
import { visualizerWinUrl } from "../utils/config";

/**
 * 拾音器窗口管理类
 * 负责创建、管理左右两侧的拾音器窗口
 */
class VisualizerWindow {
  private leftWin: BrowserWindow | null = null;
  private rightWin: BrowserWindow | null = null;
  private mainWin: BrowserWindow | null = null;
  private currentWidth: number = 40;

  /** 设置主窗口引用 */
  setMainWin(win: BrowserWindow | null) {
    this.mainWin = win;
  }

  /** 获取主窗口 */
  private getMainWin(): BrowserWindow | null {
    if (this.mainWin && !this.mainWin.isDestroyed()) {
      return this.mainWin;
    }
    return null;
  }

  /** 对指定窗口执行操作（如果窗口有效） */
  private withWindow(win: BrowserWindow | null, action: (w: BrowserWindow) => void) {
    if (win && !win.isDestroyed()) {
      action(win);
    }
  }

  /** 对左右窗口都执行操作 */
  private forEachWindow(action: (w: BrowserWindow) => void) {
    this.withWindow(this.leftWin, action);
    this.withWindow(this.rightWin, action);
  }

  /** 创建拾音器窗口 */
  create(side: "left" | "right"): BrowserWindow | null {
    const mainWin = this.getMainWin();
    const mainBounds = mainWin?.getBounds();
    const height = mainBounds?.height || 600;

    const win = createWindow({
      width: this.currentWidth,
      height,
      transparent: true,
      backgroundColor: "#00000000",
      alwaysOnTop: false,
      resizable: false,
      movable: false,
      show: false,
      frame: false,
      skipTaskbar: true,
      hasShadow: false,
    });

    if (!win) return null;

    // 设置初始位置
    if (mainBounds) {
      const x = side === "left" 
        ? mainBounds.x - this.currentWidth 
        : mainBounds.x + mainBounds.width;
      win.setPosition(Math.round(x), mainBounds.y);
    }

    win.loadURL(`${visualizerWinUrl}?side=${side}`);
    win.once("ready-to-show", () => win.showInactive());

    if (side === "left") this.leftWin = win;
    else this.rightWin = win;

    return win;
  }

  /** 关闭所有拾音器窗口 */
  closeAll() {
    this.forEachWindow(w => w.close());
    this.leftWin = null;
    this.rightWin = null;
  }

  /** 设置窗口可见性 */
  setVisibility(visible: boolean) {
    this.forEachWindow(w => visible ? w.showInactive() : w.hide());
  }

  /** 将窗口提升到前台 */
  bringToFront() {
    this.forEachWindow(w => {
      if (w.isVisible()) {
        w.moveTop();
      }
    });
  }

  /** 向所有拾音器窗口广播消息 */
  broadcast(channel: string, data: unknown) {
    this.forEachWindow(w => w.webContents.send(channel, data));
  }

  /** 更新窗口位置和大小 */
  updatePosition() {
    const mainWin = this.getMainWin();
    if (!mainWin) return;

    const bounds = mainWin.getBounds();
    const { currentWidth } = this;

    this.withWindow(this.leftWin, w => {
      w.setBounds({
        x: Math.round(bounds.x - currentWidth),
        y: bounds.y,
        width: currentWidth,
        height: bounds.height,
      });
    });

    this.withWindow(this.rightWin, w => {
      w.setBounds({
        x: Math.round(bounds.x + bounds.width),
        y: bounds.y,
        width: currentWidth,
        height: bounds.height,
      });
    });
  }

  /** 更新拾音器宽度 */
  updateWidth(width: number) {
    this.currentWidth = width;
    this.updatePosition();
  }
}

export default new VisualizerWindow();
