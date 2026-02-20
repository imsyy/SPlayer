import type { VNodeChild } from "vue";
import { useSettingStore } from "@/stores";
import { usePlayerController } from "@/core/player/PlayerController";
import { isElectron, checkIsolationSupport } from "@/utils/env";
import { renderOption } from "@/utils/helper";
import { SettingConfig } from "@/types/settings";
import { AI_AUDIO_LEVELS } from "@/utils/meta";
import { openSongUnlockManager } from "@/utils/modal";
import { NTooltip, SelectOption } from "naive-ui";
import { uniqBy } from "lodash-es";

import { computed, ref, h, watch } from "vue";

export const usePlaySettings = (): SettingConfig => {
  const settingStore = useSettingStore();
  const player = usePlayerController();

  // 音频引擎数据
  const audioEngineData = {
    element: {
      label: "Web Audio",
      value: "element",
      tip: "浏览器原生播放引擎，稳定可靠占用低，但不支持部分音频格式",
    },
    ffmpeg: {
      label: "FFmpeg",
      value: "ffmpeg",
      tip: "FFmpeg 播放引擎，支持更多音频格式，但不支持部分功能，如倍速播放",
    },
    mpv: {
      label: "MPV",
      value: "mpv",
      tip: "MPV 播放引擎，支持更多格式与高采样率且原生输出至系统音频，但不支持均衡器和频谱等功能",
    },
  };

  // 引擎提示文案
  const engineTip = computed(() => {
    if (settingStore.playbackEngine === "mpv") {
      return audioEngineData.mpv?.tip;
    }
    return audioEngineData[settingStore.audioEngine as keyof typeof audioEngineData]?.tip;
  });

  // 音频引擎选项渲染函数 (处理禁用状态的 Tooltip)
  const renderAudioEngineOption = ({
    node,
    option,
  }: {
    node: VNodeChild;
    option: SelectOption;
  }) => {
    if (option.value === "ffmpeg" && option.disabled) {
      return h(
        NTooltip,
        { placement: "left", keepAliveOnHover: false },
        {
          trigger: () => h("div", { style: "cursor: not-allowed;" }, [node]),
          default: () => "当前环境不支持 FFmpeg",
        },
      );
    }
    if (option.value === "mpv" && option.disabled) {
      return h(
        NTooltip,
        { placement: "left", keepAliveOnHover: false },
        {
          trigger: () => h("div", { style: "cursor: not-allowed;" }, [node]),
          default: () => "当前环境不支持 MPV 引擎",
        },
      );
    }
    return node;
  };

  // 组合下拉选项
  const audioEngineOptions = [
    { label: "Web Audio (默认)", value: "element" },
    {
      label: "FFmpeg",
      value: "ffmpeg",
      disabled: !checkIsolationSupport(),
    },
    {
      label: "MPV",
      value: "mpv",
      disabled: !isElectron,
    },
  ];

  // 当前选中的引擎值
  const audioEngineSelectValue = computed<"element" | "ffmpeg" | "mpv">(() =>
    settingStore.playbackEngine === "mpv" ? "mpv" : settingStore.audioEngine,
  );

  // 处理引擎切换
  const handleAudioEngineSelect = async (value: "element" | "ffmpeg" | "mpv") => {
    if (value === "ffmpeg" && !checkIsolationSupport()) {
      window.$message.warning("当前环境不支持 FFmpeg 引擎，已回退至默认引擎");
      return;
    }

    const targetPlaybackEngine = value === "mpv" ? "mpv" : "web-audio";
    // 如果是切回 web-audio，且 value 为 element/ffmpeg，则更新 audioEngine
    const targetAudioEngine = value !== "mpv" ? value : settingStore.audioEngine;

    // 检查是否有变化
    if (
      targetPlaybackEngine === settingStore.playbackEngine &&
      targetAudioEngine === settingStore.audioEngine
    ) {
      return;
    }

    // 如果切换到 MPV 引擎，先检查是否已安装
    if (targetPlaybackEngine === "mpv") {
      if (!isElectron) {
        window.$message.warning("当前环境不支持 MPV 引擎，已回退至默认引擎");
        return;
      }
      try {
        const result = await window.electron.ipcRenderer.invoke("mpv-check-installed");
        if (!result.installed) {
          window.$message.error("未检测到 MPV，请先安装 MPV 播放器", { duration: 3000 });
          return;
        }
      } catch (e) {
        console.error("Check MPV installed failed", e);
        return;
      }
    }

    window.$dialog.warning({
      title: "更换播放引擎",
      content: "更换播放引擎需要重启应用以确保设置生效，是否立即重启？",
      positiveText: "重启",
      negativeText: "取消",
      onPositiveClick: () => {
        settingStore.playbackEngine = targetPlaybackEngine;
        settingStore.audioEngine = targetAudioEngine;
        if (isElectron) {
          window.electron.ipcRenderer.send("win-restart");
        } else {
          window.location.reload();
        }
      },
    });
  };

  const outputDevices = ref<SelectOption[]>([]);

  // 获取全部输出设备
  const getOutputDevices = async () => {
    if (!isElectron) return; // 简单处理：非 Electron 环境暂不复杂处理

    // MPV 引擎：从主进程查询 mpv 设备列表
    if (settingStore.playbackEngine === "mpv") {
      try {
        const result = await window.electron.ipcRenderer.invoke("mpv-get-audio-devices");
        if (result.success && result.devices) {
          outputDevices.value = result.devices.map(
            (device: { id: string; description: string }) => ({
              label: device.description,
              value: device.id,
            }),
          );

          // 初始化选中为当前 mpv 设备
          if (!settingStore.playDevice || settingStore.playDevice === "default") {
            const current = await window.electron.ipcRenderer.invoke(
              "mpv-get-current-audio-device",
            );
            if (current.success) {
              settingStore.playDevice = current.deviceId;
            } else {
              settingStore.playDevice = "auto";
            }
          }
        }
      } catch (e) {
        console.error("获取 MPV 音频设备失败:", e);
        if (!settingStore.playDevice || settingStore.playDevice === "default") {
          settingStore.playDevice = "auto";
        }
      }
      return;
    }

    // WebAudio 引擎：使用浏览器设备列表
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const devices = uniqBy(
        allDevices.filter((device) => device.kind === "audiooutput" && device.deviceId),
        "groupId",
      );
      const outputData = devices.filter((device) => device.kind === "audiooutput");
      outputDevices.value = outputData.map((device) => ({
        label: device.label,
        value: device.deviceId,
      }));
    } catch (e) {
      console.error("获取 WebAudio 设备失败", e);
    }
  };

  // 切换输出设备
  const playDeviceChange = async (deviceId: string) => {
    // 找到对应的 label 用于显示
    const option = outputDevices.value.find((d) => d.value === deviceId);
    const label = option?.label || deviceId;

    if (settingStore.playbackEngine === "mpv") {
      try {
        const result = await window.electron.ipcRenderer.invoke("mpv-set-audio-device", deviceId);
        if (result.success) {
          settingStore.playDevice = deviceId;
          window.$message.success(`已切换输出设备为 ${label}`);
        } else {
          window.$message.error(`切换输出设备失败: ${result.error}`);
        }
      } catch (e) {
        window.$message.error(`切换输出设备失败: ${e}`);
      }
      return;
    }

    player.toggleOutputDevice(deviceId);
    settingStore.playDevice = deviceId;
    window.$message.success(`已切换输出设备为 ${label}`);
  };
  // 监听播放引擎变化以刷新设备列表
  watch(
    () => settingStore.playbackEngine,
    () => {
      if (isElectron) getOutputDevices();
    },
  );

  const onActivate = () => {
    if (isElectron) getOutputDevices();
  };

  // 音质数据
  const songLevelData: Record<string, { label: string; tip: string; value: string }> = {
    standard: { label: "标准音质", tip: "标准音质 128kbps", value: "standard" },
    higher: { label: "较高音质", tip: "较高音质 328kbps", value: "higher" },
    exhigh: { label: "极高 (HQ)", tip: "近CD品质的细节体验，最高320kbps", value: "exhigh" },
    lossless: { label: "无损 (SQ)", tip: "高保真无损音质，最高48kHz/16bit", value: "lossless" },
    hires: {
      label: "高解析度无损 (Hi-Res)",
      tip: "更饱满清晰的高解析度音质，最高192kHz/24bit",
      value: "hires",
    },
    jyeffect: {
      label: "高清臻音 (Spatial Audio)",
      tip: "声音听感增强，96kHz/24bit",
      value: "jyeffect",
    },
    jymaster: { label: "超清母带 (Master)", tip: "还原音频细节，192kHz/24bit", value: "jymaster" },
    sky: {
      label: "沉浸环绕声 (Surround Audio)",
      tip: "沉浸式空间环绕音感，最高5.1声道",
      value: "sky",
    },
    vivid: {
      label: "臻音全景声 (Audio Vivid)",
      tip: "极致沉浸三维空间音频，最高7.1.4声道",
      value: "vivid",
    },
    dolby: {
      label: "杜比全景声 (Dolby Atmos)",
      tip: "杜比全景声音乐，沉浸式聆听体验",
      value: "dolby",
    },
  };

  // 动态计算音质选项
  const songLevelOptions = computed(() => {
    const options = Object.values(songLevelData);

    if (settingStore.disableAiAudio) {
      return options.filter((option) => {
        if (option.value === "dolby") return true;
        // 正确的类型转换或检查
        return !AI_AUDIO_LEVELS.includes(option.value);
      });
    }
    return options;
  });

  // 监听 Fuck AI Mode，重置不合法音质
  watch(
    () => settingStore.disableAiAudio,
    (val) => {
      if (!val) return;
      // 正确的类型检查
      if (AI_AUDIO_LEVELS.includes(settingStore.songLevel)) {
        settingStore.songLevel = "hires";
      }
    },
  );

  return {
    onActivate,
    groups: [
      {
        title: "播放控制",
        items: [
          {
            key: "autoPlay",
            label: "自动播放",
            type: "switch",
            description: "启动软件时是否自动播放",
            show: isElectron,
            value: computed({
              get: () => settingStore.autoPlay,
              set: (v) => (settingStore.autoPlay = v),
            }),
            disabled: !isElectron,
          },
          {
            key: "useNextPrefetch",
            label: "下一首歌曲预载",
            type: "switch",
            description: "提前预加载下一首歌曲的播放地址，提升切换速度",
            value: computed({
              get: () => settingStore.useNextPrefetch,
              set: (v) => (settingStore.useNextPrefetch = v),
            }),
          },
          {
            key: "memoryLastSeek",
            label: "记忆上次播放位置",
            type: "switch",
            description: "程序启动时恢复上次播放位置",
            value: computed({
              get: () => settingStore.memoryLastSeek,
              set: (v) => (settingStore.memoryLastSeek = v),
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
            key: "progressTooltipShow",
            label: "显示进度条悬浮信息",
            type: "switch",
            value: computed({
              get: () => settingStore.progressTooltipShow,
              set: (v) => (settingStore.progressTooltipShow = v),
            }),
            children: [
              {
                key: "progressLyricShow",
                label: "进度条悬浮时显示歌词",
                type: "switch",
                value: computed({
                  get: () => settingStore.progressLyricShow,
                  set: (v) => (settingStore.progressLyricShow = v),
                }),
              },
            ],
          },
          {
            key: "progressAdjustLyric",
            label: "进度调节吸附最近歌词",
            type: "switch",
            description: "进度调节时从当前时间最近一句歌词开始播放",
            value: computed({
              get: () => settingStore.progressAdjustLyric,
              set: (v) => (settingStore.progressAdjustLyric = v),
            }),
          },
          {
            key: "songVolumeFade",
            label: "音乐渐入渐出",
            type: "switch",
            value: computed({
              get: () => settingStore.songVolumeFade,
              set: (v) => (settingStore.songVolumeFade = v),
            }),
            children: [
              {
                key: "songVolumeFadeTime",
                label: "渐入渐出时长",
                type: "input-number",
                description: "单位 ms，最小 200，最大 2000",
                min: 200,
                max: 2000,
                suffix: "ms",
                value: computed({
                  get: () => settingStore.songVolumeFadeTime,
                  set: (v) => (settingStore.songVolumeFadeTime = v),
                }),
              },
            ],
          },
          {
            key: "enableAutomix",
            label: "启用自动混音",
            type: "switch",
            tags: [{ text: "Beta", type: "warning" }],
            description: computed(() =>
              settingStore.playbackEngine === "web-audio"
                ? "是否启用自动混音功能"
                : "自动混音功能仅在使用 Web Audio 引擎时可用",
            ),
            value: computed({
              get: () => settingStore.enableAutomix,
              set: (v) => {
                if (v) {
                  window.$dialog.warning({
                    title: "启用自动混音 (Beta)",
                    content:
                      "可能出现兼容性问题，该功能在早期测试，遇到问题请反馈issue，不保证可以及时处理。效果可能因为歌曲而异，保守策略。",
                    positiveText: "开启",
                    negativeText: "取消",
                    onPositiveClick: () => {
                      settingStore.enableAutomix = true;
                    },
                  });
                } else {
                  settingStore.enableAutomix = v;
                }
              },
            }),
            disabled: computed(() => settingStore.playbackEngine !== "web-audio"),
            children: [
              {
                key: "automixMaxAnalyzeTime",
                label: "最大分析时间",
                type: "input-number",
                description: "单位秒，越长越精准但更耗时 (建议 60s)",
                min: 5,
                max: 300,
                suffix: "s",
                value: computed({
                  get: () => settingStore.automixMaxAnalyzeTime,
                  set: (v) => (settingStore.automixMaxAnalyzeTime = v),
                }),
              },
            ],
          },
        ],
      },
      {
        title: "音频设置",
        items: [
          {
            key: "songLevel",
            label: "在线歌曲音质",
            type: "select",
            description: () => songLevelData[settingStore.songLevel]?.tip,
            options: songLevelOptions,
            componentProps: {
              renderOption,
            },
            value: computed({
              get: () => settingStore.songLevel,
              set: (v) => (settingStore.songLevel = v),
            }),
          },
          {
            key: "disableAiAudio",
            label: "Fuck AI Mode",
            type: "switch",
            description:
              "开启后将隐藏部分 AI 增强音质选项（如超清母带、沉浸环绕声等），但会保留杜比全景声",
            value: computed({
              get: () => settingStore.disableAiAudio,
              set: (v) => (settingStore.disableAiAudio = v),
            }),
          },
          {
            key: "disableDjMode",
            label: "Fuck DJ Mode",
            type: "switch",
            description: "歌曲名字带有 DJ 抖音 0.9 0.8 网红 车载 热歌 慢摇 自动跳过",
            value: computed({
              get: () => settingStore.disableDjMode,
              set: (v) => (settingStore.disableDjMode = v),
            }),
          },
          {
            key: "audioEngine",
            label: "音频处理引擎",
            type: "select",
            tags: [{ text: "Beta", type: "warning" }],
            description: () =>
              h("div", [
                h("span", null, engineTip.value),
                h("br"),
                h(NTooltip, null, {
                  default: () => "重启应用以生效",
                  trigger: () =>
                    h("span", { style: "color: var(--n-warning-color);" }, "重启应用以生效"),
                }),
              ]),
            options: audioEngineOptions,
            componentProps: {
              renderOption: renderAudioEngineOption,
            },
            value: computed({
              get: () => audioEngineSelectValue.value,
              set: (v) => handleAudioEngineSelect(v),
            }),
          },
          {
            key: "playSongDemo",
            label: "播放试听",
            type: "switch",
            description: "是否在非会员状态下播放试听歌曲",
            show: !isElectron,
            value: computed({
              get: () => settingStore.playSongDemo,
              set: (v) => (settingStore.playSongDemo = v),
            }),
          },
          {
            key: "playDevice",
            label: "音频输出设备",
            type: "select",
            show: isElectron,
            description: (() => {
              return () => {
                if (settingStore.audioEngine === "ffmpeg") return "FFmpeg 引擎不支持切换输出设备";
                if (settingStore.playbackEngine === "mpv")
                  return '如不知怎么选择，请选择 "Autoselect" 或者 "Default" 设备，选错可能导致无声，或处于锁死状态，重新选择 "Autoselect" 后切歌即可解决';
                return "新增或移除音频设备后请重新打开设置";
              };
            })(),
            options: outputDevices,
            componentProps: {
              renderOption,
            },
            disabled: computed(
              () => settingStore.playbackEngine !== "mpv" && settingStore.audioEngine === "ffmpeg",
            ),
            value: computed({
              get: () => settingStore.playDevice,
              set: (v) => playDeviceChange(v),
            }),
          },
          {
            key: "enableReplayGain",
            label: "音量平衡",
            type: "switch",
            description:
              "平衡不同音频内容之间的音量大小（需要本地歌曲标签中有 replayGain 数据才会生效）",
            value: computed({
              get: () => settingStore.enableReplayGain,
              set: (v) => (settingStore.enableReplayGain = v),
            }),
            children: [
              {
                key: "replayGainMode",
                label: "平衡模式",
                type: "select",
                description: "选择音量平衡的计算基准",
                options: [
                  { label: "单曲 (Track)", value: "track" },
                  { label: "专辑 (Album)", value: "album" },
                ],
                value: computed({
                  get: () => settingStore.replayGainMode,
                  set: (v) => (settingStore.replayGainMode = v),
                }),
              },
            ],
          },
        ],
      },
      {
        title: "音乐解锁",
        tags: [{ text: "Beta", type: "warning" }],
        show: isElectron,
        items: [
          {
            key: "useSongUnlock",
            label: "音乐解锁",
            type: "switch",
            description: "在无法正常播放时进行替换，可能会与原曲不符",
            value: computed({
              get: () => settingStore.useSongUnlock,
              set: (v) => (settingStore.useSongUnlock = v),
            }),
          },
          {
            key: "songUnlockConfig",
            label: "音源配置",
            type: "button",
            description: "配置歌曲解锁的音源顺序或是否启用",
            buttonLabel: "配置",
            action: openSongUnlockManager,
            disabled: computed(() => !settingStore.useSongUnlock),
          },
        ],
      },
    ],
  };
};
