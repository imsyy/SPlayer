/**
 * 节流函数
 * @param {Function} func - 要进行节流处理的函数
 * @param {number} delay - 延迟时间，单位毫秒
 * @param {string} errorMessage - 重复触发时的提醒消息
 * @returns {Function} - 返回一个新的函数，该函数在指定的时间间隔内最多只会执行一次
 */
const throttle = (func, delay, errorMessage) => {
  let isThrottled = false;

  // 返回一个新的函数
  return (...args) => {
    if (!isThrottled) {
      isThrottled = true;
      func.apply(this, args);
      setTimeout(() => {
        isThrottled = false;
      }, delay);
    } else if (errorMessage) {
      $message.warning(errorMessage);
    }
  };
};

export default throttle;
