<template>
  <n-scrollbar style="max-height: 70vh" class="font-manager">
    <div class="set-list">
      <n-h3 prefix="bar">通用字体</n-h3>
      <n-card v-if="isElectron" class="set-item">
        <div class="label">
          <n-text class="name">字体设置样式</n-text>
          <n-text class="tip" :depth="3"> 下面的字体如何显示，如何设置 </n-text>
        </div>
        <n-select
          v-model:value="settingStore.fontSettingStyle"
          :options="[
            {
              label: '自定义 CSS 字体',
              value: 'custom',
            },
            {
              label: '多字体备选',
              value: 'multi',
            },
            {
              label: '单字体选择',
              value: 'single',
            },
          ]"
          class="set"
          :round="false"
        />
      </n-card>
      <n-card class="set-item" :class="{ 'input-mode': isInputMode }">
        <div class="label">
          <div style="display: flex; justify-content: space-between; align-items: center">
            <div class="info" style="display: flex; flex-direction: column">
              <n-text class="name">全局字体</n-text>
              <n-text class="tip" :depth="3">应用到软件内所有非特定区域的字体</n-text>
            </div>
            <Transition name="fade" mode="out-in">
              <n-button
                :disabled="settingStore.globalFont === 'default'"
                type="primary"
                strong
                secondary
                @click="settingStore.globalFont = 'default'"
              >
                恢复默认
              </n-button>
            </Transition>
          </div>
        </div>
        <n-flex align="center">
          <s-input
            v-if="settingStore.fontSettingStyle === 'custom' || !isElectron"
            v-model:value="settingStore.globalFont"
            :update-value-on-input="false"
            placeholder="输入字体名称"
            class="set"
          />
          <n-select
            v-else-if="settingStore.fontSettingStyle === 'multi'"
            :value="fontFamilyToArray(settingStore.globalFont)"
            @update:value="(val: string[]) => (settingStore.globalFont = fontArrayToFamily(val))"
            :options="getOptions('globalFont')"
            class="set"
            filterable
            multiple
            tag
          />
          <n-select
            v-else-if="settingStore.fontSettingStyle === 'single'"
            :value="fontFamilyToDisplay(settingStore.globalFont)"
            @update:value="(val) => (settingStore.globalFont = fontDisplayToFamily(val))"
            :options="getOptions('globalFont')"
            class="set"
            filterable
          />
        </n-flex>
      </n-card>
    </div>
    <div class="set-list" v-if="isElectron">
      <n-h3 prefix="bar">桌面歌词</n-h3>
      <n-card class="set-item" :class="{ 'input-mode': isInputMode }">
        <div class="label">
          <div class="label-header">
            <div class="info" style="display: flex; flex-direction: column">
              <n-text class="name">桌面歌词字体</n-text>
              <n-text class="tip" :depth="3"> 桌面歌词使用的字体 </n-text>
            </div>
            <Transition name="fade" mode="out-in">
              <n-button
                :disabled="desktopLyricConfig.fontFamily === 'system-ui'"
                type="primary"
                strong
                secondary
                @click="
                  () => {
                    desktopLyricConfig.fontFamily = 'system-ui';
                    saveDesktopLyricConfig();
                  }
                "
              >
                恢复默认
              </n-button>
            </Transition>
          </div>
        </div>
        <n-flex align="center">
          <s-input
            v-if="settingStore.fontSettingStyle === 'custom'"
            :value="desktopLyricConfig.fontFamily"
            :update-value-on-input="false"
            placeholder="输入字体名称"
            class="set"
            @update:value="
              (val) => {
                desktopLyricConfig.fontFamily = val;
                saveDesktopLyricConfig();
              }
            "
          />
          <n-select
            v-else-if="settingStore.fontSettingStyle === 'multi'"
            :value="fontFamilyToArray(desktopLyricConfig.fontFamily)"
            :options="getOptions('desktop')"
            class="set"
            filterable
            multiple
            tag
            @update:value="
              (val: string[]) => (desktopLyricConfig.fontFamily = fontArrayToFamily(val))
            "
          />
          <n-select
            v-else-if="settingStore.fontSettingStyle === 'single'"
            :value="fontFamilyToDisplay(desktopLyricConfig.fontFamily)"
            :options="getOptions('desktop')"
            class="set"
            filterable
            @update:value="
              (val) => {
                desktopLyricConfig.fontFamily = fontDisplayToFamily(val);
                saveDesktopLyricConfig();
              }
            "
          />
        </n-flex>
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar">歌词字体</n-h3>
      <n-card
        v-for="font in lyricFontConfigs"
        :key="font.keySetting"
        class="set-item"
        :class="{ 'input-mode': isInputMode }"
      >
        <div class="label">
          <div class="label-header">
            <div class="info" style="display: flex; flex-direction: column">
              <n-text class="name">{{ font.name }}</n-text>
              <n-text class="tip" :depth="3">{{ font.tip }}</n-text>
            </div>
            <Transition name="fade" mode="out-in">
              <n-button
                :disabled="settingStore[font.keySetting] === font.default"
                type="primary"
                strong
                secondary
                @click="settingStore[font.keySetting] = font.default"
              >
                恢复默认
              </n-button>
            </Transition>
          </div>
        </div>
        <n-flex align="center">
          <s-input
            v-if="settingStore.fontSettingStyle === 'custom' || !isElectron"
            v-model:value="settingStore[font.keySetting]"
            :update-value-on-input="false"
            placeholder="输入字体名称"
            class="set"
          />
          <n-select
            v-else-if="settingStore.fontSettingStyle === 'multi'"
            :value="fontFamilyToArray(settingStore[font.keySetting])"
            @update:value="
              (val: string[]) => (settingStore[font.keySetting] = fontArrayToFamily(val))
            "
            :options="getOptions(font.keySetting)"
            class="set"
            filterable
            multiple
            tag
          />
          <n-select
            v-else-if="settingStore.fontSettingStyle === 'single'"
            :value="fontFamilyToDisplay(settingStore[font.keySetting])"
            @update:value="(val) => (settingStore[font.keySetting] = fontDisplayToFamily(val))"
            :options="getOptions(font.keySetting)"
            class="set"
            filterable
          />
        </n-flex>
      </n-card>
    </div>
  </n-scrollbar>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
