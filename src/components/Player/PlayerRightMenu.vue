<template>
  <n-flex :size="8" align="center" class="right-menu">
    <!-- 音质 -->
    <template v-if="settingStore.showPlayerQuality">
      <n-popselect
        v-if="isOnlineSong"
        v-model:show="showQualityPopover"
        :value="currentPlayingLevel"
        :options="qualityOptions"
        trigger="manual"
        placement="top"
        @update:value="handleQualitySelect"
        @clickoutside="handleClickOutside"
      >
        <template #header>
          <n-flex class="quality-title" size="small" vertical>
            <span class="title">音质切换</span>
            <span class="tip">以账号具体权限为准</span>
          </n-flex>
        </template>
        <div ref="qualityTagRef">
          <n-tag
            class="quality-tag hidden"
            type="primary"
            size="small"
            @click.stop="handleQualityClick"
          >
            {{ getQualityName(statusStore.songQuality) }}
          </n-tag>
        </div>
      </n-popselect>
      <n-popover v-else trigger="hover" placement="top" :show-arrow="false">
        <template #trigger>
          <n-tag class="quality-tag hidden" type="primary" size="small">
            {{ getQualityName(statusStore.songQuality) }}
          </n-tag>
        </template>
        <span>当前歌曲不支持切换音质</span>
      </n-popover>
    </template>
    <!-- 桌面歌词 -->
    <n-badge
      v-if="isElectron && settingStore.fullscreenPlayerElements.desktopLyric"
      value="ON"
      :show="statusStore.showDesktopLyric"
      class="hidden"
    >
      <div class="menu-icon hidden" @click.stop="player.toggleDesktopLyric()">
        <SvgIcon name="DesktopLyric2" :depth="statusStore.showDesktopLyric ? 1 : 3" />
      </div>
    </n-badge>
    <!-- 其他控制 -->
    <n-dropdown
      v-if="settingStore.fullscreenPlayerElements.moreSettings"
      :options="controlsOptions"
      :show-arrow="false"
      @select="handleControls"
    >
      <div class="menu-icon hidden">
        <SvgIcon name="Controls" />
      </div>
    </n-dropdown>
    <!-- 音量 -->
    <n-popover :show-arrow="false" :style="{ padding: 0 }">
      <template #trigger>
        <div class="menu-icon hidden" @click.stop="player.toggleMute" @wheel="player.setVolume">
          <SvgIcon :name="statusStore.playVolumeIcon" />
        </div>
      </template>
      <div class="volume-change" @wheel="player.setVolume">
        <n-slider
          v-model:value="statusStore.playVolume"
          :tooltip="false"
          :min="0"
          :max="1"
          :step="0.01"
          vertical
          @update:value="(val: number) => player.setVolume(val)"
        />
        <n-text class="slider-num hidden">{{ statusStore.playVolumePercent }}%</n-text>
      </div>
    </n-popover>
    <!-- 播放列表 -->
    <n-badge
      v-if="!statusStore.personalFmMode"
      :value="dataStore.playList?.length ?? 0"
      :show="settingStore.showPlaylistCount"
      :max="9999"
      :style="{
        marginRight: settingStore.showPlaylistCount ? '12px' : null,
      }"
    >
      <div class="menu-icon" @click.stop="statusStore.playListShow = !statusStore.playListShow">
        <SvgIcon name="PlayList" />
      </div>
    </n-badge>
  </n-flex>
</template>

<script setup lang="ts">
import { usePlayerController } from "@/core/player/PlayerController";
import { useDataStore, useSettingStore, useStatusStore, useMusicStore } from "@/stores";
import { isElectron } from "@/utils/env";
import { renderIcon } from "@/utils/helper";
import { openAutoClose, openChangeRate, openEqualizer, openABLoop } from "@/utils/modal";
import { useAudioManager } from "@/core/player/AudioManager";
import type { DropdownOption } from "naive-ui";
import { useQualityControl } from "@/composables/useQualityControl";

