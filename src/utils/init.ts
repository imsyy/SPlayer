import { useDataStore, useSettingStore, useShortcutStore, useStatusStore } from "@/stores";
import { useEventListener } from "@vueuse/core";
import { openUserAgreement } from "@/utils/modal";
import { debounce } from "lodash-es";
import { isElectron } from "./helper";
import packageJson from "@/../package.json";
import player from "@/utils/player";
import log from "./log";

// 应用初始化时需要执行的操作
const init = async () => {
  // init pinia-data
  const dataStore = useDataStore();
  const statusStore = useStatusStore();
  const settingStore = useSettingStore();
  const shortcutStore = useShortcutStore();

  printVersion();

  // 用户协议
  openUserAgreement();

  // 事件监听
  initEventListener();

  // 加载数据
  await dataStore.loadData();
  // 初始化播放器
  player.initPlayer(
    settingStore.autoPlay,
    settingStore.memoryLastSeek ? statusStore.currentTime : 0,
  );
  // 同步播放模式
  player.playModeSyncIpc();

  if (isElectron) {
    // 注册全局快捷键
    shortcutStore.registerAllShortcuts();
    // 显示窗口
    window.electron.ipcRenderer.send("win-loaded");
    // 显示桌面歌词
    window.electron.ipcRenderer.send("change-desktop-lyric", statusStore.showDesktopLyric);
    // 检查更新
    if (settingStore.checkUpdateOnStart) window.electron.ipcRenderer.send("check-update");
  }
};

// 事件监听
const initEventListener = () => {
  // 键盘事件
  useEventListener(window, "keydown", keyDownEvent);
};

// 键盘事件
const keyDownEvent = debounce((event: KeyboardEvent) => {
  const shortcutStore = useShortcutStore();
  const target = event.target as HTMLElement;
  // 排除元素
  const extendsDom = ["input", "textarea"];
  if (extendsDom.includes(target.tagName.toLowerCase())) return;
  event.preventDefault();
  event.stopPropagation();
  // 获取按键信息
  const key = event.code;
  const isCtrl = event.ctrlKey || event.metaKey;
  const isShift = event.shiftKey;
  const isAlt = event.altKey;
  // 循环注册快捷键
  for (const shortcutKey in shortcutStore.shortcutList) {
    const shortcut = shortcutStore.shortcutList[shortcutKey];
    const shortcutParts = shortcut.shortcut.split("+");
    // 标志位
    let match = true;
    // 检查修饰键
    if (shortcutParts.includes("CmdOrCtrl") && !isCtrl) match = false;
    if (shortcutParts.includes("Shift") && !isShift) match = false;
    if (shortcutParts.includes("Alt") && !isAlt) match = false;
    // 检查实际按键
    const mainKey = shortcutParts.find(
      (part: string) => part !== "CmdOrCtrl" && part !== "Shift" && part !== "Alt",
    );
    if (mainKey !== key) match = false;
    if (match && shortcutKey) {
      console.log(shortcutKey, `快捷键触发: ${shortcut.name}`);
      switch (shortcutKey) {
        case "playOrPause":
          player.playOrPause();
          break;
        case "playPrev":
          player.nextOrPrev("prev");
          break;
        case "playNext":
          player.nextOrPrev("next");
          break;
        case "volumeUp":
          player.setVolume("up");
          break;
        case "volumeDown":
          player.setVolume("down");
          break;
        case "toogleDesktopLyric":
          player.toggleDesktopLyric();
          break;
        default:
          break;
      }
    }
  }
}, 100);

// 版本输出
const printVersion = async () => {
  log.success(`🚀 ${packageJson.version}`, packageJson.productName);
  log.info(`👤 ${packageJson.author}`, packageJson.github);
};

export default init;