import { isElectron } from "@/utils/env";
import type { SelectOption } from "naive-ui";
import { lyricFontConfigs } from "@/utils/lyric/lyricFontConfig";
import { LyricConfig } from "@/types/desktop-lyric";
import defaultDesktopLyricConfig from "@/assets/data/lyricConfig";
import { cloneDeep, isEqual } from "lodash-es";

const settingStore = useSettingStore();

// 系统字体选项
const systemFonts = ref<SelectOption[]>([]);

// 桌面歌词配置
const desktopLyricConfig = reactive<LyricConfig>({ ...defaultDesktopLyricConfig });

// 是否为输入模式
const isInputMode = computed(() => settingStore.fontSettingStyle !== "single" || !isElectron);

// 获取下拉选项
const getOptions = (key: string) => {
  const isGlobal = key === "globalFont";
  const isDesktop = key === "desktop";
  let defaultLabel = "跟随全局";
  let defaultValue = "follow";

  if (isGlobal || isDesktop) {
    defaultLabel = "系统默认";
    defaultValue = isGlobal ? "default" : "system-ui";
  }

  return [{ label: defaultLabel, value: defaultValue }, ...systemFonts.value];
};

// 获取全部系统字体
const getAllSystemFonts = async () => {
  if (!isElectron) return;
  try {
    const allFonts: string[] = await window.electron.ipcRenderer.invoke("get-all-fonts");
    const fontOptions = allFonts.map((v: string) => {
      const name = v.replace(/^['"]+|['"]+$/g, "");
      return {
        label: name,
        value: name,
        style: {
          fontFamily: name,
        },
      };
    });
    fontOptions.sort((ao, bo) => {
      // 这里自定义排序是为了解决这样一个问题
      // 默认情况下，长的字符串在最前，而 filterable 按原顺序展示
      // 这会导致我输入 `Noto Sans` 时，一大堆的其他变体挡在其前面，而我真正想要的结果却在最后
      const a = ao.value;
      const b = bo.value;
      if (a === b) return 0;
      if (a.startsWith(b)) return 1;
      if (b.startsWith(a)) return -1;
      return a.localeCompare(b);
    });
    systemFonts.value = fontOptions;
  } catch (error) {
    console.error("Failed to get system fonts:", error);
  }
};

/**
 * 字符串是否拥有在开头和结尾的成对引号
 * @note 不移除首尾空格，因为在下面的所有调用场景，都会先移除首尾空格
 * @param s 字符串
 * @returns 是否拥有成对引号
 */
const hasPairedQuotes = (s: string): boolean => {
  const l = s.length;
  if (l < 2) return false;
  if (s.startsWith('"')) {
    if (s.indexOf('"', 1) === l - 1) return true;
  } else if (s.startsWith("'")) {
    if (s.indexOf("'", 1) === l - 1) return true;
  }
  return false;
};

/**
 * 将 Font Family 字符串转换为用户可见字符串
 * @param fontFamily Font Family 字符串
 * @return 用户可见字符串
 */
const fontFamilyToDisplay = (fontFamily: string): string => {
  // 移除首尾空格
  fontFamily = fontFamily.trim();
  // 移除引号
  if (hasPairedQuotes(fontFamily)) {
    fontFamily = fontFamily.substring(1, fontFamily.length - 1);
  }
  return fontFamily.trim();
};

/**
 * 用户可见字符串转换为 Font Family 字符串
 * @param display 用户可见字符串（单一字体）
 * @return Font Family 字符串
 */
const fontDisplayToFamily = (display: string): string => {
  display = display.trim();
  if ((display.includes(",") || display.includes(" ")) && !hasPairedQuotes(display)) {
    return `"${display}"`;
  }
  return display;
};

/**
 * 字体字符串转数组
 * @param fontFamily 字体字符串
 * @returns 字体数组
 */
const fontFamilyToArray = (fontFamily: string): string[] => {
  if (!fontFamily) return [];
  const regex = /"([^"]*)"|'([^']*)'|([^,]+)/g;
  const matches = fontFamily.match(regex);
  if (!matches) return [];

  return matches.map(fontFamilyToDisplay).filter(Boolean);
};

