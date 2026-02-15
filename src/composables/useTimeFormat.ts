import { useSettingStore, useStatusStore } from "@/stores";
import { msToTime } from "@/utils/time";

/**
 * 歌曲播放时间显示类型
 * - current: 显示当前播放时间
 * - total: 显示总时长
 * - remaining: 显示剩余时间（负值）
 */
export type TimeDisplayType = "current" | "total" | "remaining";

/**
 * 歌曲播放时间显示格式
 * - current-total: 播放时间 / 总时长
 * - remaining-total: 剩余时间 / 总时长
 * - current-remaining: 播放时间 / 剩余时间
 */
export type TimeFormat = "current-total" | "remaining-total" | "current-remaining";

// 歌曲播放时间显示格式所对应的两个时间的显示类型
const timeFormatConfig: Record<TimeFormat, [TimeDisplayType, TimeDisplayType]> = {
  "current-total": ["current", "total"],
  "remaining-total": ["remaining", "total"],
  "current-remaining": ["current", "remaining"],
};

// 所有的歌曲播放时间显示格式
const timeFormats = Object.keys(timeFormatConfig) as TimeFormat[];

/**
 * 获取歌曲播放时间显示格式
 */
export const useTimeFormat = () => {
  const statusStore = useStatusStore();
  const settingStore = useSettingStore();

  /**
   * 获取时间显示字符串
   * @param index 值在 timeFormatConfig 的数组中的 index
   * @returns 时间显示字符串的计算属性
   */
  const useTimeDisplay = (index: 0 | 1) =>
    computed(() => {
      const display = timeFormatConfig[settingStore.timeFormat][index];
      switch (display) {
        case "current":
          return msToTime(statusStore.currentTime);
        case "total":
          return msToTime(statusStore.duration);
        case "remaining":
          return "-" + msToTime(statusStore.duration - statusStore.currentTime);
      }
    });

  /**
   * 切换时间格式
   */
  const toggleTimeFormat = () => {
    const currentIndex = timeFormats.indexOf(settingStore.timeFormat);
    settingStore.timeFormat = timeFormats[(currentIndex + 1) % timeFormats.length];
  };

  return {
    timeDisplay: [useTimeDisplay(0), useTimeDisplay(1)] as const,
    toggleTimeFormat,
  };
};
