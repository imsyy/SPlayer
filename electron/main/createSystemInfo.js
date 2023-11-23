import { join } from "path";
import { Tray, Menu, app, ipcMain, nativeImage, nativeTheme } from "electron";

/**
 * 创建系统自定义信息
 * @param {BrowserWindow} win - 程序窗口
 */
const createSystemInfo = (win) => {
  // 弹出列表
  app.setUserTasks([]);
  // 系统托盘
  const mainTray = new Tray(join(__dirname, "../../public/images/logo/favicon.png"));
  // 给托盘图标设置气球提示
  mainTray.setToolTip(app.getName());
  // 歌曲改变时
  ipcMain.on("sendSongName", (_, val) => {
    // 托盘图标标题
    mainTray.setToolTip(val);
    // 更改应用标题
    win.setTitle(val);
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
      label: `显示 ${import.meta.env.MAIN_VITE_TITLE ?? "SPlayer"}`,
      icon: createIcon("open"),
      click() {
        win.show();
        win.focus();
      },
    },
    {
      type: "separator",
    },
    {
      label: "上一曲",
      icon: createIcon("prev"),
      click: () => {
        win.webContents.send("playNextOrPrev", "prev");
      },
    },
    {
      label: "播放 / 暂停",
      icon: createIcon("play"),
      click: () => {
        win.webContents.send("playOrPause");
      },
    },
    {
      label: "下一曲",
      icon: createIcon("next"),
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
        console.log(111);
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
