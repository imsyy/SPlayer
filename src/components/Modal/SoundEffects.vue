<template>
  <n-flex class="sound-effects" size="large" vertical>
    <div class="header-row">
      <n-alert :show-icon="false" class="header-tip">
        实验性功能，所有音效通过 Web Audio API 实时处理，建议戴耳机体验。
        <br />
        8D 与 3D 环绕互斥，开启其中一个会自动关闭另一个。
      </n-alert>
      <n-button
        secondary
        size="small"
        :disabled="!supportsEffects"
        class="reset-btn"
        @click="resetAllEffects"
      >
        <template #icon>
          <n-icon>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6s-2.69 6-6 6s-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8s-3.58-8-8-8z"
              />
            </svg>
          </n-icon>
        </template>
        重置
      </n-button>
    </div>

    <!-- ============ 空间环绕类 ============ -->
    <div class="effect-section">
      <div class="section-title">🎧 空间环绕</div>

      <!-- 8D 环绕 -->
      <div class="effect-card" :class="{ disabled: !supportsEffects }">
        <div class="effect-header">
          <div class="effect-info">
            <div class="effect-name">8D 环绕</div>
            <div class="effect-desc">声音在左右耳之间周期性游走</div>
          </div>
          <n-switch
            v-model:value="effect8dEnabled"
            :round="false"
            :disabled="!supportsEffects"
            @update:value="on8dToggle"
          />
        </div>
        <div v-if="effect8dEnabled" class="effect-params">
          <div class="param-row">
            <div class="param-label">
              <span>摇摆速率</span>
              <span class="param-value">{{ format8dRate(effect8dRate) }}</span>
            </div>
            <n-slider
              v-model:value="effect8dRate"
              :min="0.05"
              :max="2"
              :step="0.01"
              :disabled="!supportsEffects"
              @update:value="on8dRateChange"
            />
          </div>
          <div class="param-row">
            <div class="param-label">
              <span>摇摆深度</span>
              <span class="param-value">{{ Math.round(effect8dDepth * 100) }}%</span>
            </div>
            <n-slider
              v-model:value="effect8dDepth"
              :min="0"
              :max="1"
              :step="0.01"
              :disabled="!supportsEffects"
              @update:value="on8dDepthChange"
            />
          </div>
        </div>
      </div>

      <!-- 3D HRTF 环绕 -->
      <div class="effect-card" :class="{ disabled: !supportsEffects }">
        <div class="effect-header">
          <div class="effect-info">
            <div class="effect-name">3D 环绕 (HRTF)</div>
            <div class="effect-desc">基于 HRTF 的真 3D，声源绕头旋转</div>
          </div>
          <n-switch
            v-model:value="effect3dEnabled"
            :round="false"
            :disabled="!supportsEffects"
            @update:value="on3dToggle"
          />
        </div>
        <div v-if="effect3dEnabled" class="effect-params">
          <div class="param-row">
            <div class="param-label">
              <span>旋转速度</span>
              <span class="param-value">{{ format3dRate(effect3dRate) }}</span>
            </div>
            <n-slider
              v-model:value="effect3dRate"
              :min="0.02"
              :max="1.5"
              :step="0.01"
              :disabled="!supportsEffects"
              @update:value="on3dRateChange"
            />
          </div>
          <div class="param-row">
            <div class="param-label">
              <span>声源半径</span>
              <span class="param-value">{{ Math.round(effect3dRadius * 100) }}%</span>
            </div>
            <n-slider
              v-model:value="effect3dRadius"
              :min="0"
              :max="1"
              :step="0.01"
              :disabled="!supportsEffects"
              @update:value="on3dRadiusChange"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 混响类 ============ -->
    <div class="effect-section">
      <div class="section-title">🏛️ 混响</div>
      <div class="effect-card" :class="{ disabled: !supportsEffects }">
        <div class="effect-header">
          <div class="effect-info">
            <div class="effect-name">空间混响</div>
            <div class="effect-desc">模拟不同空间的回声感</div>
          </div>
          <n-switch
            v-model:value="reverbEnabled"
            :round="false"
            :disabled="!supportsEffects"
            @update:value="onReverbToggle"
          />
        </div>
        <div v-if="reverbEnabled" class="effect-params">
          <div class="param-row">
            <div class="param-label">
              <span>场景类型</span>
            </div>
            <n-radio-group
              v-model:value="reverbType"
              :disabled="!supportsEffects"
              @update:value="onReverbTypeChange"
            >
              <n-radio-button value="hall">音乐厅</n-radio-button>
              <n-radio-button value="ktv">KTV</n-radio-button>
              <n-radio-button value="room">小房间</n-radio-button>
            </n-radio-group>
          </div>
          <div class="param-row">
            <div class="param-label">
              <span>湿度</span>
              <span class="param-value">{{ Math.round(reverbWet * 100) }}%</span>
            </div>
            <n-slider
              v-model:value="reverbWet"
              :min="0"
              :max="1"
              :step="0.01"
              :disabled="!supportsEffects"
              @update:value="onReverbWetChange"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 增强类 ============ -->
    <div class="effect-section">
      <div class="section-title">🔊 音色增强</div>

      <!-- 超重低音 -->
      <div class="effect-card" :class="{ disabled: !supportsEffects }">
        <div class="effect-header">
          <div class="effect-info">
            <div class="effect-name">超重低音</div>
            <div class="effect-desc">提升 80Hz 以下的低频能量</div>
          </div>
          <n-switch
            v-model:value="bassBoostEnabled"
            :round="false"
            :disabled="!supportsEffects"
            @update:value="onBassToggle"
          />
        </div>
        <div v-if="bassBoostEnabled" class="effect-params">
          <div class="param-row">
            <div class="param-label">
              <span>增益</span>
              <span class="param-value">+{{ bassBoostGain.toFixed(1) }} dB</span>
            </div>
            <n-slider
              v-model:value="bassBoostGain"
              :min="0"
              :max="15"
              :step="0.1"
              :disabled="!supportsEffects"
              @update:value="onBassGainChange"
            />
          </div>
        </div>
      </div>

      <!-- 清澈人声 -->
      <div class="effect-card" :class="{ disabled: !supportsEffects }">
        <div class="effect-header">
          <div class="effect-info">
            <div class="effect-name">清澈人声</div>
            <div class="effect-desc">提升 2.5kHz 附近的人声频段</div>
          </div>
          <n-switch
            v-model:value="vocalEnhanceEnabled"
            :round="false"
            :disabled="!supportsEffects"
            @update:value="onVocalToggle"
          />
        </div>
        <div v-if="vocalEnhanceEnabled" class="effect-params">
          <div class="param-row">
            <div class="param-label">
              <span>增益</span>
              <span class="param-value">+{{ vocalEnhanceGain.toFixed(1) }} dB</span>
            </div>
            <n-slider
              v-model:value="vocalEnhanceGain"
              :min="0"
              :max="12"
              :step="0.1"
              :disabled="!supportsEffects"
              @update:value="onVocalGainChange"
            />
          </div>
        </div>
      </div>
    </div>
  </n-flex>
