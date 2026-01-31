import { useSettingStore, useDataStore } from "@/stores";
import { isElectron } from "@/utils/env";
import { SettingConfig } from "@/types/settings";
import { computed, ref, h } from "vue";
import { debounce } from "lodash-es";
import { NAlert } from "naive-ui";

export const useOtherSettings = (): SettingConfig => {
  const settingStore = useSettingStore();
  const dataStore = useDataStore();

  const testProxyLoading = ref<boolean>(false);

  // --- Network Proxy Logic ---
  const proxyConfig = computed(() => ({
    protocol: settingStore.proxyProtocol,
    server: settingStore.proxyServe,
    port: settingStore.proxyPort,
  }));

  const setProxy = debounce(() => {
    if (
      settingStore.proxyProtocol === "off" ||
      !settingStore.proxyServe ||
      !settingStore.proxyPort
    ) {
      window.electron.ipcRenderer.send("remove-proxy");
      window.$message.success("成功关闭网络代理");
      return;
    }
    window.electron.ipcRenderer.send("set-proxy", proxyConfig.value);
    window.$message.success("网络代理配置完成，请重启软件");
  }, 300);

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

  // --- Backup & Restore Logic ---
  const exportSettings = async () => {
    try {
      const rendererData = {
        "setting-store": localStorage.getItem("setting-store"),
        "shortcut-store": localStorage.getItem("shortcut-store"),
      };
      const result = await window.api.store.export(rendererData);
      if (result) {
        window.$message.success("设置导出成功");
      } else {
        window.$message.error("设置导出失败");
      }
    } catch (error) {
      window.$message.error("设置导出出错");
    }
  };

  const importSettings = async () => {
    window.$dialog.warning({
      title: "导入设置",
      content: () =>
        h("div", null, [
          h(
            NAlert,
            { type: "warning", showIcon: true, style: { marginBottom: "12px" } },
            { default: () => "目前备份数据功能属于测试阶段，不保证可用性" },
          ),
          h("div", null, "导入设置将覆盖当前所有配置并重启软件，是否继续？"),
        ]),
      positiveText: "确定",
      negativeText: "取消",
      onPositiveClick: async () => {
        try {
          const data = await window.api.store.import();
          if (data) {
            if (data.renderer) {
              if (data.renderer["setting-store"])
                localStorage.setItem("setting-store", data.renderer["setting-store"]);
              if (data.renderer["shortcut-store"])
                localStorage.setItem("shortcut-store", data.renderer["shortcut-store"]);
            }
            window.$message.success("设置导入成功，即将重启");
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            window.$message.error("设置导入失败或已取消");
          }
        } catch (error) {
          window.$message.error("设置导入出错");
        }
      },
    });
  };

  // --- Reset Logic ---
  const resetSetting = () => {
    window.$dialog.warning({
      title: "警告",
      content: "此操作将重置所有设置，是否继续?",
      positiveText: "确定",
      negativeText: "取消",
      onPositiveClick: () => {
        settingStore.$reset();
        if (isElectron) window.electron.ipcRenderer.send("reset-setting");
        window.$message.success("设置重置完成");
      },
    });
  };

  const clearAllData = () => {
    window.$dialog.warning({
      title: "高危操作",
      content: "此操作将重置所有设置并清除全部数据，同时将退出登录状态，是否继续?",
      positiveText: "确定",
      negativeText: "取消",
      onPositiveClick: async () => {
        window.localStorage.clear();
        window.sessionStorage.clear();
        await dataStore.deleteDB();
        if (isElectron) window.electron.ipcRenderer.send("reset-setting");
        window.$message.loading("数据清除完成，软件即将热重载", {
          duration: 3000,
          onAfterLeave: () => window.location.reload(),
        });
      },
    });
  };

  return {
    groups: [
      {
        title: "地区解锁",
        items: [
          {
            key: "useRealIP",
            label: "使用真实 IP 地址",
            type: "switch",
            description: "在海外或部分地区可能会受到限制，可开启此处尝试解决",
            value: computed({
              get: () => settingStore.useRealIP,
              set: (v) => (settingStore.useRealIP = v),
            }),
          },
          {
            key: "realIP",
            label: "真实 IP 地址",
            type: "text-input",
            description: "可在此处输入国内 IP，不填写则为随机",
            disabled: computed(() => !settingStore.useRealIP),
            prefix: "IP",
            componentProps: { placeholder: "127.0.0.1" },
            value: computed({
              get: () => settingStore.realIP,
              set: (v) => (settingStore.realIP = v),
            }),
          },
        ],
      },
      {
        title: "网络代理",
        show: isElectron,
        items: [
          {
            key: "proxyProtocol",
            label: "网络代理",
            type: "select",
            description: "修改后请点击保存或重启软件以应用",
            options: [
              { label: "关闭代理", value: "off" },
              { label: "HTTP 代理", value: "HTTP" },
              { label: "HTTPS 代理", value: "HTTPS" },
            ],
            value: computed({
              get: () => settingStore.proxyProtocol,
              set: (v) => (settingStore.proxyProtocol = v),
            }),
            extraButton: {
              label: "保存并应用",
              action: setProxy,
              type: "primary",
              secondary: true,
              strong: true,
            },
          },
          {
            key: "proxyServe",
            label: "代理服务器地址",
            type: "text-input",
            description: "请填写代理服务器地址，如 127.0.0.1",
            disabled: computed(() => settingStore.proxyProtocol === "off"),
            prefix: computed(() =>
              settingStore.proxyProtocol === "off" ? "-" : settingStore.proxyProtocol,
            ),
            componentProps: {
              placeholder: "请填写代理服务器地址",
            },
            value: computed({
              get: () => settingStore.proxyServe,
              set: (v) => (settingStore.proxyServe = v),
            }),
          },
          {
            key: "proxyPort",
            label: "代理服务器端口",
            type: "input-number",
            description: "请填写代理服务器端口，如 80",
            disabled: computed(() => settingStore.proxyProtocol === "off"),
            componentProps: {
              min: 1,
              max: 65535,
              showButton: false,
              placeholder: "请填写代理服务器端口",
            },
            value: computed({
              get: () => settingStore.proxyPort,
              set: (v) => (settingStore.proxyPort = v),
            }),
          },
          {
            key: "proxyTest",
            label: "测试代理",
            type: "button",
            description: "测试代理配置是否可正常连通",
            buttonLabel: "测试代理",
            action: testProxy,
            condition: () => settingStore.proxyProtocol !== "off",
            componentProps: computed(() => ({
              loading: testProxyLoading.value,
              type: "primary",
            })),
          },
        ],
      },
      {
        title: "备份与恢复",
        tags: [{ text: "Beta", type: "warning" }],
        show: isElectron,
        items: [
          {
            key: "exportSettings",
            label: "导出设置",
            type: "button",
            description: "将当前所有设置导出为 JSON 文件",
            buttonLabel: "导出设置",
            action: exportSettings,
            componentProps: { type: "primary" },
          },
          {
            key: "importSettings",
            label: "导入设置",
            type: "button",
            description: "从 JSON 文件恢复设置（导入后将自动重启）",
            buttonLabel: "导入设置",
            action: importSettings,
            componentProps: { type: "primary" },
          },
        ],
      },
      {
        title: "重置",
        items: [
          {
            key: "resetSetting",
            label: "重置所有设置",
            type: "button",
            description: "重置所有设置，恢复软件默认值",
            buttonLabel: "重置设置",
            action: resetSetting,
            componentProps: { type: "warning" },
          },
          {
            key: "clearAllData",
            label: "清除全部数据",
            type: "button",
            description: "重置所有设置，清除全部数据",
            buttonLabel: "清除全部",
            action: clearAllData,
            componentProps: { type: "error" },
          },
        ],
      },
    ],
  };
};
