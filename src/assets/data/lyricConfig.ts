import type { LyricConfig } from "../../types/desktop-lyric";

const config: LyricConfig = {
  isLock: false,
  playedColor: "#fe7971",
  unplayedColor: "#ccc",
  shadowColor: "rgba(0, 0, 0, 0.5)",
  fontFamily: "system-ui",
  fontSize: 24,
  fontWeight: 400,
  showTran: true,
  showYrc: true,
  isDoubleLine: true,
  position: "both",
  limitBounds: false,
  textBackgroundMask: false,
  backgroundMaskColor: "rgba(0, 0, 0, 0.5)",
  alwaysShowPlayInfo: false,
  animation: true,
};

export default config;
