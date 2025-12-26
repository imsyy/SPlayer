<template>
  <n-flex :size="8" align="center" class="right-menu">
    <n-badge v-if="isElectron" value="ON" :show="statusStore.showDesktopLyric">
      <div class="menu-icon" @click.stop="player.toggleDesktopLyric()">
        <SvgIcon name="DesktopLyric2" :depth="statusStore.showDesktopLyric ? 1 : 3" />
      </div>
    </n-badge>
    <!-- 其他控制 -->
    <n-dropdown
      :options="controlsOptions"
      :show-arrow="false"
      :class="{ player: statusStore.showFullPlayer }"
    >
      <div class="menu-icon">
        <SvgIcon name="Controls" />
      </div>
    </n-dropdown>
    <!-- 播放模式 -->
    <n-dropdown
      v-if="musicStore.playSong.type !== 'radio' && !statusStore.personalFmMode"
      :options="playModeOptions"
      :show-arrow="false"
      :class="{ player: statusStore.showFullPlayer }"
      @select="(mode) => player.togglePlayMode(mode)"
    >
      <div class="menu-icon" @click.stop="player.togglePlayMode(false)">
        <SvgIcon :name="statusStore.playModeIcon" />
      </div>
    </n-dropdown>
    <!-- 音量调节 -->
    <n-popover
      :show-arrow="false"
      :style="{ padding: 0 }"
      :class="{ player: statusStore.showFullPlayer }"
    >
      <template #trigger>
        <div class="menu-icon" @click.stop="player.toggleMute" @wheel="player.setVolume">
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
        <n-text class="slider-num">{{ statusStore.playVolumePercent }}%</n-text>
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
import type { DropdownOption } from "naive-ui";
import { useMusicStore, useStatusStore, useDataStore, useSettingStore } from "@/stores";
import { openAutoClose, openChangeRate, openEqualizer } from "@/utils/modal";
import { isElectron } from "@/utils/env";
import { renderIcon } from "@/utils/helper";
import { usePlayerController } from "@/core/player/PlayerController";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const dataStore = useDataStore();
const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();
const player = usePlayerController();

// 播放模式数据
const playModeOptions = computed<DropdownOption[]>(() => [
  {
    label: t("player.repeatList"),
    key: "repeat",
    icon: renderIcon("Repeat"),
  },
  {
    label: t("player.repeatSong"),
    key: "repeat-once",
    icon: renderIcon("RepeatSong"),
  },
  {
    label: t("player.shuffle"),
    key: "shuffle",
    icon: renderIcon("Shuffle"),
  },
]);

// 其他控制：播放速度下拉菜单
const controlsOptions = computed<DropdownOption[]>(() => [
  {
    label: t("player.equalizer"),
    key: "equalizer",
    icon: renderIcon("Eq"),
    props: {
      onClick: () => openEqualizer(),
    },
  },
  {
    label: t("player.autoClose"),
    key: "autoClose",
    icon: renderIcon("TimeAuto"),
    props: {
      onClick: () => openAutoClose(),
    },
  },
  {
    label: t("player.playRate"),
    key: "rate",
    icon: renderIcon("PlayRate"),
    props: {
      onClick: () => openChangeRate(),
    },
  },
]);
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
    color: var(--color);
    white-space: nowrap;
  }
}
</style>
