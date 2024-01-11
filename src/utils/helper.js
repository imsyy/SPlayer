// BlobUrl
let lastSongBlobUrl = null;
let lastCoverBlobUrl = null;
let lastDownloadBlobUrl = null;

/**
 * 判断当前运行环境
 */
export const checkPlatform = {
  electron: () => {
    return typeof electron !== "undefined";
  },
  macOS: () => {
    if (!checkPlatform.electron()) return false;
    return electron.process.platform === "darwin";
  },
  windows: () => {
    if (!checkPlatform.electron()) return false;
    return electron.process.platform === "win32";
  },
  linux: () => {
    if (!checkPlatform.electron()) return false;
    return electron.process.platform === "linux";
  },
};

/**
 * 获取缓存数据或请求数据并进行缓存
 * @param {string} key - 缓存数据的键名
 * @param {number} time - 缓存的有效时间，以分钟为单位
 * @param {Function} request - 请求数据的函数，应返回 Promise
 * @returns {Promise<any>} 缓存数据或请求的数据
 */
export const getCacheData = async (key, time, request, params) => {
  try {
    const storedData = sessionStorage.getItem(`${key}Data`);
    const storedTimestamp = sessionStorage.getItem(`${key}Timestamp`);
    if (storedData && storedTimestamp) {
      const currentTime = new Date().getTime();
      const storedTime = parseInt(storedTimestamp, 10);
      const elapsedTime = (currentTime - storedTime) / (1000 * 60);
      if (elapsedTime <= time) {
        console.log(`${key}Data` + " 触发缓存");
        return JSON.parse(storedData);
      }
    }
    const data = params ? await request(params) : await request();
    const currentTime = new Date().getTime();
    if (data !== undefined) {
      sessionStorage.setItem(`${key}Data`, JSON.stringify(data));
      sessionStorage.setItem(`${key}Timestamp`, currentTime.toString());
    }
    return data;
  } catch (error) {
    console.error("缓存操作出错：", error);
    throw error;
  }
};

/**
 * 获取本地音乐封面的 Blob URL
 * @param {string} path - 音乐文件的路径
 * @returns {Promise<string>} 返回封面的 Blob URL，如果没有封面数据则返回默认 URL
 */
export const getLocalCoverData = async (path, isAlbum = false) => {
  try {
    // 清理过期的 Blob 链接
    if (lastCoverBlobUrl) URL.revokeObjectURL(lastCoverBlobUrl);
    const coverData = await electron.ipcRenderer.invoke("getMusicCover", path);
    if (coverData) {
      // 将 Uint8Array 数据转换为 Blob
      const blob = new Blob([coverData.coverData], { type: `image/${coverData.coverFormat}` });
      // 生成Blob URL
      lastCoverBlobUrl = URL.createObjectURL(blob);
      return lastCoverBlobUrl;
    } else {
      // 如果没有封面数据
      return `/images/pic/${isAlbum ? "album" : "song"}.jpg?assest`;
    }
  } catch (error) {
    console.error("获取本地音乐封面出错：", error);
    throw error;
  }
};

/**
 * 内容复制
 */
export const copyData = async (data, info) => {
  try {
    const isElectron = checkPlatform.electron();
    // electron
    if (isElectron) {
      const result = await electron.ipcRenderer.invoke("copyData", data);
      result ? $message.success(`${info || "复制"}成功`) : $message.error(`${info || "复制"}失败`);
    }
    // 浏览器端
    else {
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(data);
          $message.success(`${info || "复制"}成功`);
        } catch (error) {
          console.error("复制出错：", error);
          $message.error("复制失败");
        }
      } else {
        // 如果浏览器不支持 navigator.clipboard
        const textArea = document.createElement("textarea");
        textArea.value = data;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          const successful = document.execCommand("copy");
          successful
            ? $message.success(`${info || "复制"}成功`)
            : $message.error(`${info || "复制"}失败`);
        } catch (err) {
          console.error("复制出错：", err);
          $message.error("复制失败");
        } finally {
          document.body.removeChild(textArea);
        }
      }
    }
  } catch (error) {
    console.error("复制出错：", error);
    $message.error("复制出现错误，请重试");
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
    return numString.endsWith(".0") ? numString.slice(0, -2) + " 万" : numString + " 万";
  } else {
    const numString = (n / 100000000).toFixed(1);
    return numString.endsWith(".0") ? numString.slice(0, -2) + " 亿" : numString + " 亿";
  }
};

