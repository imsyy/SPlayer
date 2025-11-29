import { h } from "vue";
import type { CoverType, UpdateInfoType, SettingType, SongType } from "@/types/main";
import { isLogin } from "./auth";
import { isArray, isFunction } from "lodash-es";
import { useDataStore } from "@/stores";
import router from "@/router";
import Login from "@/components/Modal/Login/Login.vue";
import JumpArtist from "@/components/Modal/JumpArtist.vue";
import UserAgreement from "@/components/Modal/UserAgreement.vue";
import SongInfoEditor from "@/components/Modal/SongInfoEditor.vue";
import PlaylistAdd from "@/components/Modal/PlaylistAdd.vue";
import BatchList from "@/components/Modal/BatchList.vue";
import CloudMatch from "@/components/Modal/CloudMatch.vue";
import CreatePlaylist from "@/components/Modal/CreatePlaylist.vue";
import UpdatePlaylist from "@/components/Modal/UpdatePlaylist.vue";
import DownloadSong from "@/components/Modal/DownloadSong.vue";
import MainSetting from "@/components/Setting/MainSetting.vue";
import UpdateApp from "@/components/Modal/UpdateApp.vue";
import ExcludeLyrics from "@/components/Modal/ExcludeLyrics.vue";
import ChangeRate from "@/components/Modal/ChangeRate.vue";
import AutoClose from "@/components/Modal/AutoClose.vue";
import Equalizer from "@/components/Modal/Equalizer.vue";
import SongUnlockManager from "@/components/Modal/SongUnlockManager.vue";
import SidebarHideManager from "@/components/Modal/SidebarHideManager.vue";
import HomePageSectionManager from "@/components/Modal/HomePageSectionManager.vue";
import { NScrollbar } from "naive-ui";

// 用户协议
export const openUserAgreement = () => {
  const isAgree = window.localStorage.getItem("isAgree");
  if (isAgree) return;
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    maskClosable: false,
    closeOnEsc: false,
    closable: false,
    style: {
      maxWidth: "70vw",
    },
    content: () => {
      return h(UserAgreement, {
        onClose: () => {
          modal.destroy();
          // 储存状态
          window.localStorage.setItem("isAgree", Date.now().toString());
        },
      });
    },
    onEsc: () => {
      window.$message.warning("请先阅读并同意用户协议");
    },
  });
};

// 用户登录
export const openUserLogin = (showTip: boolean = false) => {
  if (showTip) window.$message.warning("请登录后使用");
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    maskClosable: false,
    closeOnEsc: false,
    closable: false,
    style: { width: "400px" },
    content: () => {
      return h(Login, { onClose: () => modal.destroy() });
    },
  });
};

// 跳转到歌手
export const openJumpArtist = (data: SongType["artists"]) => {
  // 若 data 为数组且只有一个元素，则直接跳转
  if (isArray(data) && data.length === 1) {
    const id = data[0].id;
    router.push({ name: "artist", query: { id } });
    return;
  }
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "600px" },
    title: "跳转到歌手",
    content: () => {
      return h(JumpArtist, { artist: data, onClose: () => modal.destroy() });
    },
  });
};

// 编辑歌曲信息
export const openSongInfoEditor = (song: SongType) => {
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    trapFocus: false,
    // contentStyle: { padding: 0 },
    style: { width: "600px" },
    title: "编辑歌曲信息",
    content: () => {
      return h(SongInfoEditor, { song, onClose: () => modal.destroy() });
    },
  });
};

// 添加到歌单
export const openPlaylistAdd = (data: SongType[], isLocal: boolean) => {
  if (!data.length) return window.$message.warning("请正确选择歌曲");
  if (!isLogin() && !isLocal) return openUserLogin();
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "600px" },
    title: "添加到歌单",
    content: () => {
      return h(PlaylistAdd, { data, isLocal, onClose: () => modal.destroy() });
    },
  });
};

/**
 * 开启批量操作
 * @param data 歌曲列表
 * @param isLocal 是否为本地音乐
 * @param playListId 歌单 id
 */
