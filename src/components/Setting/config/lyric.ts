import defaultDesktopLyricConfig from "@/assets/data/lyricConfig";
import { useLyricManager } from "@/core/player/LyricManager";
import { usePlayerController } from "@/core/player/PlayerController";
import { useSettingStore, useStatusStore } from "@/stores";
import type { LyricConfig } from "@/types/desktop-lyric";
import type { SettingConfig } from "@/types/settings";
import { isElectron, isWin, isMac } from "@/utils/env";
import { descMultiline } from "@/utils/format";
import { openAMLLServer, openExcludeLyric, openFontManager } from "@/utils/modal";
import { cloneDeep, isEqual } from "lodash-es";
import { toRef } from "vue";
import LyricPreview from "../components/LyricPreview.vue";

export const useLyricSettings = (): SettingConfig => {
  const player = usePlayerController();
  const statusStore = useStatusStore();
  const settingStore = useSettingStore();
  const lyricManager = useLyricManager();

  // 桌面歌词配置
  const desktopLyricConfig = reactive<LyricConfig>({ ...defaultDesktopLyricConfig });

  const getDesktopLyricConfig = async () => {
    if (!isElectron) return;
    const config = await window.electron.ipcRenderer.invoke("desktop-lyric:get-option");
    if (config) Object.assign(desktopLyricConfig, config);

    // 监听更新
    window.electron.ipcRenderer.on("desktop-lyric:update-option", (_, config) => {
      if (config && !isEqual(desktopLyricConfig, config)) {
        Object.assign(desktopLyricConfig, config);
      }
    });
  };

  const saveDesktopLyricConfig = () => {
    try {
      if (!isElectron) return;
      window.electron.ipcRenderer.send(
        "desktop-lyric:set-option",
        cloneDeep(desktopLyricConfig),
        true,
      );
      window.$message.success("桌面歌词配置已保存");
    } catch (error) {
      console.error("Failed to save options:", error);
      window.$message.error("桌面歌词配置保存失败");
      getDesktopLyricConfig();
    }
  };

  const restoreDesktopLyricConfig = () => {
    try {
      if (!isElectron) return;
      window.$dialog.warning({
        title: "警告",
        content: "此操作将恢复所有桌面歌词配置为默认值，是否继续?",
        positiveText: "确定",
        negativeText: "取消",
        onPositiveClick: () => {
          window.electron.ipcRenderer.send(
            "desktop-lyric:set-option",
            defaultDesktopLyricConfig,
            true,
          );
          window.$message.success("桌面歌词配置已恢复默认");
        },
      });
    } catch (error) {
      console.error("Failed to save options:", error);
      window.$message.error("桌面歌词配置恢复默认失败");
      getDesktopLyricConfig();
    }
  };

  const onActivate = async () => {
    if (isElectron) {
      getDesktopLyricConfig();
      await window.api.store.set("amllDbServer", settingStore.amllDbServer);
    }
  };

  return {
    onActivate,
    groups: [
      {
        title: "歌词设置",
        items: [
          {
            key: "lyricPreview",
            label: "预览",
            type: "custom",
            noWrapper: true,
            component: markRaw(LyricPreview),
          },
          {
            key: "lyricFontSizeMode",
            label: "自适应歌词大小",
            type: "switch",
            description: "开启后歌词大小将根据窗口高度自动缩放，避免全屏时过小或窗口时过大",
            value: computed({
              get: () => settingStore.lyricFontSizeMode === "adaptive",
              set: (v) => (settingStore.lyricFontSizeMode = v ? "adaptive" : "fixed"),
            }),
          },
          {
            key: "lyricFontSize",
            label: "歌词字体大小",
            type: "input-number",
            description: computed(() =>
              settingStore.lyricFontSizeMode === "adaptive"
                ? "作为基准大小 (以 1080p 高度为准)"
                : "单位 px，最小 12，最大 60",
            ),
            min: 12,
            max: 60,
            suffix: "px",
            value: computed({
              get: () => settingStore.lyricFontSize,
              set: (v) => (settingStore.lyricFontSize = v || 30),
            }),
            defaultValue: 46,
          },
          {
            key: "lyricTranFontSize",
            label: "翻译歌词大小",
            type: "input-number",
            description: computed(() =>
              settingStore.lyricFontSizeMode === "adaptive"
                ? "作为基准大小 (以 1080p 高度为准)"
                : "单位 px，最小 5，最大 40",
            ),
            min: 5,
            max: 40,
            suffix: "px",
            value: computed({
              get: () => settingStore.lyricTranFontSize,
              set: (v) => (settingStore.lyricTranFontSize = v || 22),
            }),
            forceIf: {
              condition: () => settingStore.useAMLyrics,
              forcedValue: () => Math.max(0.5 * settingStore.lyricFontSize, 10),
              forcedTitle: "由 AMLL 自动控制",
            },
            defaultValue: 22,
          },
          {
            key: "lyricRomaFontSize",
            label: "音译歌词大小",
            type: "input-number",
            description: computed(() =>
              settingStore.lyricFontSizeMode === "adaptive"
                ? "作为基准大小 (以 1080p 高度为准)"
                : "单位 px，最小 5，最大 40",
            ),
            min: 5,
            max: 40,
            suffix: "px",
            value: computed({
              get: () => settingStore.lyricRomaFontSize,
              set: (v) => (settingStore.lyricRomaFontSize = v || 18),
            }),
            forceIf: {
              condition: () => settingStore.useAMLyrics,
              forcedValue: () => Math.max(0.5 * settingStore.lyricFontSize, 10),
              forcedTitle: "由 AMLL 自动控制",
            },
            defaultValue: 18,
          },
          {
            key: "fontConfig",
            label: "歌词字体设置",
            type: "button",
            description: "统一配置各语种歌词区域的字体",
            buttonLabel: "配置",
            action: openFontManager,
          },
          {
            key: "lyricFontWeight",
            label: "歌词字重设置",
            type: "input-number",
            description: "设置歌词显示的字重，部分字体可能不支持所有字重",
            min: 100,
            max: 900,
            step: 100,
            value: computed({
              get: () => settingStore.lyricFontWeight,
              set: (v) => (settingStore.lyricFontWeight = v),
            }),
          },
          {
            key: "lyricTransition",
            label: "歌词切换动画",
            type: "select",
            description: "底栏播放器歌词切换时的动画效果",
            options: [
              { label: "滑动", value: "slide" },
              { label: "淡入淡出", value: "fade" },
            ],
            value: computed({
              get: () => settingStore.lyricTransition,
              set: (v) => (settingStore.lyricTransition = v),
            }),
          },
          {
            key: "lyricsPosition",
            label: "歌词位置",
            type: "select",
            description: "歌词的默认垂直位置",
            options: [
              { label: "居左", value: "flex-start" },
              { label: "居中", value: "center" },
              { label: "居右", value: "flex-end" },
            ],
            value: computed({
              get: () => settingStore.lyricsPosition,
              set: (v) => (settingStore.lyricsPosition = v),
            }),
            forceIf: {
              condition: () => settingStore.useAMLyrics,
              forcedValue: "flex-start",
              forcedDescription: "歌词的默认垂直位置，AMLL 默认居左",
            },
          },
          {
            key: "lyricHorizontalOffset",
            label: "歌词左侧边距",
            type: "slider",
            description: "调整全屏模式下歌词的起始位置",
            min: 0,
            max: 200,
            step: 1,
            marks: { 10: "默认" },
            formatTooltip: (v) => `${v}px`,
            value: computed({
              get: () => settingStore.lyricHorizontalOffset,
              set: (v) => (settingStore.lyricHorizontalOffset = v),
            }),
          },
          {
            key: "lyricAlignRight",
            label: "默认歌词靠右",
            type: "switch",
            description: "左右对唱位置互换",
            value: computed({
              get: () => settingStore.lyricAlignRight,
              set: (v) => (settingStore.lyricAlignRight = v),
            }),
          },
          {
            key: "lyricsScrollOffset",
            label: "歌词滚动位置",
            type: "slider",
            description: "歌词高亮时在屏幕中的垂直位置",
            min: 0.1,
            max: 0.9,
            step: 0.05,
            marks: { 0.1: "靠上", 0.9: "靠下" },
            formatTooltip: (v) => `${(v * 100).toFixed(0)}%`,
            value: computed({
              get: () => settingStore.lyricsScrollOffset,
              set: (v) => (settingStore.lyricsScrollOffset = v),
            }),
          },
          {
            key: "showYrc",
            label: "显示逐字歌词",
            type: "switch",
            description: "对性能要求较高，若发生卡顿请关闭",
            value: computed({
              get: () => settingStore.showYrc,
              set: (v) => (settingStore.showYrc = v),
            }),
            children: [
              {
                key: "enableQQMusicLyric",
                label: "启用 QM 歌词",
                type: "switch",
                description: "启用从 QM 获取逐字歌词，模糊搜索，可能不准确",
                show: isElectron,
                value: computed({
                  get: () => settingStore.enableQQMusicLyric,
                  set: (v) => (settingStore.enableQQMusicLyric = v),
                }),
              },
              {
                key: "localLyricQQMusicMatch",
                label: "本地歌曲使用 QM 歌词",
                type: "switch",
                disabled: computed(() => !settingStore.enableQQMusicLyric),
                description: "为本地歌曲从 QM 匹配逐字歌词，如已有 TTML 歌词则跳过",
                show: isElectron,
                value: computed({
                  get: () => settingStore.localLyricQQMusicMatch,
                  set: (v) => (settingStore.localLyricQQMusicMatch = v),
                }),
              },
            ],
          },
          {
            key: "showTran",
            label: "显示歌词翻译",
            type: "switch",
            value: computed({
              get: () => settingStore.showTran,
              set: (v) => (settingStore.showTran = v),
            }),
          },
          {
            key: "showRoma",
            label: "显示歌词音译",
            type: "switch",
            value: computed({
              get: () => settingStore.showRoma,
              set: (v) => (settingStore.showRoma = v),
            }),
          },
          {
            key: "swapTranRoma",
            label: "调换翻译与音译位置",
            type: "switch",
            description: "开启后音译显示在翻译上方",
            value: computed({
              get: () => settingStore.swapTranRoma,
              set: (v) => (settingStore.swapTranRoma = v),
            }),
            forceIf: {
              condition: () => !settingStore.showTran || !settingStore.showRoma,
              forcedValue: false,
            },
          },
          {
            key: "lyricsBlur",
            label: "歌词自动模糊",
            type: "switch",
            description: "是否聚焦显示当前播放行，其他行将模糊显示",
            value: computed({
              get: () => settingStore.lyricsBlur,
              set: (v) => (settingStore.lyricsBlur = v),
            }),
          },
          {
            key: "lyricOffsetStep",
            label: "歌词时延调节步长",
            type: "input-number",
            description: "单位毫秒，每次点击调节的时延大小",
            min: 10,
            max: 10000,
            step: 10,
            suffix: "ms",
            value: computed({
              get: () => settingStore.lyricOffsetStep,
              set: (v) => (settingStore.lyricOffsetStep = v || 500),
            }),
            defaultValue: 500,
          },
        ],
      },
      {
        title: "歌词内容",
        items: [
          {
            key: "lyricPriority",
            label: "歌词源优先级",
            type: "select",
            description: "设置歌词获取的优先顺序",
            options: computed(() => {
              const options = [{ label: "自动", value: "auto" }];
              if (settingStore.enableQQMusicLyric) {
                options.push({ label: "QM 优先", value: "qm" });
              }
              if (settingStore.enableOnlineTTMLLyric) {
                options.push({ label: "TTML 优先", value: "ttml" });
              }
              return options;
            }),
            value: computed({
              get: () => settingStore.lyricPriority,
              set: (v) => lyricManager.switchLyricSource(v),
            }),
          },
          {
            key: "preferTraditionalChinese",
            label: "更喜欢繁体中文",
            type: "switch",
            description: "将简体中文的歌词文本和翻译内容转换为繁体中文",
            value: computed({
              get: () => settingStore.preferTraditionalChinese,
              set: (v) => (settingStore.preferTraditionalChinese = v),
            }),
            children: [
              {
                key: "traditionalChineseVariant",
                label: "繁体中文变体",
                type: "select",
                description: "偏好的繁体中文变体",
                options: [
                  { label: "繁体中文 (标准)", value: "s2t" },
                  { label: "台湾正体", value: "s2tw" },
                  { label: "香港繁体", value: "s2hk" },
                ],
                value: computed({
                  get: () => settingStore.traditionalChineseVariant,
                  set: (v) => (settingStore.traditionalChineseVariant = v),
                }),
              },
            ],
          },
          {
            key: "enableOnlineTTMLLyric",
            label: "启用在线 TTML 歌词",
            type: "switch",
            description:
              "是否从 AMLL TTML DB 获取歌词（如有），TTML 歌词支持逐字、翻译、音译等功能，将会在下一首歌生效",
            tags: [{ text: "Beta", type: "warning" }],
            value: computed({
              get: () => settingStore.enableOnlineTTMLLyric,
              set: (v) => (settingStore.enableOnlineTTMLLyric = v),
            }),
            children: [
              {
                key: "amllDbServer",
                label: "AMLL TTML DB 地址",
                type: "button",
                description: "AMLL TTML DB 地址，请确保地址正确，否则将导致歌词获取失败",
                buttonLabel: "配置",
                action: openAMLLServer,
              },
            ],
          },
          {
            key: "configExcludeLyric",
            label: "歌词排除配置",
            type: "button",
            description: "可配置排除歌词，包含关键词或匹配正则表达式的歌词行将不会显示",
            buttonLabel: "配置",
            action: openExcludeLyric,
          },
          {
            key: "replaceLyricBrackets",
            label: "替换歌词括号内容",
            type: "switch",
            description: "将歌词中的括号内容替换为指定格式",
            value: computed({
              get: () => settingStore.replaceLyricBrackets,
              set: (v) => (settingStore.replaceLyricBrackets = v),
            }),
            children: [
              {
                key: "bracketReplacementPreset",
                label: "括号替换样式",
                type: "select",
                description: "选择替换后的括号样式",
                options: [
                  { label: "连字符 ( - )", value: "dash" },
                  { label: "六角括号 (〔 〕)", value: "angleBrackets" },
                  { label: "直角引号 (「 」)", value: "cornerBrackets" },
                  { label: "自定义", value: "custom" },
                ],
                value: computed({
                  get: () => settingStore.bracketReplacementPreset,
                  set: (v) => (settingStore.bracketReplacementPreset = v),
                }),
                condition: () => settingStore.bracketReplacementPreset === "custom",
                children: [
                  {
                    key: "customBracketReplacement",
                    label: "自定义替换内容",
                    type: "text-input",
                    description:
                      "输入自定义的替换字符。支持单个分隔符（如 - ）或成对符号（如 () ）",
                    value: computed({
                      get: () => settingStore.customBracketReplacement,
                      set: (v) => {
                        if (v.trim().length > 5) {
                          window.$message.warning("自定义替换内容不能超过 5 个字符");
                          return;
                        }
                        settingStore.customBracketReplacement = v;
                      },
                    }),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        title: "Apple Music-like Lyrics",
        tags: [{ text: "Beta", type: "warning" }],
        items: [
          {
            key: "useAMLyrics",
            label: "使用 Apple Music-like Lyrics",
            type: "switch",
            description: "歌词使用 Apple Music-like Lyrics 进行渲染，需要高性能设备",
            value: computed({
              get: () => settingStore.useAMLyrics,
              set: (v) => (settingStore.useAMLyrics = v),
            }),
            children: [
              {
                key: "useAMSpring",
                label: "歌词弹簧效果",
                type: "switch",
                description: "是否使用物理弹簧算法实现歌词动画效果，需要高性能设备",
                value: computed({
                  get: () => settingStore.useAMSpring,
                  set: (v) => (settingStore.useAMSpring = v),
                }),
              },
              {
                key: "hidePassedLines",
                label: "隐藏已播放歌词",
                type: "switch",
                description: "是否隐藏已播放歌词",
                value: computed({
                  get: () => settingStore.hidePassedLines,
                  set: (v) => (settingStore.hidePassedLines = v),
                }),
              },
              {
                key: "wordFadeWidth",
                label: "文字动画的渐变宽度",
                type: "input-number",
                description: descMultiline`
                  单位以歌词行的主文字字体大小的倍数为单位
                  默认为 0.5，即一个全角字符的一半宽度
                  若模拟 Apple Music for Android 的效果，可以设为 1
                  若模拟 Apple Music for iPad 的效果，可以设为 0.5
                  若需近乎禁用渐变，可设为非常接近 0 的小数，如 0.01
                `,
                min: 0.01,
                max: 1,
                step: 0.01,
                value: computed({
                  get: () => settingStore.wordFadeWidth,
                  set: (v) => (settingStore.wordFadeWidth = v),
                }),
              },
              {
                key: "showWordsRoma",
                label: "显示逐字音译",
                type: "switch",
                value: computed({
                  get: () => settingStore.showWordsRoma,
                  set: (v) => (settingStore.showWordsRoma = v),
                }),
              },
            ],
          },
        ],
      },
      {
        title: "桌面歌词",
        tags: [{ text: "Beta", type: "warning" }],
        show: isElectron,
        items: [
          {
            key: "showDesktopLyric",
            label: "开启桌面歌词",
            type: "switch",
            description: "如遇问题请向开发者反馈",
            value: computed({
              get: () => statusStore.showDesktopLyric,
              set: (v) => player.setDesktopLyricShow(v),
            }),
          },
          {
            key: "desktopLyricLock",
            label: "锁定桌面歌词位置",
            type: "switch",
            description: "是否锁定桌面歌词位置，防止误触或遮挡内容",
            value: computed({
              get: () => desktopLyricConfig.isLock,
              set: (v) => {
                desktopLyricConfig.isLock = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricDoubleLine",
            label: "双行歌词",
            type: "switch",
            description: "是否启用双行歌词，交替显示当前句和下一句",
            value: computed({
              get: () => desktopLyricConfig.isDoubleLine,
              set: (v) => {
                desktopLyricConfig.isDoubleLine = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricLimitBounds",
            label: "限制歌词位置",
            type: "switch",
            description: "是否限制桌面歌词位置在当前屏幕内",
            value: computed({
              get: () => desktopLyricConfig.limitBounds,
              set: (v) => {
                desktopLyricConfig.limitBounds = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricPosition",
            label: "对齐方式",
            type: "select",
            description: "桌面歌词对齐方式",
            options: [
              { label: "左对齐", value: "left" },
              { label: "居中对齐", value: "center" },
              { label: "右对齐", value: "right" },
              { label: "左右分离", value: "both" },
            ],
            value: computed({
              get: () => desktopLyricConfig.position,
              set: (v) => {
                desktopLyricConfig.position = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricFont",
            label: "歌词字体",
            type: "button",
            description: "更改桌面歌词字体",
            buttonLabel: "配置",
            action: openFontManager,
          },
          {
            key: "desktopLyricShowYrc",
            label: "显示逐字歌词",
            type: "switch",
            description: "是否显示桌面歌词逐字效果",
            value: computed({
              get: () => desktopLyricConfig.showYrc,
              set: (v) => {
                desktopLyricConfig.showYrc = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricShowTran",
            label: "显示翻译",
            type: "switch",
            description: "是否显示桌面歌词翻译",
            value: computed({
              get: () => desktopLyricConfig.showTran,
              set: (v) => {
                desktopLyricConfig.showTran = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricAnimation",
            label: "歌词切换动画",
            type: "switch",
            description: "开启后歌词切换时会有动画过渡效果",
            value: computed({
              get: () => desktopLyricConfig.animation,
              set: (v) => {
                desktopLyricConfig.animation = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricFontWeight",
            label: "文字字重",
            type: "input-number",
            description: "设置桌面歌词显示的字重",
            min: 100,
            max: 900,
            step: 100,
            value: computed({
              get: () => desktopLyricConfig.fontWeight,
              set: (v) => {
                desktopLyricConfig.fontWeight = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricFontSize",
            label: "文字大小",
            type: "select",
            description: "翻译或其他文字将会跟随变化",
            options: Array.from({ length: 96 - 20 + 1 }, (_, i) => ({
              label: `${20 + i} px`,
              value: 20 + i,
            })),
            value: computed({
              get: () => desktopLyricConfig.fontSize,
              set: (v) => {
                desktopLyricConfig.fontSize = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricPlayedColor",
            label: "已播放文字",
            type: "color-picker",
            description: "桌面歌词已播放文字颜色",
            componentProps: { showAlpha: false, modes: ["hex"] },
            value: computed({
              get: () => desktopLyricConfig.playedColor,
              set: (v) => (desktopLyricConfig.playedColor = v),
            }),
            action: saveDesktopLyricConfig,
          },
          {
            key: "desktopLyricUnplayedColor",
            label: "未播放文字",
            type: "color-picker",
            description: "桌面歌词未播放文字颜色",
            componentProps: { showAlpha: false, modes: ["hex"] },
            value: computed({
              get: () => desktopLyricConfig.unplayedColor,
              set: (v) => (desktopLyricConfig.unplayedColor = v),
            }),
            action: saveDesktopLyricConfig,
          },
          {
            key: "desktopLyricShadowColor",
            label: "描边色",
            type: "color-picker",
            description: "桌面歌词文字描边色",
            componentProps: { showAlpha: true, modes: ["rgb"] },
            value: computed({
              get: () => desktopLyricConfig.shadowColor,
              set: (v) => (desktopLyricConfig.shadowColor = v),
            }),
            action: saveDesktopLyricConfig,
          },
          {
            key: "desktopLyricTextBackgroundMask",
            label: "文本背景遮罩",
            type: "switch",
            description: "防止在某些界面看不清文本",
            value: computed({
              get: () => desktopLyricConfig.textBackgroundMask,
              set: (v) => {
                desktopLyricConfig.textBackgroundMask = v;
                saveDesktopLyricConfig();
              },
            }),
            children: [
              {
                key: "desktopLyricBackgroundMaskColor",
                label: "遮罩颜色",
                type: "color-picker",
                description: "设置背景遮罩的颜色和透明度",
                componentProps: { showAlpha: true, modes: ["rgb", "hex"] },
                value: computed({
                  get: () => desktopLyricConfig.backgroundMaskColor,
                  set: (v) => (desktopLyricConfig.backgroundMaskColor = v),
                }),
                action: saveDesktopLyricConfig,
              },
            ],
          },
          {
            key: "desktopLyricAlwaysShowPlayInfo",
            label: "始终展示播放信息",
            type: "switch",
            description: "是否始终展示当前歌曲名及歌手",
            value: computed({
              get: () => desktopLyricConfig.alwaysShowPlayInfo,
              set: (v) => {
                desktopLyricConfig.alwaysShowPlayInfo = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricRestore",
            label: "恢复默认配置",
            type: "button",
            description: "恢复默认桌面歌词配置",
            buttonLabel: "恢复默认",
            action: restoreDesktopLyricConfig,
          },
        ],
      },
      {
        title: "任务栏歌词",
        show: isElectron && isWin,
        items: [
          {
            key: "showTaskbarLyric",
            label: "开启任务栏歌词",
            type: "switch",
            description: "开启后将在任务栏显示歌词",
            value: computed({
              get: () => statusStore.showTaskbarLyric,
              set: (v) => {
                player.setTaskbarLyricShow(v);
              },
            }),
          },
          {
            key: "taskbarLyricShowWhenPaused",
            label: "暂停时显示",
            type: "switch",
            description: "是否在暂停播放时显示任务栏歌词",
            value: toRef(settingStore, "taskbarLyricShowWhenPaused"),
          },
          {
            key: "taskbarLyricUseThemeColor",
            label: "跟随封面颜色",
            type: "switch",
            description: "开启后任务栏歌词颜色将跟随歌曲封面，下一曲生效",
            value: toRef(settingStore, "taskbarLyricUseThemeColor"),
          },
          {
            key: "taskbarLyricShowCover",
            label: "显示封面",
            type: "switch",
            description: "是否在任务栏歌词中显示歌曲封面",
            value: toRef(settingStore, "taskbarLyricShowCover"),
          },
          {
            key: "taskbarLyricMaxWidth",
            label: "最大宽度",
            type: "slider",
            description: "任务栏歌词的最大宽度占屏幕比例",
            min: 10,
            max: 100,
            step: 1,
            value: toRef(settingStore, "taskbarLyricMaxWidth"),
            suffix: "%",
          },
          {
            key: "taskbarLyricMinWidth",
            label: "最小宽度",
            type: "slider",
            description: "任务栏歌词可用空间低于此比例时自动隐藏",
            min: 0,
            max: 50,
            step: 1,
            value: toRef(settingStore, "taskbarLyricMinWidth"),
            suffix: "%",
          },
          {
            key: "taskbarLyricMargin",
            label: "歌词边距",
            type: "input-number",
            description: "任务栏歌词与相邻元素之间的间距",
            min: 0,
            max: 500,
            step: 10,
            suffix: "px",
            value: computed({
              get: () => settingStore.taskbarLyricMargin,
              set: (v) => (settingStore.taskbarLyricMargin = v ?? 10),
            }),
            defaultValue: 10,
          },
          {
            key: "taskbarLyricAutoShrink",
            label: "自动收缩",
            type: "switch",
            description: "关闭后将固定占据设置的最大宽度",
            value: computed({
              get: () => settingStore.taskbarLyricAutoShrink,
              set: (v) => {
                if (v) {
                  window.$dialog.warning({
                    title: "提示",
                    content: "可能会导致右侧对齐的任务栏歌词异常抖动，是否开启？",
                    positiveText: "开启",
                    negativeText: "取消",
                    onPositiveClick: () => {
                      settingStore.taskbarLyricAutoShrink = true;
                    },
                  });
                } else {
                  settingStore.taskbarLyricAutoShrink = false;
                }
              },
            }),
          },
          {
            key: "taskbarLyricPosition",
            label: "显示位置",
            type: "select",
            description: "任务栏歌词的显示位置",
            options: [
              { label: "自动", value: "automatic" },
              { label: "左侧", value: "left" },
              { label: "右侧", value: "right" },
            ],
            value: toRef(settingStore, "taskbarLyricPosition"),
          },
          {
            key: "taskbarLyricAnimationMode",
            label: "动画效果",
            type: "select",
            description: "任务栏歌词切换时的动画效果",
            options: [
              { label: "滑动模糊", value: "slide-blur" },
              { label: "左侧滑入", value: "left-sm" },
            ],
            value: toRef(settingStore, "taskbarLyricAnimationMode"),
          },
          {
            key: "taskbarLyricSingleLineMode",
            label: "单行模式",
            type: "switch",
            description: "是否仅显示单行歌词（不显示下一句）",
            value: toRef(settingStore, "taskbarLyricSingleLineMode"),
          },
          {
            key: "taskbarLyricFontWeight",
            label: "文字字重",
            type: "input-number",
            description: "设置任务栏歌词显示的字重",
            min: 100,
            max: 900,
            step: 100,
            value: toRef(settingStore, "taskbarLyricFontWeight"),
          },
        ],
      },
      {
        title: "macOS 状态栏歌词",
        show: isElectron && isMac,
        items: [
          {
            key: "macStatusBarLyricEnabled",
            label: "启用状态栏歌词",
            type: "switch",
            description: "开启后将在 macOS 状态栏显示歌词",
            value: computed({
              get: () => settingStore.macos.statusBarLyric.enabled,
              set: (v) => {
                settingStore.macos.statusBarLyric.enabled = v;
                window.electron.ipcRenderer.send("macos-lyric:toggle", v);
                window.$message.success(`${v ? "已开启" : "已关闭"}状态栏歌词`);
              },
            }),
          },
        ],
      },
    ],
  };
};
