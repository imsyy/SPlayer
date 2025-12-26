<template>
  <n-result status="404" :title="t('general.status.404.title')" :description="t('general.status.404.desc')">
    <template #footer>
      <n-button type="primary" @click="router.go(-1)"> {{ t("general.status.back") }} </n-button>
    </template>
  </n-result>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const router = useRouter();
</script>

