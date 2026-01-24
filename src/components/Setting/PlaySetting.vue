<!-- 播放设置 -->
<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> 歌曲播放 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">自动播放</n-text>
          <n-text v-if="isElectron" class="tip" :depth="3">启动时是否自动播放</n-text>
          <n-text v-else class="tip" :depth="3">网页端不支持该功能</n-text>
        </div>
        <n-switch
          v-model:value="settingStore.autoPlay"
          class="set"
          :round="false"
          :disabled="!isElectron"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">下一首歌曲预载</n-text>
          <n-text class="tip" :depth="3">提前预加载下一首歌曲的播放地址，提升切换速度</n-text>
        </div>
        <n-switch v-model:value="settingStore.useNextPrefetch" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">记忆上次播放位置</n-text>
          <n-text class="tip" :depth="3">程序启动时恢复上次播放位置</n-text>
        </div>
        <n-switch v-model:value="settingStore.memoryLastSeek" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示进度条悬浮信息</n-text>
        </div>
        <n-switch v-model:value="settingStore.progressTooltipShow" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">进度条悬浮时显示歌词</n-text>
        </div>
        <n-switch
          v-model:value="settingStore.progressLyricShow"
          :disabled="!settingStore.progressTooltipShow"
          :round="false"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">进度调节吸附最近歌词</n-text>
          <n-text class="tip" :depth="3">进度调节时从当前时间最近一句歌词开始播放</n-text>
        </div>
        <n-switch v-model:value="settingStore.progressAdjustLyric" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">音乐渐入渐出</n-text>
        </div>
        <n-switch v-model:value="settingStore.songVolumeFade" class="set" :round="false" />
      </n-card>
      <n-collapse-transition :show="settingStore.songVolumeFade">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">渐入渐出时长</n-text>
            <n-text class="tip" :depth="3">单位 ms，最小 200，最大 2000</n-text>
          </div>
          <n-input-number
            v-model:value="settingStore.songVolumeFadeTime"
            :min="200"
            :max="2000"
            :show-button="false"
            class="set"
            placeholder="请输入渐入渐出时长"
          >
            <template #suffix> ms </template>
          </n-input-number>
        </n-card>
      </n-collapse-transition>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">在线歌曲音质</n-text>
          <n-text class="tip" :depth="3"> {{ songLevelData[settingStore.songLevel].tip }}</n-text>
        </div>
        <n-select
          v-model:value="settingStore.songLevel"
          :options="Object.values(songLevelData)"
          :render-option="renderOption"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">
            音频处理引擎
            <n-tag type="warning" size="small" round> Beta </n-tag>
          </n-text>
          <n-text class="tip" :depth="3">
            {{ engineTip }} <br />
            <n-text type="warning">重启应用以生效</n-text>
          </n-text>
        </div>
        <n-select
          :value="audioEngineSelectValue"
          :options="audioEngineOptions"
          class="set"
          @update:value="handleAudioEngineSelect"
        />
      </n-card>
      <n-card v-if="!isElectron" class="set-item">
        <div class="label">
          <n-text class="name">播放试听</n-text>
          <n-text class="tip" :depth="3">是否在非会员状态下播放试听歌曲</n-text>
        </div>
        <n-switch v-model:value="settingStore.playSongDemo" class="set" :round="false" />
      </n-card>

      <n-card v-if="isElectron" class="set-item">
        <div class="label">
          <n-text class="name">音频输出设备</n-text>
          <n-text class="tip" :depth="3">
            {{
              settingStore.audioEngine === "ffmpeg"
                ? "FFmpeg 引擎不支持切换输出设备"
                : settingStore.playbackEngine === "mpv"
                  ? '如不知怎么选择，请选择"Autoselect"或者"Default"设备，选错可能导致无声，或处于锁死状态，重新选择"Autoselect"后切歌即可解决'
                  : "新增或移除音频设备后请重新打开设置"
            }}
          </n-text>
        </div>
        <n-select
          v-model:value="settingStore.playDevice"
          class="set"
          :options="outputDevices"
          :render-option="renderOption"
          :disabled="settingStore.playbackEngine !== 'mpv' && settingStore.audioEngine === 'ffmpeg'"
          @update:value="playDeviceChange"
        />
      </n-card>
    </div>
    <div v-if="isElectron" class="set-list">
      <n-h3 prefix="bar">
        音乐解锁
        <n-tag type="warning" size="small" round>Beta</n-tag>
      </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">音乐解锁</n-text>
          <n-text class="tip" :depth="3"> 在无法正常播放时进行替换，可能会与原曲不符 </n-text>
        </div>
        <n-switch v-model:value="settingStore.useSongUnlock" class="set" :round="false" />
      </n-card>
      <!-- 音源配置 -->
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">音源配置</n-text>
          <n-text class="tip" :depth="3"> 配置歌曲解锁的音源顺序或是否启用 </n-text>
        </div>
        <n-button
          :disabled="!settingStore.useSongUnlock"
          type="primary"
          strong
          secondary
          @click="openSongUnlockManager"
        >
          配置
        </n-button>
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> 播放器 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">播放器展开动画</n-text>
          <n-text class="tip" :depth="3">选择播放器展开时的动画效果</n-text>
        </div>
        <n-select
          v-model:value="settingStore.playerExpandAnimation"
          :options="[
            {
              label: '上浮',
              value: 'up',
            },
            {
              label: '平滑',
              value: 'smooth',
            },
          ]"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">播放器样式</n-text>
          <n-text class="tip" :depth="3">播放器主体样式</n-text>
        </div>
        <n-select
          v-model:value="settingStore.playerType"
          :options="[
            {
              label: '封面模式',
              value: 'cover',
            },
            {
              label: '唱片模式',
              value: 'record',
            },
          ]"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">封面/歌词占比</n-text>
          <n-text class="tip" :depth="3">调整全屏模式下封面与歌词的宽度比例</n-text>
        </div>
        <n-slider
          v-model:value="settingStore.playerStyleRatio"
          :min="30"
          :max="70"
          :step="1"
          :marks="{ 50: '默认' }"
          :format-tooltip="(value: number) => `${value}%`"
          class="set"
        />
      </n-card>

      <n-card class="set-item">
        <div class="label">
          <n-text class="name">播放器背景样式</n-text>
          <n-text class="tip" :depth="3">切换播放器背景类型</n-text>
        </div>
        <n-select
          v-model:value="settingStore.playerBackgroundType"
          :options="[
            {
              label: '流体效果',
              value: 'animation',
            },
            {
              label: '封面模糊',
              value: 'blur',
            },
            {
              label: '封面主色',
              value: 'color',
            },
          ]"
          class="set"
        />
      </n-card>
      <n-collapse-transition :show="settingStore.playerBackgroundType === 'animation'">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">背景动画帧率</n-text>
            <n-text class="tip" :depth="3">单位 fps，最小 24，最大 240</n-text>
          </div>
          <n-input-number
            v-model:value="settingStore.playerBackgroundFps"
            :min="24"
            :max="256"
            :show-button="false"
            class="set"
            placeholder="请输入背景动画帧率"
          />
        </n-card>
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">背景动画流动速度</n-text>
            <n-text class="tip" :depth="3">单位 倍数，最小 0.1，最大 10</n-text>
          </div>
          <n-input-number
            v-model:value="settingStore.playerBackgroundFlowSpeed"
            :min="0.1"
            :max="10"
            :show-button="false"
            class="set"
            placeholder="请输入背景动画流动速度"
          />
        </n-card>
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">背景渲染缩放比例</n-text>
            <n-text class="tip" :depth="3">设置当前渲染缩放比例，默认 0.5</n-text>
            <n-text class="tip" :depth="3">
              适当提高此值（如 1.0 或 1.5）可以减少分界线锯齿，让效果更好，但也会增加显卡压力
            </n-text>
          </div>
          <n-input-number
            v-model:value="settingStore.playerBackgroundRenderScale"
            :min="0.1"
            :max="10"
            :show-button="false"
            class="set"
            placeholder="请输入背景渲染缩放比例"
          />
        </n-card>
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">背景动画暂停时暂停</n-text>
            <n-text class="tip" :depth="3">在暂停时是否也暂停背景动画</n-text>
          </div>
          <n-switch v-model:value="settingStore.playerBackgroundPause" class="set" :round="false" />
        </n-card>
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">背景跳动效果</n-text>
            <n-text class="tip" :depth="3">使流体背景根据音乐低频节拍产生脉动效果</n-text>
          </div>
          <n-switch
            v-model:value="settingStore.playerBackgroundLowFreqVolume"
            :round="false"
            class="set"
          />
        </n-card>
      </n-collapse-transition>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">播放器主色跟随封面</n-text>
          <n-text class="tip" :depth="3">播放器主颜色是否跟随封面主色，下一曲生效</n-text>
        </div>
        <n-switch v-model:value="settingStore.playerFollowCoverColor" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示前奏倒计时</n-text>
          <n-text class="tip" :depth="3">部分歌曲前奏可能存在显示错误</n-text>
        </div>
        <n-switch v-model:value="settingStore.countDownShow" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">播放器元素自动隐藏</n-text>
          <n-text class="tip" :depth="3">鼠标静止一段时间或者离开播放器时自动隐藏控制元素</n-text>
        </div>
        <n-switch v-model:value="settingStore.autoHidePlayerMeta" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">展示播放状态信息</n-text>
          <n-text class="tip" :depth="3">展示当前歌曲及歌词的状态信息</n-text>
        </div>
        <n-switch v-model:value="settingStore.showPlayMeta" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">动态封面</n-text>
          <n-text class="tip" :depth="3">可展示部分歌曲的动态封面，仅在封面模式有效</n-text>
        </div>
        <n-switch
          v-model:value="settingStore.dynamicCover"
          :disabled="isLogin() !== 1"
          :round="false"
          class="set"
        />
      </n-card>
      <n-card v-if="isElectron" class="set-item">
        <div class="label">
          <n-text class="name">音乐频谱</n-text>
          <n-text class="tip" :depth="3">
            {{
              settingStore.playbackEngine === "mpv"
                ? "MPV 引擎暂不支持显示音乐频谱"
                : "开启音乐频谱会影响性能或增加内存占用，如遇问题请关闭"
            }}
          </n-text>
        </div>
        <n-switch
          class="set"
          :value="showSpectrums"
          :round="false"
          :disabled="settingStore.playbackEngine === 'mpv'"
          @update:value="showSpectrumsChange"
        />
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> 全局播放器 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">时间显示格式</n-text>
          <n-text class="tip" :depth="3">
            底栏右侧和播放页面底部的时间如何显示（单击时间可以快速切换）
          </n-text>
        </div>
        <n-select
          v-model:value="settingStore.timeFormat"
          :options="timeFormatOptions"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">播放列表歌曲数量</n-text>
          <n-text class="tip" :depth="3"> 在右下角的播放列表按钮处显示播放列表的歌曲数量 </n-text>
        </div>
        <n-switch v-model:value="settingStore.showPlaylistCount" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">底栏歌词显示</n-text>
          <n-text class="tip" :depth="3">在播放时将歌手信息更改为歌词</n-text>
        </div>
        <n-switch v-model:value="settingStore.barLyricShow" class="set" :round="false" />
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayerController } from "@/core/player/PlayerController";
import { useSettingStore } from "@/stores";
import { isLogin } from "@/utils/auth";
import { isElectron } from "@/utils/env";
import { renderOption } from "@/utils/helper";
import { openSongUnlockManager } from "@/utils/modal";
import { uniqBy } from "lodash-es";
import type { SelectOption } from "naive-ui";

