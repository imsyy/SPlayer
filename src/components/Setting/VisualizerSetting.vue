<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> 拾音器设置 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">开启拾音器</n-text>
          <n-text class="tip" :depth="3"> 在主界面左右两侧显示跳动的实体能量条 </n-text>
        </div>
        <n-switch v-model:value="statusStore.showVisualizer" :round="false" class="set" />
      </n-card>

      <n-collapse-transition :show="statusStore.showVisualizer">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">拾音器颜色</n-text>
            <n-text class="tip" :depth="3"> 设置拾音器的显示颜色，选择“跟随主题”将自动适配界面色调 </n-text>
          </div>
          <n-flex align="center" class="set">
            <n-select
              v-model:value="settingStore.visualizerColor"
              :options="[
                { label: '跟随主题', value: 'theme' },
                { label: '自定义颜色', value: 'custom' },
              ]"
              style="width: 120px"
              @update:value="handleSelectChange"
            />
            <n-color-picker
              v-if="settingStore.visualizerColor !== 'theme'"
              v-model:value="settingStore.visualizerColor"
              :show-alpha="false"
              :modes="['hex']"
              style="width: 80px"
            />
          </n-flex>
        </n-card>

        <n-card class="set-item">
          <div class="label">
            <n-text class="name">透明度</n-text>
            <n-text class="tip" :depth="3"> 调整拾音器的不透明程度 </n-text>
          </div>
          <n-slider
            v-model:value="settingStore.visualizerOpacity"
            :min="0.1"
            :max="1"
            :step="0.05"
            class="set"
          />
        </n-card>
      </n-collapse-transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore, useStatusStore } from "@/stores";

const settingStore = useSettingStore();
const statusStore = useStatusStore();

// 当从自定义颜色切回到跟随主题时，需要重置 store 值为 'theme'
const handleSelectChange = (val: string) => {
  if (val === 'theme') {
    settingStore.visualizerColor = 'theme';
  } else if (val === 'custom') {
    // 默认给一个自定义颜色
    settingStore.visualizerColor = '#fe7971';
  }
};
</script>

<style lang="scss" scoped>
.set-item {
  .set {
    width: 200px;
    justify-content: flex-end;
  }
}
</style>
