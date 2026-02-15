import { useSettingStore } from "@/stores";

export interface LyricFontConfig {
  name: string;
  keySetting: "LyricFont" | "japaneseLyricFont" | "englishLyricFont" | "koreanLyricFont";
  default: string;
  tip: string;
}

export interface LyricLangFontConfig extends LyricFontConfig {
  keyCss: string;
}

export const lyricLangFontConfigs: LyricLangFontConfig[] = [
  {
    name: "英语歌词字体",
    keySetting: "englishLyricFont",
    keyCss: "--en-font-family",
    default: "follow",
    tip: "当歌词包含英语时使用的特定字体",
  },
  {
    name: "日语歌词字体",
    keySetting: "japaneseLyricFont",
    keyCss: "--ja-font-family",
    default: "follow",
    tip: "当歌词包含日语时使用的特定字体",
  },
  {
    name: "韩语歌词字体",
    keySetting: "koreanLyricFont",
    keyCss: "--ko-font-family",
    default: "follow",
    tip: "当歌词包含韩语时使用的特定字体",
  },
];

export const lyricFontConfigs: LyricFontConfig[] = [
  {
    name: "歌词区域字体",
    keySetting: "LyricFont",
    default: "follow",
    tip: "主歌词区域的基础字体",
  },
  ...lyricLangFontConfigs,
];

export const lyricLangFontStyle = (settingStore = useSettingStore()) => {
  return Object.fromEntries(
    lyricLangFontConfigs.map((c) => {
      const settingValue = settingStore[c.keySetting];
      return [c.keyCss, settingValue !== c.default ? settingValue : ""];
    }),
  );
};
