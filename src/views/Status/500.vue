<template>
  <n-result status="500" :title="t('general.status.500.title')" :description="t('general.status.500.desc')">
    <template #footer>
      <n-button type="primary" @click="router.go(0)"> {{ t("general.status.reload") }} </n-button>
    </template>
  </n-result>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const router = useRouter();
</script>

