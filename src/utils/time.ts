import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

// 秒转为时间
export const secondsToTime = (seconds: number) => {
  if (seconds < 3600) {
    return dayjs.duration(seconds, "seconds").format("m:ss");
  } else {
    return dayjs.duration(seconds, "seconds").format("H:mm:ss");
  }
};

// 毫秒转为时间
export const msToTime = (milliseconds: number) => {
  const dur = dayjs.duration(milliseconds, "milliseconds");
  return milliseconds < 3600000 ? dur.format("mm:ss") : dur.format("H:mm:ss");
};

// 毫秒转为秒
export const msToS = (milliseconds: number, decimalPlaces: number = 2): number => {
  return Number((milliseconds / 1000).toFixed(decimalPlaces));
};

/**
 * 格式化时间戳
 * @param {number|undefined} timestamp - 要格式化的时间戳（以毫秒为单位）。如果为 `null` 或 `0`，则返回空字符串。
 * @param {string} [format="YYYY-MM-DD"] - 可选的时间格式，默认格式为 "YYYY-MM-DD"。可传入任意 dayjs 支持的格式。
 *   特殊格式支持：
 *   - 含有 "__SMART_YEAR__" 标记的格式：如果是当年则自动移除年份部分，否则保留
 *     示例：使用 "__SMART_YEAR__MM-DD" 当年显示 "MM-DD"，去年显示 "YYYY-MM-DD"
 * @returns {string} - 根据指定格式返回的日期字符串
 */
export const formatTimestamp = (
  timestamp: number | undefined,
  format: string = "YYYY-MM-DD",
): string => {
  if (!timestamp) return "";
  const date = dayjs(timestamp);
  const currentYear = dayjs().year();
  const year = date.year();

  // 支持智能年份显示：__SMART_YEAR__MM-DD 格式
  if (format.includes("__SMART_YEAR__")) {
    if (year === currentYear) {
      // 当年：移除年份部分
      return date.format(format.replace("__SMART_YEAR__YYYY-", "").replace("__SMART_YEAR__", ""));
    }
    // 非当年：补充年份
    return date.format(format.replace("__SMART_YEAR__", "YYYY-"));
  }

  // 普通格式：直接使用传入的格式
  return date.format(format);
};// 格式化评论时间戳
export const formatCommentTime = (timestamp: number): string => {
  const now = dayjs();
  const diff = now.diff(dayjs(timestamp), "minute");
  if (diff < 1) {
    return "刚刚发布";
  } else if (diff < 60) {
    return `${diff}分钟前`;
  } else if (diff < 1440) {
    // 1天 = 24小时 * 60分钟
    return `${Math.floor(diff / 60)}小时前`;
  } else if (diff < 525600) {
    // 1年约等于 525600分钟
    return dayjs(timestamp).format("MM-DD HH:mm");
  } else {
    return dayjs(timestamp).format("YYYY-MM-DD HH:mm");
  }
};

/**
 * 计算进度条移动的距离
 * @param {number} currentTime
 * @param {number} duration
 * @returns {number} 进度条移动的距离，精确到 0.01，最大为 100
 */
export const calculateProgress = (currentTime: number, duration: number): number => {
  if (duration === 0) return 0;
  const progress = (currentTime / duration) * 100;
  return Math.min(Math.round(progress * 100) / 100, 100);
};

/**
 * 获取当前时间段的问候语
 */
export const getGreeting = () => {
  const hour = dayjs().hour();
  if (hour < 6) {
    return "凌晨好";
  } else if (hour < 9) {
    return "早上好";
  } else if (hour < 12) {
    return "上午好";
  } else if (hour < 14) {
    return "中午好";
  } else if (hour < 17) {
    return "下午好";
  } else if (hour < 19) {
    return "傍晚好";
  } else if (hour < 22) {
    return "晚上好";
  } else {
    return "夜深了";
  }
};

/**
 * 是否为当天的6点之前
 * @param timestamp 当前时间戳
 */
export const isBeforeSixAM = (timestamp: number) => {
  // 当天的早上 6 点
  const sixAM = dayjs().startOf("day").add(6, "hour");
  // 判断输入时间是否在六点之前
  const inputTime = dayjs(timestamp);
  return inputTime.isBefore(sixAM);
};

/**
 * 将 ISO 8601 格式的时间字符串转换为本地时间
 * @param isoString - ISO 8601 格式的时间字符串
 * @returns
 */
export const convertToLocalTime = (isoString: string): string => {
  return dayjs(isoString).format("YYYY-MM-DD HH:mm:ss");
};

/**
 * 将秒转为 分：秒
 * @param seconds 秒数
 * @returns 分：秒格式的字符串
 */
export const convertSecondsToTime = (seconds: number): string => {
  // 需要补零
  return dayjs.duration(seconds, "seconds").format("mm:ss");
};
