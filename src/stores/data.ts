import { defineStore } from "pinia";
import type {
  SongType,
  CoverType,
  UserDataType,
  UserLikeDataType,
  CatType,
  LoginType,
  SongLevelType,
  AccountType,
} from "@/types/main";
import { playlistCatlist } from "@/api/playlist";
import { cloneDeep, isEmpty } from "lodash-es";
import { isLogin } from "@/utils/auth";
import { formatCategoryList } from "@/utils/format";
import localforage from "localforage";

interface ListState {
  playList: SongType[];
  originalPlayList: SongType[];
  historyList: SongType[];
  cloudPlayList: SongType[];
  searchHistory: string[];
  localPlayList: CoverType[];
  userLoginStatus: boolean;
  loginType: LoginType;
  userData: UserDataType;
  userList: AccountType[];
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
  /** 正在下载的歌曲列表 */
  downloadingSongs: Array<{
    /** 歌曲信息 */
    song: SongType;
    /** 音质 */
    quality: SongLevelType;
    /** 状态：下载中 / 等待中 / 失败 */
    status: "downloading" | "waiting" | "failed";
    /** 下载进度 */
    progress: number;
    /** 已传输大小 */
    transferred: string;
    /** 总大小 */
    totalSize: string;
  }>;
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

// backgroundDB
const backgroundDB = localforage.createInstance({
  name: "background-data",
  description: "Background image data",
  storeName: "background",
});

export const useDataStore = defineStore("data", {
  state: (): ListState => ({
    // 播放列表
    playList: [],
    // 原始播放列表
    originalPlayList: [],
    // 播放历史
    historyList: [],
    // 搜索历史
    searchHistory: [],
    // 本地歌单
    localPlayList: [],
    // 云盘歌单
    cloudPlayList: [],
    // 登录状态
    userLoginStatus: false,
    // 登录方式
    loginType: "qr",
    // 用户数据
    userData: {
      userId: 0,
      userType: 0,
      vipType: 0,
      name: "",
    },
    // 用户列表（多账号）
    userList: [],
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
        cover: "/images/album.jpg?asset",
      },
      data: [],
    },
    // 分类数据
    catData: {
      type: {},
      cats: [],
      hqCats: [],
    },
    // 正在下载的歌曲列表
    downloadingSongs: [],
  }),
  getters: {
    // 是否为喜欢歌曲
    isLikeSong: (state) => (id: number) => state.userLikeData.songs.includes(id),
  },
  actions: {
    /**
     * 加载数据
     */
    async loadData() {
      try {
        // 获取 music-data
        const musicDataKeys = await musicDB.keys();
        console.log(musicDataKeys);
        await Promise.all(
          musicDataKeys.map(async (key) => {
            const data = await musicDB.getItem(key);
            if (
              [
                "playList",
                "originalPlayList",
                "historyList",
                "cloudPlayList",
                "localPlayList",
                "downloadingSongs",
              ].includes(key)
            ) {
              this[key] = data ? markRaw(data) : [];
            } else if (key === "likeSongsList" && data) {
              // 特殊处理嵌套对象中的 data
              const listData = data as ListState["likeSongsList"];
              this.likeSongsList = {
                detail: listData.detail,
                data: markRaw(listData.data || []),
              };
            } else {
              this[key] = data || [];
            }
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
    /**
     * 更新播放列表
     * @param data 播放列表
     * @returns 插入的歌曲索引
     */
    async setPlayList(data: SongType | SongType[]): Promise<number> {
      try {
        let newList: SongType[] = [];
        let index = 0;
        // 若为列表
        if (Array.isArray(data)) {
          newList = data;
          index = 0;
        }
        // 若为单曲
        else {
          const currentList = toRaw(this.playList);
          // 歌曲去重
          newList = currentList.filter((s) => s.id !== data.id);
          // 添加到歌单末尾
          newList.push(data);
          // 获取索引
          index = newList.length - 1;
        }
        this.playList = markRaw(newList);
        await musicDB.setItem("playList", cloneDeep(toRaw(newList)));
        return index;
      } catch (error) {
        console.error("Error updating playlist:", error);
        throw error;
      }
    },
    /**
     * 设置原始播放列表
     * @param data 原始播放列表
     */
    async setOriginalPlayList(data: SongType[]): Promise<void> {
      this.originalPlayList = markRaw(data);
      await musicDB.setItem("originalPlayList", cloneDeep(toRaw(data)));
    },
    /**
     * 获取原始播放列表
     * @returns 原始播放列表
     */
    async getOriginalPlayList(): Promise<SongType[] | null> {
      // 检查内存中是否有数据
      if (Array.isArray(this.originalPlayList) && this.originalPlayList.length > 0) {
        return this.originalPlayList;
      }
      // 从 DB 获取
      const data = (await musicDB.getItem("originalPlayList")) as SongType[] | null;
      if (Array.isArray(data) && data.length > 0) {
        this.originalPlayList = markRaw(data);
        return data;
      }
      return null;
    },
    /**
     * 清除原始播放列表
     */
    async clearOriginalPlayList(): Promise<void> {
      this.originalPlayList = [];
      await musicDB.setItem("originalPlayList", []);
    },
    /**
     * 设置下一首播放歌曲
     * @param song 歌曲
     * @param index 插入位置
     * @returns 插入的歌曲索引
     */
    async setNextPlaySong(song: SongType, index: number): Promise<number> {
      // 若为空,则直接添加
      if (this.playList.length === 0) {
        this.playList = [song];
        await musicDB.setItem("playList", cloneDeep(this.playList));
        return 0;
      }
      // 避免直接修改 state
      const newList = [...this.playList];
      // 在当前播放位置之后插入歌曲
      const indexAdd = index + 1;
      newList.splice(indexAdd, 0, song);
      // 移除重复的歌曲（如果存在）
      const finalList = newList.filter((item, idx) => idx === indexAdd || item.id !== song.id);
      // 更新本地存储
      this.playList = markRaw(finalList);
      await musicDB.setItem("playList", cloneDeep(finalList));
      // 返回刚刚插入的歌曲索引
      return finalList.indexOf(song);
    },
    /**
     * 设置播放历史
     * @param song 歌曲
     */
    async setHistory(song: SongType) {
      try {
        let historyList: SongType[] = (await musicDB.getItem("historyList")) || [];
        if (!Array.isArray(historyList)) historyList = [];
        // 过滤旧的同名歌曲，把新的放到第一位
        const updatedList = [song, ...historyList.filter((item) => item.id !== song.id)];
        // 最多 500 首
        if (updatedList.length > 500) updatedList.splice(500);
        // 存储
        await musicDB.setItem("historyList", cloneDeep(toRaw(updatedList)));
        this.historyList = markRaw(updatedList);
      } catch (error) {
        console.error("Error updating history:", error);
        throw error;
      }
    },
    /**
     * 清除播放历史
     */
    async clearHistory(): Promise<void> {
      try {
        await musicDB.setItem("historyList", []);
        this.historyList = [];
      } catch (error) {
        console.error("Error clearing history:", error);
        throw error;
      }
    },
    /**
     * 设置我喜欢的音乐
     * @param detail 歌曲详情
     * @param data 歌曲列表
     */
    async setLikeSongsList(detail: CoverType, data: SongType[]) {
      const listData = {
        detail: { ...detail },
        data: toRaw(data),
      };
      this.likeSongsList = { detail: detail, data: markRaw(data) };
      await musicDB.setItem("likeSongsList", cloneDeep(toRaw(listData)));
    },
    /**
     * 获取我喜欢的歌单数据
     * @returns 我喜欢的歌单数据
     */
    async getUserLikePlaylist() {
      if (!isLogin() || !this.userData.userId) return;
      const result = await musicDB.getItem("likeSongsList");
      return result as { detail: CoverType; data: SongType[] } | null;
    },
    /**
     * 设置云盘歌单
     * @param data 云盘歌单
     */
    async setCloudPlayList(data: SongType[]) {
      this.cloudPlayList = markRaw(data);
      await musicDB.setItem("cloudPlayList", cloneDeep(toRaw(data)));
    },
    /**
     * 设置用户喜欢数据
     * @param name 数据名称
     * @param data 用户喜欢数据
     */
    async setUserLikeData<K extends UserDataKeys>(
      name: K,
      data: ListState["userLikeData"][K],
    ): Promise<void> {
      try {
        await userDB.setItem(name, toRaw(data));
        this.userLikeData[name] = data;
      } catch (error) {
        console.error("Error updating user data:", error);
        throw error;
      }
    },
    /**
     * 清除用户数据
     */
    async clearUserData() {
      try {
        this.userLoginStatus = false;
        this.loginType = "qr";
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
    /**
     * 删除数据库
     * @param name 数据库名称
     */
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
    /**
     * 获取歌单分类
     * @returns 歌单分类
     */
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
    /**
     * 添加正在下载的歌曲
     * @param song 歌曲
     * @param quality 音质
     */
    addDownloadingSong(song: SongType, quality: SongLevelType) {
      // 检查是否已存在
      const exists = this.downloadingSongs.find((item) => item.song.id === song.id);
      if (exists) return;
      this.downloadingSongs.push({
        song: cloneDeep(song),
        quality,
        status: "waiting",
        progress: 0,
        transferred: "0MB",
        totalSize: "0MB",
      });
      // 保存到本地存储
      musicDB.setItem("downloadingSongs", cloneDeep(this.downloadingSongs));
    },
    /**
     * 更新下载状态
     * @param songId 歌曲ID
     * @param status 下载状态
     */
    updateDownloadStatus(songId: number, status: "downloading" | "waiting" | "failed") {
      const index = this.downloadingSongs.findIndex((item) => item.song.id === songId);
      if (index !== -1) {
        this.downloadingSongs[index].status = status;
        // 强制触发响应式更新 (Fix: 下一首歌曲状态更新UI不变化的问题)
        this.downloadingSongs = [...this.downloadingSongs];
      }
    },
    // 更新下载进度
    updateDownloadProgress(
      songId: number,
      progress: number,
      transferred: string,
      totalSize: string,
    ) {
      const item = this.downloadingSongs.find((item) => item.song.id === songId);
      if (item) {
        item.progress = progress;
        item.transferred = transferred;
        item.totalSize = totalSize;
        // 进度更新过于频繁，不需要强制更新整个数组，以免影响性能
      }
    },
    // 移除正在下载的歌曲（下载失败时）
    removeDownloadingSong(songId: number) {
      const index = this.downloadingSongs.findIndex((item) => item.song.id === songId);
      if (index !== -1) {
        this.downloadingSongs.splice(index, 1);
        musicDB.setItem("downloadingSongs", cloneDeep(this.downloadingSongs));
      }
    },
    // 标记下载失败（保留在列表中）
    markDownloadFailed(songId: number) {
      const index = this.downloadingSongs.findIndex((item) => item.song.id === songId);
      if (index !== -1) {
        this.downloadingSongs[index].status = "failed";
        this.downloadingSongs[index].progress = 0;
        this.downloadingSongs[index].transferred = "0MB";
        this.downloadingSongs[index].totalSize = "0MB";
        this.downloadingSongs = [...this.downloadingSongs];
        musicDB.setItem("downloadingSongs", cloneDeep(this.downloadingSongs));
      }
    },
    // 重置下载任务状态（用于重试）
    resetDownloadingSong(songId: number) {
      const index = this.downloadingSongs.findIndex((item) => item.song.id === songId);
      if (index !== -1) {
        this.downloadingSongs[index].status = "waiting";
        this.downloadingSongs[index].progress = 0;
        this.downloadingSongs[index].transferred = "0MB";
        this.downloadingSongs[index].totalSize = "0MB";
        this.downloadingSongs = [...this.downloadingSongs];
      }
    },
    /**
     * 保存背景图
     * @param blob 图片 Blob 数据
     */
    async saveBackgroundImage(blob: Blob): Promise<void> {
      try {
        await backgroundDB.setItem("image", blob);
      } catch (error) {
        console.error("Error saving background image:", error);
        throw error;
      }
    },
    /**
     * 获取背景图
     * @returns Blob 数据
     */
    async getBackgroundImage(): Promise<Blob | null> {
      try {
        const data = await backgroundDB.getItem<Blob>("image");
        return data || null;
      } catch (error) {
        console.error("Error getting background image:", error);
        return null;
      }
    },
    /**
     * 清除背景图
     */
    async clearBackgroundImage(): Promise<void> {
      try {
        await backgroundDB.removeItem("image");
      } catch (error) {
        console.error("Error clearing background image:", error);
        throw error;
      }
    },
  },
  // 持久化
  persist: {
    key: "data-store",
    storage: localStorage,
    pick: ["userLoginStatus", "loginType", "userData", "userList", "searchHistory", "catData"],
  },
});
