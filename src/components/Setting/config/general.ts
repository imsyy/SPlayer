import { useDataStore, useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { usePlayerController } from "@/core/player/PlayerController";
import { isElectron } from "@/utils/env";
import {
  openSidebarHideManager,
  openHomePageSectionManager,
  openFontManager,
  openCustomCode,
  openThemeConfig,
  openExcludeComment,
  openPlaylistPageManager,
} from "@/utils/modal";
import { sendRegisterProtocol } from "@/utils/protocol";
import { SettingConfig } from "@/types/settings";

export const useGeneralSettings = (): SettingConfig => {
  const dataStore = useDataStore();
  const musicStore = useMusicStore();
  const settingStore = useSettingStore();
  const statusStore = useStatusStore();
  const player = usePlayerController();

  const useOnlineService = ref(settingStore.useOnlineService);

  const handleModeChange = (val: boolean) => {
    if (val) {
      window.$dialog.warning({
        title: "开启在线服务",
        content: "确定开启软件的在线服务？更改将在热重载后生效！",
        positiveText: "开启",
        negativeText: "取消",
        onPositiveClick: async () => {
          useOnlineService.value = true;
          settingStore.useOnlineService = true;
          // 清空播放列表
          await player.cleanPlayList();
          // 清理播放数据
          dataStore.$reset();
          musicStore.$reset();
          // 清空本地数据
          localStorage.removeItem("data-store");
          localStorage.removeItem("music-store");
          // 热重载
          window.location.reload();
        },
      });
    } else {
      window.$dialog.warning({
        title: "关闭在线服务",
        content: "确定关闭软件的在线服务？关闭后将只能播放本地音乐！更改将在热重载后生效！",
        positiveText: "关闭",
        negativeText: "取消",
        onPositiveClick: async () => {
          useOnlineService.value = false;
          settingStore.useOnlineService = false;
          // 清空播放列表
          await player.cleanPlayList();
          // 清理播放数据
          dataStore.$reset();
          musicStore.$reset();
          // 清空本地数据
          localStorage.removeItem("data-store");
          localStorage.removeItem("music-store");
          // 热重载
          window.location.reload();
        },
        onNegativeClick: () => {
          useOnlineService.value = true;
          settingStore.useOnlineService = true;
        },
      });
    }
  };

  const useBorderless = ref(true);

  const handleBorderlessChange = async (val: boolean) => {
    if (!isElectron) return;
    const windowConfig = await window.api.store.get("window");
    window.api.store.set("window", {
      ...windowConfig,
      useBorderless: val,
    });
    window.$message.warning("设置已保存，重启软件后生效");
  };
  // 任务栏进度
  const closeTaskbarProgress = (val: boolean) => {
    if (!isElectron) return;
    if (!val) window.electron.ipcRenderer.send("set-bar", "none");
  };
  // Orpheus 协议
  const handleOrpheusChange = async (isRegistry: boolean) => {
    sendRegisterProtocol("orpheus", isRegistry);
  };

  const onActivate = async () => {
    if (isElectron) {
      // 获取无边框窗口配置
      const windowConfig = await window.api.store.get("window");
      useBorderless.value = windowConfig?.useBorderless ?? true;
    }
  };

  return {
    onActivate,
    groups: [
      {
        title: "全局设置",
        items: [
          {
            key: "themeMode",
            label: "主题模式",
            type: "select",
            description: () =>
              statusStore.themeBackgroundMode === "image"
                ? "请关闭自定义背景图后调节"
                : "调整全局主题明暗模式",
            disabled: computed(() => statusStore.themeBackgroundMode === "image"),
            options: [
              { label: "跟随系统", value: "auto" },
              { label: "浅色模式", value: "light" },
              { label: "深色模式", value: "dark" },
            ],
            value: computed({
              get: () => settingStore.themeMode,
              set: (v) => (settingStore.themeMode = v),
            }),
          },
          {
            key: "themeConfig",
            label: "主题配置",
            type: "button",
            description: "更改主题色或自定义图片",
            buttonLabel: "配置",
            action: openThemeConfig,
          },
          {
            key: "fontConfig",
            label: "字体设置",
            type: "button",
            description: "统一配置全局及歌词区域的字体",
            buttonLabel: "配置",
            action: openFontManager,
          },
          {
            key: "customCode",
            label: "自定义代码注入",
            type: "button",
            description: "注入自定义 CSS 和 JavaScript 代码",
            buttonLabel: "配置",
            action: openCustomCode,
            show: statusStore.isDeveloperMode,
          },
        ],
      },
      {
        title: "杂项设置",
        items: [
          {
            key: "showSearchHistory",
            label: "显示搜索历史",
            type: "switch",
            value: computed({
              get: () => settingStore.showSearchHistory,
              set: (v) => (settingStore.showSearchHistory = v),
            }),
          },
          {
            key: "enableSearchKeyword",
            label: "搜索关键词建议",
            type: "switch",
            description: "是否启用搜索关键词建议",
            value: computed({
              get: () => settingStore.enableSearchKeyword,
              set: (v) => (settingStore.enableSearchKeyword = v),
            }),
          },
          {
            key: "clearSearchOnBlur",
            label: "失焦自动清空搜索框",
            type: "switch",
            description: "搜索框失去焦点后自动清空内容",
            value: computed({
              get: () => settingStore.clearSearchOnBlur,
              set: (v) => (settingStore.clearSearchOnBlur = v),
            }),
          },
          {
            key: "hideLyricBrackets",
            label: "隐藏括号与别名",
            type: "switch",
            description: "隐藏歌曲名与专辑名中的括号内容和别名",
            value: computed({
              get: () => settingStore.hideLyricBrackets,
              set: (v) => (settingStore.hideLyricBrackets = v),
            }),
          },
          {
            key: "configExcludeComment",
            label: "评论排除配置",
            type: "button",
            description: "配置排除评论的规则（关键词或正则表达式）",
            buttonLabel: "配置",
            action: openExcludeComment,
          },
          {
            key: "hideAllCovers",
            label: "隐藏歌曲封面",
            type: "switch",
            description: "开启后将隐藏列表中所有歌曲的封面",
            value: computed({
              get: () => settingStore.hideAllCovers,
              set: (v) => (settingStore.hideAllCovers = v),
            }),
          },
          {
            key: "hideMiniPlayerCover",
            label: "隐藏迷你播放器封面",
            type: "switch",
            description: "开启后将隐藏底部迷你播放器的封面",
            value: computed({
              get: () => settingStore.hideMiniPlayerCover,
              set: (v) => (settingStore.hideMiniPlayerCover = v),
            }),
          },
          {
            key: "menuShowCover",
            label: "侧边栏显示封面",
            type: "switch",
            description: "是否显示歌单的封面，如果有",
            value: computed({
              get: () => settingStore.menuShowCover,
              set: (v) => (settingStore.menuShowCover = v),
            }),
          },
          {
            key: "sidebarHide",
            label: "侧边栏隐藏",
            type: "button",
            description: "配置需要在侧边栏隐藏的菜单项",
            buttonLabel: "配置",
            action: openSidebarHideManager,
          },
          {
            key: "homePageSection",
            label: "首页栏目配置",
            type: "button",
            description: "调整首页各栏目的显示顺序或隐藏不需要的栏目",
            buttonLabel: "配置",
            action: openHomePageSectionManager,
          },
          {
            key: "playlistPageElements",
            label: "歌单界面配置",
            type: "button",
            description: "自定义歌单界面的标签、拥有者、时间、描述显示",
            buttonLabel: "配置",
            action: openPlaylistPageManager,
          },
          {
            key: "showSongQuality",
            label: "显示歌曲音质",
            type: "switch",
            description: "是否列表中显示歌曲音质",
            value: computed({
              get: () => settingStore.showSongQuality,
              set: (v) => (settingStore.showSongQuality = v),
            }),
          },
          {
            key: "showPlayerQuality",
            label: "显示播放器切换音质按钮",
            type: "switch",
            description: "是否在播放器显示切换音质按钮",
            value: computed({
              get: () => settingStore.showPlayerQuality,
              set: (v) => (settingStore.showPlayerQuality = v),
            }),
          },
          {
            key: "showSongPrivilegeTag",
            label: "显示特权标签",
            type: "switch",
            description: "是否显示如 VIP、EP 等特权标签",
            value: computed({
              get: () => settingStore.showSongPrivilegeTag,
              set: (v) => (settingStore.showSongPrivilegeTag = v),
            }),
          },
          {
            key: "showSongExplicitTag",
            label: "显示脏标",
            type: "switch",
            description: "是否显示歌曲脏标（🅴）",
            value: computed({
              get: () => settingStore.showSongExplicitTag,
              set: (v) => (settingStore.showSongExplicitTag = v),
            }),
          },
          {
            key: "showSongOriginalTag",
            label: "显示原唱翻唱标签",
            type: "switch",
            description: "是否显示歌曲原唱翻唱标签",
            value: computed({
              get: () => settingStore.showSongOriginalTag,
              set: (v) => (settingStore.showSongOriginalTag = v),
            }),
          },
          {
            key: "useKeepAlive",
            label: "开启页面缓存",
            type: "switch",
            description: "是否开启部分页面的缓存，这将会增加内存占用",
            value: computed({
              get: () => settingStore.useKeepAlive,
              set: (v) => (settingStore.useKeepAlive = v),
            }),
          },
          {
            key: "routeAnimation",
            label: "页面切换动画",
            type: "select",
            description: "选择页面切换时的动画效果",
            options: [
              { label: "无动画", value: "none" },
              { label: "淡入淡出", value: "fade" },
              { label: "缩放", value: "zoom" },
              { label: "滑动", value: "slide" },
              { label: "上浮", value: "up" },
            ],
            value: computed({
              get: () => settingStore.routeAnimation,
              set: (v) => (settingStore.routeAnimation = v),
            }),
          },
        ],
      },
      {
        title: "系统设置",
        show: isElectron,
        items: [
          {
            key: "useOnlineService",
            label: "在线服务",
            type: "switch",
            description: "是否开启软件的在线服务",
            value: computed({
              get: () => useOnlineService.value,
              set: (v) => handleModeChange(v),
            }),
          },
          {
            key: "closeAppMethod",
            label: "关闭软件时",
            type: "select",
            description: "选择关闭软件的方式",
            disabled: computed(() => settingStore.showCloseAppTip),
            options: [
              { label: "最小化到任务栏", value: "hide" },
              { label: "直接退出", value: "close" },
            ],
            value: computed({
              get: () => settingStore.closeAppMethod,
              set: (v) => (settingStore.closeAppMethod = v),
            }),
          },
          {
            key: "showCloseAppTip",
            label: "每次关闭前都进行提醒",
            type: "switch",
            value: computed({
              get: () => settingStore.showCloseAppTip,
              set: (v) => (settingStore.showCloseAppTip = v),
            }),
          },
          {
            key: "showTaskbarProgress",
            label: "任务栏显示播放进度",
            type: "switch",
            description: "是否在任务栏显示歌曲播放进度",
            value: computed({
              get: () => settingStore.showTaskbarProgress,
              set: (v) => {
                settingStore.showTaskbarProgress = v;
                closeTaskbarProgress(v);
              },
            }),
          },
          {
            key: "preventSleep",
            label: "阻止系统息屏",
            type: "switch",
            description: "是否在播放界面阻止系统息屏",
            value: computed({
              get: () => settingStore.preventSleep,
              set: (v) => (settingStore.preventSleep = v),
            }),
          },
          {
            key: "useBorderless",
            label: "无边框窗口模式",
            type: "switch",
            description: "是否开启无边框窗口模式，关闭后将使用系统原生边框（需重启）",
            value: computed({
              get: () => useBorderless.value,
              set: (v) => {
                useBorderless.value = v;
                handleBorderlessChange(v);
              },
            }),
          },
          {
            key: "orpheusProtocol",
            label: "通过 Orpheus 协议唤起本应用",
            type: "switch",
            description:
              "该协议通常用于官方网页端唤起官方客户端， 启用后可能导致官方客户端无法被唤起",
            value: computed({
              get: () => settingStore.registryProtocol.orpheus,
              set: (v) => {
                settingStore.registryProtocol.orpheus = v;
                handleOrpheusChange(v);
              },
            }),
          },
          {
            key: "checkUpdateOnStart",
            label: "自动检查更新",
            type: "switch",
            description: "在每次开启软件时自动检查更新",
            value: computed({
              get: () => settingStore.checkUpdateOnStart,
              set: (v) => (settingStore.checkUpdateOnStart = v),
            }),
          },
        ],
      },
    ],
  };
};
