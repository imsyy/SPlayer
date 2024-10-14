import { getCookie, removeCookie, setCookies } from "./cookie";
import type { UserLikeDataType, CoverType, ArtistType, SongType } from "@/types/main";
import {
  userAccount,
  userDetail,
  userSubcount,
  userLike,
  userDj,
  userMv,
  userArtist,
  userAlbum,
  userPlaylist,
} from "@/api/user";
import { likeSong } from "@/api/song";
import { formatCoverList, formatArtistsList, formatSongsList } from "@/utils/format";
import { useDataStore, useMusicStore } from "@/stores";
import { logout, refreshLogin } from "@/api/login";
import { debounce, isFunction } from "lodash-es";
import { isBeforeSixAM } from "./time";
import { dailyRecommend } from "@/api/rec";
import { isElectron } from "./helper";
import { likePlaylist, playlistTracks } from "@/api/playlist";
import { likeArtist } from "@/api/artist";
import { radioSub } from "@/api/radio";

// 是否登录
export const isLogin = (): 0 | 1 | 2 => {
  const dataStore = useDataStore();
  if (dataStore.loginType === "uid") return 2;
  return getCookie("MUSIC_U") ? 1 : 0;
};

// 退出登录
export const toLogout = async () => {
  const dataStore = useDataStore();
  // 退出登录
  await logout();
  // 去除 cookie
  removeCookie("MUSIC_U");
  removeCookie("__csrf");
  sessionStorage.clear();
  // 清除用户数据
  await dataStore.clearUserData();
  window.$message.success("成功退出登录");
};

// 刷新登录
export const refreshLoginData = async () => {
  // lastLoginTime 是否超过 3 天
  const lastLoginTime = localStorage.getItem("lastLoginTime");
  // 超时时长
  const timeout = 3 * 24 * 60 * 60 * 1000;
  if (lastLoginTime && Date.now() - Number(lastLoginTime) > timeout) {
    // 刷新登录
    const result = await refreshLogin();
    if (result?.code === 200) {
      setCookies(result.cookie);
      localStorage.setItem("lastLoginTime", Date.now().toString());
    }
    return result;
  }
};

// 更新用户信息
export const updateUserData = async () => {
  try {
    if (!isLogin()) return;
    const dataStore = useDataStore();
    // userId
    const { profile } = await userAccount();
    const userId = profile.userId;
    // 获取用户信息
    const userDetailData = await userDetail(userId);
    const userData = Object.assign(profile, userDetailData);
    // 获取用户订阅信息
    const subcountData = await userSubcount();
    // 更改用户信息
    dataStore.userData = {
      userId,
      userType: userData.userType,
      vipType: userData.vipType,
      name: userData.nickname,
      level: userData.level,
      avatarUrl: userData.avatarUrl,
      backgroundUrl: userData.backgroundUrl,
      createTime: userData.createTime,
      createDays: userData.createDays,
      artistCount: subcountData.artistCount,
      djRadioCount: subcountData.djRadioCount,
      mvCount: subcountData.mvCount,
      subPlaylistCount: subcountData.subPlaylistCount,
      createdPlaylistCount: subcountData.createdPlaylistCount,
    };
    // 获取用户喜欢数据
    const allUserLikeResult = await Promise.allSettled([
      updateUserLikeSongs(),
      updateUserLikePlaylist(),
      updateUserLikeArtists(),
      updateUserLikeAlbums(),
      updateUserLikeMvs(),
      updateUserLikeDjs(),
      // 每日推荐
      updateDailySongsData(),
    ]);
    // 若部分失败
    const hasFailed = allUserLikeResult.some((result) => result.status === "rejected");
    if (hasFailed) throw new Error("Failed to update some user data");
  } catch (error) {
    console.error("❌ Error updating user data:", error);
    throw error;
  }
};

// 更新用户信息 - 特殊登录模式
export const updateSpecialUserData = async (userData?: any) => {
  try {
    const dataStore = useDataStore();
    if (!userData) {
      const result = await userDetail(dataStore.userData.userId);
      userData = result?.profile;
    }
    // 更改用户信息
    dataStore.userData = {
      userId: userData.userId,
      userType: userData.userType,
      vipType: userData.vipType,
      name: userData.nickname,
      level: userData.level,
      avatarUrl: userData.avatarUrl,
      backgroundUrl: userData.backgroundUrl,
      createTime: userData.createTime,
      createDays: userData.createDays,
    };
    // 获取用户喜欢数据
    await updateUserLikePlaylist();
  } catch (error) {
    console.error("❌ Error updating special user data:", error);
    throw error;
  }
};

