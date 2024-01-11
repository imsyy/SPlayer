/* eslint-disable no-unused-vars */
/**
 * 将歌词接口数据解析出对应数据
 * @param {string} data 接口数据
 * @returns {Array} 对应数据
 */
export const parseLyric = (data) => {
  try {
    // 判断是否具有内容
    const checkLyric = (lyric) => (lyric ? (lyric.lyric ? true : false) : false);
    // 初始化数据
    const { lrc, tlyric, romalrc, yrc, ytlrc, yromalrc } = data;
    const lrcData = {
      lrc: lrc?.lyric || null,
      tlyric: tlyric?.lyric || null,
      romalrc: romalrc?.lyric || null,
      yrc: yrc?.lyric || null,
      ytlrc: ytlrc?.lyric || null,
      yromalrc: yromalrc?.lyric || null,
    };
    // 初始化输出结果
    const result = {
      // 是否具有普通翻译
      hasLrcTran: checkLyric(tlyric),
      // 是否具有普通音译
      hasLrcRoma: checkLyric(romalrc),
      // 是否具有逐字歌词
      hasYrc: checkLyric(yrc),
      // 是否具有逐字翻译
      hasYrcTran: checkLyric(ytlrc),
      // 是否具有逐字音译
      hasYrcRoma: checkLyric(yromalrc),
      // 普通歌词数组
      lrc: [],
      // 逐字歌词数据
      yrc: [],
    };
    // 普通歌词
    if (lrcData.lrc) {
      result.lrc = parseLrc(lrcData.lrc);
      //判断是否有其他翻译
      result.lrc = lrcData.tlyric
        ? parseOtherLrc(result.lrc, parseLrc(lrcData.tlyric), "tran")
        : result.lrc;
      result.lrc = lrcData.romalrc
        ? parseOtherLrc(result.lrc, parseLrc(lrcData.romalrc), "roma")
        : result.lrc;
    }
    // 逐字歌词
    if (lrcData.yrc) {
      result.yrc = parseYrc(lrcData.yrc);
      //判断是否有其他翻译
      result.yrc = lrcData.ytlrc
        ? parseOtherLrc(result.yrc, parseLrc(lrcData.ytlrc), "tran")
        : result.yrc;
      result.yrc = lrcData.yromalrc
        ? parseOtherLrc(result.yrc, parseLrc(lrcData.yromalrc, false), "roma")
        : result.yrc;
    }
    console.log(result);
    return result;
  } catch (error) {
    console.error("解析歌词时出现错误：", error);
    return false;
  }
};

/**
 * 解析本地歌词数据
 * @param {string} data - 歌词字符串
 * @returns {Object} - 包含解析后的歌词信息的对象
 */
export const parseLocalLrc = (data) => {
  try {
    const lyric = parseLrc(data);
    const parsedLyrics = [];
    // 初始化输出结果
    const result = {
      hasLrcTran: false,
      hasLrcRoma: false,
      hasYrc: false,
      hasYrcTran: false,
      hasYrcRoma: false,
      lrc: [],
      yrc: [],
    };
    // 遍历本地歌词数据
    for (let i = 0; i < lyric.length; i++) {
      // 当前歌词
      let currentObj = lyric[i];
      // 是否有相同时间
      let existingObj = parsedLyrics.find((v) => Number(v.time) === Number(currentObj.time));
      // 如果存在翻译
      if (existingObj) {
        result.hasLrcTran = true;
        existingObj.tran = currentObj.content;
      }
      // 若不存在翻译
      else {
        parsedLyrics.push({
          time: currentObj.time,
          content: currentObj.content,
        });
      }
    }
    // 改变输出结果
    result.lrc = parsedLyrics;
    console.log(result);
    return result;
  } catch (error) {
    console.error("解析本地歌词时出现错误：", error);
    return false;
  }
};

/**
 * 翻译文本对齐
 * @param {string} lrc 歌词字符串
 * @param {string} tranLrc 翻译歌词字符串
 * @returns {Array} 包含翻译的歌词对象数组
 */
const parseOtherLrc = (lrc, tranLrc, name) => {
  const lyric = lrc;
  const tranLyric = tranLrc;
  if (lyric[0] && tranLyric[0]) {
    lyric.forEach((v) => {
      tranLyric.forEach((x) => {
        if (Number(v.time) === Number(x.time) || Math.abs(Number(v.time) - Number(x.time)) < 0.6) {
          v[name] = x.content;
        }
      });
    });
  }
  return lyric;
};

