/**
 * 循环模式
 *
 * off: 不循环 | list: 列表循环 | one: 单曲循环
 */
export type RepeatModeType = "off" | "list" | "one";

/**
 * 随机模式
 *
 * off: 关闭 | on: 随机播放 | heartbeat: 心动模式
 */
export type ShuffleModeType = "off" | "on" | "heartbeat";

/**
 * 用于 "play-mode-change" 事件的负载结构
 */
export interface PlayModePayload {
  repeatMode: RepeatModeType;
  shuffleMode: ShuffleModeType;
}
