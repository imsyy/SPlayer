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
  private leftReady: boolean = false;
  private rightReady: boolean = false;

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
    const targetWin = side === "left" ? this.leftWin : this.rightWin;
    
    if (targetWin && !targetWin.isDestroyed()) {
      targetWin.destroy();
    }

    const mainWin = this.getMainWin();
    const height = mainWin?.getBounds().height || 600;

    const win = createWindow({
      width: this.currentWidth,
      height,
      transparent: true,
      frame: false,
      skipTaskbar: true,
      hasShadow: false,
      show: true,
      x: -10000,
      y: -10000,
    });

    if (!win) return null;

    win.loadURL(`${visualizerWinUrl}?side=${side}`);
    win.setIgnoreMouseEvents(true);
    
    if (side === "left") {
      this.leftWin = win;
      this.leftReady = false;
    } else {
      this.rightWin = win;
      this.rightReady = false;
    }

    return win;
  }

  /** 关闭所有拾音器窗口 */
  closeAll() {
    this.forEachWindow(w => w.close());
    this.leftWin = null;
    this.rightWin = null;
    this.leftReady = false;
    this.rightReady = false;
  }

  /** 设置窗口可见性 */
  setVisibility(visible: boolean) {
    if (visible) {
      if (this.leftReady || this.rightReady) this.updatePosition();
    } else {
      this.forEachWindow(w => w.setPosition(-10000, -10000));
    }
  }

  /** 显示指定侧的窗口 */
  showWindow(side: "left" | "right") {
    if (side === "left") this.leftReady = true;
    else this.rightReady = true;

    const mainWin = this.getMainWin();
    if (mainWin && mainWin.isVisible()) {
      this.updatePosition();
    }
  }

  /** 将窗口提升到前台 */
  bringToFront() {
    this.forEachWindow(w => w.moveTop());
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
    const windowBounds = {
      y: bounds.y,
      width: this.currentWidth,
      height: bounds.height,
    };

    this.withWindow(this.leftWin, w => {
      this.updateWindowBounds(w, { ...windowBounds, x: Math.round(bounds.x - this.currentWidth) });
    });

    this.withWindow(this.rightWin, w => {
      this.updateWindowBounds(w, { ...windowBounds, x: Math.round(bounds.x + bounds.width) });
    });
  }

  /** 更新单个窗口的位置和大小并强制重绘 */
  private updateWindowBounds(win: BrowserWindow, bounds: { x: number; y: number; width: number; height: number }) {
    win.setBounds(bounds);
    win.showInactive();
    const [width, height] = win.getSize();
    win.setSize(width + 1, height);
    win.setSize(width, height);
  }

  /** 更新拾音器宽度 */
  updateWidth(width: number) {
    this.currentWidth = width;
    this.updatePosition();
  }
}

export default new VisualizerWindow();
