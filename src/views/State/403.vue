<template>
  <n-result class="error" status="403" title="禁止访问" description="总有些门是对你关闭的">
    <template #footer>
      <n-button type="primary" @click="router.go(-1)"> 返回上一级 </n-button>
    </template>
  </n-result>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();
</script>
