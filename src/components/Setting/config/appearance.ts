import { useSettingStore, useStatusStore } from "@/stores";
import { isElectron } from "@/utils/env";
import {
  openFontManager,
  openCustomCode,
  openThemeConfig,
  openSidebarHideManager,
  openHomePageSectionManager,
  openPlaylistPageManager,
  openCoverManager,
} from "@/utils/modal";
import { SettingConfig } from "@/types/settings";
import { computed, ref } from "vue";
import { isLogin } from "@/utils/auth";

export const useAppearanceSettings = (): SettingConfig => {
  const settingStore = useSettingStore();
  const statusStore = useStatusStore();

  // --- Window / Borderless Logic (from general.ts) ---
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

  const onActivate = async () => {
    if (isElectron) {
      const windowConfig = await window.api.store.get("window");
      useBorderless.value = windowConfig?.useBorderless ?? true;
    }
  };

  return {
    onActivate,
    groups: [
      {
        title: "主题与风格",
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
            key: "useBorderless",
            label: "无边框窗口模式",
            type: "switch",
            show: isElectron,
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
            key: "fontConfig",
            label: "全局字体",
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
            show: computed(() => statusStore.isDeveloperMode),
          },
        ],
      },
      {
        title: "界面布局",
        items: [
          {
            key: "sidebarHide",
            label: "侧边栏管理",
            type: "button",
            description: "配置需要在侧边栏隐藏的菜单项",
            buttonLabel: "配置",
            action: openSidebarHideManager,
          },
          {
            key: "homePageSection",
            label: "首页栏目",
            type: "button",
            description: "调整首页各栏目的显示顺序或隐藏不需要的栏目",
            buttonLabel: "配置",
            action: openHomePageSectionManager,
          },
          {
            key: "playlistPageElements",
            label: "歌单界面",
            type: "button",
            description: "自定义歌单界面的标签、拥有者、时间、描述显示",
            buttonLabel: "配置",
            action: openPlaylistPageManager,
          },
          {
            key: "menuShowCover",
            label: "侧边栏显示歌单封面",
            type: "switch",
            description: "是否在侧边栏显示歌单的封面（如有）",
            value: computed({
              get: () => settingStore.menuShowCover,
              set: (v) => (settingStore.menuShowCover = v),
            }),
          },
          {
            key: "showPlaylistCount",
            label: "显示播放列表数量",
            type: "switch",
            description: "在右下角的播放列表按钮处显示播放列表的歌曲数量",
            value: computed({
              get: () => settingStore.showPlaylistCount,
              set: (v) => (settingStore.showPlaylistCount = v),
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
              { label: "流体", value: "flow" },
              { label: "左右遮罩", value: "mask-left" },
              { label: "上下遮罩", value: "mask-top" },
            ],
            value: computed({
              get: () => settingStore.routeAnimation,
              set: (v) => (settingStore.routeAnimation = v),
            }),
          },
        ],
      },
      {
        title: "播放器外观",
        items: [
          {
            key: "playerType",
            label: "播放器样式",
            type: "select",
            description: "播放器主体样式",
            options: [
              { label: "封面模式", value: "cover" },
              { label: "唱片模式", value: "record" },
              { label: "全屏封面", value: "fullscreen" },
            ],
            value: computed({
              get: () => settingStore.playerType,
              set: (v) => (settingStore.playerType = v),
            }),
            children: [
              {
                key: "playerStyleRatio",
                label: "封面 / 歌词占比",
                type: "slider",
                description: "调整全屏播放器的封面与歌词的宽度比例",
                min: 30,
                max: 70,
                step: 1,
                marks: { 50: "默认" },
                show: () => settingStore.playerType !== "fullscreen",
                formatTooltip: (v) => `${v}%`,
                value: computed({
                  get: () => settingStore.playerStyleRatio,
                  set: (v) => (settingStore.playerStyleRatio = v),
                }),
              },
              {
                key: "playerFullscreenGradient",
                label: "封面过渡位置",
                type: "slider",
                description: "调整全屏封面右侧的渐变过渡位置",
                show: () => settingStore.playerType === "fullscreen",
                min: 0,
                max: 100,
                step: 1,
                marks: { 15: "默认" },
                formatTooltip: (v) => `${v}%`,
                value: computed({
                  get: () => settingStore.playerFullscreenGradient,
                  set: (v) => (settingStore.playerFullscreenGradient = v),
                }),
              },
            ],
          },
          {
            key: "playerBackgroundType",
            label: "播放器背景样式",
            type: "select",
            description: "切换播放器背景类型",
            options: [
              { label: "流体效果", value: "animation" },
              { label: "封面模糊", value: "blur" },
              { label: "封面主色", value: "color" },
            ],
            value: computed({
              get: () => settingStore.playerBackgroundType,
              set: (v) => (settingStore.playerBackgroundType = v),
            }),
            children: [
              {
                key: "playerBackgroundFps",
                label: "背景动画帧率",
                type: "input-number",
                description: "单位 fps，最小 24，最大 240",
                min: 24,
                max: 256,
                show: () => settingStore.playerBackgroundType === "animation",
                value: computed({
                  get: () => settingStore.playerBackgroundFps,
                  set: (v) => (settingStore.playerBackgroundFps = v),
                }),
              },
              {
                key: "playerBackgroundFlowSpeed",
                label: "背景动画流动速度",
                type: "input-number",
                description: "单位 倍数，最小 0.1，最大 10",
                min: 0.1,
                max: 10,
                show: () => settingStore.playerBackgroundType === "animation",
                value: computed({
                  get: () => settingStore.playerBackgroundFlowSpeed,
                  set: (v) => (settingStore.playerBackgroundFlowSpeed = v),
                }),
              },
              {
                key: "playerBackgroundRenderScale",
                label: "背景渲染缩放比例",
                type: "input-number",
                description:
                  "设置当前渲染缩放比例，默认 0.5。适当提高此值（如 1.0 或 1.5）可以减少分界线锯齿，让效果更好，但也会增加显卡压力",
                min: 0.1,
                max: 10,
                show: () => settingStore.playerBackgroundType === "animation",
                value: computed({
                  get: () => settingStore.playerBackgroundRenderScale,
                  set: (v) => (settingStore.playerBackgroundRenderScale = v),
                }),
              },
              {
                key: "playerBackgroundPause",
                label: "背景动画暂停时暂停",
                type: "switch",
                description: "在暂停时是否也暂停背景动画",
                show: () => settingStore.playerBackgroundType === "animation",
                value: computed({
                  get: () => settingStore.playerBackgroundPause,
                  set: (v) => (settingStore.playerBackgroundPause = v),
                }),
              },
              {
                key: "playerBackgroundLowFreqVolume",
                label: "背景跳动效果",
                type: "switch",
                description: "使流体背景根据音乐低频节拍产生脉动效果",
                show: () => settingStore.playerBackgroundType === "animation",
                value: computed({
                  get: () => settingStore.playerBackgroundLowFreqVolume,
                  set: (v) => (settingStore.playerBackgroundLowFreqVolume = v),
                }),
              },
            ],
          },
          {
            key: "playerExpandAnimation",
            label: "播放器展开动画",
            type: "select",
            description: "选择播放器展开时的动画效果",
            options: [
              { label: "上浮", value: "up" },
              { label: "流体", value: "flow" },
            ],
            value: computed({
              get: () => settingStore.playerExpandAnimation,
              set: (v) => (settingStore.playerExpandAnimation = v),
            }),
          },
          {
            key: "playerFollowCoverColor",
            label: "播放器主色跟随封面",
            type: "switch",
            description: "播放器主颜色是否跟随封面主色，下一曲生效",
            value: computed({
              get: () => settingStore.playerFollowCoverColor,
              set: (v) => (settingStore.playerFollowCoverColor = v),
            }),
          },
          {
            key: "dynamicCover",
            label: "动态封面",
            type: "switch",
            description: "可展示部分歌曲的动态封面，仅在封面模式有效",
            disabled: () => isLogin() !== 1,
            value: computed({
              get: () => settingStore.dynamicCover,
              set: (v) => (settingStore.dynamicCover = v),
            }),
          },
          {
            key: "showSpectrums",
            label: "音乐频谱",
            type: "switch",
            show: isElectron,
            description:
              settingStore.playbackEngine === "mpv"
                ? "MPV 引擎暂不支持显示音乐频谱"
                : "开启音乐频谱会影响性能或增加内存占用，如遇问题请关闭",
            disabled: () => settingStore.playbackEngine === "mpv",
            value: computed({
              get: () => settingStore.showSpectrums,
              set: (v) => (settingStore.showSpectrums = v),
            }),
          },
        ],
      },
      {
        title: "界面元素显示",
        items: [
          {
            key: "coverManager",
            label: "封面隐藏管理",
            type: "button",
            description: "配置各界面封面是否隐藏（如歌单广场、排行榜、播放器等）",
            buttonLabel: "配置",
            action: openCoverManager,
          },
          {
            key: "autoHidePlayerMeta",
            label: "播放器元素自动隐藏",
            type: "switch",
            description: "鼠标静止一段时间或者离开播放器时自动隐藏控制元素",
            value: computed({
              get: () => settingStore.autoHidePlayerMeta,
              set: (v) => (settingStore.autoHidePlayerMeta = v),
            }),
          },
          {
            key: "showPlayMeta",
            label: "展示播放状态信息",
            type: "switch",
            description: "展示当前歌曲及歌词的状态信息",
            value: computed({
              get: () => settingStore.showPlayMeta,
              set: (v) => (settingStore.showPlayMeta = v),
            }),
          },
          {
            key: "barLyricShow",
            label: "底栏显示歌词",
            type: "switch",
            description: "在播放时将歌手信息更改为歌词",
            value: computed({
              get: () => settingStore.barLyricShow,
              set: (v) => (settingStore.barLyricShow = v),
            }),
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
            key: "countDownShow",
            label: "显示前奏倒计时",
            type: "switch",
            description: "部分歌曲前奏可能存在显示错误",
            value: computed({
              get: () => settingStore.countDownShow,
              set: (v) => (settingStore.countDownShow = v),
            }),
          },
          {
            key: "timeFormat",
            label: "时间显示格式",
            type: "select",
            description: "底栏右侧和播放页面底部的时间如何显示（单击时间可以快速切换）",
            options: [
              { label: "播放时间 / 总时长", value: "current-total" },
              { label: "剩余时间 / 总时长", value: "remaining-total" },
              { label: "播放时间 / 剩余时间", value: "current-remaining" },
            ],
            value: computed({
              get: () => settingStore.timeFormat,
              set: (v) => (settingStore.timeFormat = v),
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
            key: "hideBracketedContent",
            label: "隐藏括号内容",
            type: "switch",
            description: "隐藏括号内的内容，如 (Live)、(伴奏) 等",
            value: computed({
              get: () => settingStore.hideBracketedContent,
              set: (v) => (settingStore.hideBracketedContent = v),
            }),
          },
        ],
      },
    ],
  };
};
