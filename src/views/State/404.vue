<template>
  <n-result
    class="error"
    status="404"
    :title="$t('state.notFound')"
    :description="$t('state.notFoundDesc')"
  >
    <template #footer>
      <n-button type="primary" @click="router.go(-1)">{{
        $t("general.name.goBack")
      }}</n-button>
    </template>
  </n-result>
</template>

<script setup>
import { useRouter } from "vue-router";
const router = useRouter();

onMounted(() => {
  $setSiteTitle("404");
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
