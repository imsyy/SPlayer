<template>
  <n-scrollbar style="max-height: 70vh" class="custom-code">
    <n-alert type="error" title="高危操作警告">
      在此处输入任意内容都可能会导致应用出现异常，包括但不限于界面错乱、功能异常、数据丢失等，请谨慎操作！<br />
      请勿输入来源不明或他人提供的代码！恶意代码可能窃取您的账号信息、泄露隐私数据，或导致应用崩溃等异常行为。
    </n-alert>
    <div class="code-section">
      <n-h3 prefix="bar">自定义 CSS</n-h3>
      <n-text :depth="3"> 输入自定义 CSS 样式，将会被注入到页面中 </n-text>
      <n-input
        v-model:value="customCss"
        :autosize="{ minRows: 6, maxRows: 12 }"
        type="textarea"
        placeholder="/* 输入自定义 CSS */"
        style="font-family: monospace"
      />
    </div>
    <div class="code-section">
      <n-h3 prefix="bar">自定义 JavaScript</n-h3>
      <n-text :depth="3"> 输入自定义 JavaScript 代码，将在应用启动时执行（ 重启后生效 ） </n-text>
      <n-input
        v-model:value="customJs"
        :autosize="{ minRows: 6, maxRows: 12 }"
        type="textarea"
        placeholder="// 输入自定义 JavaScript"
        style="font-family: monospace"
      />
    </div>
    <n-flex justify="end" style="margin-top: 16px">
      <n-button type="primary" strong @click="saveCode">保存</n-button>
    </n-flex>
  </n-scrollbar>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";

const settingStore = useSettingStore();

// 本地编辑状态
const customCss = ref(settingStore.customCss);
const customJs = ref(settingStore.customJs);

// 保存代码
const saveCode = () => {
  settingStore.customCss = customCss.value;
  settingStore.customJs = customJs.value;
  window.$message.success("自定义代码已保存");
};

watch(
  () => settingStore.customCss,
  (val) => (customCss.value = val),
);
watch(
  () => settingStore.customJs,
  (val) => (customJs.value = val),
);
</script>

<style lang="scss" scoped>
.custom-code {
  .n-alert {
    margin-bottom: 16px;
  }
  .n-h3 {
    margin-bottom: 12px;
  }
  .n-text {
    display: block;
    margin-bottom: 8px;
  }
  .code-section {
    margin-bottom: 20px;
    &:last-of-type {
      margin-bottom: 0;
    }
  }
}
</style>