// 更新用户喜欢歌曲
export const updateUserLikeSongs = async () => {
  const dataStore = useDataStore();
  if (!isLogin() || !dataStore.userData.userId) return;
  const result = await userLike(dataStore.userData.userId);
  dataStore.setUserLikeData("songs", result.ids);
};

// 更新用户喜欢歌单
export const updateUserLikePlaylist = async () => {
  const dataStore = useDataStore();
  const userId = dataStore.userData.userId;
  if (!isLogin() || !userId) return;
  if (dataStore.loginType === "uid") {
    const result = await userPlaylist(30, 0, userId);
    dataStore.setUserLikeData("playlists", formatCoverList(result.playlist));
    return;
  }
  // 计算数量
  const { createdPlaylistCount, subPlaylistCount } = dataStore.userData;
  const number = (createdPlaylistCount || 0) + (subPlaylistCount || 0) || 50;
  const result = await userPlaylist(number, 0, userId);
  dataStore.setUserLikeData("playlists", formatCoverList(result.playlist));
};

// 更新用户喜欢歌手
export const updateUserLikeArtists = async () => {
  await setUserLikeDataLoop(userArtist, formatArtistsList, "artists");
};

// 更新用户喜欢专辑
export const updateUserLikeAlbums = async () => {
  await setUserLikeDataLoop(userAlbum, formatCoverList, "albums");
};

// 更新用户喜欢电台
export const updateUserLikeDjs = async () => {
  const dataStore = useDataStore();
  if (!isLogin() || !dataStore.userData.userId) return;
  const result = await userDj();
  dataStore.setUserLikeData("djs", formatCoverList(result.djRadios));
};

// 更新用户喜欢MV
export const updateUserLikeMvs = async () => {
  const dataStore = useDataStore();
  if (!isLogin() || !dataStore.userData.userId) return;
  const result = await userMv();
  dataStore.setUserLikeData("mvs", formatCoverList(result.data));
};

// 喜欢歌曲
export const toLikeSong = debounce(
  async (song: SongType, like: boolean) => {
    if (!isLogin()) {
      window.$message.warning("请登录后使用");
      return;
    }
    if (isLogin() === 2) {
      window.$message.warning("该登录模式暂不支持该操作");
      return;
    }
    const dataStore = useDataStore();
    const { id, path } = song;
    if (path) {
      window.$message.warning("本地歌曲暂不支持该操作");
      return;
    }
    const likeList = dataStore.userLikeData.songs;
    const exists = likeList.includes(id);
    const { code } = await likeSong(id, like);
    if (code === 200) {
      if (like && !exists) {
        likeList.push(id);
        window.$message.success("已添加到我喜欢的音乐");
      } else if (!like && exists) {
        likeList.splice(likeList.indexOf(id), 1);
        window.$message.success("已取消喜欢");
      } else if (like && exists) {
        window.$message.info("我喜欢的音乐中已存在该歌曲");
      }
      // 更新
      dataStore.setUserLikeData("songs", likeList);
      // ipc
      if (isElectron) window.electron.ipcRenderer.send("like-status-change", like);
    } else {
      window.$message.error(`${like ? "喜欢" : "取消"}音乐时发生错误`);
      return;
    }
  },
  300,
  { leading: true, trailing: false },
);

// 收藏/取消收藏歌单
export const toLikePlaylist = debounce(
  async (id: number, like: boolean) => {
    if (!id) return;
    if (!isLogin()) {
      window.$message.warning("请登录后使用");
      return;
    }
    if (isLogin() === 2) {
      window.$message.warning("该登录模式暂不支持该操作");
      return;
    }
    const { code } = await likePlaylist(id, like ? 1 : 2);
    if (code === 200) {
      window.$message.success((like ? "收藏" : "取消收藏") + "歌单成功");
      // 更新
      await updateUserLikePlaylist();
    } else {
      window.$message.success((like ? "收藏" : "取消收藏") + "歌单失败，请重试");
      return;
    }
  },
  300,
  { leading: true, trailing: false },
);

