<template>
  <div class="font-manager">
    <div class="set-list">
      <n-h3 prefix="bar">{{ t("settings.font.common") }}</n-h3>
      <n-card v-if="isElectron" class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.font.custom") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.font.customTip") }}</n-text>
        </div>
        <n-switch v-model:value="settingStore.useCustomFont" class="set" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.font.global") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.font.globalTip") }}</n-text>
        </div>
        <n-flex align="center">
          <Transition name="fade" mode="out-in">
            <n-button
              v-if="settingStore.globalFont !== 'default'"
              type="primary"
              strong
              secondary
              @click="settingStore.globalFont = 'default'"
            >
              {{ t("settings.font.restore") }}
            </n-button>
          </Transition>
          <s-input
            v-if="settingStore.useCustomFont || !isElectron"
            v-model:value="settingStore.globalFont"
            :update-value-on-input="false"
            :placeholder="t('settings.font.placeholder')"
            class="set"
          />
          <n-select
            v-else
            v-model:value="settingStore.globalFont"
            :options="getOptions('globalFont')"
            class="set"
            filterable
          />
        </n-flex>
      </n-card>
    </div>

    <div class="set-list">
      <n-h3 prefix="bar">{{ t("settings.font.lyric") }}</n-h3>
      <n-card v-for="font in lyricFontConfigs" :key="font.key" class="set-item">
        <div class="label">
          <n-text class="name">{{ font.name }}</n-text>
          <n-text class="tip" :depth="3">{{ font.tip }}</n-text>
        </div>
        <n-flex align="center">
          <Transition name="fade" mode="out-in">
            <n-button
              v-if="settingStore[font.key] !== font.default"
              type="primary"
              strong
              secondary
              @click="settingStore[font.key] = font.default"
            >
              {{ t("settings.font.restore") }}
            </n-button>
          </Transition>
          <s-input
            v-if="settingStore.useCustomFont || !isElectron"
            v-model:value="settingStore[font.key]"
            :update-value-on-input="false"
            :placeholder="t('settings.font.placeholder')"
            class="set"
          />
          <n-select
            v-else
            v-model:value="settingStore[font.key]"
            :options="getOptions(font.key)"
            class="set"
            filterable
          />
        </n-flex>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
import { isElectron } from "@/utils/env";
import type { SelectOption } from "naive-ui";
import { useI18n } from "vue-i18n";
import { computed, onMounted, ref } from "vue";

const { t } = useI18n();
const settingStore = useSettingStore();

interface FontConfig {
  name: string;
  key: "globalFont" | "LyricFont" | "japaneseLyricFont" | "englishLyricFont" | "koreanLyricFont";
  default: string;
  tip: string;
}

const lyricFontConfigs = computed<FontConfig[]>(() => [
  {
    name: t("settings.font.lyricRegion"),
    key: "LyricFont",
    default: "follow",
    tip: t("settings.font.lyricRegionTip"),
  },
  {
    name: t("settings.font.en"),
    key: "englishLyricFont",
    default: "follow",
    tip: t("settings.font.enTip"),
  },
  {
    name: t("settings.font.jp"),
    key: "japaneseLyricFont",
    default: "follow",
    tip: t("settings.font.jpTip"),
  },
  {
    name: t("settings.font.ko"),
    key: "koreanLyricFont",
    default: "follow",
    tip: t("settings.font.koTip"),
  },
]);

// 系统字体选项
const systemFonts = ref<SelectOption[]>([]);

// 获取下拉选项
const getOptions = (key: string) => {
  const isGlobal = key === "globalFont";
  const defaultLabel = isGlobal ? t("settings.font.system") : t("settings.font.follow");
  const defaultValue = isGlobal ? "default" : "follow";

  return [{ label: defaultLabel, value: defaultValue }, ...systemFonts.value];
};

// 获取全部系统字体
const getAllSystemFonts = async () => {
  if (!isElectron) return;
  try {
    const allFonts = await window.electron.ipcRenderer.invoke("get-all-fonts");
    systemFonts.value = allFonts.map((v: string) => {
      const name = v.replace(/^['"]+|['"]+$/g, "");
      return {
        label: name,
        value: name,
        style: {
          fontFamily: name,
        },
      };
    });
  } catch (error) {
    console.error("Failed to get system fonts:", error);
  }
};

onMounted(() => {
  getAllSystemFonts();
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
      display: flex;
      flex-direction: column;
      padding-right: 20px;
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
  }
}
</style>
