import initFileIpc from "./ipc-file";
import initLyricIpc from "./ipc-lyric";
import initShortcutIpc from "./ipc-shortcut";
import initStoreIpc from "./ipc-store";
import initSystemIpc from "./ipc-system";
import initThumbarIpc from "./ipc-thumbar";
import initTrayIpc from "./ipc-tray";
import initUpdateIpc from "./ipc-update";
import initWindowsIpc from "./ipc-window";
import initProtocolIpc from "./ipc-protocol";
import initCacheIpc from "./ipc-cache";
import initSocketIpc from "./ipc-socket";
import initSmtcIpc from "./ipc-smtc";
import initMprisIpc from "./ipc-mpris";
import initMpvIpc from "./ipc-mpv";

/**
 * 初始化全部 IPC 通信
 * @returns void
 */
const initIpc = (): void => {
  initSystemIpc();
  initWindowsIpc();
  initUpdateIpc();
  initFileIpc();
  initTrayIpc();
  initLyricIpc();
  initStoreIpc();
  initThumbarIpc();
  initShortcutIpc();
  initProtocolIpc();
  initCacheIpc();
  initSocketIpc();
  initSmtcIpc();
  initMprisIpc();
  initMpvIpc();
};

export default initIpc;
