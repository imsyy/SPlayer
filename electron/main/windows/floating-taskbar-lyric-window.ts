import { TASKBAR_IPC_CHANNELS } from "@shared";
import { type BrowserWindow, nativeTheme, screen } from "electron";
import { debounce } from "lodash-es";
import { useStore } from "../store";
import { isDev, port } from "../utils/config";
import { createWindow } from "./index";

const floatingTaskbarLyricUrl =
  isDev && process.env.ELECTRON_RENDERER_URL
    ? `${process.env.ELECTRON_RENDERER_URL}/#/taskbar-lyric?win=taskbar-lyric&mode=floating`
    : `http://localhost:${port}/#/taskbar-lyric?win=taskbar-lyric&mode=floating`;

class FloatingTaskbarLyricWindow {
  private win: BrowserWindow | null = null;
  private themeListener: (() => void) | null = null;
  private contentWidth = 300;
  private shouldBeVisible = false;
  private isFadingOut = false;
  private lastFloatingAlign: "left" | "right" | null = null;
  private lastAlwaysOnTop: boolean | null = null;

  private debouncedSaveBounds = debounce((bounds: Electron.Rectangle) => {
    const store = useStore();
    store.set("taskbar.floatingX", bounds.x);
    store.set("taskbar.floatingY", bounds.y);
    store.set("taskbar.floatingWidth", bounds.width);
    store.set("taskbar.floatingHeight", bounds.height);
  }, 200);

  create(): BrowserWindow | null {
    if (this.win && !this.win.isDestroyed()) {
      this.win.show();
      return this.win;
    }

    const store = useStore();
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workArea;
    const maxHeight = Math.min(100, workArea.height);

    const x = store.get("taskbar.floatingX", Math.round(workArea.x + workArea.width / 2 - 150));
    const y = store.get("taskbar.floatingY", Math.round(workArea.y + workArea.height - 120));
    const height = Math.min(store.get("taskbar.floatingHeight", 48), maxHeight);
    const width = store.get("taskbar.floatingWidth", 300);

    this.win = createWindow({
      width,
      height,
      minWidth: 100,
      minHeight: 48,
      maxWidth: workArea.width,
      maxHeight,
      x,
      y,
      type: "toolbar",
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      hasShadow: false,
      show: false,
      skipTaskbar: true,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      resizable: true,
      movable: true,
      webPreferences: {
        zoomFactor: 1.0,
        partition: "persist:taskbar-lyric",
      },
    });

    if (!this.win) return null;

    this.applyAlwaysOnTop(true);
    this.win.loadURL(floatingTaskbarLyricUrl);

    const sendTheme = () => {
      if (this.win && !this.win.isDestroyed()) {
        const isDark = nativeTheme.shouldUseDarkColors;
        this.win.webContents.send(TASKBAR_IPC_CHANNELS.SYNC_STATE, {
          type: "system-theme",
          data: { isDark },
        });
      }
    };

    if (!this.themeListener) {
      this.themeListener = sendTheme;
      nativeTheme.on("updated", this.themeListener);
    }

    this.win.once("ready-to-show", () => {
      if (!this.win || this.win.isDestroyed()) return;
      this.updateLayout(false);
      if (this.shouldBeVisible) {
        this.win.show();
      }
      sendTheme();
      this.sendFloatingAlign(true);
    });

    this.win.on("move", () => {
      if (!this.win || this.win.isDestroyed()) return;
      const bounds = this.win.getBounds();
      this.debouncedSaveBounds(bounds);
    });

    this.win.on("resize", () => {
      if (!this.win || this.win.isDestroyed()) return;
      const bounds = this.win.getBounds();
      this.debouncedSaveBounds(bounds);
    });

    this.win.on("closed", () => {
      this.destroy();
      this.win = null;
    });

    return this.win;
  }

  private getMaxWidthPercent(screenWidth: number) {
    const store = useStore();
    let maxWidthSetting = store.get("taskbar.maxWidth", 30);
    if (maxWidthSetting > 100) {
      const converted = Math.round((maxWidthSetting / screenWidth) * 100);
      maxWidthSetting = Math.min(Math.max(converted, 10), 100);
      store.set("taskbar.maxWidth", maxWidthSetting);
      return maxWidthSetting;
    }
    return Math.min(Math.max(maxWidthSetting, 10), 100);
  }

  private getWorkAreaForWindow() {
    if (!this.win || this.win.isDestroyed()) {
      return screen.getPrimaryDisplay().workArea;
    }
    const bounds = this.win.getBounds();
    return screen.getDisplayMatching(bounds).workArea;
  }