/**
 * 字体数组转字符串
 * @param fontArray 字体数组
 * @returns 字体字符串
 */
const fontArrayToFamily = (fontArray: string[]): string => {
  return fontArray.map(fontDisplayToFamily).join(", ");
};

// 获取桌面歌词配置
const getDesktopLyricConfig = async () => {
  if (!isElectron) return;
  const config = await window.electron.ipcRenderer.invoke("desktop-lyric:get-option");
  if (config) Object.assign(desktopLyricConfig, config);
};

const onLyricConfigUpdate = (_: any, config: LyricConfig) => {
  if (config && !isEqual(desktopLyricConfig, config)) {
    Object.assign(desktopLyricConfig, config);
  }
};

// 保存桌面歌词配置
const saveDesktopLyricConfig = (val?: string) => {
  try {
    if (!isElectron) return;
    if (val) desktopLyricConfig.fontFamily = val;
    window.electron.ipcRenderer.send(
      "desktop-lyric:set-option",
      cloneDeep(desktopLyricConfig),
      true,
    );
    window.$message.success("桌面歌词字体已保存");
  } catch (error) {
    console.error("Failed to save options:", error);
    window.$message.error("桌面歌词配置保存失败");
    getDesktopLyricConfig();
  }
};

onMounted(() => {
  getAllSystemFonts();
  getDesktopLyricConfig();
  window.electron.ipcRenderer.on("desktop-lyric:update-option", onLyricConfigUpdate);
});

onUnmounted(() => {
  if (isElectron) {
    window.electron.ipcRenderer.removeListener("desktop-lyric:update-option", onLyricConfigUpdate);
  }
});
</script>

<style lang="scss" scoped>
.font-manager {
  .set-list {
    margin-bottom: 24px;
    &:last-child {
      margin-bottom: 0;
    }
  }

  .set-item {
    width: 100%;
    border-radius: 8px;
    margin-bottom: 12px;
    transition: margin 0.3s;
    &:last-child {
      margin-bottom: 0;
    }
    :deep(.n-card__content) {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
    }
    .label {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding-right: 20px;
      .label-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .name {
        font-size: 16px;
      }
    }
    .n-flex {
      flex-flow: nowrap !important;
    }
    .set {
      justify-content: flex-end;
      width: 200px;
      &.n-switch {
        width: max-content;
      }
      @media (max-width: 768px) {
        width: 140px;
        min-width: 140px;
      }
    }
    &.input-mode {
      :deep(.n-card__content) {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }
      .label {
        padding-right: 0;
      }
      .n-flex {
        width: 100%;
        flex-flow: wrap !important;
        justify-content: flex-end !important;
      }
      .set {
        width: 100%;
        max-width: none;
        order: -1;
      }
      .n-button {
        margin-left: auto;
      }
    }
  }
}
</style>
