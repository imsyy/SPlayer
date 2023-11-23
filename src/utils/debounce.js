/**
 * 防抖函数
 * @param {Function} func - 要进行防抖处理的函数
 * @param {number} delay - 延迟时间，单位毫秒
 * @param {string} errorMessage - 重复触发时的提醒消息
 * @returns {Function} - 返回一个新的函数，该函数在指定的时间间隔内最多只会执行一次
 */
const debounce = (func, delay, errorMessage) => {
  let timerId;
  let lastCallTime = 0;

  // 返回一个新的函数
  return (...args) => {
    const currentTime = Date.now();
    const elapsed = currentTime - lastCallTime;

    // 如果两次触发时间间隔小于 delay，弹出提醒
    if (elapsed < delay && errorMessage) {
      $message.warning(errorMessage);
      return;
    }

    // 清除上一个定时器
    clearTimeout(timerId);

    // 设置新的定时器，在指定的延迟时间后执行函数
    timerId = setTimeout(() => {
      func.apply(this, args);
      lastCallTime = Date.now();
    }, delay);
  };
};

export default debounce;