const dataStore = useDataStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();
const musicStore = useMusicStore();
const player = usePlayerController();

const {
  currentPlayingLevel,
  qualityOptions,
  loadQualities,
  handleQualitySelect,
  getQualityName,
  isOnlineSong,
} = useQualityControl();

const showQualityPopover = ref(false);
const qualityTagRef = ref<HTMLElement | null>(null);

const handleQualityClick = async () => {
  if (showQualityPopover.value) {
    showQualityPopover.value = false;
  } else {
    await loadQualities();
    if (qualityOptions.value.length > 0) {
      showQualityPopover.value = true;
    }
  }
};

// 点击外部关闭音质选择
const handleClickOutside = (e: MouseEvent) => {
  if (qualityTagRef.value && qualityTagRef.value.contains(e.target as Node)) {
    return;
  }
  showQualityPopover.value = false;
};

// 更多功能
const audioManager = useAudioManager();

const controlsOptions = computed<DropdownOption[]>(() => [
  {
    label: "均衡器",
    key: "equalizer",
    icon: renderIcon("Eq"),
    disabled: !audioManager.capabilities.supportsEqualizer,
  },
  {
    label: "自动关闭",
    key: "autoClose",
    icon: renderIcon("TimeAuto"),
  },
  {
    label: "AB 循环",
    key: "abLoop",
    icon: renderIcon("Repeat"),
  },
  {
    label: "播放速度",
    key: "rate",
    disabled: !audioManager.capabilities.supportsRate,
    icon: renderIcon("PlayRate"),
  },
]);

// 更多功能选择
const handleControls = (key: string) => {
  switch (key) {
    case "equalizer":
      if (!audioManager.capabilities.supportsEqualizer) {
        window.$message.warning("当前引擎不支持均衡器功能");
        return;
      }
      openEqualizer();
      break;
    case "autoClose":
      openAutoClose();
      break;
    case "abLoop":
      openABLoop();
      break;
    case "rate":
      openChangeRate();
      break;
  }
};

// 更新音质数据
watch(
  () => musicStore.playSong.id,
  async () => {
    statusStore.availableQualities = [];
    await loadQualities();
    if (showQualityPopover.value && statusStore.availableQualities.length === 0) {
      showQualityPopover.value = false;
    }
  },
);

// 监听 VIP 状态或设置变化，重新加载音质
watch([() => dataStore.userData.vipType, () => settingStore.disableAiAudio], async () => {
  statusStore.availableQualities = [];
  await loadQualities();
});
</script>

<style scoped lang="scss">
.right-menu {
  .menu-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    border-radius: 8px;
    transition:
      background-color 0.3s,
      transform 0.3s;
    cursor: pointer;
    .n-icon {
      font-size: 22px;
      color: var(--primary-hex);
    }
    &:hover {
      transform: scale(1.1);
      background-color: rgba(var(--primary), 0.28);
    }
    &:active {
      transform: scale(1);
    }
  }
  :deep(.n-badge-sup) {
    background-color: rgba(var(--primary), 0.28);
    backdrop-filter: blur(20px);
    // font-size: 10px;
    .n-base-slot-machine {
      color: var(--primary-hex);
    }
  }
  .quality-tag {
    height: 26px;
    padding: 0 8px;
    border-radius: 8px;
    cursor: pointer;
  }
  @media (max-width: 810px) {
    .hidden {
      display: none;
    }
  }
}
.quality-title {
  .title {
    font-size: 14px;
    line-height: normal;
  }
  .tip {
    font-size: 12px;
    opacity: 0.6;
  }
}
.volume-change {
  padding: 12px;
  display: flex;
  flex-direction: column;
  height: 180px;
  width: 58px;
  align-items: center;
  .slider-num {
    margin-top: 8px;
    font-size: 13px;
    white-space: nowrap;
  }
}
</style>
