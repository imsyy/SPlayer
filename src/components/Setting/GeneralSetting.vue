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
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">字体设置</n-text>
          <n-text class="tip" :depth="3"> 统一配置全局及歌词区域的字体 </n-text>
        </div>
        <n-button type="primary" strong secondary @click="openFontManager"> 配置 </n-button>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">自定义代码注入</n-text>
          <n-text class="tip" :depth="3"> 注入自定义 CSS 和 JavaScript 代码 </n-text>
        </div>
        <n-button type="primary" strong secondary @click="openCustomCode"> 配置 </n-button>
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
          <n-text class="name">失焦自动清空搜索框</n-text>
          <n-text class="tip" :depth="3">搜索框失去焦点后自动清空内容</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.clearSearchOnBlur" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">隐藏括号与别名</n-text>
          <n-text class="tip" :depth="3">隐藏歌曲名与专辑名中的括号内容和别名</n-text>
        </div>
        <n-switch v-model:value="settingStore.hideLyricBrackets" class="set" :round="false" />
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
          <n-text class="name">无边框窗口模式</n-text>
          <n-text class="tip" :depth="3">
            是否开启无边框窗口模式，关闭后将使用系统原生边框（需重启）
          </n-text>
        </div>
        <n-switch
          v-model:value="useBorderless"
          class="set"
          :round="false"
          @update:value="borderlessChange"
        />
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
  </div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui";
import { useDataStore, useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { isElectron } from "@/utils/env";
import { isEmpty } from "lodash-es";
import themeColor from "@/assets/data/themeColor.json";
import {
  openSidebarHideManager,
  openHomePageSectionManager,
  openFontManager,
  openCustomCode,
} from "@/utils/modal";
import { sendRegisterProtocol } from "@/utils/protocol";
import { getCoverColor } from "@/utils/color";
import { usePlayerController } from "@/core/player/PlayerController";

const dataStore = useDataStore();
const musicStore = useMusicStore();
const settingStore = useSettingStore();
const statusStore = useStatusStore();
const player = usePlayerController();

// 是否开启在线服务
const useOnlineService = ref(settingStore.useOnlineService);

// 是否开启无边框窗口
const useBorderless = ref(true);

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

// 在线模式切换
const modeChange = (val: boolean) => {
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

// 全局着色更改
const themeGlobalColorChange = (val: boolean) => {
  if (val) getCoverColor(musicStore.songCover);
};

// 注册或取消注册协议
const orpheusChange = async (isRegistry: boolean) => {
  sendRegisterProtocol("orpheus", isRegistry);
};

// 无边框窗口切换
const borderlessChange = async (val: boolean) => {
  const windowConfig = await window.api.store.get("window");
  window.api.store.set("window", {
    ...windowConfig,
    useBorderless: val,
  });
  window.$message.warning("设置已保存，重启软件后生效");
};

onMounted(async () => {
  if (isElectron) {
    // 获取无边框窗口配置
    const windowConfig = await window.api.store.get("window");
    useBorderless.value = windowConfig?.useBorderless ?? true;
  }
});
</script>