// 收藏/取消收藏歌手
export const toLikeArtist = debounce(
  async (id: number, like: boolean) => {
    if (!id) return;
    if (!isLogin()) {
      window.$message.warning("请登录后使用");
      return;
    }
    if (isLogin() === 2) {
      window.$message.warning("该登录模式暂不支持该操作");
      return;
    }
    const { code } = await likeArtist(id, like ? 1 : 2);
    if (code === 200) {
      window.$message.success((like ? "收藏" : "取消收藏") + "歌手成功");
      // 更新
      await updateUserLikeArtists();
    } else {
      window.$message.success((like ? "收藏" : "取消收藏") + "歌手失败，请重试");
      return;
    }
  },
  300,
  { leading: true, trailing: false },
);

// 订阅/取消订阅播客
export const toSubRadio = debounce(
  async (id: number, like: boolean) => {
    if (!id) return;
    if (!isLogin()) {
      window.$message.warning("请登录后使用");
      return;
    }
    if (isLogin() === 2) {
      window.$message.warning("该登录模式暂不支持该操作");
      return;
    }
    const { code } = await radioSub(id, like ? 1 : 0);
    if (code === 200) {
      window.$message.success((like ? "订阅" : "取消订阅") + "播客成功");
      // 更新
      await updateUserLikeDjs();
    } else {
      window.$message.success((like ? "订阅" : "取消订阅") + "播客失败，请重试");
      return;
    }
  },
  300,
  { leading: true, trailing: false },
);

// 循环获取用户喜欢数据
const setUserLikeDataLoop = async <T>(
  apiFunction: (limit: number, offset: number) => Promise<{ data: any[]; count: number }>,
  formatFunction: (data: any[]) => T[],
  key: keyof UserLikeDataType,
) => {
  const dataStore = useDataStore();
  const userId = dataStore.userData.userId;
  if (!isLogin() || !userId) return;
  // 必要数据
  let offset: number = 0;
  const allData: T[] = [];
  const limit: number = 100;
  // 是否可循环
  let canLoop: boolean = true;
  // 循环获取
  while (canLoop) {
    const { data, count } = await apiFunction(limit, offset);
    // 数据处理
    const formattedData = formatFunction(data);
    // 若为空
    if (formattedData.length === 0) break;
    // 合并数据
    allData.push(...formattedData);
    // 更新偏移量
    offset += limit;
    canLoop = offset < count && formattedData.length > 0;
  }
  // 更新数据
  if (key === "artists") {
    dataStore.setUserLikeData(key, allData as ArtistType[]);
  } else if (key === "albums" || key === "mvs" || key === "djs") {
    dataStore.setUserLikeData(key, allData as CoverType[]);
  } else {
    console.error(`Unsupported key: ${key}`);
  }
  return allData;
};

/**
 * 更新每日推荐
 * @param refresh 是否强制刷新
 */
export const updateDailySongsData = async (refresh = false) => {
  try {
    const musicStore = useMusicStore();
    if (!isLogin()) {
      musicStore.dailySongsData = { timestamp: null, list: [] };
      return;
    }
    const { timestamp, list } = musicStore.dailySongsData;
    // 是否需要刷新
    if (!refresh && list.length > 0 && timestamp && !isBeforeSixAM(timestamp)) return;
    // 获取每日推荐
    const result = await dailyRecommend("songs");
    const songsData = formatSongsList(result.data.dailySongs);
    // 更新数据
    musicStore.dailySongsData = { timestamp: Date.now(), list: songsData };
    if (refresh) window.$message.success("每日推荐更新成功");
  } catch (error) {
    console.error("❌ Error updating daily songs data:", error);
    throw error;
  }
};

/**
 * 删除歌曲
 * @param pid 歌单id
 * @param ids 要删除的歌曲id
 */
export const deleteSongs = async (pid: number, ids: number[], callback?: () => void) => {
  try {
    window.$dialog.warning({
      title: "删除歌曲",
      content: ids?.length > 1 ? "确定删除这些选中的歌曲吗？" : "确定删除这个歌曲吗？",
      positiveText: "删除",
      negativeText: "取消",
      onPositiveClick: async () => {
        const result = await playlistTracks(pid, ids, "del");
        if (result.status === 200) {
          if (result.body?.code !== 200) {
            window.$message.error(result.body?.message || "删除歌曲失败，请重试");
            return;
          }
          if (isFunction(callback)) callback();
          window.$message.success("删除成功");
        } else {
          window.$message.error(result?.message || "删除歌曲失败，请重试");
        }
      },
    });
  } catch (error) {
    console.error("❌ Error deleting songs:", error);
    throw error;
  }
};
