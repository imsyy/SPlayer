<template>
  <div class="login-qrcode">
    <div class="qr-img">
      <div
        v-if="qrImg"
        :class="['qr', { success: qrStatusCode === 802, error: qrStatusCode === 800 }]"
      >
        <n-qr-code
          :value="qrImg"
          :size="160"
          :icon-size="30"
          icon-src="/icons/favicon.png?assest"
          error-correction-level="H"
        />
        <!-- 待确认 -->
        <Transition name="fade" mode="out-in">
          <div v-if="loginName" class="login-data">
            <n-image
              :src="loginAvatar.replace(/^http:/, 'https:') + '?param=100y100'"
              class="cover"
              preview-disabled
              @load="coverLoaded"
            >
              <template #placeholder>
                <div class="cover-loading">
                  <img src="/images/avatar.jpg?assest" class="loading-img" alt="loading-img" />
                </div>
              </template>
            </n-image>
            <n-text>{{ loginName }}</n-text>
          </div>
        </Transition>
      </div>
      <n-skeleton v-else class="qr" />
    </div>
    <n-text class="tip" depth="3">{{ qrTipText }}</n-text>
  </div>
</template>

<script setup lang="ts">
import { qrKey, checkQr } from "@/api/login";
import { LoginType } from "@/types/main";
import { coverLoaded } from "@/utils/helper";

const props = defineProps<{
  pause?: boolean;
}>();

const emit = defineEmits<{
  saveLogin: [any, LoginType];
}>();

// 状态提示
const qrCodeTip = {
  800: "二维码过期，即将重试",
  801: "请打开云音乐 APP 扫码登录",
  802: "扫描成功，请在客户端确认登录",
  803: "登录成功",
} as const;

// 二维码数据
const qrImg = ref<string>("");
const qrUnikey = ref<string>("");
const qrStatusCode = ref<keyof typeof qrCodeTip>(801);

// 提示文本
const qrTipText = computed(() => {
  return qrCodeTip[qrStatusCode.value] || "遇到未知状态，请重试";
});

// 待确认数据
const loginName = ref<string>("");
const loginAvatar = ref<string>("");

// 获取二维码
const getQrData = async () => {
  try {
    pauseCheck();
    qrStatusCode.value = 801;
    loginName.value = "";
    loginAvatar.value = "";
    // 获取 key
    const res = await qrKey();
    qrImg.value = `https://music.163.com/login?codekey=${res.data.unikey}`;
    // 更改 key
    qrUnikey.value = res.data.unikey;
    // 检查状态
    resumeCheck();
  } catch (error) {
    pauseCheck();
    console.error("二维码获取失败：", error);
  }
};

// 检查二维码状态
const checkQrStatus = async () => {
  if (!qrUnikey.value || props.pause) return;
  // 检查状态
  const { code, cookie, nickname, avatarUrl } = await checkQr(qrUnikey.value);
  switch (code) {
    // 二维码过期
    case 800:
      qrStatusCode.value = 800;
      getQrData();
      break;
    // 等待扫码
    case 801:
      qrStatusCode.value = 801;
      break;
    // 待确认
    case 802:
      qrStatusCode.value = 802;
      loginName.value = nickname;
      loginAvatar.value = avatarUrl;
      break;
    // 登录成功
    case 803:
      qrStatusCode.value = 803;
      pauseCheck();
      // 是否含有 MUSIC_U
      if (cookie && cookie.includes("MUSIC_U")) {
        // 储存登录信息
        emit("saveLogin", { code: 200, cookie }, "qr");
      } else {
        window.$message.error("登录出错，请重试");
        getQrData();
      }
      break;
    default:
      break;
  }
};

// 控制检查二维码
const { pause: pauseCheck, resume: resumeCheck } = useIntervalFn(checkQrStatus, 1000, {
  immediate: false,
});

onMounted(getQrData);
onBeforeUnmount(pauseCheck);
</script>

<style lang="scss" scoped>
.login-qrcode {
  display: flex;
  flex-direction: column;
  align-items: center;
  .qr-img {
    display: flex;
    margin: 20px 0;
    width: 180px;
    height: 180px;
    border-radius: 12px;
    overflow: hidden;
    .qr {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      .n-qr-code {
        padding: 0;
        height: 180px;
        width: 180px;
        min-height: 180px;
        min-width: 180px;
        transition:
          opacity 0.3s,
          filter 0.3s;
        :deep(canvas) {
          width: 100% !important;
          height: 100% !important;
        }
      }
      .login-data {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        z-index: 1;
        .cover {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          margin-bottom: 8px;
        }
      }
      &.success {
        .n-qr-code {
          opacity: 0.5;
          filter: blur(4px);
        }
      }
    }
  }
  .tip {
    margin-bottom: 12px;
  }
}
</style>
