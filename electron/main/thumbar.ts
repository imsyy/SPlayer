import { BrowserWindow, nativeImage, nativeTheme, ThumbarButton } from "electron";
import { join } from "path";
import { isWin } from "./utils";
import log from "./logger";

enum ThumbarKeys {
  Play = "play",
  Pause = "pause",
  Prev = "prev",
  Next = "next",
}

type ThumbarMap = Map<ThumbarKeys, ThumbarButton>;

export interface Thumbar {
  clearThumbar(): void;
  updateThumbar(playing: boolean, clean?: boolean): void;
}

// 工具栏图标
const thumbarIcon = (filename: string) => {
  // 是否为暗色
  const isDark = nativeTheme.shouldUseDarkColors;
  // 返回图标
  return nativeImage.createFromPath(
    join(__dirname, `../../public/icons/thumbar/${filename}-${isDark ? "dark" : "light"}.png`),
  );
};

// 缩略图工具栏
const createThumbarButtons = (win: BrowserWindow): ThumbarMap => {
  return new Map<ThumbarKeys, ThumbarButton>()
    .set(ThumbarKeys.Prev, {
      tooltip: "上一曲",
      icon: thumbarIcon("prev"),
      click: () => win.webContents.send("playPrev"),
    })
    .set(ThumbarKeys.Next, {
      tooltip: "下一曲",
      icon: thumbarIcon("next"),
      click: () => win.webContents.send("playNext"),
    })
    .set(ThumbarKeys.Play, {
      tooltip: "播放",
      icon: thumbarIcon("play"),
      click: () => win.webContents.send("play"),
    })
    .set(ThumbarKeys.Pause, {
      tooltip: "暂停",
      icon: thumbarIcon("pause"),
      click: () => win.webContents.send("pause"),
    });
};

// 创建缩略图工具栏
class createThumbar implements Thumbar {
  // 窗口
  private _win: BrowserWindow;
  // 工具栏
  private _thumbar: ThumbarMap;
  // 工具栏按钮
  private _prev: ThumbarButton;
  private _next: ThumbarButton;
  private _play: ThumbarButton;
  private _pause: ThumbarButton;
  constructor(win: BrowserWindow) {
    // 初始化数据
    this._win = win;
    this._thumbar = createThumbarButtons(win);
    // 工具栏按钮
    this._play = this._thumbar.get(ThumbarKeys.Play)!;
    this._pause = this._thumbar.get(ThumbarKeys.Pause)!;
    this._prev = this._thumbar.get(ThumbarKeys.Prev)!;
    this._next = this._thumbar.get(ThumbarKeys.Next)!;
    // 初始化工具栏
    this.updateThumbar();
  }
  // 更新工具栏
  updateThumbar(playing: boolean = false, clean: boolean = false) {
    if (clean) return this.clearThumbar();
    this._win.setThumbarButtons([this._prev, playing ? this._pause : this._play, this._next]);
  }
  // 清除工具栏
  clearThumbar() {
    this._win.setThumbarButtons([]);
  }
}

export const initThumbar = (win: BrowserWindow) => {
  try {
    // 若非 Win
    if (!isWin) return null;
    log.info("🚀 ThumbarButtons Startup");
    return new createThumbar(win);
  } catch (error) {
    log.error("❌ ThumbarButtons Error", error);
    throw error;
  }
};
