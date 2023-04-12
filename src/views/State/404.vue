<template>
  <n-result
    class="error"
    status="404"
    title="资源不存在"
    description="怎么跑到这来了"
  >
    <template #footer>
      <n-button type="primary" @click="router.go(-1)">回到上一页</n-button>
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
