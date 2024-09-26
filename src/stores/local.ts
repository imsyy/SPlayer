import { ref, reactive } from "vue";
import type { SongType } from "@/types/main";
import { cloneDeep } from "lodash-es";
import localforage from "localforage";

// localDB
const localDB = localforage.createInstance({
  name: "local-data",
  description: "Local data of the application",
  storeName: "local",
});

export const useLocalStore = () => {
  // 本地歌曲
  const localSongs = ref<SongType[]>([]);

  // 读取本地歌曲
  const readLocalSong = async (): Promise<SongType[]> => {
    try {
      const result = await localDB.getItem("local-songs");
      localSongs.value = (result as SongType[]) || [];
      return localSongs.value;
    } catch (error) {
      console.error("Error reading local songs:", error);
      throw error;
    }
  };

  // 更新本地歌曲
  const updateLocalSong = async (songs: SongType[]) => {
    try {
      await localDB.setItem("local-songs", cloneDeep(songs));
      localSongs.value = songs;
    } catch (error) {
      console.error("Error updating local songs:", error);
      throw error;
    }
  };

  // 删除指定歌曲
  const deleteLocalSong = async (index: number) => {
    try {
      const playlist = cloneDeep(localSongs.value);
      playlist.splice(index, 1);
      await localDB.setItem("local-songs", playlist);
      localSongs.value = playlist;
    } catch (error) {
      console.error("Error deleting local song:", error);
      throw error;
    }
  };

  // 直接初始化数据
  readLocalSong();

  return reactive({
    localSongs,
    readLocalSong,
    updateLocalSong,
    deleteLocalSong,
  });
};
