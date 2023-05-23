<template>
  <div class="set-other">
    <n-card class="set-item">
      <div class="name">
        {{ $t("setting.resetApp") }}
        <span class="tip">{{ $t("setting.resetAppTip") }}</span>
      </div>
      <n-button strong secondary type="error" @click="resetApp">
        {{ $t("general.name.restore") }}
      </n-button>
    </n-card>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";

const { t } = useI18n();

// 程序重置
const resetApp = () => {
  const cleanAll = () => {
    $message
      ? $message.success(t("other.cleanAll"))
      : alert(t("other.cleanAll"));
    localStorage.clear();
    window.location.href = "/";
  };
  $dialog.warning({
    class: "s-dialog",
    title: t("setting.resetApp"),
    content: t("setting.resetAppWarning"),
    positiveText: t("setting.resetApp"),
    negativeText: t("general.dialog.cancel"),
    onPositiveClick: () => {
      $cleanAll ? $cleanAll() : cleanAll();
    },
  });
};
</script>
