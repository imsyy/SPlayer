import { LyricLine } from "@applemusic-like-lyrics/lyric";

/**
 * 计算歌词索引
 * @param currentTime 当前播放时间 (ms)
 * @param lyrics 原始歌词数组
 * @param offset 偏移量
 * @param maxKeep 最大保留行数 (用于多行同时激活)
 * @returns 歌词索引
 */
export const calculateLyricIndex = (
  currentTime: number,
  lyrics: LyricLine[],
  offset: number = 0,
  maxKeep: number = 3,
): number => {
  // 边界检查
  if (!lyrics || !lyrics.length) return -1;
  // 预处理时间
  const playSeek = currentTime + offset + 300;
  const getStart = (v: LyricLine) => v.startTime || 0;
  // 直接返回最后一句
  const lastLine = lyrics[lyrics.length - 1];
  if (playSeek >= (lastLine.endTime ?? Infinity)) {
    return lyrics.length - 1;
  }
  // 普通歌词
  const isLrc = !lyrics[0].endTime;
  if (isLrc) {
    const idx = lyrics.findIndex((v) => getStart(v) >= playSeek);
    return idx === -1 ? lyrics.length - 1 : idx - 1;
  }
  // 逐字歌词
  if (playSeek < getStart(lyrics[0])) return -1;
  const activeCandidates: number[] = [];
  // 使用二分查找找到第一个开始时间大于 playSeek 的行
  // 那么它的前一个可能就是当前行的候选
  let low = 0;
  let high = lyrics.length - 1;
  let firstAfterIndex = lyrics.length;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (getStart(lyrics[mid]) > playSeek) {
      firstAfterIndex = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  // 从找到的位置向前回溯，找到所有包含当前时间的行 (处理重叠情况)
  // 向前回溯直到 endTime < playSeek 或者到达数组头部
  // 通常重叠不会太严重，回溯几行即可
  for (let i = firstAfterIndex - 1; i >= 0; i--) {
    const line = lyrics[i];
    const end = line.endTime ?? Infinity;
    // 如果该行的结束时间已经在播放时间之前，且不是因为 Infinity
    // 只要 startTime <= playSeek 且 endTime > playSeek，就是候选
    if (playSeek >= getStart(line) && playSeek < end) {
      activeCandidates.push(i); // 倒序加入
    }
  }
  // 恢复顺序 (因为是倒序 push 的)
  activeCandidates.reverse();
  // 不在任何区间 -> 找最近的上一句 (Gap)
  if (activeCandidates.length === 0) {
    return firstAfterIndex - 1;
  }
  // 多句激活处理
  if (activeCandidates.length === 1) return activeCandidates[0];
  const keepCount = activeCandidates.length >= maxKeep ? maxKeep : 2;
  const concurrent = activeCandidates.slice(-keepCount);
  return concurrent[0];
};
