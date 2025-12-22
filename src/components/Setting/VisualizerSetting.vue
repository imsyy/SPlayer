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
                { label: '蓝紫渐变', value: 'gradient-blue-purple' },
                { label: '彩虹渐变', value: 'gradient-rainbow' },
                { label: '日落渐变', value: 'gradient-sunset' },
                { label: '霓虹渐变', value: 'gradient-flame' },
                { label: '自定义颜色', value: 'custom' },
              ]"
              style="width: 120px"
              @update:value="handleSelectChange"
            />
            <n-color-picker
              v-if="settingStore.visualizerColor !== 'theme' && !settingStore.visualizerColor.startsWith('gradient-')"
              v-model:value="settingStore.visualizerColor"
              :show-alpha="false"
              :modes="['hex']"
              placement="bottom-end"
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

        <n-card class="set-item">
          <div class="label">
            <n-text class="name">拾音器宽度</n-text>
            <n-text class="tip" :depth="3"> 调整拾音器的显示宽度（像素） </n-text>
          </div>
          <n-slider
            v-model:value="settingStore.visualizerWidth"
            :min="20"
            :max="100"
            :step="5"
            class="set"
          />
        </n-card>

        <n-card class="set-item">
          <div class="label">
            <n-text class="name">拾音器形状</n-text>
            <n-text class="tip" :depth="3"> 设置拾音器的显示形状 </n-text>
          </div>
          <n-select
            v-model:value="settingStore.visualizerShape"
            :options="[
              { label: '圆角', value: 'rounded' },
              { label: '矩形', value: 'rectangle' },
              { label: '胶囊', value: 'pill' },
            ]"
            class="set"
            style="width: 120px"
          />
        </n-card>

        <n-card class="set-item">
          <div class="label">
            <n-text class="name">顶部渐变</n-text>
            <n-text class="tip" :depth="3"> 拾音器顶部显示渐变淡出效果 </n-text>
          </div>
          <n-switch v-model:value="settingStore.visualizerGradient" :round="false" class="set" />
        </n-card>

        <n-card class="set-item">
          <div class="label">
            <n-text class="name">显示边框</n-text>
            <n-text class="tip" :depth="3"> 为拾音器添加边框效果 </n-text>
          </div>
          <n-switch v-model:value="settingStore.visualizerBorder" :round="false" class="set" />
        </n-card>

        <n-card class="set-item">
          <div class="label">
            <n-text class="name">跳动方向</n-text>
            <n-text class="tip" :depth="3"> 设置拾音器的跳动方向 </n-text>
          </div>
          <n-select
            v-model:value="settingStore.visualizerDirection"
            :options="[
              { label: '单向向上', value: 'up' },
              { label: '中心扩散', value: 'center' },
            ]"
            class="set"
            style="width: 120px"
          />
        </n-card>

        <n-card class="set-item">
          <div class="label">
            <n-text class="name">恢复默认配置</n-text>
            <n-text class="tip" :depth="3">恢复拾音器的所有设置为默认值</n-text>
          </div>
          <n-button type="primary" @click="resetToDefault">
            恢复默认
          </n-button>
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
  if (val === 'custom') {
    // 默认给一个自定义颜色
    settingStore.visualizerColor = '#fe7971';
  } else {
    settingStore.visualizerColor = val;
  }
};

// 恢复默认设置
const resetToDefault = () => {
  window.$dialog.warning({
    title: "恢复默认配置",
    content: "确定将拾音器的所有设置恢复为默认值吗？",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: () => {
      settingStore.visualizerColor = 'gradient-blue-purple';
      settingStore.visualizerOpacity = 1;
      settingStore.visualizerWidth = 60;
      settingStore.visualizerShape = 'rounded';
      settingStore.visualizerGradient = true;
      settingStore.visualizerBorder = true;
      settingStore.visualizerDirection = 'up';
      window.$message.success('已恢复默认设置');
    },
  });
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
