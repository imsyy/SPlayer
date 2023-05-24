import { settingStore } from "@/store";

/**
 * 翻译文本数据
 */
const languageData = {
  "zh-CN": {
    million: "万",
    billion: "亿",
    year: "年",
    month: "月",
    day: "日",
    just: "刚刚发布",
    minutesAgo: "分钟前",
    yesterday: "昨天",
    lightMode: "已切换至浅色模式",
    darkMode: "已切换至深色模式",
    personalFmError: "获取私人 FM 失败",
    fmTrashError: "歌曲移除至垃圾桶失败",
    needLogin: "请登录账号后使用",
    loveSong: "已添加到我喜欢的音乐",
    loveSongError: "喜欢音乐时发生错误",
    loveSongRepeat: "我喜欢的音乐中已存在该歌曲",
    loveSongRemove: "已从我喜欢的音乐中移除",
    loveSongRemoveError: "取消喜欢音乐时发生错误",
    loveSongNoFound: "我喜欢的列表中未找到该歌曲",
    getDataError: "数据获取失败，请刷新后重试",
    getDaraEmpty: "数据为空",
    getLrcError: "歌词处理出错",
    random: "随机播放",
    single: "单曲循环",
    normal: "列表循环",
    playError: "播放出错，请刷新后重试",
    addSongToNext: "已添加至下一曲播放",
    removeSong: "已从播放列表中移除",
    songLoadError: "音乐数据获取失败",
    songPlayError: "歌曲播放失败",
    songLoadTest: "歌曲重试次数过多，请刷新后重试",
  },
  en: {
    million: "M",
    billion: "B",
    year: "-",
    month: "-",
    day: "",
    just: "Just released",
    minutesAgo: "Minutes ago",
    yesterday: "Yesterday",
    lightMode: "Switched to light mode",
    darkMode: "Switched to dark mode",
    personalFmError: "Get Private FM Failed",
    fmTrashError: "Song removal to trash failed",
    needLogin: "Please login to your account to use",
    loveSong: "Added to my favorite music",
    loveSongError: "An error occurred while liking music",
    loveSongRepeat: "The song already exists in my favorite music",
    loveSongRemove: "Removed from my favorite music",
    loveSongError: "An error occurred while unliking music",
    loveSongNoFound: "The song was not found in my favorite list",
    getDataError: "Data acquisition failed, please refresh and try again",
    getDaraEmpty: "Data is empty",
    getLrcError: "Lyrics processing error",
    random: "Random play",
    single: "Single loop",
    normal: "list loop",
    playError: "Playback error, please refresh and try again",
    addSongToNext: "has been added to the next song to play",
    removeSong: "has been removed from the playlist",
  },
};

/**
 * 返回翻译文本
 * @param {String} type 文本类别
 * @returns {Object} 对应语种文本
 */
const getLanguageData = (type) => {
  try {
    const setting = settingStore();
    const language = setting.language;
    return languageData[language][type];
  } catch (err) {
    console.log("Failed to get translated:" + err);
    return null;
  }
};

export default getLanguageData;
