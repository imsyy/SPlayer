<!-- 本地设置 -->
<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> 地区解锁 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">使用真实 IP 地址</n-text>
          <n-text class="tip" :depth="3">在海外或部分地区可能会受到限制，可开启此处尝试解决</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.useRealIP" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">真实 IP 地址</n-text>
          <n-text class="tip" :depth="3">可在此处输入国内 IP，不填写则为随机</n-text>
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
      <n-h3 prefix="bar"> 网络代理 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">网络代理</n-text>
          <n-text class="tip" :depth="3">修改后请点击保存或重启软件以应用</n-text>
        </div>
        <n-flex>
          <n-button type="primary" strong secondary @click="setProxy"> 保存并应用 </n-button>
          <n-select
            v-model:value="settingStore.proxyProtocol"
            :options="[
              {
                label: '关闭代理',
                value: 'off',
              },
              {
                label: 'HTTP 代理',
                value: 'HTTP',
              },
              {
                label: 'HTTPS 代理',
                value: 'HTTPS',
              },
            ]"
            class="set"
          />
        </n-flex>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">代理服务器地址</n-text>
          <n-text class="tip" :depth="3">请填写代理服务器地址，如 127.0.0.1</n-text>
        </div>
        <n-input
          v-model:value="settingStore.proxyServe"
          :disabled="settingStore.proxyProtocol === 'off'"
          placeholder="请填写代理服务器地址"
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
          <n-text class="name">代理服务器端口</n-text>
          <n-text class="tip" :depth="3">请填写代理服务器端口，如 80</n-text>
        </div>
        <n-input-number
          v-model:value="settingStore.proxyPort"
          :disabled="settingStore.proxyProtocol === 'off'"
          :show-button="false"
          :min="1"
          :max="65535"
          placeholder="请填写代理服务器端口"
          class="set"
        />
      </n-card>
      <n-collapse-transition :show="settingStore.proxyProtocol !== 'off'">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">测试代理</n-text>
            <n-text class="tip" :depth="3">测试代理配置是否可正常连通</n-text>
          </div>
          <n-button :loading="testProxyLoading" type="primary" strong secondary @click="testProxy">
            测试代理
          </n-button>
        </n-card>
      </n-collapse-transition>
    </div>
    <div v-if="isElectron" class="set-list">
      <n-h3 prefix="bar">
        备份与恢复
        <n-tag type="warning" size="small" round>Beta</n-tag>
      </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">导出设置</n-text>
          <n-text class="tip" :depth="3">将当前所有设置导出为 JSON 文件</n-text>
        </div>
        <n-button type="primary" strong secondary @click="exportSettings"> 导出设置 </n-button>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">导入设置</n-text>
          <n-text class="tip" :depth="3">从 JSON 文件恢复设置（导入后将自动重启）</n-text>
        </div>
        <n-button type="primary" strong secondary @click="importSettings"> 导入设置 </n-button>
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> 重置 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">重置所有设置</n-text>
          <n-text class="tip" :depth="3">重置所有设置，恢复软件默认值</n-text>
        </div>
        <n-button type="warning" strong secondary @click="resetSetting"> 重置设置 </n-button>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">清除全部数据</n-text>
          <n-text class="tip" :depth="3">重置所有设置，清除全部数据</n-text>
        </div>
        <n-button type="error" strong secondary @click="clearAllData"> 清除全部 </n-button>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore, useDataStore } from "@/stores";
import { isElectron } from "@/utils/env";
import { debounce } from "lodash-es";
import { NAlert, NTag } from "naive-ui";

const dataStore = useDataStore();
const settingStore = useSettingStore();

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
    window.$message.success("成功关闭网络代理");
    return;
  }
  window.electron.ipcRenderer.send("set-proxy", proxyConfig.value);
  window.$message.success("网络代理配置完成，请重启软件");
}, 300);

// 测试代理
const testProxy = async () => {
  testProxyLoading.value = true;
  const result = await window.electron.ipcRenderer.invoke("test-proxy", proxyConfig.value);
  if (result) {
    window.$message.success("该代理可正常使用");
  } else {
    window.$message.error("代理测试失败，请重试");
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
      window.$message.success("设置导出成功");
    } else {
      window.$message.error("设置导出失败");
    }
  } catch (error) {
    console.error("[Frontend] Export error:", error);
    window.$message.error("设置导出出错");
  }
};

// 导入设置
const importSettings = async () => {
  console.log("[Frontend] Import settings clicked");
  window.$dialog.warning({
    title: "导入设置",
    content: () => h("div", null, [
      h(NAlert, { type: "warning", showIcon: true, style: { marginBottom: "12px" } }, { default: () => "目前备份数据功能属于测试阶段，不保证可用性" }),
      h("div", null, "导入设置将覆盖当前所有配置并重启软件，是否继续？")
    ]),
    positiveText: "确定",
    negativeText: "取消",
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

          window.$message.success("设置导入成功，即将重启");
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          window.$message.error("设置导入失败或已取消");
        }
      } catch (error) {
        console.error("[Frontend] Import error:", error);
        window.$message.error("设置导入出错");
      }
    },
  });
};

// 重置设置
const resetSetting = () => {
  window.$dialog.warning({
    title: "警告",
    content: "此操作将重置所有设置，是否继续?",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: () => {
      settingStore.$reset();
      // electron
      if (isElectron) window.electron.ipcRenderer.send("reset-setting");
      window.$message.success("设置重置完成");
    },
  });
};

// 清除全部数据
const clearAllData = () => {
  window.$dialog.warning({
    title: "高危操作",
    content: "此操作将重置所有设置并清除全部数据，同时将退出登录状态，是否继续?",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: async () => {
      // 重置设置
      window.localStorage.clear();
      window.sessionStorage.clear();
      // deleteDB
      await dataStore.deleteDB();
      // electron
      if (isElectron) window.electron.ipcRenderer.send("reset-setting");
      window.$message.loading("数据清除完成，软件即将热重载", {
        duration: 3000,
        onAfterLeave: () => window.location.reload(),
      });
    },
  });
};
</script>
