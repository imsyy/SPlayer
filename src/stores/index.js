// stores
import useSiteDataStore from "@/stores/siteData";
import useSiteStatusStore from "@/stores/siteStatus";
import useSiteSettingsStore from "@/stores/siteSettings";
import useMusicDataStore from "@/stores/musicData";
import useIndexedDBStore from "@/stores/indexedDB";

export const siteData = () => useSiteDataStore();
export const siteStatus = () => useSiteStatusStore();
export const siteSettings = () => useSiteSettingsStore();
export const musicData = () => useMusicDataStore();
export const indexedDBData = () => useIndexedDBStore();
