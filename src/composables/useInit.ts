import { useDataStore, useSettingStore, useShortcutStore, useStatusStore } from "@/stores";
import { useEventListener } from "@vueuse/core";
import { watch, onMounted } from "vue";
import { openUserAgreement } from "@/utils/modal";
import { debounce } from "lodash-es";
import { isElectron } from "@/utils/env";
import { usePlayerController } from "@/core/player/PlayerController";
import { mediaSessionManager } from "@/core/player/MediaSessionManager";
import { useDownloadManager } from "@/core/resource/DownloadManager";
import { printVersion } from "@/utils/log";

/**
 * 应用初始化时需要执行的操作
 */
export const useInit = () => {
  // init pinia-data
  const dataStore = useDataStore();
  const statusStore = useStatusStore();
  const settingStore = useSettingStore();
  const shortcutStore = useShortcutStore();

  const player = usePlayerController();
  const downloadManager = useDownloadManager();

  // 事件监听
  initEventListener();

  onMounted(async () => {
    // 检查并执行设置迁移
    settingStore.checkAndMigrate();
    // 打印版本信息
    printVersion();
    // 用户协议
    openUserAgreement();
    // 加载数据
    await dataStore.loadData();
    // 初始化 MediaSession
    mediaSessionManager.init();
    // 初始化播放器
    player.playSong({
      autoPlay: settingStore.autoPlay,
      seek: settingStore.memoryLastSeek ? statusStore.currentTime : 0,
    });
    // 同步播放模式
    player.playModeSyncIpc();
    // 初始化自动关闭定时器
    if (statusStore.autoClose.enable) {
      const { endTime, time } = statusStore.autoClose;
      const now = Date.now();
      if (endTime > now) {
        // 计算真实剩余时间
        const realRemainTime = Math.ceil((endTime - now) / 1000);
        player.startAutoCloseTimer(time, realRemainTime);
      } else {
        // 定时器已过期，重置状态
        statusStore.autoClose.enable = false;
        statusStore.autoClose.remainTime = time * 60;
        statusStore.autoClose.endTime = 0;
      }
    }
    if (isElectron) {
      // 注册全局快捷键
      shortcutStore.registerAllShortcuts();
      // 初始化下载管理器
      downloadManager.init();
      // 显示窗口
      window.electron.ipcRenderer.send("win-loaded");
      // 同步任务栏歌词状态
      window.electron.ipcRenderer.send("taskbar:toggle", statusStore.showTaskbarLyric);
      // 显示桌面歌词
      window.electron.ipcRenderer.send("toggle-desktop-lyric", statusStore.showDesktopLyric);
      // 检查更新
      if (settingStore.checkUpdateOnStart)
        window.electron.ipcRenderer.send("check-update", false, settingStore.updateChannel);

      // 监听任务栏歌词设置
      watch(
        () => settingStore.taskbarLyricMaxWidth,
        (val) => {
          window.electron.ipcRenderer.send("taskbar:set-max-width", val);
        },
      );

      watch(
        () => settingStore.taskbarLyricShowCover,
        (val) => {
          window.electron.ipcRenderer.send("taskbar:set-show-cover", val);
        },
      );

      watch(
        () => settingStore.taskbarLyricPosition,
        (val) => {
          window.electron.ipcRenderer.send("taskbar:set-position", val);
        },
      );

      watch(
        () => settingStore.taskbarLyricShowWhenPaused,
        (val) => {
          window.electron.ipcRenderer.send("taskbar:set-show-when-paused", val);
        },
      );

      watch(
        () => settingStore.taskbarLyricAutoShrink,
        (val) => {
          window.electron.ipcRenderer.send("taskbar:set-auto-shrink", val);
        },
      );

      watch(
        () => [
          settingStore.taskbarLyricAnimationMode,
          settingStore.taskbarLyricSingleLineMode,
          settingStore.LyricFont,
          settingStore.globalFont,
          settingStore.taskbarLyricFontWeight,
          settingStore.showTran,
          settingStore.showRoma,
        ],
        () => {
          window.electron.ipcRenderer.send("taskbar:broadcast-settings", {
            animationMode: settingStore.taskbarLyricAnimationMode,
            singleLineMode: settingStore.taskbarLyricSingleLineMode,
            lyricFont: settingStore.LyricFont,
            globalFont: settingStore.globalFont,
            fontWeight: settingStore.taskbarLyricFontWeight,
            showTran: settingStore.showTran,
            showRoma: settingStore.showRoma,
          });
        },
        { deep: true },
      );
    }
  });
};

// 事件监听
const initEventListener = () => {
  // 键盘事件
  useEventListener(window, "keydown", keyDownEvent);
};

// 键盘事件
const keyDownEvent = debounce((event: KeyboardEvent) => {
  const player = usePlayerController();
  const shortcutStore = useShortcutStore();
  const statusStore = useStatusStore();
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
    // 检查是否包含修饰键
    const hasCmdOrCtrl = shortcutParts.includes("CmdOrCtrl");
    const hasShift = shortcutParts.includes("Shift");
    const hasAlt = shortcutParts.includes("Alt");
    // 检查修饰键匹配
    if (hasCmdOrCtrl && !isCtrl) match = false;
    if (hasShift && !isShift) match = false;
    if (hasAlt && !isAlt) match = false;
    // 如果快捷键定义中没有修饰键，确保没有按下任何修饰键
    if (!hasCmdOrCtrl && !hasShift && !hasAlt) {
      if (isCtrl || isShift || isAlt) match = false;
    }
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
        case "toggle-desktop-lyric":
          player.toggleDesktopLyric();
          break;
        case "openPlayer":
          // 打开播放界面（任意界面）
          statusStore.showFullPlayer = true;
          break;
        case "closePlayer":
          // 关闭播放界面（仅在播放界面时）
          if (statusStore.showFullPlayer) {
            statusStore.showFullPlayer = false;
          }
          break;
        case "openPlayList":
          // 打开播放列表（任意界面）
          statusStore.playListShow = !statusStore.playListShow;
          break;
        default:
          break;
      }
    }
  }
}, 100);
