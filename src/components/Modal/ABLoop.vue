<template>
  <n-flex :size="20" class="ab-loop" align="center" vertical>
    <!-- Enable Switch -->
    <n-card class="open">
      <n-flex align="center" justify="space-between">
        <n-flex size="small" align="center">
          <SvgIcon name="Repeat" size="22" />
          <n-text>AB 循环模式</n-text>
        </n-flex>
        <n-switch v-model:value="statusStore.abLoop.enable" :disabled="!canEnable" :round="false" />
      </n-flex>
    </n-card>

    <!-- Point A -->
    <n-card class="point-card">
      <n-flex align="center" justify="space-between">
        <n-flex vertical size="small">
          <n-text strong>起点 A</n-text>
          <n-text depth="3">{{ formatTime(statusStore.abLoop.pointA) }}</n-text>
        </n-flex>
        <n-flex>
          <n-button size="small" secondary type="primary" @click="setPoint('A')">设为当前</n-button>
          <n-button
            size="small"
            secondary
            type="error"
            @click="clearPoint('A')"
            v-if="statusStore.abLoop.pointA !== null"
          >
            清除
          </n-button>
        </n-flex>
      </n-flex>
      <!-- Fine Tune -->
      <n-input-number
        v-if="statusStore.abLoop.pointA !== null"
        v-model:value="statusStore.abLoop.pointA"
        :step="0.1"
        size="small"
        style="margin-top: 10px"
        placeholder="微调时间 (秒)"
      >
        <template #suffix>秒</template>
      </n-input-number>
    </n-card>

    <!-- Point B -->
    <n-card class="point-card">
      <n-flex align="center" justify="space-between">
        <n-flex vertical size="small">
          <n-text strong>终点 B</n-text>
          <n-text depth="3">{{ formatTime(statusStore.abLoop.pointB) }}</n-text>
        </n-flex>
        <n-flex>
          <n-button size="small" secondary type="primary" @click="setPoint('B')">设为当前</n-button>
          <n-button
            size="small"
            secondary
            type="error"
            @click="clearPoint('B')"
            v-if="statusStore.abLoop.pointB !== null"
          >
            清除
          </n-button>
        </n-flex>
      </n-flex>
      <!-- Fine Tune -->
      <n-input-number
        v-if="statusStore.abLoop.pointB !== null"
        v-model:value="statusStore.abLoop.pointB"
        :step="0.1"
        size="small"
        style="margin-top: 10px"
        placeholder="微调时间 (秒)"
      >
        <template #suffix>秒</template>
      </n-input-number>
    </n-card>

    <n-text depth="3" style="font-size: 12px">
      提示：若 B 点小于或等于 A 点，循环将不会生效。
    </n-text>
  </n-flex>
</template>

<script setup lang="ts">
import { useStatusStore } from "@/stores";
import { useAudioManager } from "@/core/player/AudioManager";
import { convertSecondsToTime } from "@/utils/time";

const statusStore = useStatusStore();
const audioManager = useAudioManager();

const canEnable = computed(() => {
  return (
    statusStore.abLoop.pointA !== null &&
    statusStore.abLoop.pointB !== null &&
    statusStore.abLoop.pointB > statusStore.abLoop.pointA
  );
});

const formatTime = (time: number | null) => {
  if (time === null) return "未设置";
  return convertSecondsToTime(time);
};

const setPoint = (point: "A" | "B") => {
  const current = audioManager.currentTime;
  if (point === "A") {
    statusStore.abLoop.pointA = Number(current.toFixed(2));
  } else {
    statusStore.abLoop.pointB = Number(current.toFixed(2));
  }
  // Auto disable if invalid
  const { pointA, pointB } = statusStore.abLoop;
  if (pointA !== null && pointB !== null && pointA >= pointB) {
    statusStore.abLoop.enable = false;
  }
};

const clearPoint = (point: "A" | "B") => {
  if (point === "A") {
    statusStore.abLoop.pointA = null;
  } else {
    statusStore.abLoop.pointB = null;
  }
  statusStore.abLoop.enable = false;
};
</script>

<style scoped lang="scss">
.ab-loop {
  width: 100%;
  .open,
  .point-card {
    width: 100%;
    border-radius: 8px;
  }
}
</style>
