<template>
  <div class="scaling-modal">
    <div class="tip">
      <n-text depth="3" class="value">可调节范围：50% - 200%</n-text>
    </div>
    <n-input-number
      v-model:value="zoomPercentage"
      :min="50"
      :max="200"
      :step="5"
      button-placement="both"
      class="scaling-input"
    >
      <template #suffix>%</template>
    </n-input-number>
    <n-button size="small" secondary type="primary" @click="resetZoom"> 恢复默认 </n-button>
  </div>
</template>

<script setup lang="ts">
const zoomPercentage = ref(100);

watch(zoomPercentage, (newVal) => {
  if (newVal) {
    const factor = newVal / 100;
    window.electron.ipcRenderer.invoke("set-zoom-factor", factor);
  }
});

const resetZoom = () => {
  zoomPercentage.value = 100;
};

onMounted(async () => {
  const currentZoom = await window.electron.ipcRenderer.invoke("get-zoom-factor");
  zoomPercentage.value = Math.round(currentZoom * 100);
});
</script>

<style lang="scss" scoped>
.scaling-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 24px 0;

  .scaling-input {
    width: 200px;
    text-align: center;
    :deep(.n-input__input-el) {
      text-align: center;
    }
  }

  .tip {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    .value {
      font-size: 13px;
    }
  }
}
</style>
