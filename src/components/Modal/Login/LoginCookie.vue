<template>
  <div class="login-cookie">
    <n-alert :bordered="false" title="如何获取 Cookie">
      <template #icon>
        <SvgIcon name="Help" />
      </template>
      可在官方的
      <n-a href="https://music.163.com/" target="_blank">网页端</n-a>
      和客户端的控制台中获取，详细步骤请自行搜索。
    </n-alert>
    <n-input
      v-model:value="cookie"
      :autosize="{ minRows: 3, maxRows: 6 }"
      type="textarea"
      placeholder="请输入 Cookie"
    />
    <n-button type="primary" @click="login">登录</n-button>
  </div>
</template>

<script setup lang="ts">
import type { LoginType } from "@/types/main";

const emit = defineEmits<{
  close: [];
  saveLogin: [any, LoginType];
}>();

const cookie = ref<string>();

// Cookie 登录
const login = async () => {
  if (!cookie.value) {
    window.$message.warning("请输入 Cookie");
    return;
  }
  // 写入 Cookie
  try {
    window.$message.success("登录成功");
    // 保存登录信息
    emit(
      "saveLogin",
      {
        code: 200,
        cookie: cookie.value,
      },
      "cookie",
    );
    emit("close");
  } catch (error) {
    window.$message.error("登录失败，请重试");
    console.error("Cookie 登录出错：", error);
  }
};
</script>

<style lang="scss" scoped>
.login-cookie {
  .n-input,
  .n-button {
    width: 100%;
    margin-top: 20px;
  }
}
</style>
