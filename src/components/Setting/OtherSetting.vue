<!-- 本地设置 -->
<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> {{ t("settings.other.regionTitle") }} </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.other.useRealIP") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.other.useRealIPTip") }}</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.useRealIP" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.other.realIP") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.other.realIPTip") }}</n-text>
        </div>

        <n-input
          v-model:value="settingStore.realIP"
          :disabled="!settingStore.useRealIP"
          placeholder="127.0.0.1"
          class="set"
        >
          <template #prefix>
            <n-text depth="3">IP</n-text>
          </template>
        </n-input>
      </n-card>
    </div>
    <div v-if="isElectron" class="set-list">
      <n-h3 prefix="bar"> {{ t("settings.other.proxyTitle") }} </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.other.proxyLabel") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.other.proxyTip") }}</n-text>
        </div>
        <n-flex>
          <n-button type="primary" strong secondary @click="setProxy"> {{ t("settings.other.proxyApply") }} </n-button>
          <n-select
            v-model:value="settingStore.proxyProtocol"
            :options="[
              {
                label: t('settings.other.proxyOff'),
                value: 'off',
              },
              {
                label: t('settings.other.proxyHttp'),
                value: 'HTTP',
              },
              {
                label: t('settings.other.proxyHttps'),
                value: 'HTTPS',
              },
            ]"
            class="set"
          />
        </n-flex>
      </n-card>

      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.other.proxyAddress") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.other.proxyAddressTip") }}</n-text>
        </div>
        <n-input
          v-model:value="settingStore.proxyServe"
          :disabled="settingStore.proxyProtocol === 'off'"
          :placeholder="t('settings.other.proxyAddressPlaceholder')"
          class="set"

        >
          <template #prefix>
            <n-text depth="3">
              {{ settingStore.proxyProtocol === "off" ? "-" : settingStore.proxyProtocol }}
            </n-text>
          </template>
        </n-input>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.other.proxyPort") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.other.proxyPortTip") }}</n-text>
        </div>
        <n-input-number
          v-model:value="settingStore.proxyPort"
          :disabled="settingStore.proxyProtocol === 'off'"
          :show-button="false"
          :min="1"
          :max="65535"
          :placeholder="t('settings.other.proxyPortPlaceholder')"
          class="set"

        />
      </n-card>
      <n-collapse-transition :show="settingStore.proxyProtocol !== 'off'">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.other.proxyTestTitle") }}</n-text>
            <n-text class="tip" :depth="3">{{ t("settings.other.proxyTestTip") }}</n-text>
          </div>
          <n-button :loading="testProxyLoading" type="primary" strong secondary @click="testProxy">
            {{ t("settings.other.proxyTestBtn") }}
          </n-button>
        </n-card>

      </n-collapse-transition>
    </div>
    <div v-if="isElectron" class="set-list">
      <n-h3 prefix="bar">
        {{ t("settings.other.backupTitle") }}
        <n-tag type="warning" size="small" round>Beta</n-tag>
      </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.other.startExport") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.other.startExportTip") }}</n-text>
        </div>
        <n-button type="primary" strong secondary @click="exportSettings"> {{ t("settings.other.exportBtn") }} </n-button>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.other.startImport") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.other.startImportTip") }}</n-text>
        </div>
        <n-button type="primary" strong secondary @click="importSettings"> {{ t("settings.other.importBtn") }} </n-button>
      </n-card>

    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> {{ t("settings.other.resetTitle") }} </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.other.resetSettings") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.other.resetSettingsTip") }}</n-text>
        </div>
        <n-button type="warning" strong secondary @click="resetSetting"> {{ t("settings.other.resetBtn") }} </n-button>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.other.clearData") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.other.clearDataTip") }}</n-text>
        </div>
        <n-button type="error" strong secondary @click="clearAllData"> {{ t("settings.other.clearBtn") }} </n-button>
      </n-card>

    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore, useDataStore } from "@/stores";
import { isElectron } from "@/utils/env";
import { debounce } from "lodash-es";
import { NAlert, NTag } from "naive-ui";
import { h } from "vue";
import { useI18n } from "vue-i18n";

const dataStore = useDataStore();
const settingStore = useSettingStore();
const { t } = useI18n();

const testProxyLoading = ref<boolean>(false);

