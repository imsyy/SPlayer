import type {
  RegistryWatcher,
  TaskbarLayout,
  TaskbarService,
  TrayWatcher,
  UiaWatcher,
} from "@native/taskbar-lyric";
import { TASKBAR_IPC_CHANNELS } from "@shared";
import { app, type BrowserWindow, ipcMain, nativeTheme, screen } from "electron";
import { debounce } from "lodash-es";
import { join } from "node:path";
import { processLog } from "../logger";
import { useStore } from "../store";
import { isDev, port } from "../utils/config";
import { loadNativeModule } from "../utils/native-loader";
import { createWindow } from "./index";

type taskbarLyricModule = typeof import("@native/taskbar-lyric");

const taskbarLyricNative: taskbarLyricModule = loadNativeModule(
  "taskbar-lyric.node",
  "taskbar-lyric",
);

if (taskbarLyricNative) {
  try {
    const logDir = join(app.getPath("userData"), "logs", "taskbar-lyric");
    taskbarLyricNative.initLogger(logDir);
    // processLog.info(`[TaskbarLyric] 日志初始化于 ${logDir}`);
  } catch (e) {
    processLog.error("[TaskbarLyric] 初始化日志失败", e);
  }
}

const taskbarLyricUrl =
  isDev && process.env.ELECTRON_RENDERER_URL
    ? `${process.env.ELECTRON_RENDERER_URL}/#/taskbar-lyric?win=taskbar-lyric`
    : `http://localhost:${port}/#/taskbar-lyric?win=taskbar-lyric`;

class TaskbarLyricWindow {
  private win: BrowserWindow | null = null;
  private registryWatcher: RegistryWatcher | null = null;
  private uiaWatcher: UiaWatcher | null = null;
  private trayWatcher: TrayWatcher | null = null;
  private currentWidth = 300;
  private themeListener: (() => void) | null = null;
  private animationTimer: NodeJS.Timeout | null = null;
  private service: TaskbarService | null = null;
  private useAnimation = false;
  private isNativeDisposed = false;
  private contentWidth = 300;
  private maxWidthPercent = 30;
  private isFadingOut = false;
  private shouldBeVisible = false;

  private debouncedUpdateLayout = debounce(() => {
    this.updateLayout(true);
  }, 150);

  private debouncedRegistryUpdate = debounce(() => {
    this.updateLayout(false);
    this.win?.webContents.send("taskbar:fade-in");
  }, 500);

