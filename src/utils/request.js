import { checkPlatform } from "@/utils/helper";
import { getCookie, isLogin } from "@/utils/auth";
import { siteSettings } from "@/stores";
import axios from "axios";

// 全局地址
if (checkPlatform.electron()) {
  axios.defaults.baseURL = "/api";
} else {
  axios.defaults.baseURL = import.meta.env["RENDERER_VITE_SERVER_URL"];
}

// 基础配置
axios.defaults.timeout = 15000;
axios.defaults.withCredentials = true;

// 请求拦截
axios.interceptors.request.use(
  (request) => {
    const settings = siteSettings();
    if (!request.params) request.params = {};
    // 附加 cookie
    if (!request.noCookie && (isLogin() || getCookie("MUSIC_U") !== null)) {
      request.params.cookie = `MUSIC_U=${getCookie("MUSIC_U")};`;
    }
    // 去除 cookie
    if (request.noCookie) {
      request.params.noCookie = true;
    }
    // 附加 realIP
    if (settings.useRealIP) {
      request.params.realIP = settings.realIP || "116.25.146.177";
    }
    // 附加代理
    const proxy = JSON.parse(localStorage.getItem("siteSettings")).proxyProtocol;
    if (proxy !== "off") {
      const server = JSON.parse(localStorage.getItem("siteSettings")).proxyServe;
      const port = parseInt(localStorage.getItem("siteSettings").proxyPort);
      if (server && port) {
        request.params.proxy = `${proxy}://${server}:${port}`;
      }
    }
    // 发送请求
    return request;
  },
  (error) => {
    console.error("请求失败，请稍后重试");
    return Promise.reject(error);
  },
);

// 响应拦截
axios.interceptors.response.use(
  (response) => {
    return response?.data;
  },
  (error) => {
    // 从错误对象中获取响应信息
    const response = error.response;
    // 断网处理
    if (!response) $canNotConnect(error);
    // 状态码处理
    switch (response?.status) {
      case 400:
        console.error("客户端错误：", response.status, response.statusText);
        // 执行客户端错误的处理逻辑
        break;
      case 401:
        console.error("未授权：", response.status, response.statusText);
        // 执行未授权的处理逻辑
        break;
      case 403:
        console.error("禁止访问：", response.status, response.statusText);
        // 执行禁止访问的处理逻辑
        break;
      case 404:
        console.error("未找到资源：", response.status, response.statusText);
        // 执行未找到资源的处理逻辑
        break;
      case 500:
        console.error("服务器错误：", response.status, response.statusText);
        // 执行服务器错误的处理逻辑
        break;
      default:
        // 处理其他状态码或错误条件
        console.error("未处理的错误：", error.message);
    }
    // 继续传递错误
    return Promise.reject(error);
  },
);

export default axios;
