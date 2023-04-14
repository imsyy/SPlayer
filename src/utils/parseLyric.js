/**
 * 将接口数据解析出对应数据
 * @param {string} data 接口数据
 * @returns {Array} 对应数据
 */
const parseLyric = (data) => {
  // 初始化数据
  const { lrc, tlyric, romalrc, yrc, ytlrc } = data;
  const lyrics = lrc ? lrc.lyric : null;
  const otherLyrics = {
    tran: tlyric ? tlyric.lyric : null,
    roma: romalrc ? romalrc.lyric : null,
    yrc: yrc ? yrc.lyric : null,
    ytlrc: ytlrc ? ytlrc.lyric : null,
  };
  // 初始化输出结果
  let result = {
    lrc: [], // 歌词数组 {time:时间,content:歌词}
    yrc: [], // 逐字歌词数据
    // 是否具有翻译
    hasTran: tlyric ? (tlyric.lyric ? true : false) : false,
    // 是否具有音译
    hasRoma: romalrc ? (romalrc.lyric ? true : false) : false,
    // 是否具有逐字歌词
    hasYrc: yrc ? (yrc.lyric ? true : false) : false,
  };
  // 普通歌词数据
  let lrcData = Lrcsplit(lyrics);
  // 翻译歌词数据
  let tranLrcData = null;
  // 循环遍历 otherLyrics 参数对象
  for (let i in otherLyrics) {
    const element = otherLyrics[i];
    if (element !== null) {
      // 若存在逐字歌词
      if (i == "yrc" && otherLyrics[i] != null) {
        result[i] = parseYrc(otherLyrics[i]);
        continue;
      }
      // 若存在翻译
      if (i == "ytlrc" && element != null) {
        tranLrcData = Lrcsplit(element);
        for (let num in tranLrcData) {
          // 翻译文本对齐
          let objNum = result["yrc"].findIndex(
            (o) => o.time == tranLrcData[num].time
          );
          if (objNum != -1)
            result["yrc"][objNum]["tran"] = tranLrcData[num].content;
        }
      }
      // 若存在其他翻译
      tranLrcData = Lrcsplit(element);
      if (tranLrcData[0]) {
        console.log(`歌曲存在 ${i} 翻译`, tranLrcData);
        for (let num in tranLrcData) {
          // 翻译文本对齐
          let objNum = lrcData.findIndex(
            (o) => o.time == tranLrcData[num].time
          );
          if (objNum != -1) lrcData[objNum][i] = tranLrcData[num].content;
        }
      }
    }
  }
  // 将歌词按时间排序
  result.lrc = lrcData.sort((a, b) => {
    return a.t - b.t;
  });
  return result;
};

/**
 * 将歌词字符串解析为歌词对象数组
 * @param {string} lrc 歌词字符串
 * @returns {Array} 歌词对象数组
 */
const Lrcsplit = (lrc) => {
  const lyrics = lrc.split("\n");
  const lrcData = [];
  lyrics.forEach((lyric) => {
    lyric = lyric.replace(/(^\s*)|(\s*$)/g, "");
    const time = lyric.substring(lyric.indexOf("[") + 1, lyric.indexOf("]"));
    const timeArr = time.split(":");
    if (isNaN(parseInt(timeArr[0]))) {
      for (let i in lyrics) {
        if (i != "lrc" && i == timeArr[0].toLowerCase()) {
          lyrics[i] = timeArr[1];
        }
      }
    } else {
      const lyricArr = lyric.match(/\[(\d+:.+?)\]/g);
      let start = 0;
      for (let k in lyricArr) {
        start += lyricArr[k].length;
      }
      const content = lyric.substring(start);
      if (content == "") {
        return false;
      }
      lyricArr.forEach((t) => {
        let time = t.substring(1, t.length - 1);
        let second = time.split(":");
        if (
          (parseFloat(second[0]) * 60 + parseFloat(second[1])).toFixed(3) == 0
        ) {
          return;
        }
        lrcData.push({
          time: (parseFloat(second[0]) * 60 + parseFloat(second[1])).toFixed(3),
          content: content,
        });
      });
    }
  });
  return lrcData;
};

/**
 * 逐字歌词解析
 * @param {string} lyrics 歌词字符串
 * @returns {Array} 歌词对象数组
 */
const parseYrc = (lyrics) => {
  // 若无内容，则返回空数组
  if (lyrics == undefined) {
    return [];
  }
  let lines = lyrics.split("\n");
  let parsedLyrics = [];
  // 解析每一句
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 创建一个空对象，用于存放当前句的信息
    let parsedLine = {
      time: undefined, // 开始时间
      endTime: undefined, // 结束时间
      content: undefined, // 歌词内容
    };
    // 分离出时间信息，并转换为秒
    let timeInfo = line
      .substring(line.indexOf("[") + 1, line.indexOf("]"))
      .split(",");
    // 将开始时间转换为秒
    parsedLine.time = Number(timeInfo[0]) / 1000;
    // 将结束时间转换为秒
    parsedLine.endTime = Number(timeInfo[1]) / 1000;
    // 若时间信息不合法，将跳过该句
    if (isNaN(parsedLine.time) || isNaN(parsedLine.endTime)) {
      continue;
    }
    // 寻找歌词内容
    const lyricArr = line.match(/\[[1-9]\d*,[1-9]\d*]/g);
    if (!lyricArr) {
      continue;
    }
    // 去除时间信息，获取歌词内容
    let contentArray = [];
    // 分离成单个字或词，并解析时间信息
    let splitContent = line.split(/(\([1-9]\d*,[1-9]\d*,\d*\)[^\(]*)/g);
    for (let j = 0; j < splitContent.length; j++) {
      const splitc = splitContent[j];
      if (splitc == "") {
        continue;
      }
      // 创建一个对象，用于存放当前字或词的信息，并添加到当前句的歌词内容中
      let contentObj = {
        time: undefined, // 开始时间
        duration: undefined, // 持续时间
        content: "", // 字或词的文本内容
      };
      // 提取时间和文本信息，并转换为秒
      let time = splitc.match(/\([1-9]\d*,[1-9]\d*,\d*\)/);
      if (!time) {
        continue;
      }
      let timeArray = time[0].slice(1, -1).split(",");
      // 将开始时间转换为秒
      contentObj.time = Number(timeArray[0]) / 1000;
      // 将持续时间转换为秒
      contentObj.duration = Number(timeArray[1]) / 1000;
      // 获取字或词的文本内容
      contentObj.content = splitc.slice(time[0].length);
      contentArray.push(contentObj);
    }
    parsedLine.content = contentArray;
    parsedLyrics.push(parsedLine);
  }

  return parsedLyrics;
};

export default parseLyric;
