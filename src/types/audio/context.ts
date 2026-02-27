/** 扩充 AudioContext 接口以支持 setSinkId (实验性 API) */
export interface IExtendedAudioContext extends AudioContext {
  setSinkId(deviceId: string): Promise<void>;
}
