<template>
  <n-flex :size="20" class="auto-close" align="center" vertical>
    <n-card class="open">
      <n-flex align="center" justify="space-between">
        <n-flex size="small" align="center">
          <SvgIcon name="TimeAuto" size="22" />
          <Transition name="fade" mode="out-in">
            <n-text v-if="!statusStore.autoClose.enable"> {{ t("player.notEnabled") }} </n-text>
            <n-text v-else strong>
              {{ convertSecondsToTime(statusStore.autoClose.remainTime) }}
            </n-text>
          </Transition>
        </n-flex>
        <n-switch
          v-model:value="statusStore.autoClose.enable"
          :round="false"
          @update:value="handleUpdate"
        />
      </n-flex>
    </n-card>
    <!-- 时间选择 -->
    <n-flex size="large" align="center" justify="center">
      <n-tag
        v-for="(item, index) in [10, 20, 30, 45, 60, 90, 120]"
        :bordered="false"
        :key="index"
        type="primary"
        size="large"
        round
        @click="player.startAutoCloseTimer(item, item * 60)"
      >
        {{ item }}min
      </n-tag>
      <!-- 自定义 -->
      <n-popconfirm
        :negative-text="null"
        :positive-button-props="{
          strong: true,
          secondary: true,
          type: 'primary',
        }"
        :show-icon="false"
        @positive-click="player.startAutoCloseTimer(customTime, customTime * 60)"
      >
        <template #trigger>
          <n-tag :bordered="false" type="primary" size="large" round>
            {{ t("player.customDuration") }}
          </n-tag>
        </template>
        <n-flex vertical>
          <n-text>{{ t("player.customDuration") }} ({{ t("general.minute") }})</n-text>
          <n-input-number
            v-model:value="customTime"
            :min="1"
            :max="120"
            :placeholder="t('player.customDuration')"
          />
        </n-flex>
      </n-popconfirm>
    </n-flex>
    <!-- 是否播放完 -->
    <n-checkbox v-model:checked="statusStore.autoClose.waitSongEnd">
      {{ t("player.waitForSongEnd") }}
    </n-checkbox>
  </n-flex>
</template>

<script setup lang="ts">
import { useStatusStore } from "@/stores";
import { convertSecondsToTime } from "@/utils/time";
import { usePlayerController } from "@/core/player/PlayerController";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const player = usePlayerController();
const statusStore = useStatusStore();

// 自定义时长
const customTime = ref(1);

// 是否开启
const handleUpdate = (value: boolean) => {
  if (value) {
    player.startAutoCloseTimer(statusStore.autoClose.time, statusStore.autoClose.remainTime);
  } else {
    statusStore.autoClose.enable = false;
    statusStore.autoClose.remainTime = statusStore.autoClose.time * 60;
  }
};
</script>

<style scoped lang="scss">
.auto-close {
  width: 100%;
  .open {
    width: 100%;
    border-radius: 8px;
    .n-text {
      font-size: 18px;
    }
  }
}
</style>
