// src/types/ipc.d.ts

import { MacLyricLine } from "./lyric";

/**
 * IPC 通道 taskbar:update-lyrics 的载荷类型
 */
export interface UpdateLyricsPayload {
  lines?: MacLyricLine[];
}

/**
 * IPC 通道 taskbar:update-progress 的载荷类型
 */
export interface UpdateProgressPayload {
  currentTime?: number;
  offset?: number;
}

/**
 * IPC 通道 taskbar:update-state 的载荷类型
 */
export interface UpdateStatePayload {
  isPlaying?: boolean;
}