// 获取当前代理配置
const proxyConfig = computed(() => ({
  protocol: settingStore.proxyProtocol,
  server: settingStore.proxyServe,
  port: settingStore.proxyPort,
}));

// 应用代理
const setProxy = debounce(() => {
  if (settingStore.proxyProtocol === "off" || !settingStore.proxyServe || !settingStore.proxyPort) {
    window.electron.ipcRenderer.send("remove-proxy");
    window.$message.success(t("settings.other.proxyCloseSuccess"));
    return;
  }
  window.electron.ipcRenderer.send("set-proxy", proxyConfig.value);
  window.$message.success(t("settings.other.proxySetupSuccess"));

}, 300);

// 测试代理
const testProxy = async () => {
  testProxyLoading.value = true;
  const result = await window.electron.ipcRenderer.invoke("test-proxy", proxyConfig.value);
  if (result) {
    window.$message.success(t("settings.other.proxySuccess"));
  } else {
    window.$message.error(t("settings.other.proxyFail"));
  }

  testProxyLoading.value = false;
  testProxyLoading.value = false;
};

// 导出设置
const exportSettings = async () => {
  console.log("[Frontend] Export settings clicked");
  try {
    // 收集渲染进程数据 (localStorage)
    const rendererData = {
      "setting-store": localStorage.getItem("setting-store"),
      "shortcut-store": localStorage.getItem("shortcut-store"),
    };

    const result = await window.api.store.export(rendererData);
    console.log("[Frontend] Export result:", result);
    if (result) {
      window.$message.success(t("settings.other.exportSuccess"));
    } else {
      window.$message.error(t("settings.other.exportFail"));
    }
  } catch (error) {
    console.error("[Frontend] Export error:", error);
    window.$message.error(t("settings.other.exportError"));
  }

};

// 导入设置
const importSettings = async () => {
  console.log("[Frontend] Import settings clicked");
  window.$dialog.warning({
    title: t("settings.other.importTitle"),
    content: () => h("div", null, [
      h(NAlert, { type: "warning", showIcon: true, style: { marginBottom: "12px" } }, { default: () => t("settings.other.importWarning") }),
      h("div", null, t("settings.other.importConfirm"))
    ]),
    positiveText: t("general.dialog.ok"), // "确定"
    negativeText: t("general.dialog.cancel"), // "取消"

    onPositiveClick: async () => {
      console.log("[Frontend] Import confirmed");
      try {
        const data = await window.api.store.import();
        console.log("[Frontend] Import data:", data);

        if (data) {
          // 恢复渲染进程数据
          if (data.renderer) {
            if (data.renderer["setting-store"]) localStorage.setItem("setting-store", data.renderer["setting-store"]);
            if (data.renderer["shortcut-store"]) localStorage.setItem("shortcut-store", data.renderer["shortcut-store"]);
          }

          window.$message.success(t("settings.other.importSuccess"));
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          window.$message.error(t("settings.other.importFail"));
        }
      } catch (error) {
        console.error("[Frontend] Import error:", error);
        window.$message.error(t("settings.other.importError"));
      }

    },
  });
};

// 重置设置
const resetSetting = () => {
  window.$dialog.warning({
    title: t("settings.other.resetWarningTitle"),
    content: t("settings.other.resetWarningContent"),
    positiveText: t("general.dialog.ok"),
    negativeText: t("general.dialog.cancel"),
    onPositiveClick: () => {
      settingStore.$reset();
      // electron
      if (isElectron) window.electron.ipcRenderer.send("reset-setting");
      window.$message.success(t("settings.other.resetSuccess"));
    },
  });

};

// 清除全部数据
const clearAllData = () => {
  window.$dialog.warning({
    title: t("settings.other.clearWarningTitle"),
    content: t("settings.other.clearWarningContent"),
    positiveText: t("general.dialog.ok"),
    negativeText: t("general.dialog.cancel"),
    onPositiveClick: async () => {
      // 重置设置
      window.localStorage.clear();
      window.sessionStorage.clear();
      // deleteDB
      await dataStore.deleteDB();
      // electron
      if (isElectron) window.electron.ipcRenderer.send("reset-setting");
      window.$message.loading(t("settings.other.clearLoading"), {
        duration: 3000,
        onAfterLeave: () => window.location.reload(),
      });

    },
  });
};
</script>
