import type { AdvancedTransition, AudioAnalysis, TransitionProposal } from "@/types/audio/automix";

/**
 * 检查一个值是否为 AdvancedTransition 类型
 * @param value - 需要检查的值
 * @returns 如果是 AdvancedTransition 类型则返回 true，否则返回 false
 */
export const isAdvancedTransition = (value: unknown): value is AdvancedTransition => {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.start_time_current === "number" &&
    typeof obj.start_time_next === "number" &&
    typeof obj.duration === "number" &&
    typeof obj.pitch_shift_semitones === "number" &&
    typeof obj.playback_rate === "number" &&
    Array.isArray(obj.automation_current) &&
    Array.isArray(obj.automation_next) &&
    typeof obj.strategy === "string"
  );
};

/**
 * 检查一个值是否为 AudioAnalysis 类型
 * @param value - 需要检查的值
 * @returns 如果是 AudioAnalysis 类型则返回 true，否则返回 false
 */
export const isAudioAnalysis = (value: unknown): value is AudioAnalysis => {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.duration === "number" &&
    typeof obj.fade_in_pos === "number" &&
    typeof obj.fade_out_pos === "number"
  );
};

/**
 * 检查一个值是否为 TransitionProposal 类型
 * @param value - 需要检查的值
 * @returns 如果是 TransitionProposal 类型则返回 true，否则返回 false
 */
export const isTransitionProposal = (value: unknown): value is TransitionProposal => {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.duration === "number" &&
    typeof obj.current_track_mix_out === "number" &&
    typeof obj.next_track_mix_in === "number" &&
    typeof obj.mix_type === "string" &&
    typeof obj.filter_strategy === "string" &&
    typeof obj.compatibility_score === "number" &&
    typeof obj.key_compatible === "boolean" &&
    typeof obj.bpm_compatible === "boolean"
  );
};
