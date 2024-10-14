<template>
  <div class="login-phone">
    <n-form ref="phoneFormRef" :model="phoneFormData" :rules="phoneFormRules" class="phone-form">
      <n-form-item label="国家" path="country">
        <n-select v-model:value="phoneFormData.country" filterable :options="countryListData" />
      </n-form-item>
      <n-form-item label="手机号" path="phone">
        <n-input-number
          v-model:value="phoneFormData.phone"
          :show-button="false"
          placeholder="请输入手机号"
          passively-activated
          clearable
        >
          <template #prefix>
            <SvgIcon name="Phone" :depth="3" />
          </template>
        </n-input-number>
      </n-form-item>
      <n-form-item label="验证码" path="captcha">
        <n-input-number
          v-model:value="phoneFormData.captcha"
          :show-button="false"
          :disabled="phoneFormData.phone === null"
          placeholder="请输入短信验证码"
          passively-activated
          clearable
        >
          <template #prefix>
            <SvgIcon name="Password" :depth="3" />
          </template>
        </n-input-number>
        <n-button :disabled="captchaDisabled" class="send" type="primary" @click="getCaptcha">
          {{ captchaText }}
        </n-button>
      </n-form-item>
      <n-form-item :show-label="false">
        <n-button class="login" type="primary" @click="login"> 登录 </n-button>
      </n-form-item>
    </n-form>
  </div>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui";
import { countryList, sentCaptcha, verifyCaptcha, loginPhone } from "@/api/login";
import { numberRule, phoneRule } from "@/utils/rules";
import { getCacheData } from "@/utils/cache";
import { debounce } from "lodash-es";
import { LoginType } from "@/types/main";

const emit = defineEmits<{
  saveLogin: [any, LoginType];
}>();

// 表单类型
interface PhoneFormType {
  country: number;
  phone: number | null;
  captcha: number | null;
}

// 表单数据
const phoneFormRef = ref<FormInst | null>(null);
const phoneFormData = ref<PhoneFormType>({
  country: 86,
  phone: null,
  captcha: null,
});
const phoneFormRules = computed<FormRules>(() => ({
  country: { ...numberRule, message: "请选择国家" },
  phone:
    phoneFormData.value.country === 86
      ? { ...phoneRule, key: "phone" }
      : {
          ...numberRule,
          key: "phone",
          message: "请输入手机号",
        },
  captcha: { ...numberRule, message: "请输入正确的验证码" },
}));

// 验证码数据
const captchaTime = ref<number>(60);
const captchaText = ref<string>("获取验证码");
const captchaDisabled = ref<boolean>(false);

// 国家列表
const countryListData = ref<SelectOption[]>([]);

// 获取国家列表
const getCountryListData = async () => {
  try {
    const result = await getCacheData(countryList, {
      storage: "localStorage",
      key: "countryListData",
      time: 0,
    });
    // 转换数据格式
    const transformedData = result.data.map((group: any) => ({
      type: "group",
      label: group.label,
      key: group.label,
      children: group.countryList.map((country: any) => ({
        label: `${country.zh} (+${country.code})`,
        value: Number(country.code),
      })),
    }));
    countryListData.value = transformedData;
  } catch (error) {
    console.error("获取国家列表失败：", error);
    countryListData.value = [
      {
        key: "86",
        label: "中国 (+86)",
        value: 86,
      },
    ];
  }
};

// 获取验证码
const getCaptcha = async (e: MouseEvent) => {
  e.preventDefault();
  // 是否输入
  await phoneFormRef.value?.validate(
    (errors) => errors,
    (rule) => rule?.key === "phone",
  );
  // 发送验证码
  captchaDisabled.value = true;
  const result = await sentCaptcha(
    phoneFormData.value.phone as number,
    phoneFormData.value.country as number,
  );
  if (result.code === 200) {
    resumeTime();
    window.$message.success("验证码发送成功");
  } else {
    captchaDisabled.value = false;
    window.$message.error("验证码发送失败，请重试");
  }
};

// 更改验证码状态
const { pause: pauseTime, resume: resumeTime } = useIntervalFn(
  () => {
    captchaTime.value--;
    captchaText.value = `${captchaTime.value} s`;
    if (captchaTime.value <= 0) {
      pauseTime();
      captchaTime.value = 60;
      captchaText.value = "重新获取";
      captchaDisabled.value = false;
    }
  },
  1000,
  {
    immediate: false,
  },
);

// 登录
const login = debounce(async (e: MouseEvent) => {
  e.preventDefault();
  // 验证输入
  await phoneFormRef.value?.validate();
  // 验证验证码
  const captchaResult = await verifyCaptcha(
    phoneFormData.value.phone as number,
    phoneFormData.value.captcha as number,
    phoneFormData.value.country as number,
  );
  if (captchaResult.code !== 200) {
    window.$message.error("验证码错误，请重试");
    return;
  }
  // 登录
  const loginResult = await loginPhone(
    phoneFormData.value.phone as number,
    phoneFormData.value.captcha as number,
    phoneFormData.value.country as number,
  );
  if (loginResult.code !== 200) {
    window.$message.error("登录失败，请重试");
    return;
  }
  // 是否含有 MUSIC_U
  if (loginResult.cookie && loginResult.cookie.includes("MUSIC_U")) {
    // 去除 HTTPOnly
    loginResult.cookie = loginResult.cookie.replaceAll(" HTTPOnly", "");
    // 储存登录信息
    emit("saveLogin", loginResult, "phone");
  } else {
    window.$message.error("登录出错，请重试");
  }
}, 300);

onMounted(() => {
  getCountryListData();
});
</script>

<style lang="scss" scoped>
.login-phone {
  .phone-form {
    margin-top: 20px;
    .send {
      margin-left: 12px;
    }
    .login {
      width: 100%;
    }
  }
}
</style>
