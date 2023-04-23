import useSettingDataStore from "./settingData";
import useMusicDataStore from "./musicData";
import useUserDataStore from "./userData";
import useSiteDataStore from "./siteData";

export const settingStore = () => useSettingDataStore();
export const musicStore = () => useMusicDataStore();
export const userStore = () => useUserDataStore();
export const siteStore = () => useSiteDataStore();
