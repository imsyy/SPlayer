import { useDataStore, useMusicStore, useSettingStore } from "@/stores";
import { usePlayerController } from "@/core/player/PlayerController";
import { isElectron } from "@/utils/env";
import { openExcludeComment } from "@/utils/modal";
import { sendRegisterProtocol } from "@/utils/protocol";
import { SettingConfig } from "@/types/settings";
import { ref, computed, h } from "vue";
import { NAlert } from "naive-ui";

export const useGeneralSettings = (): SettingConfig => {
  const dataStore = useDataStore();
  const musicStore = useMusicStore();
  const settingStore = useSettingStore();
  const player = usePlayerController();

  const useOnlineService = ref(settingStore.useOnlineService);

  const handleModeChange = (val: boolean) => {
    if (val) {
      window.$dialog.warning({
        title: "开启在线服务",
        content: "确定开启软件的在线服务？更改将在热重载后生效！",
        positiveText: "开启",
        negativeText: "取消",
        onPositiveClick: async () => {
          useOnlineService.value = true;
          settingStore.useOnlineService = true;
          // 清空播放列表
          await player.cleanPlayList();
          // 清理播放数据
          dataStore.$reset();
          musicStore.$reset();
          // 清空本地数据
          localStorage.removeItem("data-store");
          localStorage.removeItem("music-store");
          // 热重载
          window.location.reload();
        },
      });
    } else {
      window.$dialog.warning({
        title: "关闭在线服务",
        content: "确定关闭软件的在线服务？关闭后将只能播放本地音乐！更改将在热重载后生效！",
        positiveText: "关闭",
        negativeText: "取消",
        onPositiveClick: async () => {
          useOnlineService.value = false;
          settingStore.useOnlineService = false;
          // 清空播放列表
          await player.cleanPlayList();
          // 清理播放数据
          dataStore.$reset();
          musicStore.$reset();
          // 清空本地数据
          localStorage.removeItem("data-store");
          localStorage.removeItem("music-store");
          // 热重载
          window.location.reload();
        },
        onNegativeClick: () => {
          useOnlineService.value = true;
          settingStore.useOnlineService = true;
        },
      });
    }
  };

  // 任务栏进度
  const closeTaskbarProgress = (val: boolean) => {
    if (!isElectron) return;
    if (!val) window.electron.ipcRenderer.send("set-bar", "none");
  };
  // Orpheus 协议
  const handleOrpheusChange = async (isRegistry: boolean) => {
    sendRegisterProtocol("orpheus", isRegistry);
  };

  // --- Backup & Restore Logic (from other.ts) ---
  const exportSettings = async () => {
    try {
      const rendererData = {
        "setting-store": localStorage.getItem("setting-store"),
        "shortcut-store": localStorage.getItem("shortcut-store"),
        // "status-store": localStorage.getItem("status-store"),
        // "music-store": localStorage.getItem("music-store"),
      };
      const result = await window.api.store.export(rendererData);
      if (result && result.success) {
        window.$message.success(`设置导出成功: ${result.path}`);
      } else {
        const errorMsg = result?.error === "cancelled" ? "已取消导出" : "设置导出失败";
        if (result?.error !== "cancelled") {
          window.$message.error(errorMsg);
        }
      }
    } catch {
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
            {
              default: () =>
                "导入设置将覆盖当前所有配置（包括主题、快捷键、音效设置等）并重启软件。",
            },
          ),
          h("div", null, "是否继续？"),
        ]),
      positiveText: "确定",
      negativeText: "取消",
      onPositiveClick: async () => {
        try {
          const result = await window.api.store.import();
          if (result && result.success) {
            const data = result.data;
            let restoredCount = 0;
            if (data.renderer) {
              const storesToRestore = [
                "setting-store",
                "shortcut-store",
                // "status-store",
                // "music-store",
              ];

              storesToRestore.forEach((key) => {
                if (data.renderer[key]) {
                  localStorage.setItem(key, data.renderer[key]);
                  restoredCount++;
                }
              });
            }

            if (restoredCount > 0 || data.electron) {
              window.$message.success("设置导入成功，即将重启");
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            } else {
              window.$message.warning("未找到可恢复的设置数据");
            }
          } else {
            if (result?.error !== "cancelled") {
              window.$message.error("设置导入失败: " + (result?.error || "未知错误"));
            }
          }
        } catch (error) {
          window.$message.error("设置导入出错");
          console.error(error);
        }
      },
    });
  };

  // --- Reset Logic (from other.ts) ---
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
        title: "系统行为",
        show: isElectron,
        items: [
          {
            key: "useOnlineService",
            label: "在线服务",
            type: "switch",
            description: "是否开启软件的在线服务",
            value: computed({
              get: () => useOnlineService.value,
              set: (v) => handleModeChange(v),
            }),
          },
          {
            key: "closeAppMethod",
            label: "关闭软件时",
            type: "select",
            description: "选择关闭软件的方式",
            disabled: computed(() => settingStore.showCloseAppTip),
            options: [
              { label: "最小化到任务栏", value: "hide" },
              { label: "直接退出", value: "close" },
            ],
            value: computed({
              get: () => settingStore.closeAppMethod,
              set: (v) => (settingStore.closeAppMethod = v),
            }),
          },
          {
            key: "showCloseAppTip",
            label: "每次关闭前都进行提醒",
            type: "switch",
            value: computed({
              get: () => settingStore.showCloseAppTip,
              set: (v) => (settingStore.showCloseAppTip = v),
            }),
          },
          {
            key: "showTaskbarProgress",
            label: "任务栏显示播放进度",
            type: "switch",
            description: "是否在任务栏显示歌曲播放进度",
            value: computed({
              get: () => settingStore.showTaskbarProgress,
              set: (v) => {
                settingStore.showTaskbarProgress = v;
                closeTaskbarProgress(v);
              },
            }),
          },
          {
            key: "orpheusProtocol",
            label: "通过 Orpheus 协议唤起本应用",
            type: "switch",
            description:
              "该协议通常用于官方网页端唤起官方客户端， 启用后可能导致官方客户端无法被唤起",
            value: computed({
              get: () => settingStore.registryProtocol.orpheus,
              set: (v) => {
                settingStore.registryProtocol.orpheus = v;
                handleOrpheusChange(v);
              },
            }),
          },
          {
            key: "checkUpdateOnStart",
            label: "自动检查更新",
            type: "switch",
            description: "在每次开启软件时自动检查更新",
            value: computed({
              get: () => settingStore.checkUpdateOnStart,
              set: (v) => (settingStore.checkUpdateOnStart = v),
            }),
          },
          {
            key: "updateChannel",
            label: "更新通道",
            type: "select",
            description: "切换更新通道（Nightly 通道可体验最新功能）",
            options: [
              { label: "Stable (正式版)", value: "stable" },
              { label: "Nightly (开发版)", value: "nightly" },
            ],
            value: computed({
              get: () => settingStore.updateChannel,
              set: (v) => {
                settingStore.updateChannel = v;
                // 切换后立即检查更新
                if (isElectron) window.electron.ipcRenderer.send("check-update", true, v);
              },
            }),
          },
        ],
      },
      {
        title: "搜索设置",
        items: [
          {
            key: "showSearchHistory",
            label: "显示搜索历史",
            type: "switch",
            value: computed({
              get: () => settingStore.showSearchHistory,
              set: (v) => (settingStore.showSearchHistory = v),
            }),
          },
          {
            key: "enableSearchKeyword",
            label: "搜索关键词建议",
            type: "switch",
            description: "是否启用搜索关键词建议",
            value: computed({
              get: () => settingStore.enableSearchKeyword,
              set: (v) => (settingStore.enableSearchKeyword = v),
            }),
          },
          {
            key: "clearSearchOnBlur",
            label: "失焦自动清空搜索框",
            type: "switch",
            description: "搜索框失去焦点后自动清空内容",
            value: computed({
              get: () => settingStore.clearSearchOnBlur,
              set: (v) => (settingStore.clearSearchOnBlur = v),
            }),
          },
          {
            key: "hideBracketedContent",
            label: "隐藏括号与别名",
            type: "switch",
            description: "隐藏歌曲名与专辑名中的括号内容和别名",
            value: computed({
              get: () => settingStore.hideBracketedContent,
              set: (v) => (settingStore.hideBracketedContent = v),
            }),
          },
          {
            key: "configExcludeComment",
            label: "评论排除配置",
            type: "button",
            description: "配置排除评论的规则（关键词或正则表达式）",
            buttonLabel: "配置",
            action: openExcludeComment,
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
