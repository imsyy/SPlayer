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
          <n-text class="tip" :depth="3">新增或移除音频设备后请重新打开设置</n-text>
        </div>
        <n-select
          v-model:value="settingStore.playDevice"
          class="set"
          :options="outputDevices"
          :render-option="renderOption"
          @update:value="playDeviceChange"
        />
      </n-card>
    </div>
    <div v-if="isElectron && statusStore.isDeveloperMode" class="set-list">
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
          <n-text class="name">底栏歌词显示</n-text>
          <n-text class="tip" :depth="3">在播放时将歌手信息更改为歌词</n-text>
        </div>
        <n-switch v-model:value="settingStore.barLyricShow" class="set" :round="false" />
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
          <n-text class="name">播放列表歌曲数量</n-text>
        </div>
        <n-switch v-model:value="settingStore.showPlaylistCount" class="set" :round="false" />
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
            开启音乐频谱会影响性能或增加内存占用，如遇问题请关闭
          </n-text>
        </div>
        <n-switch
          class="set"
          :value="showSpectrums"
          :round="false"
          @update:value="showSpectrumsChange"
        />
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> 系统集成 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">开启 SMTC</n-text>
          <n-text class="tip" :depth="3">与系统集成以显示媒体元数据</n-text>
        </div>
        <n-switch v-model:value="settingStore.smtcOpen" class="set" :round="false" />
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui";
import { useSettingStore, useStatusStore } from "@/stores";
import { isLogin } from "@/utils/auth";
import { renderOption } from "@/utils/helper";
import { isElectron } from "@/utils/env";
import { uniqBy } from "lodash";
import { usePlayerController } from "@/core/player/PlayerController";
import { openSongUnlockManager } from "@/utils/modal";

const player = usePlayerController();
const statusStore = useStatusStore();
const settingStore = useSettingStore();
// 输出设备数据
const outputDevices = ref<SelectOption[]>([]);

// 显示音乐频谱
const showSpectrums = ref<boolean>(settingStore.showSpectrums);

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

// 获取全部输出设备
const getOutputDevices = async () => {
  const allDevices = await navigator.mediaDevices.enumerateDevices();
  // 过滤同一设备输出源
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

// 切换输出设备
const playDeviceChange = (deviceId: string, option: SelectOption) => {
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
</script>
