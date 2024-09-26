<template>
  <div class="login">
    <img src="/icons/favicon.png?assest" alt="logo" class="logo" />
    <!-- 登录方式 -->
    <n-tabs class="login-tabs" default-value="login-qr" type="segment" animated>
      <n-tab-pane name="login-qr" tab="扫码登录">
        <loginQRCode @saveLogin="saveLogin" />
      </n-tab-pane>
      <n-tab-pane name="login-phone" tab="验证码登录">
        <loginPhone @saveLogin="saveLogin" />
      </n-tab-pane>
    </n-tabs>
    <!-- 关闭登录 -->
    <n-button :focusable="false" class="close" strong secondary round @click="emit('close')">
      <template #icon>
        <SvgIcon name="WindowClose" />
      </template>
      取消
    </n-button>
  </div>
</template>

<script setup lang="ts">
import { setCookies } from "@/utils/cookie";
import { updateUserData } from "@/utils/auth";
import { useDataStore } from "@/stores";

const emit = defineEmits<{
  close: [];
}>();

const dataStore = useDataStore();

// 保存登录信息
const saveLogin = async (loginData: any) => {
  console.log("loginData:", loginData);
  if (!loginData) return;
  if (loginData.code === 200) {
    // 更改状态
    emit("close");
    dataStore.userLoginStatus = true;
    window.$message.success("登录成功");
    // 保存 cookie
    setCookies(loginData.cookie);
    // 保存登录时间
    localStorage.setItem("lastLoginTime", Date.now().toString());
    // 获取用户信息
    await updateUserData();
  } else {
    window.$message.error(loginData.msg ?? loginData.message ?? "账号或密码错误，请重试");
  }
};

onBeforeMount(() => {
  if (dataStore.userLoginStatus) {
    emit("close");
    window.$message.warning("已登录，请勿再次操作");
  }
});
</script>

<style lang="scss" scoped>
.login {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  .logo {
    width: 60px;
    height: 60px;
    margin: 20px auto 30px auto;
  }
  .close {
    margin-top: 20px;
    margin-bottom: 8px;
  }
}
</style>
