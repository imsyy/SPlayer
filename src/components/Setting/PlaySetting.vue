<!-- 播放设置 -->
<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> {{ t("settings.play.playback") }} </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.autoPlay") }}</n-text>
          <n-text v-if="isElectron" class="tip" :depth="3">{{ t("settings.play.autoPlayTip") }}</n-text>
          <n-text v-else class="tip" :depth="3">{{ t("settings.play.webNotSupport") }}</n-text>
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
          <n-text class="name">{{ t("settings.play.preloadNext") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.play.preloadNextTip") }}</n-text>
        </div>

        <n-switch v-model:value="settingStore.useNextPrefetch" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.memoryLastSeek") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.play.memoryLastSeekTip") }}</n-text>
        </div>

        <n-switch v-model:value="settingStore.memoryLastSeek" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.progressTooltip") }}</n-text>
        </div>

        <n-switch v-model:value="settingStore.progressTooltipShow" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.progressLyric") }}</n-text>
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
          <n-text class="name">{{ t("settings.play.progressSnap") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.play.progressSnapTip") }}</n-text>
        </div>

        <n-switch v-model:value="settingStore.progressAdjustLyric" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.fade") }}</n-text>
        </div>

        <n-switch v-model:value="settingStore.songVolumeFade" class="set" :round="false" />
      </n-card>
      <n-collapse-transition :show="settingStore.songVolumeFade">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.play.fadeDuration") }}</n-text>
            <n-text class="tip" :depth="3">{{ t("settings.play.fadeDurationTip") }}</n-text>
          </div>
          <n-input-number

            v-model:value="settingStore.songVolumeFadeTime"
            :min="200"
            :max="2000"
            :show-button="false"
            class="set"
            :placeholder="t('settings.play.fadeDurationPlaceholder')"
          >
            <template #suffix> ms </template>

          </n-input-number>
        </n-card>
      </n-collapse-transition>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.quality") }}</n-text>
          <n-text class="tip" :depth="3"> {{ songLevelData[settingStore.songLevel]?.tip }}</n-text>
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
          <n-text class="name">{{ t("settings.play.trial") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.play.trialTip") }}</n-text>
        </div>

        <n-switch v-model:value="settingStore.playSongDemo" class="set" :round="false" />
      </n-card>
      <n-card v-if="isElectron" class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.outputDevice") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.play.outputDeviceTip") }}</n-text>
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
        {{ t("settings.play.unlock") }}
        <n-tag type="warning" size="small" round>Beta</n-tag>
      </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.unlock") }}</n-text>
          <n-text class="tip" :depth="3"> {{ t("settings.play.unlockTip") }} </n-text>
        </div>

        <n-switch v-model:value="settingStore.useSongUnlock" class="set" :round="false" />
      </n-card>
      <!-- 音源配置 -->
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.sourceConfig") }}</n-text>
          <n-text class="tip" :depth="3"> {{ t("settings.play.sourceConfigTip") }} </n-text>
        </div>

        <n-button
          :disabled="!settingStore.useSongUnlock"
          type="primary"
          strong
          secondary
          @click="openSongUnlockManager"
        >
          {{ t("settings.general.configure") }}
        </n-button>
      </n-card>

    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> {{ t("settings.play.player") }} </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.expandAnim") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.play.expandAnimTip") }}</n-text>
        </div>

        <n-select
          v-model:value="settingStore.playerExpandAnimation"
          :options="[
            {
              label: t('settings.play.lyricTransitionOptions.up'),
              value: 'up',
            },
            {
              label: t('settings.play.lyricTransitionOptions.smooth'),
              value: 'smooth',
            },
          ]"

          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.playerStyle") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.play.playerStyleTip") }}</n-text>
        </div>

        <n-select
          v-model:value="settingStore.playerType"
          :options="[
            {
              label: t('settings.play.playerStyleOptions.cover'),
              value: 'cover',
            },
            {
              label: t('settings.play.playerStyleOptions.record'),
              value: 'record',
            },
          ]"

          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.bgStyle") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.play.bgStyleTip") }}</n-text>
        </div>

        <n-select
          v-model:value="settingStore.playerBackgroundType"
          :options="[
            {
              label: t('settings.play.bgStyleOptions.animation'),
              value: 'animation',
            },
            {
              label: t('settings.play.bgStyleOptions.blur'),
              value: 'blur',
            },
            {
              label: t('settings.play.bgStyleOptions.color'),
              value: 'color',
            },
          ]"

          class="set"
        />
      </n-card>
      <n-collapse-transition :show="settingStore.playerBackgroundType === 'animation'">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.play.bgFps") }}</n-text>
            <n-text class="tip" :depth="3">{{ t("settings.play.bgFpsTip") }}</n-text>
          </div>

          <n-input-number
            v-model:value="settingStore.playerBackgroundFps"
            :min="24"
            :max="256"
            :show-button="false"
            class="set"
            :placeholder="t('settings.play.bgFpsPlaceholder')"
          />
        </n-card>

        <n-card class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.play.bgSpeed") }}</n-text>
            <n-text class="tip" :depth="3">{{ t("settings.play.bgSpeedTip") }}</n-text>
          </div>

          <n-input-number
            v-model:value="settingStore.playerBackgroundFlowSpeed"
            :min="0.1"
            :max="10"
            :show-button="false"
            class="set"
            :placeholder="t('settings.play.bgSpeedPlaceholder')"
          />

        </n-card>
      </n-collapse-transition>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.followCover") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.play.followCoverTip") }}</n-text>
        </div>

        <n-switch v-model:value="settingStore.playerFollowCoverColor" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.introCountdown") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.play.introCountdownTip") }}</n-text>
        </div>

        <n-switch v-model:value="settingStore.countDownShow" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.bottomLyric") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.play.bottomLyricTip") }}</n-text>
        </div>

        <n-switch v-model:value="settingStore.barLyricShow" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.autoHide") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.play.autoHideTip") }}</n-text>
        </div>

        <n-switch v-model:value="settingStore.autoHidePlayerMeta" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.playStatus") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.play.playStatusTip") }}</n-text>
        </div>

        <n-switch v-model:value="settingStore.showPlayMeta" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.playlistCount") }}</n-text>
        </div>

        <n-switch v-model:value="settingStore.showPlaylistCount" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.dynamicCover") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.play.dynamicCoverTip") }}</n-text>
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
          <n-text class="name">{{ t("settings.play.spectrum") }}</n-text>
          <n-text class="tip" :depth="3">
            {{ t("settings.play.spectrumTip") }}
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
      <n-h3 prefix="bar"> {{ t("settings.play.system") }} </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.play.smtc") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.play.smtcTip") }}</n-text>
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
import { useI18n } from "vue-i18n";

