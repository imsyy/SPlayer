import type { SongLyric } from "@/types/lyric";
import type { LyricLine } from "@applemusic-like-lyrics/lyric";
import { cloneDeep } from "lodash-es";

const replaceMaskedProfanity = (text: string) => {
  if (!text) return text;
  return text
    .replace(/f\*{2}k/gi, "fuck")
    .replace(/s\*{2}t/gi, "shit")
    .replace(/c\*{2}t/gi, "cunt")
    .replace(/c\*{2}k/gi, "cock")
    .replace(/co\*{2}/gi, "cock")
    .replace(/s\*{2}ker/gi, "sucker")
    .replace(/\*{4}ing/gi, "fucking")
    .replace(/b\*{3}h/gi, "bitch")
    .replace(/d\*{2}k/gi, "dick")
    .replace(/d\*{2}n/gi, "damn")
    .replace(/\*{4}er/gi, "fucker")
    .replace(/as\*{2}le/gi, "asshole")
    .replace(/w\*{3}e/gi, "whore")
    .replace(/n\*{3}a/gi, "nigga");
};

const processLine = (line: LyricLine) => {
  if (line.words) {
    line.words.forEach((w) => {
      w.word = replaceMaskedProfanity(w.word);
      if (w.romanWord) w.romanWord = replaceMaskedProfanity(w.romanWord);
    });
  }
  if (line.translatedLyric) line.translatedLyric = replaceMaskedProfanity(line.translatedLyric);
  if (line.romanLyric) line.romanLyric = replaceMaskedProfanity(line.romanLyric);
};

export const applyProfanityUncensor = (lyricData: SongLyric, uncensor: boolean): SongLyric => {
  if (!uncensor) return lyricData;

  const newLyricData = cloneDeep(lyricData);
  newLyricData.lrcData?.forEach(processLine);
  newLyricData.yrcData?.forEach(processLine);
  return newLyricData;
};
