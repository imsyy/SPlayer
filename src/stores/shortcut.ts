import { cloneDeep } from "lodash-es";
import { defineStore } from "pinia";

type ShortcutType = {
  name: string;
  shortcut: string;
  globalShortcut: string;
  // 是否被注册
  isRegistered?: boolean;
};

interface ShortcutStore {
  globalOpen: boolean;
  shortcutList: {
    playOrPause: ShortcutType;
    playPrev: ShortcutType;
    playNext: ShortcutType;
    volumeUp: ShortcutType;
    volumeDown: ShortcutType;
    toogleDesktopLyric: ShortcutType;
  };
}

export const useShortcutStore = defineStore({
  id: "shortcut",
  state: (): ShortcutStore => ({
    // 全局快捷键开启
    globalOpen: true,
    // 全部快捷键
    shortcutList: {
      // 播放或暂停
      playOrPause: {
        name: "播放 / 暂停",
        shortcut: "CmdOrCtrl+Space",
        globalShortcut: "CmdOrCtrl+Shift+Space",
      },
      // 上一曲 / 下一曲
      playPrev: {
        name: "上一曲",
        shortcut: "CmdOrCtrl+ArrowLeft",
        globalShortcut: "CmdOrCtrl+Shift+Left",
      },
      playNext: {
        name: "下一曲",
        shortcut: "CmdOrCtrl+ArrowRight",
        globalShortcut: "CmdOrCtrl+Shift+Right",
      },
      // 音量加减
      volumeUp: {
        name: "音量加",
        shortcut: "CmdOrCtrl+ArrowUp",
        globalShortcut: "CmdOrCtrl+Shift+Up",
      },
      volumeDown: {
        name: "音量减",
        shortcut: "CmdOrCtrl+ArrowDown",
        globalShortcut: "CmdOrCtrl+Shift+Down",
      },
      // 桌面歌词
      toogleDesktopLyric: {
        name: "桌面歌词",
        shortcut: "CmdOrCtrl+KeyD",
        globalShortcut: "CmdOrCtrl+Shift+D",
      },
    },
  }),
  getters: {},
  actions: {
    // 注册全部全局快捷键
    async registerAllShortcuts() {
      if (!this.globalOpen) return;
      const result = await window.electron.ipcRenderer.invoke(
        "register-all-shortcut",
        cloneDeep(this.shortcutList),
      );
      console.log(result);
      return result;
    },
  },
  // 持久化
  persist: {
    key: "shortcut-store",
    storage: localStorage,
  },
});
