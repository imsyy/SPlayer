<template>
  <div class="login-uid">
    <n-alert :bordered="false" title="如何获取 UID">
      <template #icon>
        <SvgIcon name="Help" />
      </template>
      可前往
      <n-a href="https://music.163.com/" target="_blank">网易云音乐</n-a>
      官网登录并前往个人中心，即可从地址栏获取到 UID，也可在客户端分享链接中获取 UID。
    </n-alert>
    <n-input-number v-model:value="uid" :show-button="false" placeholder="请输入 UID" />
    <n-button :loading="!!loadingMsg" type="primary" @click="login">登录</n-button>
  </div>
</template>

<script setup lang="ts">
import type { MessageReactive } from "naive-ui";
import type { LoginType } from "@/types/main";
import { userDetail } from "@/api/user";

const emit = defineEmits<{
  close: [];
  saveLogin: [any, LoginType];
}>();

const uid = ref<number>();
const loadingMsg = ref<MessageReactive | null>(null);

// UID 登录
const login = async () => {
  if (!uid.value) {
    window.$message.warning("请输入 UID");
    return;
  }
  // 检查用户
  loadingMsg.value = window.$message.loading("正在尝试登录", { duration: 0 });
  try {
    const result = await userDetail(uid.value);
    window.$message.success("登录成功");
    // 保存登录信息
    emit("saveLogin", result, "uid");
    emit("close");
  } catch (error) {
    window.$message.error("登录失败，请重试");
    console.error("UID 登录出错：", error);
  } finally {
    loadingMsg.value?.destroy();
    loadingMsg.value = null;
  }
};
</script>

<style lang="scss" scoped>
.login-uid {
  .n-input-number,
  .n-button {
    width: 100%;
    margin-top: 20px;
  }
}
</style>