  private sendFloatingAlign(force: boolean) {
    if (!this.win || this.win.isDestroyed()) return;
    const store = useStore();
    const floatingAlign = store.get("taskbar.floatingAlign", "right");
    if (!force && this.lastFloatingAlign === floatingAlign) return;
    this.lastFloatingAlign = floatingAlign;

    this.win.webContents.send("taskbar:update-layout", {
      isCenter: floatingAlign === "left",
    });
  }

  private applyAlwaysOnTop(force: boolean) {
    if (!this.win || this.win.isDestroyed()) return;
    const store = useStore();
    const floatingAlwaysOnTop = store.get("taskbar.floatingAlwaysOnTop", false);
    if (!force && this.lastAlwaysOnTop === floatingAlwaysOnTop) return;
    this.lastAlwaysOnTop = floatingAlwaysOnTop;
    if (floatingAlwaysOnTop) {
      this.win.setAlwaysOnTop(true, "screen-saver");
    } else {
      this.win.setAlwaysOnTop(false);
    }
  }

  updateLayout(_animate: boolean = false) {
    if (!this.win || this.win.isDestroyed()) return;

    const store = useStore();
    const workArea = this.getWorkAreaForWindow();
    const maxWidthPercent = this.getMaxWidthPercent(workArea.width);
    const maxWidth = Math.round((workArea.width * maxWidthPercent) / 100);
    const floatingAutoWidth = store.get("taskbar.floatingAutoWidth", true);
    const floatingWidth = store.get("taskbar.floatingWidth", 300);
    const floatingHeight = store.get("taskbar.floatingHeight", 48);
    const floatingAlign = store.get("taskbar.floatingAlign", "right");
    const floatingAnchor = floatingAlign === "left" ? "left" : "right";

    const nextWidth = Math.min(
      Math.max(Math.round(floatingAutoWidth ? this.contentWidth : floatingWidth), 100),
      maxWidth,
    );
    const maxHeight = Math.min(100, workArea.height);
    const nextHeight = Math.min(Math.max(Math.round(floatingHeight), 48), maxHeight);

    const bounds = this.win.getBounds();
    let anchorX = bounds.x;
    if (floatingAnchor === "right") {
      anchorX = bounds.x + bounds.width;
    }

    let nextX = bounds.x;
    if (floatingAnchor === "right") {
      nextX = Math.round(anchorX - nextWidth);
    }

    const minX = workArea.x;
    const maxX = workArea.x + workArea.width - nextWidth;
    nextX = Math.min(Math.max(nextX, minX), maxX);

    const minY = workArea.y;
    const maxY = workArea.y + workArea.height - nextHeight;
    const nextY = Math.min(Math.max(bounds.y, minY), maxY);

    const shouldUpdate =
      bounds.x !== nextX ||
      bounds.y !== nextY ||
      bounds.width !== nextWidth ||
      bounds.height !== nextHeight;
    if (shouldUpdate) this.win.setBounds({ x: nextX, y: nextY, width: nextWidth, height: nextHeight });

    this.applyAlwaysOnTop(false);
    this.sendFloatingAlign(false);
  }

  setContentWidth(width: number) {
    const store = useStore();
    const floatingAutoWidth = store.get("taskbar.floatingAutoWidth", true);
    if (!floatingAutoWidth) return;
    if (this.contentWidth !== width) {
      this.contentWidth = width;
      this.updateLayout(false);
    }
  }

  setVisibility(shouldShow: boolean) {
    this.shouldBeVisible = shouldShow;

    if (!this.win || this.win.isDestroyed()) return;

    if (shouldShow) {
      this.isFadingOut = false;
      if (!this.win.isVisible()) {
        this.win.show();
      }
      this.win.webContents.send("taskbar:fade-in");
    } else {
      if (this.win.isVisible() && !this.isFadingOut) {
        this.isFadingOut = true;
        this.win.webContents.send("taskbar:fade-out");
      }
    }
  }

  handleFadeDone() {
    if (this.isFadingOut && this.win && !this.win.isDestroyed()) {
      this.win.hide();
      this.isFadingOut = false;
    }
  }

  close() {
    if (this.win && !this.win.isDestroyed()) {
      this.win.close();
    } else {
      this.win = null;
    }
  }

  destroy() {
    this.debouncedSaveBounds.cancel();
    if (this.themeListener) {
      nativeTheme.removeListener("updated", this.themeListener);
      this.themeListener = null;
    }
  }

  send(channel: string, ...args: unknown[]) {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send(channel, ...args);
    }
  }
}

export default new FloatingTaskbarLyricWindow();
