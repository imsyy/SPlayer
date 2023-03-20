/**
 * 格式化歌词字符串为时间轴和歌词文本的数组
 * @param {string} lrc 歌词字符串
 * @returns {Array<{ time: number, lyric: string }>} 时间轴和歌词文本的数组
 */
const lyricFormat = (lrc) => {
  // 匹配时间轴和歌词文本的正则表达式
  const regex = /^\[(.*?)\]\s*(.+?)\s*$/;
  // 将歌词字符串按行分割为数组
  const lines = lrc.split("\n");
  // 对每一行进行转换
  const result = lines
    // 筛选出包含时间轴和歌词文本的行
    .filter((line) => regex.test(line))
    // 转换时间轴和歌词文本为对象
    .map((line) => {
      const [, time, text] = line.match(regex);
      const seconds = time
        .split(":")
        .reduce((acc, cur) => acc * 60 + parseFloat(cur), 0);
      return { time: seconds, lyric: text };
    });
  // 检查是否为纯音乐，是则返回空数组
  if (result.length && /纯音乐，请欣赏/.test(result[0].lyric)) {
    console.log("该歌曲为纯音乐");
    return [];
  }
  return result;
};

export default lyricFormat;
