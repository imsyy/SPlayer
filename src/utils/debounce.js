/**
 * 防抖函数，用于限制函数的执行频率
 * @param {Function} func 要执行的函数
 * @param {number} [wait=300] 延迟执行的时间，单位为毫秒，默认为 300 毫秒
 * @param {boolean} [immediate=false] 是否立即执行一次，如果为 true，则在第一次调用时立即执行，之后再进行限制；如果为 false，则等到延迟时间后再执行
 */
let timeout;

const debounce = (func, wait = 300, immediate = false) => {
    // 清除定时器
    if (timeout !== null) {
        clearTimeout(timeout);
    }
    // 立即执行，此类情况一般用不到
    if (immediate) {
        var callNow = !timeout;
        timeout = setTimeout(function () {
            timeout = null;
        }, wait);
        if (callNow) typeof func === 'function' && func();
    } else {
        // 设置定时器，当最后一次操作后，timeout不会再被清除，所以在延时wait毫秒后执行func回调方法
        timeout = setTimeout(function () {
            typeof func === 'function' && func();
        }, wait);
    }
}

export default debounce;