/**
 * 将输入数组拆分成指定大小的块
 * @param {Array} input - 要拆分的数组
 * @param {number} size - 每个块的大小
 * @returns {Array} - 包含拆分块的数组
 */
export const chunk = (input, size) => {
  // 使用 reduce 方法迭代数组，arr 是累加器，item 是当前元素，idx 是当前元素的索引
  return input.reduce((arr, item, idx) => {
    // 如果当前索引是块大小的倍数，创建一个新块并将当前元素放入
    return idx % size === 0
      ? [...arr, [item]]
      : // 如果不是块的起始索引，将当前元素添加到最后一个块中
        [...arr.slice(0, -1), [...arr.slice(-1)[0], item]];
  }, []);
};

/**
 * 将字符串转换为小驼峰形式（Camel Case）
 * @param {string} str - 需要转换的字符串
 * @returns {string} - 转换后的小驼峰形式字符串
 */
export const toCamelCase = (str) => {
  // 使用正则表达式将字符串中每个单词的首字母大写
  return str.replace(/(\w)(\w*)/g, (_, firstChar, rest) => {
    // 对第一个单词的首字母进行小写转换
    return firstChar.toLowerCase() + rest.toLowerCase();
  });
};

/**
 * 获取 localStorage 的存储信息，包括总容量、剩余容量和百分比
 * @returns {{total: string, free: string, percentageFree: string}} 存储信息对象
 */
export const getLocalStorageInfo = () => {
  /** @type {number} 总容量为 5MB */
  const totalSpace = 5 * 1024 * 1024;
  /** @type {string} 用于测试的键名 */
  const testKey = "testData";
  /** @type {string} 用于测试的数据 */
  let testData = "";
  try {
    // 尝试存储大量数据
    for (let i = 0; i < 1024 * 1024; i++) {
      testData += "a";
    }
    // 存储数据
    localStorage.setItem(testKey, testData);
    // 获取存储后的数据大小
    const dataSize = localStorage.getItem(testKey).length;
    // 计算剩余容量
    const freeSpace = totalSpace - dataSize;
    // 计算剩余容量的百分比
    const percentageFree = (freeSpace / totalSpace) * 100;
    // 删除测试数据
    localStorage.removeItem(testKey);
    // 返回包含总容量、剩余容量和百分比的对象
    return {
      total: (totalSpace / (1024 * 1024)).toFixed(2),
      free: (freeSpace / (1024 * 1024)).toFixed(2),
      percentageFree: percentageFree.toFixed(2) + "%",
    };
  } catch (e) {
    // 可能出现 QuotaExceededError 异常
    return {
      total: (totalSpace / (1024 * 1024)).toFixed(2),
      free: 0,
      percentageFree: "0.00%",
    };
  }
};

/**
 * 模糊搜索
 * @param {string} keyword - 要搜索的关键词
 * @param {Array} array - 要搜索的对象数组
 * @returns {Array} - 包含关键词的对象数组
 */
/**
 * 模糊搜索工具函数（支持深度搜索）
 * @param {string} keyword - 要搜索的关键词
 * @param {Array|Object} data - 要搜索的数据，可以是对象或对象数组
 * @returns {Array} - 包含关键词的对象数组
 */
