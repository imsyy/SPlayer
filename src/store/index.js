import useSettingDataStore from "./settingData";
import useMusicDataStore from "./musicData";
import useUserDataStore from "./userData";

export const settingStore = () => useSettingDataStore();
export const musicStore = () => useMusicDataStore();
export const userStore = () => useUserDataStore();
