<template>
  <n-flex class="spatial-audio" size="large" vertical>
    <n-alert :show-icon="false">
      实验性功能：模拟 "8D 环绕" 效果，声音会在左右耳之间周期性游走，建议佩戴耳机体验
    </n-alert>

    <n-flex align="center" justify="space-between" :size="8">
      <n-flex wrap :size="8" class="sa-presets">
        <n-tag
          v-for="(preset, key) in presetList"
          :key="key"
          :type="currentPreset === key ? 'primary' : 'default'"
          :bordered="currentPreset === key"
          :disabled="!enabled"
          round
          @click="applyPreset(key as PresetKey)"
        >
          {{ preset.label }}
        </n-tag>
      </n-flex>
      <n-switch v-model:value="enabled" :round="false" :disabled="!supportsSpatial" />
    </n-flex>

    <div class="sa-controls">
      <div class="sa-row">
        <div class="sa-label">
          <span>摇摆速率</span>
          <span class="sa-value">{{ formatRate(rate) }}</span>
        </div>
        <n-slider
          v-model:value="rate"
          :min="0.05"
          :max="2"
          :step="0.01"
          :disabled="!enabled || !supportsSpatial"
          @update:value="onRateChange"
        />
      </div>

      <div class="sa-row">
        <div class="sa-label">
          <span>摇摆深度</span>
          <span class="sa-value">{{ Math.round(depth * 100) }}%</span>
        </div>
        <n-slider
          v-model:value="depth"
          :min="0"
          :max="1"
          :step="0.01"
          :disabled="!enabled || !supportsSpatial"
          @update:value="onDepthChange"
        />
      </div>

      <div class="sa-row">
        <div class="sa-label">
          <span>波形</span>
        </div>
        <n-radio-group
          v-model:value="waveform"
          :disabled="!enabled || !supportsSpatial"
          @update:value="onWaveformChange"
        >
          <n-radio-button value="sine">正弦（平滑）</n-radio-button>
          <n-radio-button value="triangle">三角（匀速）</n-radio-button>
          <n-radio-button value="square">方波（硬切）</n-radio-button>
        </n-radio-group>
      </div>
    </div>
  </n-flex>
</template>

<script setup lang="ts">
import { useStatusStore } from "@/stores";
import { usePlayerController } from "@/core/player/PlayerController";
import { useAudioManager } from "@/core/player/AudioManager";

type SpatialWaveform = "sine" | "triangle" | "square";

const player = usePlayerController();
const statusStore = useStatusStore();
const audioManager = useAudioManager();

const supportsSpatial = computed(() => audioManager.capabilities.supportsSpatialAudio);

type PresetKey = keyof typeof presetList;

const presetList = {
  classic8d: { label: "经典 8D", rate: 0.25, depth: 0.9, waveform: "sine" as SpatialWaveform },
  slow: { label: "慢摇", rate: 0.12, depth: 0.8, waveform: "sine" as SpatialWaveform },
  fast: { label: "快摇", rate: 0.7, depth: 0.9, waveform: "sine" as SpatialWaveform },
  pingpong: {
    label: "乒乓",
    rate: 0.5,
    depth: 1,
    waveform: "square" as SpatialWaveform,
  },
  custom: { label: "自定义", rate: 0, depth: 0, waveform: "sine" as SpatialWaveform },
} as const;

const enabled = ref<boolean>(statusStore.spatialEnabled);
const rate = ref<number>(statusStore.spatialRate);
const depth = ref<number>(statusStore.spatialDepth);
const waveform = ref<SpatialWaveform>(statusStore.spatialWaveform);
const currentPreset = ref<PresetKey>((statusStore.spatialPreset as PresetKey) || "classic8d");

/**
 * 速率显示：<1 Hz 时以秒/周期展示更直观
 */
const formatRate = (v: number) => {
  if (v >= 1) return `${v.toFixed(2)} Hz`;
  const period = 1 / v;
  return `${period.toFixed(1)} 秒/周期`;
};

/**
 * 应用预设
 */
const applyPreset = (key: PresetKey) => {
  if (!enabled.value) return;
  currentPreset.value = key;
  statusStore.setSpatialPreset(key);
  if (key === "custom") return;
  const preset = presetList[key];
  rate.value = preset.rate;
  depth.value = preset.depth;
  waveform.value = preset.waveform;
  statusStore.setSpatialRate(rate.value);
  statusStore.setSpatialDepth(depth.value);
  statusStore.setSpatialWaveform(waveform.value);
  player.updateSpatialAudio({
    rate: rate.value,
    depth: depth.value,
    waveform: waveform.value,
  });
};

/**
 * 开关切换时应用/移除空间音效
 */
const applySpatial = () => {
  if (!supportsSpatial.value) return;
  statusStore.setSpatialEnabled(enabled.value);
  if (enabled.value) {
    player.updateSpatialAudio({
      enabled: true,
      rate: rate.value,
      depth: depth.value,
      waveform: waveform.value,
    });
  } else {
    player.disableSpatialAudio();
  }
};

const markCustom = () => {
  if (currentPreset.value !== "custom") {
    currentPreset.value = "custom";
    statusStore.setSpatialPreset("custom");
  }
};

const onRateChange = (value: number) => {
  statusStore.setSpatialRate(value);
  markCustom();
  if (enabled.value) player.updateSpatialAudio({ rate: value });
};

const onDepthChange = (value: number) => {
  statusStore.setSpatialDepth(value);
  markCustom();
  if (enabled.value) player.updateSpatialAudio({ depth: value });
};

const onWaveformChange = (value: SpatialWaveform) => {
  statusStore.setSpatialWaveform(value);
  markCustom();
  if (enabled.value) player.updateSpatialAudio({ waveform: value });
};

watch(enabled, () => applySpatial());
</script>

<style scoped lang="scss">
.spatial-audio {
  .sa-presets {
    flex: 1;
  }
  .sa-controls {
    display: flex;
    flex-direction: column;
    gap: 18px;
    margin-top: 8px;
    .sa-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      .sa-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        opacity: 0.85;
        .sa-value {
          font-size: 12px;
          opacity: 0.75;
        }
      }
    }
  }
}
</style>
