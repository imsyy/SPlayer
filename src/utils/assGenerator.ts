import { type LyricLine } from "@applemusic-like-lyrics/lyric";

/**
 * 将毫秒转换为 ASS 时间格式 (H:MM:SS.cc)
 */
const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10); // ASS uses centiseconds (0-99)

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
};

/**
 * 生成 ASS 字幕内容
 * @param lines 歌词行数组
 * @param metadata 元数据（标题、艺术家等）
 * @param options 选项（是否包含翻译、罗马音）
 */
export const generateASS = (
  lines: LyricLine[],
  metadata: { title?: string; artist?: string } = {},
  options: {
    tlyric?: boolean;
    romalrc?: boolean;
  } = {},
): string => {
  const { title = "Unknown Title", artist = "Unknown Artist" } = metadata;
  const { tlyric = true, romalrc = false } = options;

  const header = `[Script Info]
Title: ${title} - ${artist}
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,60,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const escapeText = (str: string) => str.replace(/\r?\n/g, "\\N");

  const events = lines
    .map((line) => {
      // 忽略空行
      const text = line.words
        .map((w) => w.word)
        .join("")
        .trim();
      if (!text) return null;

      const startTime = formatTime(line.startTime);
      const endTime = formatTime(line.endTime);

      const dialogueParts: string[] = [escapeText(text)];

      // 处理翻译
      if (tlyric && line.translatedLyric) {
        dialogueParts.push(escapeText(line.translatedLyric));
      }

      // 处理音译
      if (romalrc && line.romanLyric) {
        dialogueParts.push(escapeText(line.romanLyric));
      }

      const dialogueText = dialogueParts.join("\\N");

      return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${dialogueText}`;
    })
    .filter(Boolean)
    .join("\n");

  return header + events;
};
