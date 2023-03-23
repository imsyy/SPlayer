import axios from "@/api/request";

/**
 * 用户及登录部分
 */

/**
 * 生成二维码 key
 */
export const getQrKey = () => {
  return axios({
    method: "GET",
    loadingBar: "Hidden",
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
    loadingBar: "Hidden",
    url: "/login/qr/create",
    params: {
      key,
      qrimg,
      time: new Date().getTime(),
    },
  });
};
