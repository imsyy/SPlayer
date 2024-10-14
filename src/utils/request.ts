import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from "axios";
import { isDev, isElectron } from "./helper";
import { useSettingStore } from "@/stores";
import { getCookie } from "./cookie";
import { isLogin } from "./auth";

// 全局地址
const baseURL: string = String(isDev ? "/api/netease" : import.meta.env["VITE_API_URL"]);

// 基础配置
const server: AxiosInstance = axios.create({
  baseURL,
  // 允许跨域
  withCredentials: true,
  // 超时时间
  timeout: 15000,
});

// 请求拦截器
server.interceptors.request.use(
  (request) => {
    // pinia
    const settingStore = useSettingStore();
    if (!request.params) request.params = {};
    // Cookie
    if (!request.params.noCookie && (isLogin() || getCookie("MUSIC_U") !== null)) {
      const cookie = `MUSIC_U=${getCookie("MUSIC_U")};`;
      request.params.cookie = encodeURIComponent(cookie);
    }
    // realIP
    if (!isElectron && !request.url?.includes("/login")) {
      request.params.realIP = "116.25.146.177";
    }
    // 自定义 realIP
    if (settingStore.useRealIP) {
      request.params.realIP = settingStore.realIP || "116.25.146.177";
    }
    // proxy
    if (settingStore.proxyProtocol !== "off") {
      const protocol = settingStore.proxyProtocol.toLowerCase();
      const server = settingStore.proxyServe;
      const port = settingStore.proxyPort;
      const proxy = `${protocol}://${server}:${port}`;
      if (proxy) request.params.proxy = proxy;
    }
    // 发送请求
    return request;
  },
  (error: AxiosError) => {
    console.error("请求发送失败：", error);
    return Promise.reject(error);
  },
);

// 响应拦截器
server.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const { response } = error;
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
    window.$notification.error({
      title: "请求错误",
      description: `状态码: ${response?.status || ""}`,
      content: (response && (response.data as { message?: string }).message) || error.message,
      meta: "若持续发生，可尝试软件热重载",
      duration: 5000,
    });
    // 返回错误
    return Promise.reject(error);
  },
);

// 请求
const request = async (config: AxiosRequestConfig): Promise<any> => {
  // 返回请求数据
  const { data } = await server.request(config);
  return data as any;
};

export default request;
