import { defineStore } from "pinia";
import type { SongType, CoverType, UserDataType, UserLikeDataType, CatType } from "@/types/main";
import { playlistCatlist } from "@/api/playlist";
import { cloneDeep, isEmpty } from "lodash-es";
import { isLogin } from "@/utils/auth";
import localforage from "localforage";
import { formatCategoryList } from "@/utils/format";

interface ListState {
  playList: SongType[];
  historyList: SongType[];
  cloudPlayList: SongType[];
  searchHistory: string[];
  localPlayList: CoverType[];
  userLoginStatus: boolean;
  userData: UserDataType;
  userLikeData: UserLikeDataType;
  likeSongsList: {
    detail: CoverType;
    data: SongType[];
  };
  catData: {
    type: Record<number, string>;
    cats: CatType[];
    hqCats: CatType[];
  };
}

type UserDataKeys = keyof ListState["userLikeData"];

// musicDB
const musicDB = localforage.createInstance({
  name: "music-data",
  description: "List data of the application",
  storeName: "music",
});

// userDB
const userDB = localforage.createInstance({
  name: "user-data",
  description: "User data of the application",
  storeName: "user",
});

export const useDataStore = defineStore({
  id: "data",
  state: (): ListState => ({
    // 播放列表
    playList: [],
    // 播放历史
    historyList: [],
    // 搜索历史
    searchHistory: [],
    // 本地歌单
    localPlayList: [],
    // 云盘歌单
    cloudPlayList: [],
    // 用户状态
    userLoginStatus: false,
    // 用户数据
    userData: {
      userId: 0,
      userType: 0,
      vipType: 0,
      name: "",
    },
    // 用户喜欢数据
    userLikeData: {
      songs: [],
      playlists: [],
      artists: [],
      albums: [],
      mvs: [],
      djs: [],
    },
    // 我喜欢的音乐
    likeSongsList: {
      detail: {
        id: 0,
        name: "我喜欢的音乐",
        cover: "/images/album.jpg?assest",
      },
      data: [],
    },
    // 分类数据
    catData: {
      type: {},
      cats: [],
      hqCats: [],
    },
  }),
  getters: {
    // 是否为喜欢歌曲
    isLikeSong: (state) => (id: number) => state.userLikeData.songs.includes(id),
  },
  actions: {
    async loadData() {
      try {
        // 获取 music-data
        const musicDataKeys = await musicDB.keys();
        console.log(musicDataKeys);
        await Promise.all(
          musicDataKeys.map(async (key) => {
            const data = await musicDB.getItem(key);
            this[key] = data || [];
          }),
        );
        // 获取 user-data
        const userDataKeys = await userDB.keys();
        await Promise.all(
          userDataKeys.map(async (key) => {
            const data = await userDB.getItem(key);
            this.userLikeData[key] = data;
          }),
        );
      } catch (error) {
        console.error("Error loading data from localforage:", error);
      }
    },
    // 更新播放列表
    async setPlayList(data: SongType | SongType[]): Promise<number> {
      try {
        // 若为列表
        if (Array.isArray(data)) {
          this.playList = data;
          // 更新本地存储
          data = cloneDeep(data);
          await musicDB.setItem("playList", data);
          return 0;
        }
        // 若为单曲
        else {
          // 若为单曲
          const song = cloneDeep(data as SongType);
          // 歌曲去重
          const playList = this.playList.filter((s) => s.id !== song.id);
          // 添加到歌单末尾
          playList.push(song);
          // 获取索引
          const index = playList.length - 1;
          // 更新本地存储
          this.playList = playList;
          await musicDB.setItem("playList", playList);
          return index;
        }
      } catch (error) {
        console.error("Error updating playlist:", error);
        throw error;
      }
    },
    // 新增下一首播放歌曲
    async setNextPlaySong(song: SongType, index: number): Promise<number> {
      // 移除重复的歌曲（如果存在）
      const playList = this.playList.filter((item) => item.id !== song.id);
      // 在当前播放位置之后插入歌曲
      const indexAdd = index + 1;
      playList.splice(indexAdd, 0, song);
      // 更新本地存储
      this.playList = playList;
      await musicDB.setItem("playList", cloneDeep(playList));
      return indexAdd;
    },
    // 更改播放历史
    async setHistory(song: SongType) {
      try {
        let historyList: ListState["historyList"] | null = await musicDB.getItem("historyList");
        // 是否无数据
        if (historyList === null) {
          historyList = [];
        } else if (!Array.isArray(historyList)) return;
        // 深拷贝
        song = cloneDeep(song);
        // 添加到首项并移除重复项
        const updatedList = [song, ...historyList.filter((item) => item.id !== song.id)];
        // 最多 500 首
        if (updatedList.length > 500) updatedList.splice(500);
        await musicDB.setItem("historyList", updatedList);
        // 更新播放历史
        this.historyList = updatedList as SongType[];
      } catch (error) {
        console.error("Error updating history:", error);
        throw error;
      }
    },
    // 清除播放历史
    async clearHistory(): Promise<void> {
      try {
        await musicDB.setItem("historyList", []);
        this.historyList = [];
      } catch (error) {
        console.error("Error clearing history:", error);
        throw error;
      }
    },
    // 更改我喜欢的音乐
    async setLikeSongsList(detail: CoverType, data: SongType[]) {
      await musicDB.setItem("likeSongsList", {
        detail: cloneDeep(detail),
        data: cloneDeep(data),
      });
      this.likeSongsList = { detail, data };
    },
    // 获取我喜欢的歌单数据
    async getUserLikePlaylist() {
      if (!isLogin() || !this.userData.userId) return;
      const result = await musicDB.getItem("likeSongsList");
      return result;
    },
    // 更改云盘歌单
    async setCloudPlayList(data: SongType[]) {
      await musicDB.setItem("cloudPlayList", cloneDeep(data));
      this.cloudPlayList = data;
    },
    // 更改用户数据
    async setUserLikeData<K extends UserDataKeys>(
      name: K,
      data: ListState["userLikeData"][K],
    ): Promise<void> {
      try {
        // 更新本地存储
        await userDB.setItem(name, cloneDeep(data));
        this.userLikeData[name] = data;
      } catch (error) {
        console.error("Error updating user data:", error);
        throw error;
      }
    },
    // 清除用户数据
    async clearUserData() {
      try {
        this.userLoginStatus = false;
        this.userData = {
          userId: 0,
          userType: 0,
          vipType: 0,
          name: "",
        };
        await Promise.all(
          Object.keys(this.userLikeData).map(async (key) => {
            const userDataKey = key as UserDataKeys;
            await this.setUserLikeData(userDataKey, []);
            this.userLikeData[userDataKey] = [];
          }),
        );
      } catch (error) {
        console.error("Error clearing user data:", error);
        throw error;
      }
    },
    // 删除数据库
    async deleteDB(name?: string): Promise<void> {
      try {
        if (name) {
          await localforage.dropInstance({ name });
          console.log(`Dropped ${name} database`);
          return;
        }
        await musicDB.clear();
        await userDB.clear();
        console.log("All databases cleared");
      } catch (error) {
        console.error("Error deleting database:", error);
        throw error;
      }
    },
    // 获取歌单分类
    async getPlaylistCatList() {
      if (!isEmpty(this.catData.cats) && !isEmpty(this.catData.hqCats)) return;
      // 获取歌单分类
      try {
        const [catsRes, hqCatsRes] = await Promise.all([playlistCatlist(), playlistCatlist(true)]);
        console.log(catsRes, hqCatsRes);
        this.catData = {
          type: catsRes.categories,
          cats: formatCategoryList(catsRes.sub),
          hqCats: formatCategoryList(hqCatsRes.tags),
        };
      } catch (error) {
        console.error("Error getting playlist cat list:", error);
        throw error;
      }
    },
  },
  // 持久化
  persist: {
    key: "data-store",
    storage: localStorage,
    paths: ["userLoginStatus", "userData", "searchHistory", "catData"],
  },
});