  create(): BrowserWindow | null {
    if (this.win && !this.win.isDestroyed()) {
      this.win.show();
      return this.win;
    }

    this.isNativeDisposed = false;

    if (taskbarLyricNative?.TaskbarService) {
      try {
        this.service = new taskbarLyricNative.TaskbarService(
          (err: Error | null, layout: TaskbarLayout) => {
            if (err) {
              processLog.error("[TaskbarLyric] Rust Worker 回调错误", err);
              return;
            }
            this.applyLayout(layout);
          },
        );
      } catch (e) {
        processLog.error("[TaskbarLyric] 初始化 TaskbarService 失败", e);
      }
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const maxWindowWidth = primaryDisplay.workAreaSize.width;
    this.win = createWindow({
      width: this.currentWidth,
      height: 48,
      minWidth: 100,
      minHeight: 30,
      maxWidth: maxWindowWidth,
      maxHeight: 100,
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
      resizable: false,
      webPreferences: {
        zoomFactor: 1.0,
        partition: "persist:taskbar-lyric",
      },
    });

    if (!this.win) return null;

    this.win.loadURL(taskbarLyricUrl);

    // 因为任务栏窗口非常小，默认嵌入的开发者工具完全无法使用，
    // 所以监听 F12 并按分离模式打开开发者工具
    this.win.webContents.on("before-input-event", (event, input) => {
      if (input.key === "F12" && input.type === "keyDown") {
        if (this.win?.webContents.isDevToolsOpened()) {
          this.win?.webContents.closeDevTools();
        } else {
          this.win?.webContents.openDevTools({ mode: "detach" });
        }
        event.preventDefault();
      }
    });

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

    sendTheme();

    ipcMain.removeAllListeners("taskbar:set-width");
    ipcMain.on("taskbar:set-width", (_, width: number) => {
      if (this.contentWidth !== width) {
        this.contentWidth = width;
        this.debouncedUpdateLayout();
      }
    });

    this.win.once("ready-to-show", () => {
      if (this.win) {
        this.embed();
        if (this.shouldBeVisible) {
          this.win.show();
        }
        this.updateLayout(false);
        sendTheme();
      }
    });

    if (taskbarLyricNative) {
      if (!this.registryWatcher && taskbarLyricNative.RegistryWatcher) {
        try {
          this.registryWatcher = new taskbarLyricNative.RegistryWatcher(() => {
            this.win?.webContents.send("taskbar:fade-out");
            this.debouncedRegistryUpdate();
          });
        } catch (e) {
          processLog.error("[TaskbarLyric] 启动 RegistryWatcher 失败", e);
        }
      }

      if (!this.uiaWatcher && taskbarLyricNative.UiaWatcher) {
        try {
          this.uiaWatcher = new taskbarLyricNative.UiaWatcher(() => {
            this.debouncedUpdateLayout();
          });
        } catch (e) {
          processLog.error("[TaskbarLyric] 启动 UiaWatcher 失败", e);
        }
      }

      if (!this.trayWatcher && taskbarLyricNative.TrayWatcher) {
        try {
          this.trayWatcher = new taskbarLyricNative.TrayWatcher(() => {
            this.debouncedUpdateLayout();
          });
        } catch (e) {
          processLog.error("[TaskbarLyric] 启动 TrayWatcher 失败", e);
        }
      }
    }

    this.win.on("closed", () => {
      this.destroy();
      this.win = null;
    });

    return this.win;
  }

  embed() {
    if (!this.win || !this.service) return;
    try {
      const handle = this.win.getNativeWindowHandle();
      this.service.embedWindow(handle);
    } catch (e) {
      processLog.error("[TaskbarLyric] 嵌入窗口失败", e);
    }
  }

  private getMaxWidthPercent(screenWidth: number) {
    const store = useStore();
    let maxWidthSetting = store.get("taskbar.maxWidth", 30);
    if (maxWidthSetting > 100) {
      // Assume it's pixels, convert to percent
      const converted = Math.round((maxWidthSetting / screenWidth) * 100);
      maxWidthSetting = Math.min(Math.max(converted, 10), 100);
      store.set("taskbar.maxWidth", maxWidthSetting);
      return maxWidthSetting;
    }
    return Math.min(Math.max(maxWidthSetting, 10), 100);
  }

  updateLayout(animate: boolean = false) {
    if (!this.win || !this.service) return;
    this.useAnimation = animate;

    const primaryDisplay = screen.getPrimaryDisplay();
    this.maxWidthPercent = this.getMaxWidthPercent(primaryDisplay.workAreaSize.width);
    const scaleFactor = primaryDisplay.scaleFactor;
    const maxWidthSetting = Math.round(
      (primaryDisplay.workAreaSize.width * this.maxWidthPercent) / 100,
    );
    const requestWidth = Math.round(maxWidthSetting * scaleFactor);

    this.service.update(requestWidth);
  }

  private applyLayout(layout: TaskbarLayout | null) {
    if (!layout) {
      processLog.warn("[TaskbarLyric] applyLayout 收到空布局");
      return;
    }

    if (!this.win || this.win.isDestroyed()) return;

    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const scaleFactor = primaryDisplay.scaleFactor;
      const store = useStore();
      const GAP = store.get("taskbar.margin", 10) * scaleFactor;
      const maxWidthSetting = Math.round(
        (primaryDisplay.workAreaSize.width * this.maxWidthPercent) / 100,
      );
      const positionSetting = store.get("taskbar.position", "automatic");
      const autoShrink = store.get("taskbar.autoShrink", false);
      const MAX_WIDTH_PHYSICAL = autoShrink
        ? Math.min(maxWidthSetting, this.contentWidth) * scaleFactor
        : maxWidthSetting * scaleFactor;
      const minWidthPercent = Math.min(Math.max(store.get("taskbar.minWidth", 10), 0), 50);
      const MIN_WIDTH_PHYSICAL =
        Math.round((primaryDisplay.workAreaSize.width * minWidthPercent) / 100) * scaleFactor;

      let targetBounds: Electron.Rectangle = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      };
      // isCenter determines the alignment mode for the Vue component.
      // true: Left Aligned (Cover Left)
      // false: Right Aligned (Cover Right)
      let shouldCenter = false;

      if (layout.systemType === "win10" && layout.win10) {
        const { x, y, width, height } = layout.win10.lyricArea;
        targetBounds = { x, y, width, height };
        shouldCenter = false;
      } else if (layout.systemType === "win11" && layout.win11) {
        const { startButton, widgets, content, tray, isCentered } = layout.win11;

        let effectiveRightAnchor = tray.x;
        const contentRightEdge = content.x + content.width;
        if (widgets.width > 0 && widgets.x > contentRightEdge) {
          if (widgets.x < tray.x) effectiveRightAnchor = widgets.x;
        }
        const rightSpaceRaw = effectiveRightAnchor - contentRightEdge;
        const rightSpaceNet = rightSpaceRaw - GAP;

        const widgetsRightEdge = widgets.width > 0 ? widgets.x + widgets.width : 0;
        const startLeftEdge = startButton.x;
        const leftSpaceRaw = startLeftEdge - widgetsRightEdge;
        const leftSpaceNet = leftSpaceRaw - GAP;

        let finalPhysicalX = 0;
        const finalPhysicalY = 0;
        let finalPhysicalWidth = 0;

        const clampWidth = (space: number) => {
          if (space < MIN_WIDTH_PHYSICAL) return 0;
          return Math.min(space, MAX_WIDTH_PHYSICAL);
        };

        if (positionSetting === "left" && isCentered) {
          // 强制左侧 (仅在 Win11 居中模式下有效)
          finalPhysicalWidth = clampWidth(leftSpaceNet);
          finalPhysicalX = widgetsRightEdge + GAP;
          shouldCenter = true; // Left Align
        } else if (positionSetting === "right") {
          // 强制右侧
          finalPhysicalWidth = clampWidth(rightSpaceNet);
          finalPhysicalX = effectiveRightAnchor - finalPhysicalWidth - GAP;
          shouldCenter = false; // Right Align
        } else if (isCentered) {
          // 自动判断 (Win11 居中)
          if (leftSpaceNet >= MIN_WIDTH_PHYSICAL) {
            finalPhysicalWidth = clampWidth(leftSpaceNet);
            finalPhysicalX = widgetsRightEdge + GAP;
            shouldCenter = true; // Left Align
          } else {
            finalPhysicalWidth = clampWidth(rightSpaceNet);
            finalPhysicalX = effectiveRightAnchor - finalPhysicalWidth - GAP;
            shouldCenter = false; // Right Align
          }
        } else {
          // Win11 左对齐 (仅右侧可用)
          finalPhysicalWidth = clampWidth(rightSpaceNet);
          finalPhysicalX = effectiveRightAnchor - finalPhysicalWidth - GAP;
          shouldCenter = false; // Right Align
        }

        // processLog.info(finalPhysicalWidth, finalPhysicalX);

        if (finalPhysicalWidth <= 0) {
          processLog.warn("[TaskbarLyric] 无可用空间");
          this.win.hide();
          return;
        }

        this.currentWidth = Math.round(finalPhysicalWidth / scaleFactor);

        targetBounds = {
          x: finalPhysicalX,
          y: finalPhysicalY,
          width: finalPhysicalWidth,
          height: tray.height,
        };
      }

      const finalBounds = {
        x: Math.round(targetBounds.x / scaleFactor),
        y: Math.round(targetBounds.y / scaleFactor),
        width: Math.round(targetBounds.width / scaleFactor),
        height: Math.round(targetBounds.height / scaleFactor),
      };

      // processLog.info(JSON.stringify(finalBounds));

      // 空间恢复后自动重新显示
      if (this.shouldBeVisible && !this.win.isVisible()) {
        this.win.show();
      }

      if (this.useAnimation) {
        this.animateToBounds(finalBounds);
      } else {
        if (this.animationTimer) clearInterval(this.animationTimer);
        this.win.setBounds(finalBounds);
      }

      this.win.webContents.send("taskbar:update-layout", {
        isCenter: shouldCenter,
      });
    } catch (e) {
      processLog.error("[TaskbarLyric] 应用布局失败", e);
    }
  }

  private animateToBounds(target: Electron.Rectangle) {
    if (!this.win || this.win.isDestroyed()) return;

    const screenBounds = this.win.getBounds();

    const start = {
      x: screenBounds.x,
      y: target.y,
      width: screenBounds.width,
      height: target.height,
    };

    if (Math.abs(start.x - target.x) < 2 && Math.abs(start.width - target.width) < 2) {
      this.win.setBounds(target);
      return;
    }

    if (this.animationTimer) clearInterval(this.animationTimer);

    const primaryDisplay = screen.getPrimaryDisplay();
    const refreshRate = primaryDisplay.displayFrequency || 60;
    const interval = 1000 / refreshRate;

    const duration = 300;
    const startTime = Date.now();

    const easeOutCubic = (t: number): number => {
      return 1 - (1 - t) ** 3;
    };

    this.animationTimer = setInterval(() => {
      if (!this.win || this.win.isDestroyed()) {
        if (this.animationTimer) clearInterval(this.animationTimer);
        return;
      }

      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = easeOutCubic(progress);

      const currentBounds = {
        x: Math.round(start.x + (target.x - start.x) * ease),
        y: target.y,
        width: Math.round(start.width + (target.width - start.width) * ease),
        height: target.height,
      };

      this.win.setBounds(currentBounds);

      if (progress >= 1) {
        if (this.animationTimer) clearInterval(this.animationTimer);
        this.animationTimer = null;
        this.win.setBounds(target);
      }
    }, interval);
  }

  public setVisibility(shouldShow: boolean) {
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

  public handleFadeDone() {
    if (this.isFadingOut && this.win && !this.win.isDestroyed()) {
      this.win.hide();
      this.isFadingOut = false;
    }
  }

  public destroy() {
    if (this.isNativeDisposed) return;
    this.debouncedUpdateLayout.cancel();
    this.debouncedRegistryUpdate.cancel();
    if (this.themeListener) {
      nativeTheme.removeListener("updated", this.themeListener);
      this.themeListener = null;
    }
    if (this.registryWatcher) {
      try {
        this.registryWatcher.stop();
      } catch (e) {
        processLog.error(e);
      }
      this.registryWatcher = null;
    }

    if (this.uiaWatcher) {
      try {
        this.uiaWatcher.stop();
      } catch (e) {
        processLog.error(e);
      }
      this.uiaWatcher = null;
    }

    if (this.trayWatcher) {
      try {
        this.trayWatcher.stop();
      } catch (e) {
        processLog.error(e);
      }
      this.trayWatcher = null;
    }

    if (this.service) {
      try {
        this.service.stop();
      } catch (e) {
        processLog.error("停止 TaskbarService 失败", e);
      }
      this.service = null;
    }

    this.isNativeDisposed = true;
  }

  close(animate: boolean = true) {
    this.destroy();
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = null;
    }
    if (this.win && !this.win.isDestroyed()) {
      if (animate) {
        this.win.webContents.send("taskbar:fade-out");
        const winToClose = this.win;
        setTimeout(() => {
          if (winToClose && !winToClose.isDestroyed()) {
            winToClose.close();
          }
        }, 350);
      } else {
        this.win.close();
      }
    } else {
      this.win = null;
    }
  }

  send(channel: string, ...args: unknown[]) {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send(channel, ...args);
    }
  }
}

export default new TaskbarLyricWindow();
