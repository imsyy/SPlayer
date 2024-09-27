import {
  app,
  Tray,
  Menu,
  MenuItemConstructorOptions,
  BrowserWindow,
  nativeImage,
  nativeTheme,
} from "electron";
import { isWin, isLinux, isDev, appName } from "./utils";
import { join } from "path";
import log from "./logger";

// 播放模式
type PlayMode = "repeat" | "repeat-once" | "shuffle";
type PlayState = "play" | "pause" | "loading";

// 全局数据
let playMode: PlayMode = "repeat";
let playState: PlayState = "pause";
let playName: string = "未播放歌曲";
let likeSong: boolean = false;
let desktopLyricShow: boolean = false;
let desktopLyricLock: boolean = false;

export interface MainTray {
  setTitle(title: string): void;
  setPlayMode(mode: PlayMode): void;
  setLikeState(like: boolean): void;
  setPlayState(state: PlayState): void;
  setPlayName(name: string): void;
  setDesktopLyricShow(show: boolean): void;
  setDesktopLyricLock(lock: boolean): void;
  destroyTray(): void;
}

// 托盘图标
const trayIcon = (filename: string) => {
  // const rootPath = isDev
  //   ? join(__dirname, "../../public/icons/tray")
  //   : join(app.getAppPath(), "../../public/icons/tray");
  // return nativeImage.createFromPath(join(rootPath, filename));
  return nativeImage.createFromPath(join(__dirname, `../../public/icons/tray/${filename}`));
};

// 托盘菜单
const createTrayMenu = (
  win: BrowserWindow,
  lyricWin: BrowserWindow,
): MenuItemConstructorOptions[] => {
  // 区分明暗图标
  const showIcon = (iconName: string) => {
    const isDark = nativeTheme.shouldUseDarkColors;
    return trayIcon(`${iconName}${isDark ? "-dark" : "-light"}.png`).resize({
      width: 16,
      height: 16,
    });
  };
  // 菜单
  const menu: MenuItemConstructorOptions[] = [
    {
      id: "name",
      label: playName,
      icon: showIcon("music"),
      click: () => {
        win.show();
        win.focus();
      },
    },
    {
      type: "separator",
    },
    {
      id: "toogleLikeSong",
      label: likeSong ? "从我喜欢中移除" : "添加到我喜欢",
      icon: showIcon(likeSong ? "like" : "unlike"),
      click: () => win.webContents.send("toogleLikeSong"),
    },
    {
      id: "changeMode",
      label:
        playMode === "repeat" ? "列表循环" : playMode === "repeat-once" ? "单曲循环" : "随机播放",
      icon: showIcon(playMode),
      submenu: [
        {
          id: "repeat",
          label: "列表循环",
          icon: showIcon("repeat"),
          checked: playMode === "repeat",
          type: "radio",
          click: () => win.webContents.send("changeMode", "repeat"),
        },
        {
          id: "repeat-once",
          label: "单曲循环",
          icon: showIcon("repeat-once"),
          checked: playMode === "repeat-once",
          type: "radio",
          click: () => win.webContents.send("changeMode", "repeat-once"),
        },
        {
          id: "shuffle",
          label: "随机播放",
          icon: showIcon("shuffle"),
          checked: playMode === "shuffle",
          type: "radio",
          click: () => win.webContents.send("changeMode", "shuffle"),
        },
      ],
    },
    {
      type: "separator",
    },
    {
      id: "playNext",
      label: "上一曲",
      icon: showIcon("prev"),
      click: () => win.webContents.send("playPrev"),
    },
    {
      id: "playOrPause",
      label: playState === "pause" ? "播放" : "暂停",
      icon: showIcon(playState === "pause" ? "play" : "pause"),
      click: () => win.webContents.send(playState === "pause" ? "play" : "pause"),
    },
    {
      id: "playNext",
      label: "下一曲",
      icon: showIcon("next"),
      click: () => win.webContents.send("playNext"),
    },
    {
      type: "separator",
    },
    {
      id: "toogleDesktopLyric",
      label: `${desktopLyricShow ? "关闭" : "开启"}桌面歌词`,
      icon: showIcon("lyric"),
      click: () => win.webContents.send("toogleDesktopLyric"),
    },
    {
      id: "toogleDesktopLyricLock",
      label: `${desktopLyricLock ? "解锁" : "锁定"}桌面歌词`,
      icon: showIcon(desktopLyricLock ? "lock" : "unlock"),
      visible: desktopLyricShow,
      click: () => lyricWin.webContents.send("toogleDesktopLyricLock", !desktopLyricLock),
    },
    {
      type: "separator",
    },
    {
      id: "setting",
      label: "全局设置",
      icon: showIcon("setting"),
      click: () => {
        win.show();
        win.focus();
        win.webContents.send("openSetting");
      },
    },
    {
      type: "separator",
    },
    {
      id: "exit",
      label: "退出",
      icon: showIcon("power"),
      click: () => {
        win.close();
        // app.exit(0);
        app.quit();
      },
    },
  ];
  return menu;
};

