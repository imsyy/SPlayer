import { app, type BrowserWindow, shell } from "electron";
import { processLog } from "../logger";
import { useStore } from "../store";
import { isLinux, isWin, mainWinUrl } from "../utils/config";
import { loadNativeModule } from "../utils/native-loader";
import { createWindow } from "./index";

type toolModule = typeof import("@native/tools");
const tools: toolModule = loadNativeModule("tools.node", "tools");

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
      const windowState = store.get("window");
      store.set("window", { ...windowState, ...bounds, maximized });
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

    // 拦截页面导航
    this.win.webContents.on("will-navigate", (event, url) => {
      // 检查是否为图片文件（通过扩展名简单判断）
      const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico"];
      const isImage = imageExtensions.some((ext) => url.toLowerCase().split("?")[0].endsWith(ext));

      // 如果是图片，阻止导航并下载
      if (isImage) {
        event.preventDefault();
        this.win?.webContents.downloadURL(url);
      }
    });

    // 窗口显示时
    this.win?.on("show", () => {
      this.win?.webContents.send("lyricsScroll");
    });
    // 窗口获得焦点时
    this.win?.on("focus", () => {
      this.saveBounds();
    });
    // 窗口大小改变时
    this.win?.on("resized", () => {
      // 若处于全屏则不保存
      if (this.win?.isFullScreen()) return;
      this.saveBounds();
    });
    // 窗口位置改变时
    this.win?.on("moved", () => {
      this.saveBounds();
    });
    // 窗口最大化时
    this.win?.on("maximize", () => {
      this.saveBounds();
      this.win?.webContents.send("win-state-change", true);
    });
    // 窗口取消最大化时
    this.win?.on("unmaximize", () => {
      this.saveBounds();
      this.win?.webContents.send("win-state-change", false);
    });
    // Linux 无法使用 resized 和 moved
    if (isLinux) {
      this.win?.on("resize", () => {
        // 若处于全屏则不保存
        if (this.win?.isFullScreen()) return;
        this.saveBounds();
      });
      this.win?.on("move", () => {
        this.saveBounds();
      });
    }
    // 窗口关闭
    this.win?.on("close", (event) => {
      if (this.isQuitting) {
        return;
      }
      event.preventDefault();
      this.win?.hide();
    });
  }
  /**
   * 创建窗口
   * @returns BrowserWindow | null
   */
  create(): BrowserWindow | null {
    const store = useStore();
    const { width, height, useBorderless = true } = store.get("window");
    this.win = createWindow({
      // 菜单栏
      titleBarStyle: useBorderless ? "customButtonsOnHover" : "default",
      frame: !useBorderless,
      width,
      height,
      minHeight: 600,
      minWidth: 800,
      show: false,
    });
    if (!this.win) return null;
    // 加载地址
    this.win.loadURL(this.winURL);
    // 窗口事件
    this.event();

    // 监听 Explorer 重启
    if (isWin && tools && this.win) {
      try {
        const msgId = tools.getTaskbarCreatedMessageId();
        if (msgId > 0) {
          this.win.hookWindowMessage(msgId, () => {
            processLog.info("[MainWindow] 监听到资源管理器重启");
            // 把事件发射到 app 里不太好，但是我觉得也没有必要为了这一个事件创建一个事件总线
            // TODO: 如果有了事件总线，通过那个事件总线发射这个事件
            app.emit("explorer-restarted");
          });
        }
      } catch (e) {
        processLog.error("[MainWindow] 监听资源管理器重启时失败", e);
      }
    }

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
