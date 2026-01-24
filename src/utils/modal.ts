import { h } from "vue";
import type { CoverType, UpdateInfoType, SettingType, SongType } from "@/types/main";
import type { RemoteFolderType } from "@/types/local";
import { CURRENT_AGREEMENT_VERSION } from "@/constants/agreement";
import { NScrollbar } from "naive-ui";
import { isLogin } from "./auth";
import { isArray, isFunction } from "lodash-es";
import { useDataStore, useSettingStore } from "@/stores";
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
import DownloadModal from "@/components/Modal/DownloadModal.vue";
import MainSetting from "@/components/Setting/MainSetting.vue";
import UpdateApp from "@/components/Modal/UpdateApp.vue";
import ExcludeLyrics from "@/components/Modal/Setting/ExcludeLyrics.vue";
import ChangeRate from "@/components/Modal/ChangeRate.vue";
import AutoClose from "@/components/Modal/AutoClose.vue";
import Equalizer from "@/components/Modal/Equalizer.vue";
import SongUnlockManager from "@/components/Modal/Setting/SongUnlockManager.vue";
import SidebarHideManager from "@/components/Modal/Setting/SidebarHideManager.vue";
import HomePageSectionManager from "@/components/Modal/Setting/HomePageSectionManager.vue";
import CopyLyrics from "@/components/Modal/CopyLyrics.vue";
import AMLLServer from "@/components/Modal/Setting/AMLLServer.vue";
import FontManager from "@/components/Modal/Setting/FontManager.vue";
import CustomCode from "@/components/Modal/Setting/CustomCode.vue";
import StreamingServerConfig from "@/components/Modal/Setting/StreamingServerConfig.vue";
import AddRemoteFolderModal from "@/components/Modal/AddRemoteFolderModal.vue";
import type { StreamingServerConfig as StreamingServerConfigType } from "@/types/streaming";

export const openUserAgreement = () => {
  const settingStore = useSettingStore();
  // 检查是否需要重新同意协议
  const needReAgree = settingStore.userAgreementVersion !== CURRENT_AGREEMENT_VERSION;
  // 如果已经同意了当前版本，则不需要再弹窗
  if (!needReAgree) return;
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
          // 储存状态（这个逻辑现在在 UserAgreement 组件内部处理）
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

/**
 * 跳转到歌手
 * @param data 歌手信息
 * @param id 歌手 id
 * @returns
 */
export const openJumpArtist = (data: SongType["artists"], id?: number) => {
  // 若 data 为数组且只有一个元素，则直接跳转
  if (isArray(data) && data.length <= 2 && id) {
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
    title: isLocal ? "添加到本地歌单" : "添加到歌单",
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
export const openCreatePlaylist = (isLocal: boolean = false) => {
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "600px" },
    title: isLocal ? "新建本地歌单" : "新建歌单",
    content: () => {
      return h(CreatePlaylist, { isLocal, onClose: () => modal.destroy() });
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
      return h(DownloadModal, { songId: song.id, onClose: () => modal.destroy() });
    },
  });
};

// 批量下载歌曲
export const openDownloadSongs = (songs: SongType[]): void => {
  if (!isLogin()) return openUserLogin();
  if (!songs || songs.length === 0) {
    window.$message.warning("请选择要下载的歌曲");
    return;
  }
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "600px" },
    title: "批量下载",
    content: () => {
      return h(DownloadModal, { songs, onClose: () => modal.destroy() });
    },
  });
};

// 设置页面是否已打开
let isSettingOpen = false;

// 打开设置
export const openSetting = (type: SettingType = "general", scrollTo?: string) => {
  // 如果设置页面已打开，显示提醒
  if (isSettingOpen) {
    window.$message.warning("设置页面已打开");
    return;
  }
  isSettingOpen = true;
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    maskClosable: false,
    closeOnEsc: false,
    bordered: false,
    class: "main-setting",
    content: () => {
      return h(MainSetting, { type, scrollTo });
    },
    onAfterLeave: () => {
      isSettingOpen = false;
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

/** 打开复制歌词弹窗 */
export const openCopyLyrics = () => {
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "500px" },
    title: "复制歌词",
    content: () => {
      return h(CopyLyrics, {
        onClose: () => modal.destroy(),
      });
    },
  });
};

/** 打开 AMLL 服务器配置弹窗 */
export const openAMLLServer = () => {
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "600px" },
    title: "AMLL TTML DB 服务器配置",
    content: () => {
      return h(AMLLServer, {
        onClose: () => modal.destroy(),
      });
    },
  });
};

/** 打开字体管理弹窗 */
export const openFontManager = () => {
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "700px" },
    title: "字体设置",
    content: () => {
      return h(FontManager);
    },
  });
};

/** 打开自定义代码弹窗 */
export const openCustomCode = () => {
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "700px" },
    title: "自定义代码注入",
    content: () => {
      return h(CustomCode);
    },
  });
};

/**
 * 打开流媒体服务器配置弹窗
 * @param server 要编辑的服务器配置，为空时表示新增
 * @param onSave 保存回调
 */
export const openStreamingServerConfig = (
  server: StreamingServerConfigType | null,
  onSave: (config: Omit<StreamingServerConfigType, "id">) => void,
) => {
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    maskClosable: false,
    closeOnEsc: false,
    style: { width: "500px" },
    title: server ? "编辑流媒体服务" : "添加流媒体服务",
    content: () => {
      return h(StreamingServerConfig, {
        server,
        onSave: (config: Omit<StreamingServerConfigType, "id">) => {
          onSave(config);
          modal.destroy();
        },
        onCancel: () => modal.destroy(),
      });
    },
  });
};

/**
 * 打开添加远程文件夹弹窗
 * @param initialType 初始协议类型
 */
export const openAddRemoteFolder = (initialType: RemoteFolderType = "smb") => {
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "500px" },
    title: "添加远程文件夹",
    content: () => {
      return h(AddRemoteFolderModal, {
        initialType,
        onClose: () => modal.destroy(),
      });
    },
  });
};