// 创建托盘
class CreateTray implements MainTray {
  // 窗口
  private _win: BrowserWindow;
  private _lyricWin: BrowserWindow;
  // 托盘
  private _tray: Tray;
  // 菜单
  private _menu: MenuItemConstructorOptions[];
  private _contextMenu: Menu;

  constructor(win: BrowserWindow, lyricWin: BrowserWindow) {
    // 托盘图标
    const icon = trayIcon(isWin ? "tray.ico" : "tray@32.png").resize({
      height: 32,
      width: 32,
    });
    // 初始化数据
    this._win = win;
    this._lyricWin = lyricWin;
    this._tray = new Tray(icon);
    this._menu = createTrayMenu(this._win, this._lyricWin);
    this._contextMenu = Menu.buildFromTemplate(this._menu);
    // 初始化事件
    this.initTrayMenu();
    this.initEvents();
    this.setTitle(appName);
  }
  // 托盘菜单
  private initTrayMenu() {
    this._menu = createTrayMenu(this._win, this._lyricWin);
    this._contextMenu = Menu.buildFromTemplate(this._menu);
    this._tray.setContextMenu(this._contextMenu);
  }
  // 托盘事件
  private initEvents() {
    // 点击
    this._tray.on("click", () => this._win.show());
    // 明暗变化
    nativeTheme.on("updated", () => {
      this.initTrayMenu();
    });
  }
  // 设置标题
  setTitle(title: string) {
    this._tray.setTitle(title);
    this._tray.setToolTip(title);
  }
  // 设置播放名称
  setPlayName(name: string) {
    // 超长处理
    if (name.length > 20) name = name.slice(0, 20) + "...";
    playName = name;
    // 更新菜单
    this.initTrayMenu();
  }
  // 设置播放状态
  setPlayState(state: PlayState) {
    playState = state;
    // 更新菜单
    this.initTrayMenu();
  }
  // 设置播放模式
  setPlayMode(mode: PlayMode) {
    playMode = mode;
    // 更新菜单
    this.initTrayMenu();
  }
  // 设置喜欢状态
  setLikeState(like: boolean) {
    likeSong = like;
    // 更新菜单
    this.initTrayMenu();
  }
  // 桌面歌词开关
  setDesktopLyricShow(show: boolean) {
    desktopLyricShow = show;
    // 更新菜单
    this.initTrayMenu();
  }
  // 锁定桌面歌词
  setDesktopLyricLock(lock: boolean) {
    desktopLyricLock = lock;
    // 更新菜单
    this.initTrayMenu();
  }
  // 销毁托盘
  destroyTray() {
    this._tray.destroy();
  }
}

export const initTray = (win: BrowserWindow, lyricWin: BrowserWindow) => {
  try {
    // 若为 MacOS
    if (isWin || isLinux || isDev) {
      log.info("🚀 Tray Process Startup");
      return new CreateTray(win, lyricWin);
    }
    return null;
  } catch (error) {
    log.error("❌ Tray Process Error", error);
    return null;
  }
};
