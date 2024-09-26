<template>
  <n-layout-header class="nav">
    <!-- 页面导航 -->
    <n-flex class="page-control">
      <n-button :focusable="false" tertiary circle @click="router.go(-1)">
        <template #icon>
          <SvgIcon name="NavigateBefore" :size="26" />
        </template>
      </n-button>
      <n-button :focusable="false" tertiary circle @click="router.go(1)">
        <template #icon>
          <SvgIcon name="NavigateNext" :size="26" />
        </template>
      </n-button>
    </n-flex>
    <!-- 主内容 -->
    <n-flex class="nav-main">
      <!-- 搜索 -->
      <SearchInp />
      <!-- 可拖拽 -->
      <div class="nav-drag" />
      <!-- 用户 -->
      <User v-if="settingStore.useOnlineService" />
      <!-- 设置菜单 -->
      <n-dropdown :options="setOptions" trigger="click" show-arrow @select="setSelect">
        <n-button :focusable="false" title="设置" tertiary circle>
          <template #icon>
            <SvgIcon name="Settings" />
          </template>
        </n-button>
      </n-dropdown>
    </n-flex>
    <!-- 客户端控制 -->
    <n-flex v-if="isElectron" align="center" class="client-control">
      <n-divider class="divider" vertical />
      <n-button :focusable="false" title="最小化" tertiary circle @click="min">
        <template #icon>
          <SvgIcon name="WindowMinimize" />
        </template>
      </n-button>
      <n-button
        :focusable="false"
        :title="isMax ? '还原' : '最大化'"
        tertiary
        circle
        @click="maxOrRes"
      >
        <template #icon>
          <SvgIcon :name="isMax ? 'WindowRestore' : 'WindowMaximize'" />
        </template>
      </n-button>
      <n-button :focusable="false" title="关闭" tertiary circle @click="tryClose">
        <template #icon>
          <SvgIcon name="WindowClose" />
        </template>
      </n-button>
    </n-flex>
    <!-- 关闭弹窗 -->
    <n-modal
      v-model:show="showCloseModal"
      :auto-focus="false"
      title="关闭软件"
      style="width: 600px"
      preset="card"
      transform-origin="center"
      bordered
      @after-leave="rememberNotAsk = false"
    >
      <n-text class="tip">确认关闭软件吗？</n-text>
      <n-checkbox v-model:checked="rememberNotAsk" class="checkbox"> 记住且不再询问 </n-checkbox>
      <template #footer>
        <n-flex justify="end">
          <n-button strong secondary @click="hideOrClose('exit')">
            <template #icon>
              <SvgIcon name="ExitToApp" />
            </template>
            关闭
          </n-button>
          <n-button type="primary" strong secondary @click="hideOrClose('hide')">
            <template #icon>
              <SvgIcon name="WindowHide" />
            </template>
            隐藏到托盘
          </n-button>
        </n-flex>
      </template>
    </n-modal>
  </n-layout-header>
</template>

<script setup lang="ts">
import type { DropdownOption } from "naive-ui";
import { useSettingStore } from "@/stores";
import { isElectron, isDev, renderIcon } from "@/utils/helper";
import { openSetting } from "@/utils/modal";

const router = useRouter();
const settingStore = useSettingStore();

const showCloseModal = ref(false);
// 是否记住
const rememberNotAsk = ref(false);

// 当前窗口状态
const isMax = ref(false);

// 最小化
const min = () => window.electron.ipcRenderer.send("win-min");

// 最大化或还原
const maxOrRes = () => {
  if (window.electron.ipcRenderer.sendSync("win-state")) {
    isMax.value = false;
    window.electron.ipcRenderer.send("win-restore");
  } else {
    isMax.value = true;
    window.electron.ipcRenderer.send("win-max");
  }
};

// 隐藏或关闭
const hideOrClose = (action: "hide" | "exit") => {
  if (rememberNotAsk.value) {
    settingStore.showCloseAppTip = false;
    settingStore.closeAppMethod = action;
  }
  showCloseModal.value = false;
  window.electron.ipcRenderer.send(action === "hide" ? "win-hide" : "win-close");
};

// 尝试关闭软件
const tryClose = () => {
  if (settingStore.showCloseAppTip) {
    showCloseModal.value = true;
  } else {
    hideOrClose(settingStore.closeAppMethod);
  }
};

// 设置菜单
const setOptions = computed<DropdownOption[]>(() => [
  {
    label:
      settingStore.themeMode === "auto"
        ? "浅色模式"
        : settingStore.themeMode === "light"
          ? "深色模式"
          : "跟随系统",
    key: "themeMode",
    icon: renderIcon(
      settingStore.themeMode === "auto"
        ? "LightTheme"
        : settingStore.themeMode === "light"
          ? "DarkTheme"
          : "AutoTheme",
    ),
  },
  {
    key: "header-divider",
    type: "divider",
  },
  {
    // 重启
    key: "restart",
    label: "软件热重载",
    show: isElectron,
    props: { onClick: () => window.location.reload() },
    icon: renderIcon("Restart"),
  },
  {
    key: "dev-tools",
    label: "开启控制台",
    show: isDev,
    icon: renderIcon("Code"),
  },
  {
    key: "setting",
    label: "全局设置",
    icon: renderIcon("Settings"),
  },
]);

// 菜单选择
const setSelect = (key: string) => {
  switch (key) {
    case "themeMode":
      settingStore.setThemeMode();
      break;
    case "setting":
      openSetting();
      break;
    case "dev-tools":
      window.electron.ipcRenderer.send("open-dev-tools");
      break;
    default:
      break;
  }
};

onMounted(() => {
  // 获取窗口状态
  if (isElectron) {
    isMax.value = window.electron.ipcRenderer.sendSync("win-state");
  }
});
</script>

<style lang="scss" scoped>
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
  padding: 0 1rem;
  background-color: transparent;
  -webkit-app-region: drag;
  .n-button {
    width: 40px;
    height: 40px;
    -webkit-app-region: no-drag;
  }
  .nav-main {
    flex: 1;
    align-items: center;
    height: 100%;
    margin-left: 12px;
    .nav-drag {
      flex: 1;
      width: 100%;
      height: 100%;
    }
  }
  .client-control {
    .divider {
      margin: 0 0 0 12px;
    }
  }
}
.tip {
  font-size: 16px;
}
.checkbox {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: max-content;
  margin-top: 12px;
  :deep(.n-checkbox__label) {
    line-height: 0;
  }
}
</style>