/**
 * 普通歌词解析
 * @param {string} lyrics 歌词字符串
 * @returns {Array} 歌词对象数组
 */
const parseLrc = (lyrics, isTrim = true) => {
  if (!lyrics) return [];
  try {
    // 匹配时间轴和歌词文本的正则表达式
    const regex = /^\[([^\]]+)\]\s*(.+?)\s*$/;
    // 匹配歌曲信息的正则表达式
    // const infoRegex = /\].*[:：-]/;
    // 将歌词字符串按行分割为数组
    const lines = lyrics.split("\n");
    // 对每一行进行转换
    const parsedLyrics = lines
      // 筛选出包含时间轴和歌词文本的行
      .filter((line) => regex.test(line))
      // 转换时间轴和歌词文本为对象
      .map((line) => {
        // 过滤掉包含信息的文本
        // if (infoRegex.test(line)) return null;
        // 继续解析
        const [, time, text] = line.match(regex);
        const parts = time.split(":");
        const seconds =
          Number(parts[0]) * 60 +
          Number(parts[1]) +
          (parts.length > 2 ? Number(parts[2]) / 1000 : 0);
        return { time: Number(seconds.toFixed(2)), content: isTrim ? text.trim() : text };
      })
      .filter((c) => c && c.content.trim() !== "");
    // 检查是否为纯音乐，是则返回空数组
    if (parsedLyrics.length && /纯音乐，请欣赏/.test(parsedLyrics[0].content)) {
      console.log("该歌曲为纯音乐");
      return [];
    }
    return parsedLyrics;
  } catch (err) {
    console.error("普通歌词处理出错：" + err);
    return [];
  }
};

/**
 * 逐字歌词解析
 * @param {string} lyrics 逐字歌词字符串
 * @returns {Array} 歌词对象数组
 */
const parseYrc = (lyrics) => {
  if (!lyrics) return [];
  try {
    // 遍历每一行逐字歌词
    const parsedLyrics = lyrics
      .split("\n")
      .map((line) => {
        // 匹配每一行中的时间戳信息
        const timeReg = /\[(\d+),(\d+)\]/;
        const timeMatch = line.match(timeReg);
        if (!timeMatch) {
          return null;
        }
        // 解构出起始时间和结束时间
        const [_, startTime, endTime] = timeMatch;
        if (isNaN(startTime) || isNaN(endTime)) {
          return null;
        }
        // 去除当前行中的时间戳信息，得到歌词内容
        const content = line.replace(timeReg, "");
        if (!content) {
          return null;
        }
        // 去除歌曲信息
        // const contentInfoReg = /\s*[^:：\n]*[:：]\s*.+/;
        // const contentFilter = content.replace(/\(\d+,\d+,\d+\)/g, "");
        // if (!contentFilter || contentInfoReg.test(contentFilter)) {
        //   return null;
        // }
        // 对歌词内容中的时间戳和歌词内容分离
        const contentArray = content
          .split(/(\([1-9]\d*,[1-9]\d*,\d*\)[^(]*)/g)
          .filter((c) => c.trim())
          .map((c) => {
            // 匹配当前片段中的时间戳信息
            const timeReg = /\((\d+),(\d+),(\d+)\)/;
            const timeMatch = c.match(timeReg);
            if (!timeMatch) {
              return null;
            }
            // 解构出时间戳，持续时间和歌词内容
            const [_, time, duration] = timeMatch;
            const contentReg = /\(\d+,\d+,\d+\)/g;
            const content = c.replace(timeReg, "").replace(contentReg, "");
            if (!content || !content.trim()) {
              return null;
            }
            return {
              time: Number(time) / 1000,
              duration: Number(duration) / 1000,
              content: content.trim(),
              endsWithSpace: content.endsWith(" "),
            };
          })
          .filter((c) => c);
        // 返回当前行解析出的时间信息和歌词内容信息
        return {
          time: Number(startTime) / 1000,
          endTime: Number(endTime) / 1000,
          content: contentArray,
        };
      })
      .filter((line) => line);
    return parsedLyrics;
  } catch (err) {
    console.error("逐字歌词处理出错：" + err);
    return [];
  }
};
