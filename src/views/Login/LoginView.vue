<template>
  <div class="login">
    <div class="title">
      <img src="/images/logo/favicon.png" alt="logo" />
      <n-text>{{ $t("login.login", { name: siteTitle }) }}</n-text>
    </div>
    <n-tabs
      animated
      class="content"
      type="segment"
      justify-content="space-evenly"
      :pane-style="{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '30px',
      }"
      @update:value="tabChange"
    >
      <n-tab-pane name="qr" :tab="$t('login.qr')">
        <n-card class="qr-img">
          <n-skeleton
            v-if="!qrImg"
            style="min-width: 180px"
            height="180px"
            width="180px"
          />
          <QrcodeVue
            v-else
            class="qr"
            :value="qrImg"
            :size="180"
            level="H"
            background="#00000000"
            :foreground="setting.themeData.primaryColor"
          />
        </n-card>
        <span class="tip">{{ qrText }}</span>
      </n-tab-pane>
      <n-tab-pane name="phone" :tab="$t('login.phone')">
        <n-alert
          style="width: 100%; margin-top: -20px; margin-bottom: 12px"
          type="warning"
        >
          {{ $t("login.canNotUse") }}
        </n-alert>
        <!-- <n-form
          class="phone"
          ref="phoneFormRef"
          :model="phoneFormData"
          :rules="phoneFormRules"
          :show-label="false"
        >
          <n-form-item path="phone">
            <n-input
              placeholder="请输入手机号"
              v-model:value="phoneFormData.phone"
            >
              <template #prefix>
                <n-icon :component="PhoneAndroidRound" />
              </template>
            </n-input>
          </n-form-item>
          <n-form-item path="captcha">
            <n-input-number
              style="width: 100%"
              placeholder="请输入短信验证码"
              v-model:value="phoneFormData.captcha"
              :show-button="false"
            >
              <template #prefix>
                <n-icon :component="PasswordRound" />
              </template>
            </n-input-number>
            <n-button
              type="primary"
              style="margin-left: 12px"
              :disabled="captchaDisabled"
              @click="getCaptcha(phoneFormData.phone)"
            >
              {{ captchaText }}
            </n-button>
          </n-form-item>
          <n-form-item>
            <n-button style="width: 100%" type="primary" @click="phoneLogin">
              {{$t("login.login")}}
            </n-button>
          </n-form-item>
        </n-form> -->
      </n-tab-pane>
      <n-tab-pane name="email" :tab="$t('login.email')">
        <n-alert
          style="width: 100%; margin-top: -20px; margin-bottom: 12px"
          type="warning"
        >
          {{ $t("login.canNotUse") }}
        </n-alert>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup>
import { userStore, musicStore, settingStore } from "@/store";
import {
  getLoginState,
  getQrKey,
  checkQr,
  toLogin,
  sentCaptcha,
  verifyCaptcha,
} from "@/api/login";
import { useRouter } from "vue-router";
import { PhoneAndroidRound, PasswordRound } from "@vicons/material";
import { formRules } from "@/utils/formRules";
import { useI18n } from "vue-i18n";
import QrcodeVue from "qrcode.vue";

const { t } = useI18n();
const router = useRouter();
const user = userStore();
const music = musicStore();
const setting = settingStore();
const siteTitle = import.meta.env.VITE_SITE_TITLE;
const { numberRule, mobileRule } = formRules();

// 二维码数据
const qrImg = ref(null);
const qrText = ref(t("login.qrText1"));

// 手机号登录数据
const phoneFormRef = ref(null);
const phoneFormData = ref({
  phone: null,
  captcha: null,
});
const phoneFormRules = {
  phone: mobileRule,
  captcha: numberRule,
};
const captchaTimeOut = ref(null);
const captchaText = ref("获取验证码");
const captchaDisabled = ref(false);

// 定时器
const qrCheckInterval = ref(null);

// 登陆状态弹窗
const loginStateMessage = ref(null);

// 储存登录信息
const saveLoginData = (data) => {
  data.cookie = data.cookie.replaceAll(" HTTPOnly", "");
  user.setCookie(data.cookie);
  // 验证用户登录信息
  getLoginState().then((res) => {
    if (res.data.profile) {
      user.setUserData(res.data.profile);
      user.userLogin = true;
      qrText.value = t("login.qrText4");
      $message.success(t("login.qrText4"));
      // 自动签到
      if ($signIn) $signIn();
      clearInterval(qrCheckInterval.value);
      router.push("/user");
    } else {
      user.userLogOut();
      $message.error(t("login.qrText5"));
      getQrKeyData();
    }
  });
};

