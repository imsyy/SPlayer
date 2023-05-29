import axios from "axios";

switch (process.env.NODE_ENV) {
  case "production":
    axios.defaults.baseURL = import.meta.env.VITE_MUSIC_API;
    break;
  case "development":
    axios.defaults.baseURL = "/api";
    break;
  default:
    axios.defaults.baseURL = import.meta.env.VITE_MUSIC_API;
    break;
}

axios.defaults.timeout = 30000;
axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
axios.defaults.withCredentials = true;

// 请求拦截
axios.interceptors.request.use(
  (request) => {
    if (!request.hiddenBar && typeof $loadingBar !== "undefined")
      $loadingBar.start();
    return request;
  },
  (error) => {
    $loadingBar.error();
    console.error("请求失败，请稍后重试");
    return Promise.reject(error);
  }
);

// 响应拦截
axios.interceptors.response.use(
  (response) => {
    if (typeof $loadingBar !== "undefined") $loadingBar.finish();
    return response.data;
  },
  (error) => {
    $loadingBar.error();
    if (error.response) {
      const data = error.response.data;
      switch (error.response.status) {
        case 401:
          console.error("无权限访问");
          break;
        case 301:
          console.error("请求发生重定向");
          break;
        case 404:
          console.error("请求资源不存在");
          break;
        case 500:
          console.error("内部服务器错误");
          break;
        default:
          console.error(data.message ? data.message : "请求失败，请稍后重试");
          break;
      }
    } else {
      console.error("请求失败，请稍后重试");
    }
    return Promise.reject(error);
  }
);

export default axios;
