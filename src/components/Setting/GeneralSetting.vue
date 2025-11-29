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
          <n-text class="name">全局主题色</n-text>
          <n-text class="tip" :depth="3">更改全局主题色</n-text>
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
            class="set"
            :show-alpha="false"
            :modes="['hex']"
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
          <n-text class="tip" :depth="3">主题色是否跟随封面，目前感觉不好看</n-text>
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
        <n-button
          type="primary"
          strong
          secondary
          @click="openSidebarHideManager"
        >
          配置
        </n-button>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">首页栏目配置</n-text>
          <n-text class="tip" :depth="3">调整首页各栏目的显示顺序或隐藏不需要的栏目</n-text>
        </div>
        <n-button
          type="primary"
          strong
          secondary
          @click="openHomePageSectionManager"
        >
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
          <n-text class="name">歌词区域字体</n-text>
          <n-text class="tip" :depth="3"> 是否独立更改歌词区域字体 </n-text>
        </div>
        <n-flex>
          <Transition name="fade" mode="out-in">
            <n-button
              v-if="settingStore.LyricFont !== 'follow'"
              type="primary"
              strong
              secondary
              @click="settingStore.LyricFont = 'follow'"
            >
              恢复默认
            </n-button>
          </Transition>
          <n-select
            v-model:value="settingStore.LyricFont"
            :options="[
              { label: '跟随全局', value: 'follow' },
              ...allFontsData.filter((v) => v.value !== 'default'),
            ]"
            class="set"
            filterable
          />
        </n-flex>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">日语歌词字体</n-text>
          <n-text class="tip" :depth="3"> 是否在歌词为日语时单独设置字体 </n-text>
        </div>
        <n-flex>
          <Transition name="fade" mode="out-in">
            <n-button
              v-if="settingStore.japaneseLyricFont !== 'follow'"
              type="primary"
              strong
              secondary
              @click="settingStore.japaneseLyricFont = 'follow'"
            >
              恢复默认
            </n-button>
          </Transition>
          <n-select
            v-model:value="settingStore.japaneseLyricFont"
            :options="[
              { label: '跟随全局', value: 'follow' },
              ...allFontsData.filter((v) => v.value !== 'default'),
            ]"
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
import { isDev, isElectron } from "@/utils/env";
import { getCoverColor } from "@/utils/player-utils/song";
import { isEmpty } from "lodash-es";
import themeColor from "@/assets/data/themeColor.json";
import { openSidebarHideManager, openHomePageSectionManager } from "@/utils/modal";

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
        if (!isDev) window.electron.ipcRenderer.send("win-reload");
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

onMounted(() => {
  if (isElectron) {
    getAllSystemFonts();
  }
});
</script>
