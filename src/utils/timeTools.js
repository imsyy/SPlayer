/**
 * 获取根据当前时间的问候语
 * @returns {string} 当前时间对应的问候语
 */
export const getGreetings = () => {
  const hour = new Date().getHours();
  let hello;
  if (hour < 6) {
    hello = "凌晨好";
  } else if (hour < 9) {
    hello = "早上好";
  } else if (hour < 12) {
    hello = "上午好";
  } else if (hour < 14) {
    hello = "中午好";
  } else if (hour < 17) {
    hello = "下午好";
  } else if (hour < 19) {
    hello = "傍晚好";
  } else if (hour < 22) {
    hello = "晚上好";
  } else {
    hello = "夜深了";
  }
  return hello;
};

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
export const getTimestampTime = (mss, showYear = true) => {
  const date = new Date(parseInt(mss));
  const y = date.getFullYear();
  const m = `0${date.getMonth() + 1}`.slice(-2);
  const d = `0${date.getDate()}`.slice(-2);
  return showYear ? `${y}-${m}-${d}` : `${m}-${d}`;
};

/**
 * 歌曲播放时间转换
 * @param {number} num 歌曲播放时间，单位为秒
 * @returns {string} 格式为 "mm:ss" 的字符串
 */
export const getSongPlayTime = (num) => {
  const minutes = String(Math.floor(num / 60)).padStart(2, "0");
  const seconds = String(Math.floor(num % 60)).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

/**
 * 将评论时间戳转化为对应的时间格式
 * @param {number} t - 时间戳，单位为毫秒
 * @returns {string} - 转换后的时间字符串
 */
export const getCommentTime = (t) => {
  // 获取当前 Unix 时间戳
  const nowDate = new Date();
  // 获取今天 23:59:59.999 时间戳
  const todayLast = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate(),
    23,
    59,
    59,
    999,
  ).getTime();
  // 将传入的时间戳转换为 Date 对象
  const userDate = new Date(Number(t));
  // 获取评论时间的小时和分钟数，并进行补零处理
  const UH = userDate.getHours() < 10 ? `0${userDate.getHours()}` : userDate.getHours();
  const Um = userDate.getMinutes() < 10 ? `0${userDate.getMinutes()}` : userDate.getMinutes();
  // 判断时间差
  if (nowDate - t <= 60000) {
    return "刚刚发布";
  } else if (nowDate - t > 60000 && nowDate - t <= 3600000) {
    const pastTimeUnix = nowDate - t;
    const pastTime = new Date(Number(pastTimeUnix));
    return `${pastTime.getMinutes()} 分钟前`;
  } else if (todayLast - t > 3600000 && todayLast - t <= 86400000) {
    return `${UH}:${Um}`;
  } else if (nowDate.getFullYear() === userDate.getFullYear()) {
    // 如果在今年，不显示年份
    return `${userDate.getMonth() + 1}月${userDate.getDate()}日 ${UH}:${Um}`;
  } else if (todayLast - t <= 172800000) {
    return `昨天 ${UH}:${Um}`;
  } else {
    return `${userDate.getFullYear()}年${
      userDate.getMonth() + 1
    }月${userDate.getDate()}日 ${UH}:${Um}`;
  }
};
