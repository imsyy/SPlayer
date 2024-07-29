<!-- 弹窗 - 登录 -->
<template>
  <n-modal
    v-model:show="loginModalShow"
    :auto-focus="false"
    :mask-closable="false"
    :bordered="false"
    :close-on-esc="false"
    :closable="false"
    style="width: 400px"
    preset="card"
    transform-origin="center"
  >
    <div class="login-content">
      <div class="title">
        <img class="logo" src="/imgs/icons/favicon.png?asset" alt="logo" />
      </div>
      <!-- 登录方式 -->
      <n-tabs class="login-tabs" default-value="login-qr" type="segment" animated>
        <n-tab-pane name="login-qr" tab="扫码登录">
          <loginQRCode @setLoginData="setLoginData" />
        </n-tab-pane>
        <n-tab-pane name="login-phone" tab="验证码登录">
          <loginPhone @setLoginData="setLoginData" />
        </n-tab-pane>
      </n-tabs>
      <!-- 关闭登录弹窗 -->
      <n-button
        :focusable="false"
        class="close"
        strong
        secondary
        round
        @click="(loginModalShow = false), toLogout(false)"
      >
        <template #icon>
          <n-icon :depth="2">
            <SvgIcon icon="window-close" />
          </n-icon>
        </template>
      </n-button>
    </div>
  </n-modal>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { siteData, siteSettings } from "@/stores";
import { getLoginState, refreshLogin } from "@/api/login";
import { setCookies, toLogout, isLogin } from "@/utils/auth";
import userSignIn from "@/utils/userSignIn";

const data = siteData();
const settings = siteSettings();
const { userData } = storeToRefs(data);
const { autoSignIn } = storeToRefs(settings);

// 登录数据
const loginModalShow = ref(false);

// 开启登录弹窗
const openLoginModal = () => {
  if (isLogin()) {
    $dialog.warning({
      title: "退出登录",
      content: "确认退出当前用户登录？",
      positiveText: "登出",
      negativeText: "取消",
      onPositiveClick: () => {
        toLogout();
      },
    });
  } else {
    loginModalShow.value = true;
  }
};

// 储存登录信息
const setLoginData = async (loginData) => {
  console.log(loginData);
  if (!loginData) return false;
  if (loginData.code === 200) {
    // 关闭登录弹窗
    loginModalShow.value = false;
    // 保存 cookie
    setCookies(loginData.cookie);
    // 获取用户信息
    await data.setUserProfile();
    await data.setDailySongsData();
    // 签到
    if (autoSignIn.value) await userSignIn();
    // 更改状态
    data.userLoginStatus = true;
    $message.success("登录成功");
  } else {
    $message.error(loginData.msg ?? loginData.message ?? "账号或密码错误，请重试");
  }
};

// 刷新登录
const toRefreshLogin = () => {
  const today = Date.now();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  const lastRefreshDate = new Date(localStorage.getItem("lastRefreshDate")).getTime();
  if (today - lastRefreshDate >= threeDays || !lastRefreshDate) {
    refreshLogin().then((res) => {
      if (res.code === 200) {
        localStorage.setItem("lastRefreshDate", new Date(today).toLocaleDateString());
        console.log("刷新登录成功：", res);
      } else {
        console.error("刷新登录失败");
      }
    });
  }
};

// 检查登录状态
const checkLoginStatus = async () => {
  try {
    // 获取登录状态
    const loginState = await getLoginState();
    // 登录正常
    if (loginState.data?.profile) {
      handleLoginSuccess(loginState.data?.profile);
    }
    // 若还有用户数据，则登录过期
    else if (Object.keys(userData.value.detail)?.length) {
      handleLoginExpired();
    }
  } catch (error) {
    console.error("检查登录状态失败：", error);
  }
};

// 登录正常
const handleLoginSuccess = async (profile) => {
  console.log("登录正常", profile);
  toRefreshLogin();
  data.userLoginStatus = true;
  // 获取用户信息
  await data.setUserProfile();
};

// 登录过期
const handleLoginExpired = () => {
  toLogout();
  data.userLoginStatus = false;
  loginModalShow.value = true;
  $message.warning("登录已过期，请重新登录", { duration: 2000 });
};

defineExpose({
  openLoginModal,
});

onBeforeMount(() => {
  checkLoginStatus();
  // 挂载方法
  window.$changeLogin = openLoginModal;
});
</script>

<style lang="scss">
.login-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  .title {
    width: 60px;
    height: 60px;
    margin: 20px 0 30px 0;
    .logo {
      width: 100%;
      height: 100%;
    }
  }
  .close {
    position: absolute;
    bottom: -58px;
    background-color: var(--n-color-modal);
    &:hover {
      background-color: var(--n-color-embedded);
    }
    &:active {
      background-color: var(--n-color-embedded);
    }
  }
}
</style>