export const fuzzySearch = (keyword, data) => {
  try {
    /**
     * 递归函数：遍历对象及其嵌套属性，过滤包含关键词的对象
     * @param {Object} obj - 要检查的对象
     * @returns {boolean} - 如果找到匹配的属性值，返回 true；否则返回 false
     */
    const searchInObject = (obj) => {
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
          if (value && typeof value === "string" && value.includes(keyword)) {
            return true;
          }
        }
      }
      return false;
    };
    if (!data) return [];
    // 如果传入的是数组，遍历数组
    if (Array.isArray(data)) {
      return data.filter(searchInObject);
    }
    // 如果传入的是对象，直接调用递归函数
    return searchInObject(data);
  } catch (error) {
    console.error("模糊搜索出现错误：", error);
    return [];
  }
};

/**
 * 从文件名生成数字 ID
 * @param {string} fileName - 文件名
 * @returns {number} - 生成的数字ID
 */
export const generateId = (fileName) => {
  if (!fileName) return 1000000000;
  // 将文件名转换为哈希值
  let hash = 0;
  for (let i = 0; i < fileName.length; i++) {
    hash = (hash << 5) - hash + fileName.charCodeAt(i);
  }
  // 将哈希值转换为正整数
  const numericId = Math.abs(hash % 10000000000);
  return numericId;
};

/**
 * 下载文件
 * @param {Object} data - 下载信息
 * @param {String} songName - 歌曲名称
 * @returns {number} - 生成的数字ID
 */
export const downloadFile = async (data, song, lyric, options) => {
  try {
    const isElectron = checkPlatform.electron();
    const songType = data.type.toLowerCase();
    // 歌曲名称
    const songName =
      song.name +
      "-" +
      (Array.isArray(song.artists)
        ? song.artists.map((ar) => ar.name).join("&")
        : song.artists || "未知歌手");
    if (isElectron && options.path) {
      console.log("开始下载：", data, song, songName, songType, options.path);
      return await electron.ipcRenderer.invoke(
        "downloadFile",
        JSON.stringify({
          url: data?.url,
          data: song,
          lyric: lyric,
          name: songName,
          type: songType,
        }),
        JSON.stringify(options),
      );
    } else {
      // 清理过期的 Blob 链接
      if (lastDownloadBlobUrl) URL.revokeObjectURL(lastDownloadBlobUrl);
      const songRes = await fetch(data?.url.replace(/^http:/, "https:"));
      if (!songRes.ok) throw new Error("下载出错，请重试");
      const blob = await songRes.blob();
      lastDownloadBlobUrl = URL.createObjectURL(blob);
      // 下载数据
      const a = document.createElement("a");
      a.href = lastDownloadBlobUrl;
      a.download = `${songName}.${songType}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    }
  } catch (error) {
    console.error("下载出错：", error);
    return false;
  }
};

/**
 * 将字节数格式化为可读的大小字符串。
 * @param {number} bytes - 要格式化的字节数
 * @param {number} [decimals=2] - 小数点位数
 * @returns {string} - 格式化后的大小字符串（"10 KB"）
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return "0 K";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["K", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

/**
 * 获取音频文件的 Blob 链接
 * @param {string} url - 音频文件的网络链接
 */
export const getBlobUrlFromUrl = async (url) => {
  try {
    // 清理过期的 Blob 链接
    if (lastSongBlobUrl) URL.revokeObjectURL(lastSongBlobUrl);
    // 是否为网络链接
    if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("blob:")) {
      return url;
    }
    // 获取音频文件数据
    const response = await fetch(url);
    // 检查请求是否成功
    if (!response.ok) {
      throw new Error("获取音频资源失败：", response.statusText);
    }
    const blob = await response.blob();
    // 转换为本地 Blob 链接
    lastSongBlobUrl = URL.createObjectURL(blob);
    return lastSongBlobUrl;
  } catch (error) {
    console.error("获取 Blob 链接遇到错误：" + error);
    throw error;
  }
};
