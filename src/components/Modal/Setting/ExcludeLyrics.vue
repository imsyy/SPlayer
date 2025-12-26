<template>
  <div class="exclude">
    <n-alert :show-icon="false">{{ t("settings.exclude.warning") }}</n-alert>

    <n-tabs type="line" v-model:value="page" animated>
      <n-tab-pane name="keywords" :tab="t('settings.exclude.keywords')">
        <n-dynamic-tags v-model:value="settingStore.excludeKeywords" />
      </n-tab-pane>
      <n-tab-pane name="regexes" :tab="t('settings.exclude.regex')">
        <n-dynamic-tags v-model:value="settingStore.excludeRegexes" />
      </n-tab-pane>

      <template #suffix>
        <n-flex>
          <n-button type="primary" strong secondary @click="clear">{{
            t("settings.exclude.clearPage")
          }}</n-button>
          <n-button type="primary" strong secondary @click="reset">{{
            t("settings.exclude.resetPage")
          }}</n-button>
        </n-flex>
      </template>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
import { keywords, regexes } from "@/assets/data/exclude";
import { useI18n } from "vue-i18n";
import { computed, ref } from "vue";

const { t } = useI18n();

const settingStore = useSettingStore();

const page = ref("keywords");

const pageConfig = computed(() => ({
  keywords: {
    name: t("settings.exclude.keywords"),
    storeKey: "excludeKeywords" as const,
    defaultValue: keywords,
  },
  regexes: {
    name: t("settings.exclude.regex"),
    storeKey: "excludeRegexes" as const,
    defaultValue: regexes,
  },
}));

const handleAction = (action: "clear" | "reset") => {
  const pageKey = page.value as keyof typeof pageConfig.value;
  const { name, storeKey, defaultValue } = pageConfig.value[pageKey];
  const isClear = action === "clear";

  const title = isClear
    ? t("settings.exclude.clearConfirm")
    : t("settings.exclude.resetConfirm");
  const content = isClear
    ? t("settings.exclude.clearContent", { name })
    : t("settings.exclude.resetContent", { name });
  const successMessage = isClear
    ? t("settings.exclude.clearSuccess")
    : t("settings.exclude.resetSuccess");

  window.$dialog.warning({
    title,
    content,
    positiveText: t("modal.confirm"),
    negativeText: t("modal.cancel"),
    onPositiveClick: () => {
      settingStore[storeKey] = isClear ? [] : defaultValue;
      window.$message.success(successMessage);
    },
  });
};

const clear = () => handleAction("clear");
const reset = () => handleAction("reset");
</script>

<style lang="scss" scoped>
.exclude {
  .n-alert {
    margin-bottom: 20px;
  }
}
</style>
