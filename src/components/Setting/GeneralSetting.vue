<!-- 常规设置 -->
<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> 主题设置 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">主题模式</n-text>
          <n-text class="tip" :depth="3">调整全局主题明暗模式</n-text>
        </div>
        <n-select
          v-model:value="settingStore.themeMode"
          class="set"
          :options="[
            {
              label: '跟随系统',
              value: 'auto',
            },
            {
              label: '浅色模式',
              value: 'light',
            },
            {
              label: '深色模式',
              value: 'dark',
            },
          ]"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">主题配置</n-text>
          <n-text class="tip" :depth="3">更改主题色或自定义图片</n-text>
        </div>
        <n-select
          v-model:value="settingStore.themeColorType"
          class="set"
          :disabled="settingStore.themeFollowCover"
          :options="themeColorOptions"
        />
      </n-card>
      <n-collapse-transition
        :show="settingStore.themeColorType === 'custom' && !settingStore.themeFollowCover"
      >
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">自定义主题色</n-text>
            <n-text class="tip" :depth="3">可在此处自定义全局主题色</n-text>
          </div>
          <n-color-picker
            v-model:value="settingStore.themeCustomColor"
            :show-alpha="false"
            :modes="['hex']"
            class="set"
          />
        </n-card>
      </n-collapse-transition>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">全局着色</n-text>
          <n-text class="tip" :depth="3">是否将主题色应用至所有元素</n-text>
        </div>
        <n-switch
          v-model:value="settingStore.themeGlobalColor"
          class="set"
          :round="false"
          @update:value="themeGlobalColorChange"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">全局动态取色</n-text>
          <n-text class="tip" :depth="3">主题色是否跟随封面，开启后自定义主题色将失效</n-text>
        </div>
        <n-switch
          v-model:value="settingStore.themeFollowCover"
          :disabled="isEmpty(statusStore.songCoverTheme)"
          class="set"
          :round="false"
        />
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> 杂项设置 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示搜索历史</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.showSearchHistory" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">搜索关键词建议</n-text>
          <n-text class="tip" :depth="3">是否启用搜索关键词建议</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.enableSearchKeyword" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">侧边栏显示封面</n-text>
          <n-text class="tip" :depth="3">是否显示歌单的封面，如果有</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.menuShowCover" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">侧边栏隐藏</n-text>
          <n-text class="tip" :depth="3">配置需要在侧边栏隐藏的菜单项</n-text>
        </div>
        <n-button type="primary" strong secondary @click="openSidebarHideManager"> 配置 </n-button>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">首页栏目配置</n-text>
          <n-text class="tip" :depth="3">调整首页各栏目的显示顺序或隐藏不需要的栏目</n-text>
        </div>
        <n-button type="primary" strong secondary @click="openHomePageSectionManager">
          配置
        </n-button>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示歌曲音质</n-text>
          <n-text class="tip" :depth="3">是否列表中显示歌曲音质</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.showSongQuality" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示特权标签</n-text>
          <n-text class="tip" :depth="3">是否显示如 VIP、EP 等特权标签</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.showSongPrivilegeTag" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示原唱翻唱标签</n-text>
          <n-text class="tip" :depth="3">是否显示歌曲原唱翻唱标签</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.showSongOriginalTag" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">开启页面缓存</n-text>
          <n-text class="tip" :depth="3">是否开启部分页面的缓存，这将会增加内存占用</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.useKeepAlive" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">页面切换动画</n-text>
          <n-text class="tip" :depth="3">选择页面切换时的动画效果</n-text>
        </div>
        <n-select
          v-model:value="settingStore.routeAnimation"
          :options="[
            {
              label: '无动画',
              value: 'none',
            },
            {
              label: '淡入淡出',
              value: 'fade',
            },
            {
              label: '缩放',
              value: 'zoom',
            },
            {
              label: '滑动',
              value: 'slide',
            },
            {
              label: '上浮',
              value: 'up',
            },
          ]"
          class="set"
        />
      </n-card>
    </div>
    <div v-if="isElectron" class="set-list">
      <n-h3 prefix="bar"> 系统设置 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">在线服务</n-text>
          <n-text class="tip" :depth="3">是否开启软件的在线服务</n-text>
        </div>
        <n-switch class="set" :value="useOnlineService" :round="false" @update:value="modeChange" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">自定义字体</n-text>
          <n-text class="tip" :depth="3"> 更改软件内全局字体 </n-text>
        </div>
        <n-flex>
          <Transition name="fade" mode="out-in">
            <n-button
              v-if="settingStore.globalFont !== 'default'"
              type="primary"
              strong
              secondary
              @click="settingStore.globalFont = 'default'"
            >
              恢复默认
            </n-button>
          </Transition>
          <n-select
            v-model:value="settingStore.globalFont"
            :options="allFontsData"
            class="set"
            filterable
          />
        </n-flex>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">关闭软件时</n-text>
          <n-text class="tip" :depth="3">选择关闭软件的方式</n-text>
        </div>
        <n-select
          v-model:value="settingStore.closeAppMethod"
          :disabled="settingStore.showCloseAppTip"
          :options="[
            {
              label: '最小化到任务栏',
              value: 'hide',
            },
            {
              label: '直接退出',
              value: 'close',
            },
          ]"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">每次关闭前都进行提醒</n-text>
        </div>
        <n-switch v-model:value="settingStore.showCloseAppTip" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">任务栏显示播放进度</n-text>
          <n-text class="tip" :depth="3"> 是否在任务栏显示歌曲播放进度 </n-text>
        </div>
        <n-switch
          v-model:value="settingStore.showTaskbarProgress"
          class="set"
          :round="false"
          @update:value="closeTaskbarProgress"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">阻止系统息屏</n-text>
          <n-text class="tip" :depth="3">是否在播放界面阻止系统息屏</n-text>
        </div>
        <n-switch v-model:value="settingStore.preventSleep" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">通过 Orpheus 协议唤起本应用</n-text>
          <n-text class="tip" :depth="3">
            该协议通常用于官方网页端唤起官方客户端， 启用后可能导致官方客户端无法被唤起
          </n-text>
        </div>
        <n-switch
          v-model:value="settingStore.registryProtocol.orpheus"
          class="set"
          :round="false"
          @update:value="orpheusChange"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">自动检查更新</n-text>
          <n-text class="tip" :depth="3">在每次开启软件时自动检查更新</n-text>
        </div>
        <n-switch v-model:value="settingStore.checkUpdateOnStart" class="set" :round="false" />
      </n-card>
    </div>
    <!-- OtherSetting Content -->
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
import { useSettingStore, useDataStore, useMusicStore, useStatusStore } from "@/stores";
import { isDev, isElectron } from "@/utils/env";
import { isEmpty, debounce } from "lodash-es";
import themeColor from "@/assets/data/themeColor.json";
import { openSidebarHideManager, openHomePageSectionManager } from "@/utils/modal";
import { sendRegisterProtocol } from "@/utils/protocol";
import { getCoverColor } from "@/utils/color";
import type { SelectOption } from "naive-ui";
import { NAlert } from "naive-ui";

