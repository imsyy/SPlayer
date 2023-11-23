<template>
  <n-result class="error" status="500" title="服务器错误" description="服务器寄了，等会再试吧">
    <template #footer>
      <n-button type="primary" @click="router.push('/')"> 重新载入 </n-button>
    </template>
  </n-result>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();
</script>
