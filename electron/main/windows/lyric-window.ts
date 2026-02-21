import { BrowserWindow } from "electron";
import { createWindow } from "./index";
import { useStore } from "../store";
import { appName, lyricWinUrl } from "../utils/config";
import mainWindow from "./main-window";

class LyricWindow {
  private win: BrowserWindow | null = null;
  constructor() {}
  /**
   * 主窗口事件
   * @returns void
   */
  private event(): void {
    if (!this.win) return;
    // 准备好显示
    this.win.on("ready-to-show", () => {
      this.win?.showInactive();
    });
    // 页面加载完成后设置标题
    // 这里的标题设置是为了 Linux 能够为桌面歌词单独设置窗口规则
    this.win.webContents.on("did-finish-load", () => {
      this.win?.setTitle(`${appName} - 桌面歌词`);
      // 强制重置缩放为 1.0，防止跟随主窗口缩放
      this.win?.webContents.setZoomFactor(1.0);
    });
    // 歌词窗口缩放
    this.win?.on("resized", () => {
      const store = useStore();
      const bounds = this.win?.getBounds();
      if (bounds) {
        const { width, height } = bounds;
        store.set("lyric", { ...store.get("lyric"), width, height });
      }
    });
    // 歌词窗口关闭
    this.win?.on("close", () => {
      this.win = null;
      const mainWin = mainWindow?.getWin();
      if (mainWin) {
        mainWin?.webContents.send("desktop-lyric:close");
      }
    });
  }
  /**
   * 创建主窗口
   * @returns BrowserWindow | null
   */
  create(): BrowserWindow | null {
    const store = useStore();
    const { width, height, x, y } = store.get("lyric");
    this.win = createWindow({
      width: width || 800,
      height: height || 180,
      minWidth: 640,
      minHeight: 140,
      maxWidth: 1400,
      maxHeight: 360,
      // 没有指定位置时居中显示
      center: !(x && y),
      // 窗口位置
      x,
      y,
      transparent: true,
      hasShadow: false,
      backgroundColor: "rgba(0, 0, 0, 0)",
      alwaysOnTop: true,
      resizable: true,
      movable: true,
      show: false,
      // 不在任务栏显示
      skipTaskbar: true,
      // 窗口不能最小化
      minimizable: false,
      // 窗口不能最大化
      maximizable: false,
      // 窗口不能进入全屏状态
      fullscreenable: false,
      webPreferences: {
        zoomFactor: 1.0,
        partition: "persist:desktop-lyric",
      },
    });
    if (!this.win) return null;
    // 加载地址
    const url = new URL(lyricWinUrl);
    url.searchParams.set("win", "desktop-lyric");
    this.win.loadURL(url.toString());
    // 窗口事件
    this.event();
    return this.win;
  }
  /**
   * 获取窗口
   * @returns BrowserWindow | null
   */
  getWin(): BrowserWindow | null {
    if (this.win && !this.win?.isDestroyed()) return this.win;
    return null;
  }
}

export default new LyricWindow();