const player = usePlayerController();
const statusStore = useStatusStore();
const settingStore = useSettingStore();
const { t } = useI18n();

// 输出设备数据
const outputDevices = ref<SelectOption[]>([]);

// 显示音乐频谱
const showSpectrums = ref<boolean>(settingStore.showSpectrums);

// 音质数据
const songLevelData = computed(() => ({
  standard: {
    label: t("settings.play.qualityLabel.standard"),
    tip: t("settings.play.qualityTip.standard"),
    value: "standard",
  },
  higher: {
    label: t("settings.play.qualityLabel.higher"),
    tip: t("settings.play.qualityTip.higher"),
    value: "higher",
  },
  exhigh: {
    label: t("settings.play.qualityLabel.exhigh"),
    tip: t("settings.play.qualityTip.exhigh"),
    value: "exhigh",
  },
  lossless: {
    label: t("settings.play.qualityLabel.lossless"),
    tip: t("settings.play.qualityTip.lossless"),
    value: "lossless",
  },
  hires: {
    label: t("settings.play.qualityLabel.hires"),
    tip: t("settings.play.qualityTip.hires"),
    value: "hires",
  },
  jyeffect: {
    label: t("settings.play.qualityLabel.jyeffect"),
    tip: t("settings.play.qualityTip.jyeffect"),
    value: "jyeffect",
  },
  jymaster: {
    label: t("settings.play.qualityLabel.jymaster"),
    tip: t("settings.play.qualityTip.jymaster"),
    value: "jymaster",
  },
  sky: {
    label: t("settings.play.qualityLabel.sky"),
    tip: t("settings.play.qualityTip.sky"),
    value: "sky",
  },
  vivid: {
    label: t("settings.play.qualityLabel.vivid"),
    tip: t("settings.play.qualityTip.vivid"),
    value: "vivid",
  },
  dolby: {
    label: t("settings.play.qualityLabel.dolby"),
    tip: t("settings.play.qualityTip.dolby"),
    value: "dolby",
  },
}));


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
  window.$message.success(t("settings.play.switchDevice", { device: option.label }));
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
