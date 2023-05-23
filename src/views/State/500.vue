<template>
  <n-result
    class="error"
    status="500"
    :title="$t('state.error')"
    :description="$t('state.errorDesc')"
  >
    <template #footer>
      <n-button type="primary" @click="router.push('/')">{{
        $t("general.name.reload")
      }}</n-button>
    </template>
  </n-result>
</template>

<script setup>
import { useRouter } from "vue-router";
const router = useRouter();

onMounted(() => {
  $setSiteTitle("500");
});
</script>

<style lang="scss" scoped>
.error {
  height: calc(100vh - 208px);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}
</style>