const player = usePlayerController();
const settingStore = useSettingStore();
// 输出设备数据
const outputDevices = ref<SelectOption[]>([]);

// 统一处理音频引擎选择
const handleAudioEngineSelect = async (value: "element" | "ffmpeg" | "mpv") => {
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
  if (targetPlaybackEngine === "mpv" && isElectron) {
    const result = await window.electron.ipcRenderer.invoke("mpv-check-installed");
    if (!result.installed) {
      window.$message.error("未检测到 MPV，请先安装 MPV 播放器", { duration: 3000 });
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

// 显示音乐频谱
const showSpectrums = ref<boolean>(settingStore.showSpectrums);

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

const engineTip = computed(() => {
  if (settingStore.playbackEngine === "mpv") {
    return audioEngineData.mpv?.tip;
  }
  return audioEngineData[settingStore.audioEngine]?.tip;
});

// 组合下拉选项：包含 WebAudio / FFmpeg / MPV
const audioEngineOptions = [
  { label: "Web Audio (默认)", value: "element" },
  { label: "FFmpeg", value: "ffmpeg" },
  { label: "MPV", value: "mpv" },
];

// 下拉显示值：MPV 时显示 mpv，否则显示当前音频引擎
const audioEngineSelectValue = computed<"element" | "ffmpeg" | "mpv">(() =>
  settingStore.playbackEngine === "mpv" ? "mpv" : settingStore.audioEngine,
);

// 音质数据
const songLevelData = {
  standard: {
    label: "标准音质",
    tip: "标准音质 128kbps",
    value: "standard",
  },
  higher: {
    label: "较高音质",
    tip: "较高音质 328kbps",
    value: "higher",
  },
  exhigh: {
    label: "极高 (HQ)",
    tip: "近CD品质的细节体验，最高320kbps",
    value: "exhigh",
  },
  lossless: {
    label: "无损 (SQ)",
    tip: "高保真无损音质，最高48kHz/16bit",
    value: "lossless",
  },
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
  jymaster: {
    label: "超清母带 (Master)",
    tip: "还原音频细节，192kHz/24bit",
    value: "jymaster",
  },
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

const timeFormatOptions = [
  {
    label: "播放时间 / 总时长",
    value: "current-total",
  },
  {
    label: "剩余时间 / 总时长",
    value: "remaining-total",
  },
  {
    label: "播放时间 / 剩余时间",
    value: "current-remaining",
  },
];

// 获取全部输出设备
const getOutputDevices = async () => {
  // MPV 引擎：从主进程查询 mpv 设备列表
  if (settingStore.playbackEngine === "mpv") {
    try {
      const result = await window.electron.ipcRenderer.invoke("mpv-get-audio-devices");
      if (result.success && result.devices) {
        outputDevices.value = result.devices.map((device: { id: string; description: string }) => ({
          label: device.description,
          value: device.id,
        }));

        // 初始化选中为当前 mpv 设备
        if (!settingStore.playDevice || settingStore.playDevice === "default") {
          const current = await window.electron.ipcRenderer.invoke("mpv-get-current-audio-device");
          if (current.success) {
            settingStore.playDevice = current.deviceId;
          } else {
            // 如果获取失败，默认使用 "auto"
            settingStore.playDevice = "auto";
          }
        }
      }
    } catch (e) {
      console.error("获取 MPV 音频设备失败:", e);
      // 出错时也设置为 "auto"
      if (!settingStore.playDevice || settingStore.playDevice === "default") {
        settingStore.playDevice = "auto";
      }
    }
    return;
  }

  // WebAudio 引擎：使用浏览器设备列表
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
};

// mpv 切换输出设备
const playDeviceChange = async (deviceId: string, option: SelectOption) => {
  if (settingStore.playbackEngine === "mpv") {
    try {
      const result = await window.electron.ipcRenderer.invoke("mpv-set-audio-device", deviceId);
      if (result.success) {
        window.$message.success(`已切换输出设备为 ${option.label}`);
      } else {
        window.$message.error(`切换输出设备失败: ${result.error}`);
      }
    } catch (e) {
      window.$message.error(`切换输出设备失败: ${e}`);
    }
    return;
  }

  player.toggleOutputDevice(deviceId);
  window.$message.success(`已切换输出设备为 ${option.label}`);
};

// 显示音乐频谱更改
const showSpectrumsChange = (value: boolean) => {
  showSpectrums.value = value;
  settingStore.showSpectrums = value;
};

onMounted(() => {
  if (isElectron) {
    getOutputDevices();
  }
});

// 监听播放引擎变化以刷新设备列表
watch(
  () => settingStore.playbackEngine,
  () => {
    if (isElectron) getOutputDevices();
  },
);
</script>
