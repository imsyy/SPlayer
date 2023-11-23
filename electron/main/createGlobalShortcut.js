import { globalShortcut } from "electron";

/**
 * 注册全局快捷键
 * @param {BrowserWindow} win - 程序窗口
 */
const createGlobalShortcut = (win) => {
  // 刷新程序
  globalShortcut.register("CommandOrControl+R", () => {
    win?.reload();
  });
};

export default createGlobalShortcut;
