<!-- 常规设置 -->
<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> {{ t("settings.general.basic") }} </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.general.language") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.general.languageTip") }}</n-text>
        </div>

        <n-select
          :value="settingStore.language"
          class="set"
          :options="languageOptions"
          @update:value="settingStore.setLanguage"
        />
      </n-card>
    </div>
    <div class="set-list">

      <n-h3 prefix="bar"> {{ t("settings.general.theme") }} </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.general.themeMode") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.general.themeModeTip") }}</n-text>

        </div>
        <n-select
          v-model:value="settingStore.themeMode"
          class="set"
          :options="[
            {
              label: t('nav.menu.auto'),
              value: 'auto',
            },
            {
              label: t('nav.menu.light'),
              value: 'light',
            },
            {
              label: t('nav.menu.dark'),
              value: 'dark',
            },
          ]"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.general.themeConfig") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.general.themeConfigTip") }}</n-text>
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
            <n-text class="name">{{ t("settings.general.customThemeColor") }}</n-text>
            <n-text class="tip" :depth="3">{{ t("settings.general.customThemeColorTip") }}</n-text>
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
          <n-text class="name">{{ t("settings.general.globalColor") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.general.globalColorTip") }}</n-text>
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
          <n-text class="name">{{ t("settings.general.dynamicColor") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.general.dynamicColorTip") }}</n-text>
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
          <n-text class="name">{{ t("settings.general.font") }}</n-text>
          <n-text class="tip" :depth="3"> {{ t("settings.general.fontTip") }} </n-text>
        </div>
        <n-button type="primary" strong secondary @click="openFontManager"> {{ t("settings.general.configure") }} </n-button>
      </n-card>

    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> {{ t("settings.general.misc") }} </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.general.searchHistory") }}</n-text>
        </div>

        <n-switch class="set" v-model:value="settingStore.showSearchHistory" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.general.searchKeyword") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.general.searchKeywordTip") }}</n-text>
        </div>

        <n-switch class="set" v-model:value="settingStore.enableSearchKeyword" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.general.sidebarCover") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.general.sidebarCoverTip") }}</n-text>
        </div>

        <n-switch class="set" v-model:value="settingStore.menuShowCover" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.general.sidebarHide") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.general.sidebarHideTip") }}</n-text>
        </div>
        <n-button type="primary" strong secondary @click="openSidebarHideManager"> {{ t("settings.general.configure") }} </n-button>

      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.general.homePage") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.general.homePageTip") }}</n-text>
        </div>
        <n-button type="primary" strong secondary @click="openHomePageSectionManager">
          {{ t("settings.general.configure") }}
        </n-button>

      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.general.songQuality") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.general.songQualityTip") }}</n-text>
        </div>

        <n-switch class="set" v-model:value="settingStore.showSongQuality" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.general.privilegeTag") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.general.privilegeTagTip") }}</n-text>
        </div>

        <n-switch class="set" v-model:value="settingStore.showSongPrivilegeTag" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.general.originalTag") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.general.originalTagTip") }}</n-text>
        </div>

        <n-switch class="set" v-model:value="settingStore.showSongOriginalTag" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.general.keepAlive") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.general.keepAliveTip") }}</n-text>
        </div>

        <n-switch class="set" v-model:value="settingStore.useKeepAlive" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.general.routeAnimation") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.general.routeAnimationTip") }}</n-text>
        </div>

        <n-select
          v-model:value="settingStore.routeAnimation"
          :options="[
            {
              label: t('settings.general.animation.none'),
              value: 'none',
            },
            {
              label: t('settings.general.animation.fade'),
              value: 'fade',
            },
            {
              label: t('settings.general.animation.zoom'),
              value: 'zoom',
            },
            {
              label: t('settings.general.animation.slide'),
              value: 'slide',
            },
            {
              label: t('settings.general.animation.up'),
              value: 'up',
            },
          ]"
          class="set"
        />
      </n-card>
    </div>
    <div v-if="isElectron" class="set-list">
      <n-h3 prefix="bar"> {{ t("settings.general.system") }} </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.general.onlineService") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.general.onlineServiceTip") }}</n-text>
        </div>

        <n-switch class="set" :value="useOnlineService" :round="false" @update:value="modeChange" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.general.closeApp") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.general.closeAppTip") }}</n-text>
        </div>

        <n-select
          v-model:value="settingStore.closeAppMethod"
          :disabled="settingStore.showCloseAppTip"
          :options="[
            {
              label: t('settings.general.closeAppMethods.hide'),
              value: 'hide',
            },
            {
              label: t('settings.general.closeAppMethods.close'),
              value: 'close',
            },
          ]"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.general.closeAppRemind") }}</n-text>
        </div>

        <n-switch v-model:value="settingStore.showCloseAppTip" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.general.taskbarProgress") }}</n-text>
          <n-text class="tip" :depth="3"> {{ t("settings.general.taskbarProgressTip") }} </n-text>
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
          <n-text class="name">{{ t("settings.general.preventSleep") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.general.preventSleepTip") }}</n-text>
        </div>

        <n-switch v-model:value="settingStore.preventSleep" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.general.orpheus") }}</n-text>
          <n-text class="tip" :depth="3">
            {{ t("settings.general.orpheusTip") }}
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
          <n-text class="name">{{ t("settings.general.checkUpdate") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.general.checkUpdateTip") }}</n-text>
        </div>
        <n-switch v-model:value="settingStore.checkUpdateOnStart" class="set" :round="false" />
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui";
import { useDataStore, useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { isDev, isElectron } from "@/utils/env";
import { isEmpty } from "lodash-es";
import themeColor from "@/assets/data/themeColor.json";
import { openSidebarHideManager, openHomePageSectionManager, openFontManager } from "@/utils/modal";
import { sendRegisterProtocol } from "@/utils/protocol";
import { getCoverColor } from "@/utils/color";

import { useI18n } from "vue-i18n";

const dataStore = useDataStore();
const musicStore = useMusicStore();
const settingStore = useSettingStore();
const statusStore = useStatusStore();
const { t } = useI18n();


// 语言选项
const languageOptions = [
  { label: "简体中文", value: "zh-CN" },
  { label: "English", value: "en-US" },
  { label: "日本語", value: "ja-JP" },
  { label: "한국어", value: "ko-KR" },
  { label: "Русский", value: "ru-RU" },
];

// 是否开启在线服务
const useOnlineService = ref(settingStore.useOnlineService);

// 全局主题色配置
const themeColorOptions = computed<SelectOption[]>(() => [
  ...Object.keys(themeColor).map((key) => ({
    value: key,
    label: t(`settings.general.themeOptions.${key}`),
    style: {
      color: themeColor[key as keyof typeof themeColor].color,
    },
  })),
]);

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
</script>