const dataStore = useDataStore();
const musicStore = useMusicStore();
const settingStore = useSettingStore();
const statusStore = useStatusStore();

// 全部字体
const allFontsData = ref<SelectOption[]>([]);

// 是否开启在线服务
const useOnlineService = ref(settingStore.useOnlineService);

// 全局主题色配置
const themeColorOptions: SelectOption[] = [
  // { label: "关闭主题色", value: "close" },
  ...Object.keys(themeColor).map((key) => ({
    value: key,
    label: themeColor[key].name,
    style: {
      color: themeColor[key].color,
    },
  })),
];

// 关闭任务栏进度
const closeTaskbarProgress = (val: boolean) => {
  if (!val) window.electron.ipcRenderer.send("set-bar", "none");
};

// 获取全部系统字体
const getAllSystemFonts = async () => {
  const allFonts = await window.electron.ipcRenderer.invoke("get-all-fonts");
  allFonts.map((v: string) => {
    // 去除前后的引号
    v = v.replace(/^['"]+|['"]+$/g, "");
    allFontsData.value.push({
      label: v,
      value: v,
      style: {
        fontFamily: v,
      },
    });
  });
  // 添加默认选项
  allFontsData.value.unshift({
    label: "系统默认",
    value: "default",
    style: {
      fontFamily:
        "v-sans, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
    },
  });
};

// 在线模式切换
const modeChange = (val: boolean) => {
  if (val) {
    window.$dialog.warning({
      title: "开启在线服务",
      content: "确定开启软件的在线服务？更改将在热重载后生效！",
      positiveText: "开启",
      negativeText: "取消",
      onPositiveClick: () => {
        useOnlineService.value = true;
        settingStore.useOnlineService = true;
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
      content:
        "确定关闭软件的在线服务？将关闭包括搜索、登录、在线音乐播放等在内的全部在线服务，并且将会退出登录状态，软件将会变为本地播放器！更改将在重启后生效！",
      positiveText: "关闭",
      negativeText: "取消",
      onPositiveClick: () => {
        useOnlineService.value = false;
        settingStore.useOnlineService = false;
        // 清理播放数据
        dataStore.$reset();
        musicStore.$reset();
        // 清空本地数据
        localStorage.removeItem("data-store");
        localStorage.removeItem("music-store");
        // 重启
        if (!isDev) window.electron.ipcRenderer.send("win-restart");
      },
      onNegativeClick: () => {
        useOnlineService.value = true;
        settingStore.useOnlineService = true;
      },
    });
  }
};

// 全局着色更改
const themeGlobalColorChange = (val: boolean) => {
  if (val) getCoverColor(musicStore.songCover);
};

// 注册或取消注册协议
const orpheusChange = async (isRegistry: boolean) => {
  sendRegisterProtocol("orpheus", isRegistry);
};

// OtherSetting Logic

const testProxyLoading = ref<boolean>(false);

// 获取当前代理配置
const proxyConfig = computed(() => ({
  protocol: settingStore.proxyProtocol,
  server: settingStore.proxyServe,
  port: settingStore.proxyPort,
  username: "test", // placeholder if needed or remove
  password: "test", // placeholder if needed or remove
}));

// 应用代理
const setProxy = debounce(() => {
  if (settingStore.proxyProtocol === "off" || !settingStore.proxyServe || !settingStore.proxyPort) {
    window.electron.ipcRenderer.send("remove-proxy");
    window.$message.success("成功关闭网络代理");
    return;
  }
  // @ts-ignore
  window.electron.ipcRenderer.send("set-proxy", proxyConfig.value);
  window.$message.success("网络代理配置完成，请重启软件");
}, 300);

// 测试代理
const testProxy = async () => {
  testProxyLoading.value = true;
  // @ts-ignore
  const result = await window.electron.ipcRenderer.invoke("test-proxy", proxyConfig.value);
  if (result) {
    window.$message.success("该代理可正常使用");
  } else {
    window.$message.error("代理测试失败，请重试");
  }
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

onMounted(() => {
  if (isElectron) {
    getAllSystemFonts();
  }
});
</script>
