import { Tray, Menu, app, ipcMain, nativeImage, nativeTheme } from "electron";
import { join } from "path";

// 当前歌曲数据
let playSongName = "当前暂无播放歌曲";
let playSongState = false;

/**
 * 创建系统托盘
 * @param {BrowserWindow} win - 程序窗口
 */
const createSystemTray = (win) => {
  // 系统托盘
  const mainTray = new Tray(
    nativeImage
      .createFromPath(
        join(
          __dirname,
          process.platform === "win32"
            ? "../../public/imgs/icons/favicon.ico"
            : "../../public/imgs/icons/favicon-32x32.png",
        ),
      )
      .resize({
        height: 32,
        width: 32,
      }),
  );
  // 应用内菜单
  Menu.setApplicationMenu(createTrayMenu(win));
  // 默认名称
  win.setTitle(app.getName());
  mainTray.setTitle(app.getName());
  mainTray.setToolTip(app.getName());
  // 左键事件
  mainTray.on("click", () => win.show());
  // 托盘菜单
  mainTray.setContextMenu(createTrayMenu(win));
  // 系统主题改变
  nativeTheme.on("updated", () => {
    mainTray.setContextMenu(createTrayMenu(win));
  });
  // 播放歌曲改变
  ipcMain.on("songNameChange", (_, val) => {
    playSongName = val;
    win.setTitle(val);
    mainTray.setTitle(val);
    mainTray.setToolTip(val);
    mainTray.setContextMenu(createTrayMenu(win));
  });
  // 播放状态改变
  ipcMain.on("songStateChange", (_, val) => {
    playSongState = val;
    mainTray.setContextMenu(createTrayMenu(win));
  });
};

// 生成图标
const createIcon = (name) => {
  // 系统是否为暗色
  const isDarkMode = nativeTheme.shouldUseDarkColors;
  // 返回图标
  return nativeImage
    .createFromPath(
      isDarkMode
        ? join(__dirname, `../../public/imgs/icons/${name}-dark.png`)
        : join(__dirname, `../../public/imgs/icons/${name}-light.png`),
    )
    .resize({ width: 16, height: 16 });
};

// 生成右键菜单
const createTrayMenu = (win) => {
  // 返回菜单
  return Menu.buildFromTemplate([
    {
      label: playSongName,
      icon: createIcon("open"),
      click() {
        win.show();
        win.focus();
        win.webContents.send("showPlayer");
      },
    },
    {
      type: "separator",
    },
    {
      label: "上一曲",
      icon: createIcon("prev"),
      accelerator: "CmdOrCtrl+Left",
      click: () => {
        win.webContents.send("playNextOrPrev", "prev");
      },
    },
    {
      label: playSongState ? "暂停" : "播放",
      icon: createIcon(playSongState ? "pause" : "play"),
      accelerator: "CmdOrCtrl+Space",
      click: () => {
        win.webContents.send("playOrPause");
      },
    },
    {
      label: "下一曲",
      icon: createIcon("next"),
      accelerator: "CmdOrCtrl+Right",
      click: () => {
        win.webContents.send("playNextOrPrev", "next");
      },
    },
    {
      type: "separator",
    },
    {
      label: "全局设置",
      icon: createIcon("setting"),
      click: () => {
        win.show();
        win.focus();
        win.webContents.send("open-setting");
      },
    },
    {
      type: "separator",
    },
    {
      label: "退出",
      icon: createIcon("power"),
      click: () => {
        win.close();
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);
};

export default createSystemTray;
