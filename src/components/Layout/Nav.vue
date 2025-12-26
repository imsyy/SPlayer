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
        <n-button :focusable="false" :title="t('nav.setting')" tertiary circle>
          <template #icon>
            <SvgIcon name="Settings" />
          </template>
        </n-button>
      </n-dropdown>
    </n-flex>
    <!-- 客户端控制 -->
    <n-flex v-if="isElectron" align="center" class="client-control">
      <n-divider class="divider" vertical />
      <div class="min-button-wrapper" @click="min" :title="t('nav.minimize')">
        <n-button :focusable="false" :title="t('nav.minimize')" tertiary circle @click.stop="min">
          <template #icon>
            <SvgIcon name="WindowMinimize" />
          </template>
        </n-button>
        <div class="min-expanded-area"></div>
      </div>
      <div class="max-button-wrapper" @click="maxOrRes" :title="isMax ? t('nav.restore') : t('nav.maximize')">
        <n-button
          :focusable="false"
          :title="isMax ? t('nav.restore') : t('nav.maximize')"
          tertiary
          circle
          @click.stop="maxOrRes"
        >
          <template #icon>
            <SvgIcon :name="isMax ? 'WindowRestore' : 'WindowMaximize'" />
          </template>
        </n-button>
        <div class="max-expanded-area"></div>
      </div>
      <div class="close-button-wrapper" @click="tryClose" :title="t('nav.close')">
        <n-button :focusable="false" :title="t('nav.close')" tertiary circle @click.stop="tryClose">
          <template #icon>
            <SvgIcon name="WindowClose" />
          </template>
        </n-button>
        <div class="close-expanded-area"></div>
      </div>
    </n-flex>
    <!-- 关闭弹窗 -->
    <n-modal
      v-model:show="showCloseModal"
      :auto-focus="false"
      :title="t('nav.client.title')"
      style="width: 600px"
      preset="card"
      transform-origin="center"
      bordered
      @after-leave="rememberNotAsk = false"
    >
      <n-text class="tip">{{ t("nav.client.content") }}</n-text>
      <n-checkbox v-model:checked="rememberNotAsk" class="checkbox"> {{ t("nav.client.remember") }} </n-checkbox>
      <template #footer>
        <n-flex justify="end">
          <n-button strong secondary @click="hideOrClose('exit')">
            <template #icon>
              <SvgIcon name="ExitToApp" />
            </template>
            {{ t("nav.client.close") }}
          </n-button>
          <n-button type="primary" strong secondary @click="hideOrClose('hide')">
            <template #icon>
              <SvgIcon name="WindowHide" />
            </template>
            {{ t("nav.client.hide") }}
          </n-button>
        </n-flex>
      </template>
    </n-modal>

  </n-layout-header>
</template>

<script setup lang="ts">
import type { DropdownOption } from "naive-ui";
import { useSettingStore } from "@/stores";
import { renderIcon } from "@/utils/helper";
import { openSetting } from "@/utils/modal";
import { isDev, isElectron } from "@/utils/env";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
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
    window.electron.ipcRenderer.send("win-restore");
  } else {
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
  window.electron.ipcRenderer.send(action === "hide" ? "win-hide" : "quit-app");
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
        ? t("nav.menu.auto")
        : settingStore.themeMode === "light"
          ? t("nav.menu.light")
          : t("nav.menu.dark"),
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
    key: "divider-1",
    type: "divider",
  },
  {
    // 重启
    key: "restart",
    label: t("nav.menu.reload"),
    show: isElectron,
    props: { onClick: () => window.electron.ipcRenderer.send("win-reload") },
    icon: renderIcon("Restart"),
  },
  {
    key: "dev-tools",
    label: t("nav.menu.console"),
    show: isDev,
    icon: renderIcon("Code"),
  },
  {
    key: "setting",
    label: t("nav.menu.global"),
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
  // 获取窗口状态并监听主进程的状态变更
  if (isElectron) {
    isMax.value = window.electron.ipcRenderer.sendSync("win-state");
    window.electron.ipcRenderer.on("win-state-change", (_event, value: boolean) => {
      isMax.value = value;
    });
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
    .min-button-wrapper,
    .max-button-wrapper,
    .close-button-wrapper {
      position: relative;
      cursor: pointer;
    }
    .min-expanded-area,
    .max-expanded-area,
    .close-expanded-area {
      position: fixed;
      top: 0;
      width: 50px;
      height: 70px;
      background-color: transparent;
      cursor: pointer;
      -webkit-app-region: no-drag;
      z-index: 1000;
    }
    .close-expanded-area {
      right: 0;
    }
    .max-expanded-area {
      right: 50px;
    }
    .min-expanded-area {
      right: 100px;
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