export const openBatchList = (data: SongType[], isLocal: boolean, playListId?: number) => {
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: {
      maxWidth: "70vw",
    },
    title: "批量操作",
    content: () => h(BatchList, { data, isLocal, playListId }),
  });
};

// 云盘歌曲纠正
export const openCloudMatch = (id: number, index: number) => {
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "600px" },
    title: "云盘歌曲纠正",
    content: () => {
      return h(CloudMatch, { id, index, onClose: () => modal.destroy() });
    },
  });
};

// 新建歌单
export const openCreatePlaylist = () => {
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "600px" },
    title: "新建歌单",
    content: () => {
      return h(CreatePlaylist, { onClose: () => modal.destroy() });
    },
  });
};

// 编辑歌单
export const openUpdatePlaylist = (id: number, data: CoverType, func: () => Promise<void>) => {
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "600px" },
    title: "编辑歌单",
    content: () => {
      return h(UpdatePlaylist, {
        id,
        data,
        onSuccess: () => {
          modal.destroy();
          // 触发回调
          if (isFunction(func)) func();
        },
      });
    },
  });
};

// 下载歌曲
export const openDownloadSong = (song: SongType) => {
  const dataStore = useDataStore();
  if (!isLogin()) return openUserLogin();
  // 是否可下载
  if (!song) return window.$message.warning("请正确选择歌曲");
  if (song.free !== 0 && dataStore.userData.vipType === 0 && !song?.pc) {
    return window.$message.warning("账号会员等级不足，请提升权限");
  }
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "600px" },
    title: "下载歌曲",
    content: () => {
      return h(DownloadSong, { id: song.id, onClose: () => modal.destroy() });
    },
  });
};

// 打开设置
export const openSetting = (type: SettingType = "general") => {
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    maskClosable: false,
    closeOnEsc: false,
    bordered: true,
    class: "main-setting",
    content: () => {
      return h(MainSetting, { type });
    },
  });
};

// 软件更新
export const openUpdateApp = (data: UpdateInfoType) => {
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "600px" },
    title: "发现新版本",
    content: () => {
      return h(UpdateApp, { data, onClose: () => modal.destroy() });
    },
  });
};

// 歌词排除内容
export const openLyricExclude = () => {
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "600px" },
    title: "歌词排除内容",
    content: () => {
      return h(ExcludeLyrics);
    },
  });
};

/** 打开播放速度弹窗 */
export const openChangeRate = () => {
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "600px" },
    title: "播放速度",
    content: () => {
      return h(ChangeRate);
    },
  });
};

/** 打开自动关闭弹窗 */
export const openAutoClose = () => {
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "600px" },
    title: "自动关闭",
    content: () => {
      return h(AutoClose);
    },
  });
};

/** 打开均衡器弹窗 */
export const openEqualizer = () => {
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "620px" },
    title: "均衡器",
    content: () => {
      return h(Equalizer);
    },
  });
};

/**
 * 打开简介弹窗
 * @param content 简介内容
 */
export const openDescModal = (content: string, title: string = "歌单简介") => {
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "600px" },
    title,
    content: () => {
      return h(
        NScrollbar,
        { style: { maxHeight: "400px" } },
        {
          default: () =>
            h("div", { style: { whiteSpace: "pre-wrap" } }, { default: () => content }),
        },
      );
    },
  });
};

/** 打开音源管理弹窗 */
export const openSongUnlockManager = () => {
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "500px" },
    title: "音源管理",
    content: () => {
      return h(SongUnlockManager);
    },
  });
};

/** 打开侧边栏隐藏管理弹窗 */
export const openSidebarHideManager = () => {
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "500px" },
    title: "侧边栏隐藏管理",
    content: () => {
      return h(SidebarHideManager);
    },
  });
};

/** 打开首页栏目配置弹窗 */
export const openHomePageSectionManager = () => {
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "500px" },
    title: "首页栏目配置",
    content: () => {
      return h(HomePageSectionManager);
    },
  });
};
