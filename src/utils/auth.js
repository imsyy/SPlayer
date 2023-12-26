import { logOut } from "@/api/login";
import { siteData } from "@/stores";
import Cookies from "js-cookie";

/**
 * 将服务器返回的 Cookie 数据设置到浏览器的 Cookie 和本地存储中
 */
export const setCookies = (cookieValue) => {
  const cookies = cookieValue.split(";;");
  cookies.map((cookie) => {
    document.cookie = cookie;
    const cookieKeyValue = cookie.split(";")[0].split("=");
    localStorage.setItem(`cookie-${cookieKeyValue[0]}`, cookieKeyValue[1]);
  });
};

/**
 * 获取指定 Cookie 值
 * @param {string} key - 要获取的 Cookie 键名
 * @returns {string|null} Cookie 值，如果不存在则返回 null
 */
export const getCookie = (key) => {
  return Cookies.get(key) ?? localStorage.getItem(`cookie-${key}`);
};

/**
 * 移除指定 Cookie
 * @param {string} key - 要移除的 Cookie 键名
 */
export const removeCookie = (key) => {
  Cookies.remove(key);
  localStorage.removeItem(`cookie-${key}`);
};

/**
 * 检查用户是否已登录
 * @returns {boolean} 如果用户已登录，则返回 true；否则返回 false
 */
export const isLogin = () => {
  const data = siteData();
  const status = getCookie("MUSIC_U") === undefined || getCookie("MUSIC_U") === null;
  // 更改状态
  data.userLoginStatus = !status;
  return !status;
};

/**
 * 退出用户登录
 */
export const toLogout = async (show = true) => {
  const data = siteData();
  // 去除 cookie
  await logOut();
  removeCookie("MUSIC_U");
  removeCookie("__csrf");
  sessionStorage.clear();
  // 去除用户信息
  data.userLoginStatus = false;
  data.userData = {};
  data.userLikeData = {
    songs: [],
    playlists: [],
    albums: [],
    mvs: [],
  };
  data.dailySongsData = {
    timestamp: null,
    data: [],
  };
  if (show) $message.success("成功退出登录");
};
