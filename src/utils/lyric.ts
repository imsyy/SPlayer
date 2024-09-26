import { LyricLine, parseLrc, parseYrc } from "@applemusic-like-lyrics/lyric";
import { keywords } from "@/assets/data/exclude";
import type { LyricType } from "@/types/main";
import { useMusicStore } from "@/stores";
import { msToS } from "./time";

// 恢复默认
export const resetSongLyric = () => {
  const musicStore = useMusicStore();
  musicStore.songLyric = {
    lrcData: [],
    lrcAMData: [],
    yrcData: [],
    yrcAMData: [],
  };
};

// 解析歌词数据
export const parsedLyricsData = (lyricData: any) => {
  const musicStore = useMusicStore();
  if (lyricData.code !== 200) {
    resetSongLyric();
    return;
  }
  let lrcData: LyricType[] = [];
  let yrcData: LyricType[] = [];
  // 处理后歌词
  let lrcParseData: LyricLine[] = [];
  let tlyricParseData: LyricLine[] = [];
  let romalrcParseData: LyricLine[] = [];
  let yrcParseData: LyricLine[] = [];
  let ytlrcParseData: LyricLine[] = [];
  let yromalrcParseData: LyricLine[] = [];
  // 普通歌词
  if (lyricData?.lrc?.lyric) {
    lrcParseData = parseLrc(lyricData.lrc.lyric);
    lrcData = parseLrcData(lrcParseData);
    // 其他翻译
    if (lyricData?.tlyric?.lyric) {
      tlyricParseData = parseLrc(lyricData.tlyric.lyric);
      lrcData = alignLyrics(lrcData, parseLrcData(tlyricParseData), "tran");
    }
    if (lyricData?.romalrc?.lyric) {
      romalrcParseData = parseLrc(lyricData.romalrc.lyric);
      lrcData = alignLyrics(lrcData, parseLrcData(romalrcParseData), "roma");
    }
  }
  // 逐字歌词
  if (lyricData?.yrc?.lyric) {
    yrcParseData = parseYrc(lyricData.yrc.lyric);
    yrcData = parseYrcData(yrcParseData);
    // 其他翻译
    if (lyricData?.ytlrc?.lyric) {
      ytlrcParseData = parseLrc(lyricData.ytlrc.lyric);
      yrcData = alignLyrics(yrcData, parseLrcData(ytlrcParseData), "tran");
    }
    if (lyricData?.yromalrc?.lyric) {
      yromalrcParseData = parseLrc(lyricData.yromalrc.lyric);
      yrcData = alignLyrics(yrcData, parseLrcData(yromalrcParseData), "roma");
    }
  }
  musicStore.songLyric = {
    lrcData,
    yrcData,
    lrcAMData: parseAMData(lrcParseData, tlyricParseData, romalrcParseData),
    yrcAMData: parseAMData(yrcParseData, ytlrcParseData, yromalrcParseData),
  };
};

// 解析普通歌词
export const parseLrcData = (lrcData: LyricLine[]): LyricType[] => {
  if (!lrcData) return [];
  // 数据处理
  const lrcList = lrcData
    .map((line) => {
      const words = line.words;
      const time = msToS(words[0].startTime);
      const content = words[0].word.trim();
      // 排除内容
      if (!content || keywords.some((keyword) => content.includes(keyword))) {
        return null;
      }
      return {
        time,
        content,
      };
    })
    .filter((line): line is LyricType => line !== null);
  // 筛选出非空数据并返回
  return lrcList;
};

// 解析逐字歌词
export const parseYrcData = (yrcData: LyricLine[]): LyricType[] => {
  if (!yrcData) return [];
  // 数据处理
  const yrcList = yrcData
    .map((line) => {
      const words = line.words;
      const time = msToS(words[0].startTime);
      const endTime = msToS(words[words.length - 1].endTime);
      const contents = words.map((word) => {
        return {
          time: msToS(word.startTime),
          endTime: msToS(word.endTime),
          duration: msToS(word.endTime - word.startTime),
          content: word.word.trim(),
          endsWithSpace: word.word.endsWith(" "),
        };
      });
      // 完整歌词
      const contentStr = contents
        .map((word) => word.content + (word.endsWithSpace ? " " : ""))
        .join("");
      // 排除内容
      if (!contentStr || keywords.some((keyword) => contentStr.includes(keyword))) {
        return null;
      }
      return {
        time,
        endTime,
        content: contentStr,
        contents,
      };
    })
    .filter((line): line is LyricType => line !== null);
  return yrcList;
};

// 歌词内容对齐
export const alignLyrics = (
  lyrics: LyricType[],
  otherLyrics: LyricType[],
  key: "tran" | "roma",
): LyricType[] => {
  const lyricsData = lyrics;
  if (lyricsData.length && otherLyrics.length) {
    lyricsData.forEach((v: LyricType) => {
      otherLyrics.forEach((x: LyricType) => {
        if (v.time === x.time || Math.abs(v.time - x.time) < 0.6) {
          v[key] = x.content;
        }
      });
    });
  }
  return lyricsData;
};

// 处理本地歌词
export const parseLocalLyric = (lyric: string) => {
  if (!lyric) {
    resetSongLyric();
    return;
  }
  const musicStore = useMusicStore();
  // 解析
  const lrc: LyricLine[] = parseLrc(lyric);
  const lrcData: LyricType[] = parseLrcData(lrc);
  // 处理结果
  const lrcDataParsed: LyricType[] = [];
  // 翻译提取
  for (let i = 0; i < lrcData.length; i++) {
    // 当前歌词
    const lrcItem = lrcData[i];
    // 是否具有翻译
    const existingObj = lrcDataParsed.find((v) => v.time === lrcItem.time);
    if (existingObj) {
      existingObj.tran = lrcItem.content;
    } else {
      lrcDataParsed.push(lrcItem);
    }
  }
  // 更新歌词
  musicStore.songLyric = {
    lrcData: lrcDataParsed,
    lrcAMData: lrcDataParsed.map((line, index, lines) => ({
      words: [{ startTime: line.time, endTime: 0, word: line.content }],
      startTime: line.time * 1000,
      endTime: lines[index + 1]?.time * 1000,
      translatedLyric: line.tran ?? "",
      romanLyric: line.roma ?? "",
      isBG: false,
      isDuet: false,
    })),
    yrcData: [],
    yrcAMData: [],
  };
};

// 处理 AM 歌词
const parseAMData = (lrcData: LyricLine[], tranData?: LyricLine[], romaData?: LyricLine[]) => {
  return lrcData.map((line, index, lines) => ({
    words: line.words,
    startTime: line.words[0]?.startTime ?? 0,
    endTime:
      lines[index + 1]?.words?.[0]?.startTime ??
      line.words?.[line.words.length - 1]?.endTime ??
      Infinity,
    translatedLyric: tranData?.[index]?.words?.[0]?.word ?? "",
    romanLyric: romaData?.[index]?.words?.[0]?.word ?? "",
    isBG: line.isBG ?? false,
    isDuet: line.isDuet ?? false,
  }));
};
