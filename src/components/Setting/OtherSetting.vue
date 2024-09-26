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
          <n-text class="tip" :depth="3">可在此处输入国内 IP</n-text>
        </div>
        <n-input
          v-model:value="settingStore.realIP"
          :disabled="!settingStore.useRealIP"
          placeholder="请填写真实 IP 地址"
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
import { isElectron } from "@/utils/helper";
import { debounce } from "lodash-es";

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
