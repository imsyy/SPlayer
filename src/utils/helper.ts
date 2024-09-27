import type { SongType, UpdateLogType } from "@/types/main";
import { NTooltip, SelectOption } from "naive-ui";
import { h, VNode } from "vue";
import { useClipboard } from "@vueuse/core";
import { getCacheData } from "./cache";
import { updateLog } from "@/api/other";
import { isEmpty } from "lodash-es";
import { convertToLocalTime } from "./time";
import { useSettingStore } from "@/stores";
import { marked } from "marked";
import SvgIcon from "@/components/Global/SvgIcon.vue";

type AnyObject = { [key: string]: any };

// 必要数据
let imageBlobURL: string = "";

// 环境判断
export const isDev = import.meta.env.MODE === "development" || import.meta.env.DEV;

// 系统判断
const userAgent = window.navigator.userAgent;
export const isWin = userAgent.includes("Windows");
export const isMac = userAgent.includes("Macintosh");
export const isLinux = userAgent.includes("Linux");
export const isElectron = userAgent.includes("Electron");

// 链接跳转
export const openLink = (url: string, target: "_self" | "_blank" = "_blank") => {
  window.open(url, target);
};

// 图标渲染
export const renderIcon = (
  iconName: string,
  option: {
    size?: number;
    style?: AnyObject;
  } = {},
) => {
  const { size, style } = option;
  return () => {
    return h(SvgIcon, { name: iconName, size, style });
  };
};

/**
 * 延时函数
 * @param ms 延时时间（毫秒）
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// 选项渲染
export const renderOption = ({ node, option }: { node: VNode; option: SelectOption }) =>
  h(
    NTooltip,
    { placement: "left" },
    {
      trigger: () => node,
      default: () => option.label,
    },
  );

// 模糊搜索
export const fuzzySearch = (keyword: string, data: SongType[]): SongType[] => {
  try {
    const result: SongType[] = [];
    const regex = new RegExp(keyword, "i");

    /**
     * 递归函数：遍历对象及其嵌套属性，过滤包含关键词的对象
     * @param {Object} obj - 要检查的对象
     * @returns {boolean} - 如果找到匹配的属性值，返回 true；否则返回 false
     */
    const searchInObject = (obj: AnyObject): boolean => {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          // 如果属性值是对象，则递归调用
          if (typeof value === "object" && value !== null) {
            if (searchInObject(value)) {
              return true;
            }
          }
          // 检查属性值是否是字符串并包含关键词
          if (value && typeof value === "string" && regex.test(value)) {
            return true;
          }
        }
      }
      return false;
    };

    if (!data) return [];

    // 如果传入的是数组，遍历数组
    if (Array.isArray(data)) {
      for (const item of data) {
        if (searchInObject(item)) {
          result.push(item);
        }
      }
    } else {
      // 如果传入的是对象，直接调用递归函数
      if (searchInObject(data)) {
        result.push(data);
      }
    }

    return result;
  } catch (error) {
    console.error("模糊搜索出现错误：", error);
    return [];
  }
};

/**
 * 将 32 位 ARGB 颜色值转换为 24 位 RGB 颜色值
 *
 * @param {number} x - 32位ARGB颜色值
 * @returns {number[]} - 包含红色、绿色和蓝色分量的24位RGB颜色值数组（0-255）
 */
export const argbToRgb = (x: number): number[] => {
  // 提取红色、绿色和蓝色分量
  const r = (x >> 16) & 0xff;
  const g = (x >> 8) & 0xff;
  const b = x & 0xff;
  // 返回24位RGB颜色值数组
  return [r, g, b];
};

// 封面加载完成
export const coverLoaded = (e: Event) => {
  const target = e.target as HTMLElement | null;
  if (target && target.nodeType === Node.ELEMENT_NODE) {
    target.style.opacity = "1";
  }
};

