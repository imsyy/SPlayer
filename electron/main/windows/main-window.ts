import { BrowserWindow, shell, app } from "electron";
import { createWindow } from "./index";
import { mainWinUrl, isLinux } from "../utils/config";
import { useStore } from "../store";
import visualizerWindow from "./visualizer-window";

class MainWindow {
  private win: BrowserWindow | null = null;
  private winURL: string;
  private isQuitting: boolean = false;
  constructor() {
    this.winURL = mainWinUrl;

    app.on("before-quit", () => {
      this.isQuitting = true;
    });
  }
  /**
   * 保存窗口大小和状态
   */
  private saveBounds() {
    if (this.win?.isFullScreen()) return;
    const store = useStore();
    const bounds = this.win?.getBounds();
    if (bounds) {
      const maximized = this.win?.isMaximized();
      store.set("window", { ...bounds, maximized });
    }
  }
  /**
   * 主窗口事件
   * @returns void
   */
  private event(): void {
    if (!this.win) return;
    const store = useStore();
    // 配置网络代理
    if (store.get("proxy")) {
      this.win.webContents.session.setProxy({ proxyRules: store.get("proxy") });
    }

    // 窗口打开处理程序
    this.win.webContents.setWindowOpenHandler((details) => {
      const { url } = details;
      if (url.startsWith("https://") || url.startsWith("http://")) {
        shell.openExternal(url);
      }
      return { action: "deny" };
    });
    // 窗口显示时
    this.win?.on("show", () => {
      this.win?.webContents.send("lyricsScroll");
      visualizerWindow.setVisibility(true);
    });
    // 窗口获得焦点时
    this.win?.on("focus", () => {
      this.saveBounds();
      visualizerWindow.bringToFront();
    });
    // 窗口最小化
    this.win?.on("minimize", () => {
      visualizerWindow.setVisibility(false);
    });
    // 窗口从最小化恢复
    this.win?.on("restore", () => {
      visualizerWindow.setVisibility(true);
    });
    // 窗口大小改变时（拖动结束后触发）
    this.win?.on("resized", () => {
      // 若处于全屏则不保存
      if (this.win?.isFullScreen()) return;
      this.saveBounds();
      visualizerWindow.updatePosition();
    });
    // 窗口位置改变时（拖动结束后触发）
    this.win?.on("moved", () => {
      this.saveBounds();
      visualizerWindow.updatePosition();
    });
    // 实时监听窗口大小和位置变化（拖动过程中持续触发）
    // Linux 无法使用 resized 和 moved，需要在这里保存窗口状态
    this.win?.on("resize", () => {
      if (this.win?.isFullScreen()) return;
      if (isLinux) this.saveBounds();
      visualizerWindow.updatePosition();
      visualizerWindow.bringToFront();
    });
    this.win?.on("move", () => {
      if (isLinux) this.saveBounds();
      visualizerWindow.updatePosition();
      visualizerWindow.bringToFront();
    });
    // 窗口最大化时
    this.win?.on("maximize", () => {
      this.saveBounds();
      this.win?.webContents.send("win-state-change", true);
      visualizerWindow.updatePosition();
    });
    // 窗口取消最大化时
    this.win?.on("unmaximize", () => {
      this.saveBounds();
      this.win?.webContents.send("win-state-change", false);
      visualizerWindow.updatePosition();
    });
    // 窗口关闭
    this.win?.on("close", (event) => {
      if (this.isQuitting) {
        visualizerWindow.destroyAll();
        return;
      }
      event.preventDefault();
      this.win?.hide();
      visualizerWindow.setVisibility(false);
    });
  }
  /**
   * 创建窗口
   * @returns BrowserWindow | null
   */
  create(): BrowserWindow | null {
    const store = useStore();
    const { width, height } = store.get("window");
    this.win = createWindow({
      // 菜单栏
      titleBarStyle: "customButtonsOnHover",
      width,
      height,
      minHeight: 600,
      minWidth: 800,
      show: false,
    });
    if (!this.win) return null;
    // 设置主窗口引用给拾音器
    visualizerWindow.setMainWin(this.win);
    // 加载地址
    this.win.loadURL(this.winURL);
    // 窗口事件
    this.event();
    return this.win;
  }
  /**
   * 获取窗口
   * @returns BrowserWindow | null
   */
  getWin(): BrowserWindow | null {
    if (this.win && !this.win.isDestroyed()) {
      return this.win;
    }
    return null;
  }
  /**
   * 显示主窗口
   */
  showWindow() {
    if (this.win) {
      this.win.show();
      if (this.win.isMinimized()) this.win.restore();
      this.win.focus();
    }
  }
}
export default new MainWindow();
