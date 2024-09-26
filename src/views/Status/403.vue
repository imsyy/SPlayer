<template>
  <n-result status="403" title="禁止访问" description="不行，你不能访问这里">
    <template #footer>
      <n-button type="primary" @click="router.go(-1)"> 返回上一级 </n-button>
    </template>
  </n-result>
</template>

<script setup lang="ts">
const router = useRouter();
</script>
