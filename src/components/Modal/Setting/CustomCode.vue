<template>
  <n-scrollbar style="max-height: 70vh" class="custom-code">
    <n-alert type="warning">
      请勿输入来源不明或他人提供的代码！恶意代码可能窃取您的账号信息、泄露隐私数据，或导致应用崩溃等异常行为。
    </n-alert>
    <div class="code-section">
      <n-h3 prefix="bar">自定义 CSS</n-h3>
      <n-text :depth="3">
        输入自定义 CSS 样式，将会被注入到页面中
        <n-text :depth="3" style="color: #f5222d; font-weight: bold">
          (填写不当可能导致致命性问题，请在有条件的情况下使用外部文件导入)
        </n-text>
      </n-text>
      <n-input
        v-model:value="customCss"
        :autosize="{ minRows: 6, maxRows: 12 }"
        type="textarea"
        placeholder="/* 输入自定义 CSS */"
        style="font-family: monospace"
      />
      <n-card
        title="外部 CSS 文件"
        size="small"
        style="margin-top: 12px"
        content-style="padding: 0"
      >
        <template #header-extra>
          <n-flex size="small">
            <n-button size="small" secondary @click="refreshCss">
              <template #icon>
                <SvgIcon name="Refresh" />
              </template>
              刷新
            </n-button>
            <n-button size="small" secondary @click="addCssFile">
              <template #icon>
                <SvgIcon name="Add" />
              </template>
              添加文件
            </n-button>
          </n-flex>
        </template>
        <n-list hoverable clickable>
          <n-list-item v-for="(file, index) in customCssFiles" :key="file">
            <n-flex justify="space-between" align="center">
              <n-text style="font-size: 13px">{{ file }}</n-text>
              <n-button size="tiny" text type="error" @click="removeCssFile(index)">
                <template #icon>
                  <SvgIcon name="Delete" />
                </template>
              </n-button>
            </n-flex>
          </n-list-item>
          <n-empty
            v-if="!customCssFiles.length"
            description="暂无外部 CSS 文件"
            style="padding: 12px 0"
          />
        </n-list>
      </n-card>
    </div>
    <div class="code-section">
      <n-h3 prefix="bar">自定义 JavaScript</n-h3>
      <n-text :depth="3">
        输入自定义 JavaScript 代码，将在应用启动时执行（ 重启后生效 ）
        <n-text :depth="3" style="color: #f5222d; font-weight: bold">
          (填写不当可能导致致命性问题，请在有条件的情况下使用外部文件导入)
        </n-text>
      </n-text>
      <n-input
        v-model:value="customJs"
        :autosize="{ minRows: 6, maxRows: 12 }"
        type="textarea"
        placeholder="// 输入自定义 JavaScript"
        style="font-family: monospace"
      />
      <n-text :depth="3"> 导入自定义 JavaScript 代码文件 </n-text>
      <n-card
        title="外部 JS 文件"
        size="small"
        style="margin-top: 12px"
        content-style="padding: 0"
      >
        <template #header-extra>
          <n-flex size="small">
            <n-button size="small" secondary @click="refreshJs">
              <template #icon>
                <SvgIcon name="Refresh" />
              </template>
              刷新
            </n-button>
            <n-button size="small" secondary @click="addJsFile">
              <template #icon>
                <SvgIcon name="Add" />
              </template>
              添加文件
            </n-button>
          </n-flex>
        </template>
        <n-list hoverable clickable>
          <n-list-item v-for="(file, index) in customJsFiles" :key="file">
            <n-flex justify="space-between" align="center">
              <n-text style="font-size: 13px">{{ file }}</n-text>
              <n-button size="tiny" text type="error" @click="removeJsFile(index)">
                <template #icon>
                  <SvgIcon name="Delete" />
                </template>
              </n-button>
            </n-flex>
          </n-list-item>
          <n-empty
            v-if="!customJsFiles.length"
            description="暂无外部 JS 文件"
            style="padding: 12px 0"
          />
        </n-list>
      </n-card>
    </div>
    <n-flex justify="end" style="margin-top: 16px">
      <n-button type="primary" strong @click="saveCode">保存</n-button>
    </n-flex>
  </n-scrollbar>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
import { useCustomCode } from "@/composables/useCustomCode";

const settingStore = useSettingStore();
const { updateCustomFileCss, executeCustomJs } = useCustomCode();

// 本地编辑状态
const customCss = ref(settingStore.customCss);
const customJs = ref(settingStore.customJs);
const customCssFiles = ref<string[]>(settingStore.customCssFiles || []);
const customJsFiles = ref<string[]>(settingStore.customJsFiles || []);

// 刷新 CSS
const refreshCss = async () => {
  await updateCustomFileCss();
  window.$message.success("CSS 已刷新");
};

// 刷新 JS
const refreshJs = () => {
  executeCustomJs();
  window.$message.success("JS 已重新执行");
};

// 添加 CSS 文件
const addCssFile = async () => {
  const result = await window.electron.ipcRenderer.invoke("choose-file", "选择 CSS 文件", {
    filters: [{ name: "CSS Files", extensions: ["css"] }],
    multiSelect: true,
  });
  if (result) {
    const files = Array.isArray(result) ? result : [result];
    // 过滤已存在的文件
    const newFiles = files.filter((f) => !customCssFiles.value.includes(f));
    customCssFiles.value.push(...newFiles);
  }
};

// 移除 CSS 文件
const removeCssFile = (index: number) => {
  customCssFiles.value.splice(index, 1);
};

// 添加 JS 文件
const addJsFile = async () => {
  const result = await window.electron.ipcRenderer.invoke("choose-file", "选择 JS 文件", {
    filters: [{ name: "JavaScript Files", extensions: ["js"] }],
    multiSelect: true,
  });
  if (result) {
    const files = Array.isArray(result) ? result : [result];
    const newFiles = files.filter((f) => !customJsFiles.value.includes(f));
    customJsFiles.value.push(...newFiles);
  }
};

// 移除 JS 文件
const removeJsFile = (index: number) => {
  customJsFiles.value.splice(index, 1);
};

// 保存代码
const saveCode = () => {
  settingStore.customCss = customCss.value;
  settingStore.customJs = customJs.value;
  settingStore.customCssFiles = customCssFiles.value;
  settingStore.customJsFiles = customJsFiles.value;
  window.$message.success("自定义代码及列表已保存");
};

watch(
  () => settingStore.customCss,
  (val) => (customCss.value = val),
);
watch(
  () => settingStore.customJs,
  (val) => (customJs.value = val),
);
watch(
  () => settingStore.customCssFiles,
  (val) => (customCssFiles.value = val || []),
  { deep: true }
);
watch(
  () => settingStore.customJsFiles,
  (val) => (customJsFiles.value = val || []),
  { deep: true }
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