</template>

<script setup lang="ts">
import { useStatusStore } from "@/stores";
import { usePlayerController } from "@/core/player/PlayerController";
import { useAudioManager } from "@/core/player/AudioManager";

type ReverbType = "hall" | "ktv" | "room";

/**
 * 音效默认参数
 * 这些值是经过音频工程经验调整的"一键开启就好听"的推荐值，
 * 用户不懂怎么调时可以点重置按钮恢复。
 */
const DEFAULT_EFFECTS = {
  effect8d: {
    enabled: false,
    rate: 0.25, // 4 秒一个摇摆周期，经典 8D 节奏
    depth: 0.9, // 90% 深度，明显但不夸张
  },
  effect3d: {
    enabled: false,
    rate: 0.15, // 约 6.7 秒绕一圈，最有沉浸感
    radius: 0.8, // 80% 半径，3D 效果明显
  },
  reverb: {
    enabled: false,
    wet: 0.35, // 35% 湿度，经典"音乐厅"感
    type: "hall" as ReverbType,
  },
  bassBoost: {
    enabled: false,
    gain: 8, // +8 dB，低音厚实不轰头
  },
  vocalEnhance: {
    enabled: false,
    gain: 6, // +6 dB，人声突出不刺耳
  },
} as const;

const player = usePlayerController();
const statusStore = useStatusStore();
const audioManager = useAudioManager();

const supportsEffects = computed(() => audioManager.capabilities.supportsAudioEffects);

// 8D
const effect8dEnabled = ref(statusStore.effect8dEnabled);
const effect8dRate = ref(statusStore.effect8dRate);
const effect8dDepth = ref(statusStore.effect8dDepth);

// 3D
const effect3dEnabled = ref(statusStore.effect3dEnabled);
const effect3dRate = ref(statusStore.effect3dRate);
const effect3dRadius = ref(statusStore.effect3dRadius);

