<template>
  <div class="login">
    <div class="title">
      <img src="/images/logo/favicon.png" alt="logo" />
      <span>登录云音乐</span>
    </div>
    <n-card class="qr-img">
      <n-skeleton v-if="!qrImg" height="180px" width="180px" />
      <QrcodeVue
        v-else
        class="qr"
        :value="qrImg"
        :size="180"
        level="H"
        background="#00000000"
        foreground="#f55e55"
      />
    </n-card>
    <span class="tip">{{ qrText }}</span>
  </div>
</template>

<script setup>
import { userStore } from "@/store";
import { getLoginState, getQrKey, checkQr } from "@/api";
import { useRouter } from "vue-router";
import QrcodeVue from "qrcode.vue";

const router = useRouter();
const user = userStore();

// 二维码数据
let qrImg = ref(null);
let qrText = ref("请打开云音乐 APP 扫码登录");

// 定时器
let qrCheckInterval = ref(null);

// 登陆状态弹窗
let loginStateMessage = null;

// 获取二维码登录 key
const getQrKeyData = () => {
  // 检测是否登录
  getLoginState().then((res) => {
    if (res.data.profile && window.localStorage.getItem("cookie")) {
      $message.info("已登录，请勿重复登录");
      user.userLogin = true;
      router.go(-1);
    } else {
      user.userLogOut();
      clearInterval(qrCheckInterval.value);
      getQrKey().then((res) => {
        if (res.code == 200) {
          console.log(res.data.unikey);
          qrImg.value = `https://music.163.com/login?codekey=${res.data.unikey}`;
          checkQrState(res.data.unikey);
        } else {
          $message.error("登录二维码生成失败");
        }
      });
    }
  });
};

// 检测二维码登陆状态
const checkQrState = (key) => {
  qrCheckInterval.value = setInterval(() => {
    if (!key) return false;
    checkQr(key).then((res) => {
      console.log(res);
      if (res.code == 800) {
        getQrKeyData();
        loginStateMessage = null;
        qrText.value = "当前二维码已失效，请重新扫码";
      } else if (res.code == 801) {
        loginStateMessage = null;
        qrText.value = "请打开云音乐 APP 扫码登录";
      } else if (res.code == 802) {
        qrText.value = "扫描成功，请在客户端确认登录";
        if (!loginStateMessage) {
          loginStateMessage = $message.loading("扫描成功，请在客户端确认登录", {
            duration: 0,
          });
        }
      } else if (res.code == 803) {
        loginStateMessage.destroy();
        user.setCookie(res.cookie);
        // 储存用户登录信息
        getLoginState().then((res) => {
          if (res.data.profile) {
            user.setUserData(res.data.profile);
            user.userLogin = true;
            qrText.value = "登录成功";
            $message.success("登录成功");
            clearInterval(qrCheckInterval.value);
            router.push("/user");
          } else {
            user.userLogOut();
            $message.error("登录出错，请重试");
            getQrKeyData();
          }
        });
      }
    });
  }, 1000);
};

onMounted(() => {
  // 获取二维码登录 key
  getQrKeyData();
});

onBeforeUnmount(() => {
  // 清除定时器
  clearInterval(qrCheckInterval.value);
});
</script>

<style lang="scss" scoped>
.login {
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  .title {
    display: flex;
    flex-direction: column;
    align-items: center;
    img {
      width: 80px;
      height: 80px;
      margin-bottom: 20px;
    }
    span {
      font-size: 20px;
      font-weight: bold;
    }
  }
  .qr-img {
    width: 220px;
    height: 220px;
    border-radius: 8px;
    margin-top: 16px;
    :deep(.n-card__content) {
      display: flex;
      align-items: center;
      justify-content: center;
      .n-skeleton {
        border-radius: 8px;
      }
    }
  }
  .tip {
    margin-top: 12px;
    opacity: 0.8;
  }
}
</style>