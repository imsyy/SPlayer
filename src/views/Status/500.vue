<template>
  <n-result status="500" title="服务器错误" description="服务器寄了，等会再试吧">
    <template #footer>
      <n-button type="primary" @click="router.go(0)"> 重新载入 </n-button>
    </template>
  </n-result>
</template>

<script setup lang="ts">
const router = useRouter();
</script>
