import type { AutomationPoint } from "@/core/audio-player/IPlaybackEngine";
import type { SongType } from "@/types/main";

/** 音频分析结果 */
export interface AudioAnalysis {
  /** 歌曲时长 */
  duration: number;
  /** 歌曲速度 */
  bpm?: number;
  /** 速度置信度 */
  bpm_confidence?: number;
  /** 淡入位置 */
  fade_in_pos: number;
  /** 淡出位置 */
  fade_out_pos: number;
  /** 第一拍位置 */
  first_beat_pos?: number;
  /** 音量 */
  loudness?: number;
  /** 下落位置 */
  drop_pos?: number;
  /** 版本 */
  version?: number;
  /** 分析窗口 */
  analyze_window?: number;
  /** 切入位置 */
  cut_in_pos?: number;
  /** 切出位置 */
  cut_out_pos?: number;
  /** 混合中心位置 */
  mix_center_pos?: number;
  /** 混合开始位置 */
  mix_start_pos?: number;
  /** 混合结束位置 */
  mix_end_pos?: number;
  /** 能量谱 */
  energy_profile?: number[];
  /** 人声进入位置 */
  vocal_in_pos?: number;
  /** 人声退出位置 */
  vocal_out_pos?: number;
  /** 人声最后进入位置 */
  vocal_last_in_pos?: number;
  /** 尾奏能量水平 */
  outro_energy_level?: number;
  /** 调性根音 */
  key_root?: number;
  /** 调性模式 */
  key_mode?: number;
  /** 调性置信度 */
  key_confidence?: number;
  /** 卡农调式 */
  camelot_key?: string;
}

/** 过渡建议 */
export interface TransitionProposal {
  /** 过渡时长 */
  duration: number;
  /** 当前曲目混合出位置 */
  current_track_mix_out: number;
  /** 下一曲目混合入位置 */
  next_track_mix_in: number;
  /** 混合类型 */
  mix_type: string;
  /** 过滤策略 */
  filter_strategy: string;
  /** 兼容性分数 */
  compatibility_score: number;
  /** 调性兼容 */
  key_compatible: boolean;
  /** 速度兼容 */
  bpm_compatible: boolean;
}

/** 高级过渡 */
export interface AdvancedTransition {
  /** 当前曲目开始时间 */
  start_time_current: number;
  /** 下一曲目开始时间 */
  start_time_next: number;
  /** 过渡时长 */
  duration: number;
  /** 半音变调 */
  pitch_shift_semitones: number;
  /** 播放速率 */
  playback_rate: number;
  /** 当前曲目自动化点 */
  automation_current: AutomationPoint[];
  /** 下一曲目自动化点 */
  automation_next: AutomationPoint[];
  /** 策略 */
  strategy: string;
}

export type AutomixState = "IDLE" | "MONITORING" | "SCHEDULED" | "TRANSITIONING" | "COOLDOWN";

export type AutomixPlan = {
  token: number;
  nextSong: SongType;
  nextIndex: number;
  triggerTime: number;
  crossfadeDuration: number;
  startSeek: number;
  initialRate: number;
  uiSwitchDelay: number;
  mixType: "default" | "bassSwap";
};
