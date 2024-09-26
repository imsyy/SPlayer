<template>
  <n-result status="404" title="页面不存在" description="怎么跑到这来了？">
    <template #footer>
      <n-button type="primary" @click="router.go(-1)"> 返回上一级 </n-button>
    </template>
  </n-result>
</template>

<script setup lang="ts">
const router = useRouter();
</script>
