<!-- 登录 - 二维码 -->
<template>
  <div class="login-qr">
    <div class="qr-img">
      <Transition name="fade" mode="out-in">
        <n-qr-code
          v-if="qrImg"
          :value="qrImg"
          :class="['qr', qrStatusCode === 802 ? 'hidden' : null]"
          :size="156"
          :icon-size="30"
          icon-src="/images/icons/favicon.png?asset"
          error-correction-level="H"
        />
        <n-skeleton v-else class="qr" />
      </Transition>
      <Transition name="fade" mode="out-in">
        <div v-if="qrStatusCode === 802" class="refresh" @click="getQrData">
          <n-icon size="22">
            <SvgIcon icon="refresh" />
          </n-icon>
          <n-text depth="3">重试</n-text>
        </div>
      </Transition>
    </div>
    <n-text class="tip" depth="3">{{ qrCodeTip[qrStatusCode] }}</n-text>
  </div>
</template>

<script setup>
import { getQrKey, checkQr } from "@/api/login";

const emit = defineEmits(["setLoginData"]);

// 二维码数据
const qrImg = ref(null);
const qrCheckInterval = ref(null);
const qrStatusCode = ref(801);
const qrCodeTip = {
  800: "二维码过期，即将重试",
  801: "请打开云音乐 APP 扫码登录",
  802: "扫描成功，请在客户端确认登录",
  803: "登录成功",
};

// 获取二维码
const getQrData = async () => {
  try {
    clearInterval(qrCheckInterval.value);
    qrStatusCode.value = 801;
    const res = await getQrKey();
    qrImg.value = `https://music.163.com/login?codekey=${res.data.unikey}`;
    // 检查状态
    checkQrStatus(res.data.unikey);
  } catch (error) {
    clearInterval(qrCheckInterval.value);
    console.error("二维码获取失败：", error);
  }
};

// 检查二维码状态
const checkQrStatus = (key) => {
  try {
    clearInterval(qrCheckInterval.value);
    qrCheckInterval.value = setInterval(() => {
      checkQr(key).then((res) => {
        console.log(res);
        switch (res.code) {
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
            break;
          // 授权登录成功
          case 803:
            clearInterval(qrCheckInterval.value);
            qrStatusCode.value = 803;
            // 去除 HTTPOnly
            res.code = 200;
            res.cookie = res.cookie.replaceAll(" HTTPOnly", "");
            console.log(res);
            // 是否含有 MUSIC_U
            if (res.cookie && res.cookie.includes("MUSIC_U")) {
              // 储存登录信息
              emit("setLoginData", res);
            } else {
              $message.error("登录出错，请重试");
              getQrData();
            }
            break;
          default:
            break;
        }
      });
    }, 1000);
  } catch (error) {
    clearInterval(qrCheckInterval.value);
    console.error("登录出错：", error);
  }
};

onBeforeMount(() => {
  getQrData();
});

onBeforeUnmount(() => {
  clearInterval(qrCheckInterval.value);
});
</script>

<style lang="scss" scoped>
.login-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  .qr-img {
    position: relative;
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    border-radius: 12px;
    overflow: hidden;
    .qr {
      min-width: 180px;
      height: 180px;
      width: 180px;
      min-height: 180px;
      min-width: 180px;
      box-sizing: border-box;
      transition: opacity 0.3s;
      &.hidden {
        opacity: 0.2;
      }
    }
    .refresh {
      position: absolute;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      backdrop-filter: blur(2px);
      cursor: pointer;
    }
  }
  .tip {
    margin: 20px 0;
  }
}
</style>