// 混响
const reverbEnabled = ref(statusStore.reverbEnabled);
const reverbWet = ref(statusStore.reverbWet);
const reverbType = ref<ReverbType>(statusStore.reverbType);

// 超重低音
const bassBoostEnabled = ref(statusStore.bassBoostEnabled);
const bassBoostGain = ref(statusStore.bassBoostGain);

// 清澈人声
const vocalEnhanceEnabled = ref(statusStore.vocalEnhanceEnabled);
const vocalEnhanceGain = ref(statusStore.vocalEnhanceGain);

/** 速率显示：<1 Hz 时以秒/周期展示 */
const format8dRate = (v: number) => {
  if (v >= 1) return `${v.toFixed(2)} Hz`;
  return `${(1 / v).toFixed(1)} 秒/周期`;
};
const format3dRate = (v: number) => {
  if (v >= 1) return `${v.toFixed(2)} Hz`;
  return `${(1 / v).toFixed(1)} 秒/圈`;
};

// ========== 8D ==========
const on8dToggle = (val: boolean) => {
  if (!supportsEffects.value) return;
  // 和 3D 互斥
  if (val && effect3dEnabled.value) {
    effect3dEnabled.value = false;
    statusStore.setEffect3dEnabled(false);
    player.updateEffect3d({ enabled: false });
  }
  statusStore.setEffect8dEnabled(val);
  player.updateEffect8d({
    enabled: val,
    rate: effect8dRate.value,
    depth: effect8dDepth.value,
  });
};
const on8dRateChange = (val: number) => {
  statusStore.setEffect8dRate(val);
  if (effect8dEnabled.value) player.updateEffect8d({ rate: val });
};
const on8dDepthChange = (val: number) => {
  statusStore.setEffect8dDepth(val);
  if (effect8dEnabled.value) player.updateEffect8d({ depth: val });
};

// ========== 3D ==========
const on3dToggle = (val: boolean) => {
  if (!supportsEffects.value) return;
  // 和 8D 互斥
  if (val && effect8dEnabled.value) {
    effect8dEnabled.value = false;
    statusStore.setEffect8dEnabled(false);
    player.updateEffect8d({ enabled: false });
  }
  statusStore.setEffect3dEnabled(val);
  player.updateEffect3d({
    enabled: val,
    rate: effect3dRate.value,
    radius: effect3dRadius.value,
  });
};
const on3dRateChange = (val: number) => {
  statusStore.setEffect3dRate(val);
  if (effect3dEnabled.value) player.updateEffect3d({ rate: val });
};
const on3dRadiusChange = (val: number) => {
  statusStore.setEffect3dRadius(val);
  if (effect3dEnabled.value) player.updateEffect3d({ radius: val });
};

// ========== 混响 ==========
const onReverbToggle = (val: boolean) => {
  if (!supportsEffects.value) return;
  statusStore.setReverbEnabled(val);
  player.updateReverb({
    enabled: val,
    wet: reverbWet.value,
    type: reverbType.value,
  });
};
const onReverbTypeChange = (val: ReverbType) => {
  statusStore.setReverbType(val);
  if (reverbEnabled.value) player.updateReverb({ type: val });
};
const onReverbWetChange = (val: number) => {
  statusStore.setReverbWet(val);
  if (reverbEnabled.value) player.updateReverb({ wet: val });
};

// ========== 超重低音 ==========
const onBassToggle = (val: boolean) => {
  if (!supportsEffects.value) return;
  statusStore.setBassBoostEnabled(val);
  player.updateBassBoost({ enabled: val, gain: bassBoostGain.value });
};
const onBassGainChange = (val: number) => {
  statusStore.setBassBoostGain(val);
  if (bassBoostEnabled.value) player.updateBassBoost({ gain: val });
};

// ========== 清澈人声 ==========
const onVocalToggle = (val: boolean) => {
  if (!supportsEffects.value) return;
  statusStore.setVocalEnhanceEnabled(val);
  player.updateVocalEnhance({ enabled: val, gain: vocalEnhanceGain.value });
};
const onVocalGainChange = (val: number) => {
  statusStore.setVocalEnhanceGain(val);
  if (vocalEnhanceEnabled.value) player.updateVocalEnhance({ gain: val });
};

// ========== 重置 ==========
/**
 * 重置所有音效：关闭所有开关，参数恢复到 DEFAULT_EFFECTS
 * 用于用户"不知道怎么调"时一键回到干净状态
 */
