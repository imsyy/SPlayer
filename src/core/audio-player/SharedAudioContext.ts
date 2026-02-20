import type { IExtendedAudioContext } from "./BaseAudioPlayer";

let sharedContext: IExtendedAudioContext | null = null;
let masterInput: GainNode | null = null;
let masterLimiter: DynamicsCompressorNode | null = null;

export const getSharedAudioContext = (): IExtendedAudioContext => {
  if (!sharedContext) {
    const AudioContextClass =
      window.AudioContext ||
      (
        window as unknown as {
          webkitAudioContext: typeof AudioContext;
        }
      ).webkitAudioContext;
    sharedContext = new AudioContextClass() as IExtendedAudioContext;
  }
  return sharedContext;
};

export const getSharedMasterInput = (): GainNode => {
  const ctx = getSharedAudioContext();
  if (!masterInput) {
    masterInput = ctx.createGain();
    masterLimiter = ctx.createDynamicsCompressor();

    masterLimiter.threshold.value = -1;
    masterLimiter.knee.value = 0;
    masterLimiter.ratio.value = 20;
    masterLimiter.attack.value = 0.003;
    masterLimiter.release.value = 0.25;

    masterInput.connect(masterLimiter);
    masterLimiter.connect(ctx.destination);
  }
  return masterInput;
};

export const getSharedMasterLimiter = (): DynamicsCompressorNode | null => {
  return masterLimiter;
};
