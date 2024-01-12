<!-- 登录 - 手机号 -->
<template>
  <div class="login-phone">
    <n-form
      ref="phoneFormRef"
      :model="phoneFormData"
      :rules="phoneFormRules"
      :show-label="false"
      class="phone-form"
    >
      <n-form-item path="phone">
        <n-input v-model:value="phoneFormData.phone" placeholder="请输入手机号">
          <template #prefix>
            <n-icon>
              <SvgIcon icon="phone" />
            </n-icon>
          </template>
        </n-input>
      </n-form-item>
      <n-form-item path="captcha">
        <n-input-number
          v-model:value="phoneFormData.captcha"
          :show-button="false"
          style="width: 100%"
          placeholder="请输入短信验证码"
        >
          <template #prefix>
            <n-icon>
              <SvgIcon icon="password" />
            </n-icon>
          </template>
        </n-input-number>
        <n-button
          :disabled="captchaDisabled"
          type="primary"
          style="margin-left: 12px"
          @click="getCaptcha(phoneFormData.phone)"
        >
          {{ captchaText }}
        </n-button>
      </n-form-item>
      <n-form-item>
        <n-button style="width: 100%" type="primary" @click="phoneLogin"> 登录 </n-button>
      </n-form-item>
    </n-form>
  </div>
</template>

<script setup>
import { sentCaptcha, verifyCaptcha, toLogin } from "@/api/login";
import { formRules } from "@/utils/formRules";

const emit = defineEmits(["setLoginData"]);
const { numberRule, mobileRule } = formRules();

// 手机号数据
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

// 获取验证码
const getCaptcha = (phone) => {
  clearInterval(captchaTimeOut.value);
  phoneFormRef.value?.validate(
    async (errors) => {
      if (!errors) {
        console.log(phone + "发送验证码");
        const result = await sentCaptcha(phone);
        console.log(result);
        if (result.code == 200) {
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
      } else {
        $message.error("请检查你的输入");
      }
    },
    (rule) => {
      return rule?.key === "phone";
    },
  );
};

// 手机号登录
const phoneLogin = (e) => {
  try {
    e.preventDefault();
    phoneFormRef.value?.validate(async (errors) => {
      if (!errors) {
        const verifyRes = await verifyCaptcha(
          phoneFormData._value.phone,
          phoneFormData._value.captcha,
        );
        console.log(verifyRes);
        if (verifyRes.code == 200) {
          const result = await toLogin(phoneFormData._value.phone, phoneFormData._value.captcha);
          console.log(result);
          if (result.code === 200) {
            // 去除 HTTPOnly
            result.cookie = result.cookie.replaceAll(" HTTPOnly", "");
            // 是否含有 MUSIC_U
            if (result.cookie && result.cookie.includes("MUSIC_U")) {
              // 储存登录信息
              emit("setLoginData", result);
            } else {
              $message.error("登录出错，请重试");
            }
          }
        }
      } else {
        $message.error("请检查你的输入");
      }
    });
  } catch (error) {
    phoneFormData.value.captcha = null;
    console.error("登录出错：", error);
    $message.error("登录出错，请重试");
  }
};
</script>

<style lang="scss" scoped>
.login-phone {
  .phone-form {
    margin-top: 20px;
  }
}
</style>