// 数字处理
export const formatNumber = (num: number): string => {
  if (num < 10000) {
    return num.toString();
  } else if (num < 100000000) {
    return `${(num / 10000).toFixed(1)}万`;
  } else {
    return `${(num / 100000000).toFixed(1)}亿`;
  }
};

// 文件大小处理
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  } else {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }
};

// 将图片链接转为 BlobUrl
export const convertImageUrlToBlobUrl = async (imageUrl: string) => {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  // 将响应数据转换为 Blob 对象
  const blob = await response.blob();
  // 撤销之前生成的对象 URL
  if (imageBlobURL) URL.revokeObjectURL(imageBlobURL);
  // 生成对象 URL
  imageBlobURL = URL.createObjectURL(blob);
  return imageBlobURL;
};

// 复制文本
export const copyData = async (text: any, message?: string) => {
  const { copy, copied, isSupported } = useClipboard({ legacy: true });
  if (!isSupported.value) {
    window.$message.error("暂时无法使用复制功能");
    return;
  }
  // 开始复制
  try {
    if (!text) return;
    text = typeof text === "string" ? text.trim() : JSON.stringify(text, null, 2);
    await copy(text);
    if (copied.value) {
      window.$message.success(message ?? "已复制到剪贴板");
    } else {
      window.$message.error("复制出错，请重试");
    }
  } catch (error) {
    window.$message.error("复制出错，请重试");
    console.error("复制出错：", error);
  }
};

// 获取剪贴板内容
export const getClipboardData = async (): Promise<string | null> => {
  try {
    const text = await navigator.clipboard.readText();
    return text;
  } catch (error) {
    console.error("Failed to read clipboard content:", error);
    return null;
  }
};

/**
 * 格式化为 Electron 快捷键
 * @param shortcut 快捷键
 * @returns Accelerator
 */
export const formatForGlobalShortcut = (shortcut: string): string => {
  return shortcut
    .split("+")
    .map((part) => {
      // 字母
      if (part.startsWith("Key")) {
        return part.replace("Key", "");
      }
      // 数字
      if (part.startsWith("Digit")) {
        return part.replace("Digit", "num");
      }
      if (part.startsWith("Numpad")) {
        return part.replace("Numpad", "num");
      }
      // 方向键
      if (part.startsWith("Arrow")) {
        return part.replace("Arrow", "");
      }
      return part;
    })
    .join("+");
};

// 获取更新日志
export const getUpdateLog = async (): Promise<UpdateLogType[]> => {
  const result = await getCacheData(updateLog, { key: "updateLog", time: 10 });
  if (!result || isEmpty(result)) return [];
  const updateLogs = await Promise.all(
    result.map(async (v: any) => ({
      version: v.tag_name,
      changelog: await marked(v.body),
      time: convertToLocalTime(v.published_at),
      url: v.html_url,
    })),
  );
  return updateLogs;
};

/**
 * 更改本地目录
 * @param delIndex 删除文件夹路径的索引
 */
export const changeLocalPath = async (delIndex?: number) => {
  try {
    if (!isElectron) return;
    const settingStore = useSettingStore();
    if (typeof delIndex === "number" && delIndex >= 0) {
      settingStore.localFilesPath.splice(delIndex, 1);
    } else {
      const selectedDir = await window.electron.ipcRenderer.invoke("choose-path");
      if (!selectedDir) return;
      // 检查是否为子文件夹
      const defaultMusicPath = await window.electron.ipcRenderer.invoke("get-default-dir", "music");
      const allPath = [defaultMusicPath, ...settingStore.localFilesPath];
      const isSubfolder = allPath.some((existingPath) => {
        return selectedDir.startsWith(existingPath);
      });
      if (!isSubfolder) {
        settingStore.localFilesPath.push(selectedDir);
      } else {
        window.$message.error("添加的目录与现有目录有重叠，请重新选择");
      }
    }
  } catch (error) {
    console.error("Error changing local path:", error);
    window.$message.error("更改本地歌曲文件夹出错，请重试");
  }
};