const resetAllEffects = () => {
  if (!supportsEffects.value) return;

  // 1. 本地 refs 恢复默认
  effect8dEnabled.value = DEFAULT_EFFECTS.effect8d.enabled;
  effect8dRate.value = DEFAULT_EFFECTS.effect8d.rate;
  effect8dDepth.value = DEFAULT_EFFECTS.effect8d.depth;

  effect3dEnabled.value = DEFAULT_EFFECTS.effect3d.enabled;
  effect3dRate.value = DEFAULT_EFFECTS.effect3d.rate;
  effect3dRadius.value = DEFAULT_EFFECTS.effect3d.radius;

  reverbEnabled.value = DEFAULT_EFFECTS.reverb.enabled;
  reverbWet.value = DEFAULT_EFFECTS.reverb.wet;
  reverbType.value = DEFAULT_EFFECTS.reverb.type;

  bassBoostEnabled.value = DEFAULT_EFFECTS.bassBoost.enabled;
  bassBoostGain.value = DEFAULT_EFFECTS.bassBoost.gain;

  vocalEnhanceEnabled.value = DEFAULT_EFFECTS.vocalEnhance.enabled;
  vocalEnhanceGain.value = DEFAULT_EFFECTS.vocalEnhance.gain;

  // 2. store 同步
  statusStore.setEffect8dEnabled(DEFAULT_EFFECTS.effect8d.enabled);
  statusStore.setEffect8dRate(DEFAULT_EFFECTS.effect8d.rate);
  statusStore.setEffect8dDepth(DEFAULT_EFFECTS.effect8d.depth);
  statusStore.setEffect3dEnabled(DEFAULT_EFFECTS.effect3d.enabled);
  statusStore.setEffect3dRate(DEFAULT_EFFECTS.effect3d.rate);
  statusStore.setEffect3dRadius(DEFAULT_EFFECTS.effect3d.radius);
  statusStore.setReverbEnabled(DEFAULT_EFFECTS.reverb.enabled);
  statusStore.setReverbWet(DEFAULT_EFFECTS.reverb.wet);
  statusStore.setReverbType(DEFAULT_EFFECTS.reverb.type);
  statusStore.setBassBoostEnabled(DEFAULT_EFFECTS.bassBoost.enabled);
  statusStore.setBassBoostGain(DEFAULT_EFFECTS.bassBoost.gain);
  statusStore.setVocalEnhanceEnabled(DEFAULT_EFFECTS.vocalEnhance.enabled);
  statusStore.setVocalEnhanceGain(DEFAULT_EFFECTS.vocalEnhance.gain);

  // 3. 音频引擎同步 (关闭所有启用的效果)
  player.updateEffect8d({
    enabled: false,
    rate: DEFAULT_EFFECTS.effect8d.rate,
    depth: DEFAULT_EFFECTS.effect8d.depth,
  });
  player.updateEffect3d({
    enabled: false,
    rate: DEFAULT_EFFECTS.effect3d.rate,
    radius: DEFAULT_EFFECTS.effect3d.radius,
  });
  player.updateReverb({
    enabled: false,
    wet: DEFAULT_EFFECTS.reverb.wet,
    type: DEFAULT_EFFECTS.reverb.type,
  });
  player.updateBassBoost({
    enabled: false,
    gain: DEFAULT_EFFECTS.bassBoost.gain,
  });
  player.updateVocalEnhance({
    enabled: false,
    gain: DEFAULT_EFFECTS.vocalEnhance.gain,
  });

  window.$message?.success?.("已重置所有音效");
};
</script>

<style scoped lang="scss">
.sound-effects {
  .header-row {
    display: flex;
    align-items: stretch;
    gap: 10px;
    .header-tip {
      flex: 1;
    }
    .reset-btn {
      align-self: flex-start;
      white-space: nowrap;
    }
  }

  .effect-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    .section-title {
      font-size: 14px;
      font-weight: 600;
      opacity: 0.85;
      padding-left: 2px;
    }
  }

  .effect-card {
    border: 1px solid var(--n-border-color, rgba(255, 255, 255, 0.08));
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    transition: background 0.2s;

    &.disabled {
      opacity: 0.5;
    }

    .effect-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      .effect-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        .effect-name {
          font-size: 14px;
          font-weight: 500;
        }
        .effect-desc {
          font-size: 12px;
          opacity: 0.6;
        }
      }
    }

    .effect-params {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 4px;
      border-top: 1px dashed var(--n-border-color, rgba(255, 255, 255, 0.08));
      .param-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
        .param-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          opacity: 0.8;
          .param-value {
            font-size: 12px;
            opacity: 0.7;
          }
        }
      }
    }
  }
}
</style>
