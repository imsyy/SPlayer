<template>
  <div class="login">
    <img src="/icons/favicon.png?assest" alt="logo" class="logo" />
    <!-- 登录方式 -->
    <n-tabs class="login-tabs" default-value="login-qr" type="segment" animated>
      <n-tab-pane name="login-qr" tab="扫码登录">
        <LoginQRCode :pause="qrPause" @saveLogin="saveLogin" />
      </n-tab-pane>
      <n-tab-pane name="login-phone" tab="验证码登录">
        <LoginPhone @saveLogin="saveLogin" />
      </n-tab-pane>
    </n-tabs>
    <!-- 其他方式 -->
    <n-flex align="center" class="other">
      <n-button :focusable="false" size="small" quaternary round @click="specialLogin('uid')">
        UID 登录
      </n-button>
      <n-divider vertical />
      <n-button :focusable="false" size="small" quaternary round @click="specialLogin('cookie')">
        Cookie 登录
      </n-button>
    </n-flex>
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
import { updateSpecialUserData, updateUserData } from "@/utils/auth";
import { useDataStore } from "@/stores";
import { LoginType } from "@/types/main";
import LoginUID from "./LoginUID.vue";
import LoginCookie from "./LoginCookie.vue";

const emit = defineEmits<{
  close: [];
}>();

const dataStore = useDataStore();

// 暂停二维码检查
const qrPause = ref(false);

// 保存登录信息
const saveLogin = async (loginData: any, type: LoginType = "qr") => {
  console.log("loginData:", loginData);
  if (!loginData) return;
  if (loginData.code === 200) {
    // 更改状态
    emit("close");
    dataStore.userLoginStatus = true;
    dataStore.loginType = type;
    window.$message.success("登录成功");
    // 保存 cookie
    if (type !== "uid") setCookies(loginData.cookie);
    // 保存登录时间
    localStorage.setItem("lastLoginTime", Date.now().toString());
    // 获取用户信息
    if (type !== "uid") {
      await updateUserData();
    } else {
      await updateSpecialUserData(loginData?.profile);
    }
  } else {
    window.$message.error(loginData.msg ?? loginData.message ?? "账号或密码错误，请重试");
  }
};

// 特殊登录
const specialLogin = (type: "uid" | "cookie" = "uid") => {
  qrPause.value = true;
  const loginModal = window.$modal.create({
    title: type === "uid" ? "UID 登录" : "Cookie 登录",
    preset: "card",
    transformOrigin: "center",
    style: { width: "400px" },
    content: () => {
      return h(type === "uid" ? LoginUID : LoginCookie, {
        onClose: () => loginModal.destroy(),
        onSaveLogin: saveLogin,
      });
    },
    onClose: () => {
      qrPause.value = false;
      loginModal.destroy();
    },
  });
};

onBeforeMount(() => {
  if (dataStore.userLoginStatus) {
    window.$message.warning("已登录，请勿再次操作");
    emit("close");
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
  .other {
    margin: 20px 0;
    .n-button {
      width: 140px;
    }
  }
  .close {
    margin-bottom: 8px;
  }
}
</style>
