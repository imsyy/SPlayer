import getLanguageData from "./getLanguageData";

/**
 * 歌曲时长时间戳转换
 * @param {number} mss 毫秒数
 * @returns {string} 格式为 "mm:ss" 的字符串
 */
export const getSongTime = (mss) => {
  const minutes = Math.floor(mss / (1000 * 60));
  let seconds = Math.floor((mss % (1000 * 60)) / 1000);
  if (seconds < 10) {
    seconds = `0${seconds}`;
  }
  return `${minutes}:${seconds}`;
};

/**
 * 获取时间戳对应的日期
 * @param {number} mss - 时间戳
 * @returns {string} - 日期字符串
 */
export const getLongTime = (mss) => {
  const date = new Date(parseInt(mss));
  const y = date.getFullYear();
  const m = `0${date.getMonth() + 1}`.slice(-2);
  const d = `0${date.getDate()}`.slice(-2);
  return `${y}-${m}-${d}`;
};

/**
 * 将时间戳转化为对应的时间格式
 * @param {number} t - 时间戳，单位为毫秒
 * @returns {string} - 转换后的时间字符串
 */
export const getCommentTime = (t) => {
  // 获取当前 Unix 时间戳
  const nowDate = new Date().getTime();
  // 获取今天 23:59:59.999 时间戳
  const todayLast = new Date(new Date().setHours(23, 59, 59, 999)).getTime();

  // 将传入的时间戳转换为 Date 对象
  const userDate = new Date(Number(t));
  // 获取评论时间的小时和分钟数，并进行补零处理
  const UH =
    userDate.getHours() < 10 ? `0${userDate.getHours()}` : userDate.getHours();
  const Um =
    userDate.getMinutes() < 10
      ? `0${userDate.getMinutes()}`
      : userDate.getMinutes();
  // 判断时间差
  if (nowDate - t <= 60000) {
    return getLanguageData("just");
  } else if (nowDate - t > 60000 && nowDate - t <= 3600000) {
    const pastTimeUnix = nowDate - t;
    const pastTime = new Date(Number(pastTimeUnix));
    return `${pastTime.getMinutes("yesterday")} ${getLanguageData(
      "minutesAgo"
    )}`;
  } else if (todayLast - t > 3600000 && todayLast - t <= 86400000) {
    return `${UH}:${Um}`;
  } else if (todayLast - t > 86400000 && todayLast - t <= 172800000) {
    return `${getLanguageData("yesterday")} ${UH}:${Um}`;
  } else if (todayLast - t > 172800000 && todayLast - t <= 31557600000) {
    return `${userDate.getMonth() + 1}${getLanguageData(
      "month"
    )}${userDate.getDate()}${getLanguageData("day")}`;
  } else {
    return `${userDate.getFullYear()}${getLanguageData("year")}${
      userDate.getMonth() + 1
    }${getLanguageData("month")}${userDate.getDate()}${getLanguageData("day")}`;
  }
};

/**
 * 过万/亿数字转化
 * @param {number} num 需要格式化的数字
 * @returns {string|number} 格式化后的字符串或原样返回的数字
 */
export const formatNumber = (num) => {
  const n = Number(num);
  if (n === 0 || n < 10000) {
    return n;
  } else if (n < 100000000) {
    const numString = (n / 10000).toFixed(1);
    return numString.endsWith(".0")
      ? numString.slice(0, -2) + getLanguageData("million")
      : numString + getLanguageData("million");
  } else {
    const numString = (n / 100000000).toFixed(1);
    return numString.endsWith(".0")
      ? numString.slice(0, -2) + getLanguageData("billion")
      : numString + getLanguageData("billion");
  }
};

/**
 * 歌曲播放时间转换
 * @param {number} num 歌曲播放时间，单位为秒
 * @returns {string} 格式为 "mm:ss" 的字符串
 */
export const getSongPlayingTime = (num) => {
  const minutes = String(Math.floor(num / 60)).padStart(2, "0");
  const seconds = String(Math.floor(num % 60)).padStart(2, "0");
  return `${minutes}:${seconds}`;
};