// 获取二维码登录 key
const getQrKeyData = () => {
  // 检测是否登录
  getLoginState().then((res) => {
    if (res.data.profile && window.localStorage.getItem("cookie")) {
      $message.info(t("login.loggedIn"));
      user.userLogin = true;
      router.push("/user");
    } else {
      user.userLogOut();
      clearInterval(qrCheckInterval.value);
      getQrKey().then((res) => {
        if (res.code == 200) {
          console.log(res.data.unikey);
          qrImg.value = `https://music.163.com/login?codekey=${res.data.unikey}`;
          checkQrState(res.data.unikey);
        } else {
          $message.error(t("login.qrText6"));
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
        loginStateMessage.value = null;
        qrText.value = t("login.qrText2");
      } else if (res.code == 801) {
        loginStateMessage.value = null;
        qrText.value = t("login.qrText1");
      } else if (res.code == 802) {
        qrText.value = t("login.qrText3");
        if (!loginStateMessage.value) {
          loginStateMessage.value = $message.loading(t("login.qrText3"), {
            duration: 0,
          });
        }
      } else if (res.code == 803) {
        loginStateMessage.value.destroy();
        saveLoginData(res);
      }
    });
  }, 1000);
};

// 获取验证码
const getCaptcha = (data) => {
  clearInterval(captchaTimeOut.value);
  phoneFormRef.value?.validate(
    (errors) => {
      if (errors) {
        $message.error("请输入正确的手机号");
      } else {
        console.log(data + "发送验证码");
        sentCaptcha(data).then((res) => {
          console.log(res);
          if (res.code == 200) {
            $message.success("验证码发送成功");
            let countDown = 60;
            captchaDisabled.value = true;
            captchaTimeOut.value = setInterval(() => {
              countDown--;
              captchaText.value = countDown + "s";
              if (countDown === 0) {
                clearInterval(captchaTimeOut.value);
                captchaText.value = "重新获取";
                captchaDisabled.value = false;
              }
            }, 1000);
          } else {
            $message.error("验证码发送失败，请重试");
          }
        });
      }
    },
    (rule) => {
      return rule?.key === "phone";
    }
  );
};

// 手机号登录
const phoneLogin = (e) => {
  e.preventDefault();
  phoneFormRef.value?.validate((errors) => {
    if (!errors) {
      console.log("通过");
      verifyCaptcha(
        phoneFormData._value.phone,
        phoneFormData._value.captcha
      ).then((res) => {
        console.log(res);
        if (res.code == 200) {
          toLogin(
            phoneFormData._value.phone,
            phoneFormData._value.captcha
          ).then((res) => {
            console.log(res);
            // 暂时不支持，等支持了再写
          });
        }
      });
    } else {
      $loadingBar.error();
      $message.error("请检查您的输入");
    }
  });
};

// Tab 切换
const tabChange = (val) => {
  console.log(val);
  if (val == "qr") {
    getQrKeyData();
  } else {
    clearInterval(qrCheckInterval.value);
  }
};

onMounted(() => {
  $setSiteTitle(t("login.login"));
  // 隐藏控制条
  music.setPlayBarState(false);
  // 获取二维码登录 key
  getQrKeyData();
});

onBeforeUnmount(() => {
  // 恢复控制条
  music.setPlayBarState(true);
  // 清除定时器
  clearInterval(qrCheckInterval.value);
  clearInterval(captchaTimeOut.value);
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
      font-size: 26px;
      font-weight: bold;
    }
  }
  .content {
    width: 300px;
    margin-top: 30px;
    .qr-img {
      width: 220px;
      height: 220px;
      border-radius: 8px;
      background-color: #fff;
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
      margin: 12px 0;
      opacity: 0.8;
    }
    .phone {
      width: 100%;
      padding: 0 4px;
      box-sizing: border-box;
    }
    :deep(.n-input) {
      .n-input__prefix {
        margin-right: 8px;
      }
    }
  }
}
</style>
