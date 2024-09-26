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
          <n-text class="name">记忆上次播放位置</n-text>
          <n-text class="tip" :depth="3">程序启动时恢复上次播放位置</n-text>
        </div>
        <n-switch v-model:value="settingStore.memoryLastSeek" class="set" :round="false" />
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
          <n-text class="name">音乐解锁</n-text>
          <n-text class="tip" :depth="3">在无法正常播放时进行替换，可能会与原曲不符</n-text>
        </div>
        <n-switch v-model:value="settingStore.useSongUnlock" class="set" :round="false" />
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
              disabled: true,
              value: 'animation',
            },
            {
              label: '封面模糊',
              value: 'blur',
            },
            {
              label: '封面主色',
              disabled: true,
              value: 'color',
            },
            {
              label: '无背景',
              disabled: true,
              value: 'none',
            },
          ]"
          class="set"
        />
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
          <n-text class="name">播放列表歌曲数量</n-text>
        </div>
        <n-switch v-model:value="settingStore.showPlaylistCount" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">音乐频谱</n-text>
          <n-text class="tip" :depth="3">开启音乐频谱会极大影响性能，如遇问题请关闭</n-text>
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
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">输出高清封面</n-text>
          <n-text class="tip" :depth="3">开启 SMTC 时是否输出高清封面</n-text>
        </div>
        <n-switch
          v-model:value="settingStore.smtcOutputHighQualityCover"
          class="set"
          :round="false"
          :disabled="!settingStore.smtcOpen || true"
        />
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui";
import { useSettingStore } from "@/stores";
import { isElectron, renderOption } from "@/utils/helper";
import { uniqBy } from "lodash";
import player from "@/utils/player";

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
    label: "极高 HQ",
    tip: "近 CD 品质的细节体验，最高 320kbps",
    value: "exhigh",
  },
  lossless: {
    label: "无损 SQ",
    tip: "高保真无损音质，最高 48kHz/16bit",
    value: "lossless",
  },
  hires: {
    label: "高清臻音 Spatial Audio",
    tip: "环绕声体验，声音听感增强，96kHz/24bit",
    value: "hires",
  },
  jymaster: {
    label: "超清母带 Master",
    tip: "还原音频细节，192kHz/24bit",
    value: "jymaster",
  },
  sky: {
    label: "沉浸环绕声 Surround Audio",
    tip: "沉浸式体验，最高 5.1 声道",
    value: "sky",
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
  if (settingStore.showSpectrums) {
    window.$dialog.warning({
      title: "音频通道占用",
      content:
        "由于系统限制，切换音频输出设备会导致音乐频谱失效，将会关闭音乐频谱，并将于热重载后生效（ 请点击右上角的设置菜单中的热重载按钮 ），是否继续？",
      positiveText: "继续",
      negativeText: "取消",
      closeOnEsc: false,
      closable: false,
      maskClosable: false,
      autoFocus: false,
      onPositiveClick: () => {
        showSpectrums.value = false;
        settingStore.showSpectrums = false;
        player.toggleOutputDevice(deviceId);
        window.$message.success(`已切换输出设备为 ${option.label}`);
      },
      onNegativeClick: () => {
        settingStore.playDevice = "default";
      },
    });
  } else {
    player.toggleOutputDevice(deviceId);
    window.$message.success(`已切换输出设备为 ${option.label}`);
  }
};

// 显示音乐频谱更改
const showSpectrumsChange = (value: boolean) => {
  if (value) {
    if (settingStore.playDevice !== "default") {
      window.$dialog.warning({
        title: "音频通道占用",
        content: "开启音乐频谱会导致自定义音频输出设备失效，将会恢复默认输出设备，是否继续开启？",
        positiveText: "开启",
        negativeText: "取消",
        onPositiveClick: () => {
          showSpectrums.value = true;
          settingStore.showSpectrums = true;
          settingStore.playDevice = "default";
          player.toggleOutputDevice("default");
        },
      });
      return;
    }
    showSpectrums.value = true;
    settingStore.showSpectrums = true;
  } else {
    showSpectrums.value = false;
    settingStore.showSpectrums = false;
  }
};

onMounted(() => {
  if (isElectron) {
    getOutputDevices();
  }
});
</script>
