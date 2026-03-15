import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

/** 秒转为时间字符串 (m:ss 或 H:mm:ss) */
export const secondsToTime = (seconds: number): string => {
  const format = seconds < 3600 ? "m:ss" : "H:mm:ss";
  return dayjs.duration(seconds, "seconds").format(format);
};

/** 毫秒转为时间字符串 (mm:ss 或 H:mm:ss) */
export const msToTime = (milliseconds: number): string => {
  const format = milliseconds < 3600000 ? "mm:ss" : "H:mm:ss";
  return dayjs.duration(milliseconds, "milliseconds").format(format);
};

/**
 * 将毫秒转换为秒
 * @param milliseconds - 毫秒数
 * @param decimalPlaces - 保留小数位数，默认为 2
 * @returns 转换后的秒数
 */
export const msToS = (milliseconds: number, decimalPlaces: number = 2): number => {
  return Number((milliseconds / 1000).toFixed(decimalPlaces));
};

/**
 * 格式化时间戳，同年省略年份
 * @param timestamp 时间戳（毫秒），为空或 0 时返回空字符串
 * @param format 时间格式，默认 "YYYY-MM-DD"
 * @param keepSameYear 是否保留同年年份，默认为 false（即同年省略年份）
 */
export const formatTimestamp = (
  timestamp: number | undefined,
  format: string = "YYYY-MM-DD",
  keepSameYear: boolean = false,
): string => {
  if (!timestamp) return "";
  const date = dayjs(timestamp);
  const shouldOmitYear = !keepSameYear && date.year() === dayjs().year();
  return date.format(shouldOmitYear ? format.replace("YYYY-", "") : format);
};

/**
 * 格式化评论时间戳
 * @param timestamp 评论时间戳（毫秒）
 * @returns 格式化后的字符串
 */
export const formatCommentTime = (timestamp: number): string => {
  const timeNow = dayjs();
  const timeComment = dayjs(timestamp);
  const diffMinute = timeNow.diff(timeComment, "minute");

  if (diffMinute < 1) return "刚刚发布";
  if (diffMinute < 60) return `${diffMinute} 分钟前`;
  if (diffMinute < 1440) return `${Math.floor(diffMinute / 60)} 小时前`;

  // 超过一天：同年只显示日期，跨年显示完整日期
  const format = timeComment.year() === timeNow.year() ? "MM-DD HH:mm" : "YYYY-MM-DD HH:mm";
  return timeComment.format(format);
};

/**
 * 计算进度条百分比
 * @param currentTime 当前时间
 * @param duration 总时长
 * @returns 进度百分比，精确到 0.01，范围 0-100
 */
export const calculateProgress = (currentTime: number, duration: number): number => {
  if (duration === 0) return 0;
  const progress = (currentTime / duration) * 100;
  return Math.min(Math.round(progress * 100) / 100, 100);
};

/** 获取当前时间段的问候语 */
export const getGreeting = (): string => {
  const hour = dayjs().hour();
  const greetings: [number, string][] = [
    [6, "凌晨好"],
    [9, "早上好"],
    [12, "上午好"],
    [14, "中午好"],
    [17, "下午好"],
    [19, "傍晚好"],
    [22, "晚上好"],
    [24, "夜深了"],
  ];
  return greetings.find(([limit]) => hour < limit)?.[1] ?? "夜深了";
};

/** 判断时间戳是否在当天6点之前 */
export const isBeforeSixAM = (timestamp: number): boolean => {
  const sixAM = dayjs().startOf("day").add(6, "hour");
  return dayjs(timestamp).isBefore(sixAM);
};

/** ISO 8601 字符串转本地时间格式 */
export const convertToLocalTime = (isoString: string): string => {
  return dayjs(isoString).format("YYYY-MM-DD HH:mm:ss");
};

/** 秒转为 mm:ss 格式（补零） */
export const convertSecondsToTime = (seconds: number): string => {
  return dayjs.duration(seconds, "seconds").format("mm:ss");
};
