import { join } from "path";
import { platform } from "@electron-toolkit/utils";
import { Tray, Menu, app, ipcMain, nativeImage, nativeTheme } from "electron";

// 当前播放歌曲数据
let playSongName = "当前暂无播放歌曲";
let playSongState = false;

/**
 * 创建系统自定义信息
 * @param {BrowserWindow} win - 程序窗口
 */
const createSystemInfo = (win) => {
  // 弹出列表
  app.setUserTasks([]);
  // 系统托盘
  const mainTray = new Tray(join(__dirname, "../../public/images/logo/favicon.png"));
  // 默认托盘菜单
  Menu.setApplicationMenu(Menu.buildFromTemplate(createTrayMenu(win)));
  // 给托盘图标设置气球提示
  mainTray.setToolTip(app.getName());
  // 歌曲数据改变时
  ipcMain.on("songNameChange", (_, val) => {
    playSongName = val;
    // 托盘图标标题
    mainTray.setToolTip(val);
    // 更改应用标题
    win.setTitle(val);
  });
  ipcMain.on("songStateChange", (_, val) => {
    playSongState = val;
  });
  // 左键事件
  mainTray.on("click", () => {
    // 显示窗口
    win.show();
  });
  // 右键事件
  mainTray.on("right-click", () => {
    mainTray.popUpContextMenu(Menu.buildFromTemplate(createTrayMenu(win)));
  });
  // linux 右键菜单
  if (platform.isLinux) {
    mainTray.setContextMenu(Menu.buildFromTemplate(createTrayMenu(win)));
  }
};

// 生成右键菜单
const createTrayMenu = (win) => {
  // 系统是否为暗色
  const isDarkMode = nativeTheme.shouldUseDarkColors;
  // 生成图标
  const createIcon = (name) => {
    return nativeImage
      .createFromPath(
        isDarkMode
          ? join(__dirname, `../../public/images/icon/${name}-dark.png`)
          : join(__dirname, `../../public/images/icon/${name}-light.png`),
      )
      .resize({ width: 16, height: 16 });
  };
  // 返回菜单
  return [
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
        win.webContents.send("setting");
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
  ];
};

export default createSystemInfo;
