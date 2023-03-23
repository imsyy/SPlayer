import axios from "@/utils/request";

/**
 * 登录部分
 */

/**
 * 生成二维码 key
 */
export const getQrKey = () => {
  return axios({
    method: "GET",
    hiddenBar: true,
    url: "/login/qr/key",
    params: {
      time: new Date().getTime(),
    },
  });
};

/**
 * 生成二维码
 * @param {string} key 二维码key
 * @param {boolean} qrimg 是否生成二维码图片，默认为true
 */
export const qrCreate = (key, qrimg = true) => {
  return axios({
    method: "GET",
    hiddenBar: true,
    url: "/login/qr/create",
    params: {
      key,
      qrimg,
      time: new Date().getTime(),
    },
  });
};

/**
 * 检查二维码状态
 * @param {string} key 二维码key
 */
export const checkQr = (key) => {
  return axios({
    method: "GET",
    hiddenBar: true,
    url: "/login/qr/check",
    params: {
      key,
      time: new Date().getTime(),
    },
  });
};

/**
 * 手机号登录
 * @param {string} phone 手机号码
 * @param {string} captcha 验证码
 */
export const toLogin = (phone, captcha) => {
  return axios({
    method: "GET",
    hiddenBar: true,
    url: "/login/cellphone",
    params: {
      phone,
      captcha,
      time: new Date().getTime(),
    },
  });
};

/**
 * 发送验证码
 * @param {string} phone 手机号码
 */
export const sentCaptcha = (phone) => {
  return axios({
    method: "GET",
    url: "/captcha/sent",
    params: {
      phone,
      time: new Date().getTime(),
    },
  });
};

/**
 * 验证验证码是否正确
 * @param {string} phone 手机号码
 * @param {string} captcha 验证码
 */
export const verifyCaptcha = (phone, captcha) => {
  return axios({
    method: "GET",
    hiddenBar: true,
    url: "/captcha/verify",
    params: {
      phone,
      captcha,
      time: new Date().getTime(),
    },
  });
};

// 获取登录状态
export const getLoginState = () => {
  return axios({
    method: "GET",
    hiddenBar: true,
    url: "/login/status",
    params: {
      time: new Date().getTime(),
    },
  });
};
