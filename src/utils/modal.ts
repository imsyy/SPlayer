import type { CoverType, UpdateInfoType, SettingType, SongType } from "@/types/main";
import { CURRENT_AGREEMENT_VERSION } from "@/constants/agreement";
import { NScrollbar } from "naive-ui";
import { isLogin } from "./auth";
import { isArray, isFunction } from "lodash-es";
import { useDataStore, useSettingStore } from "@/stores";
import router from "@/router";
import type { StreamingServerConfig as StreamingServerConfigType } from "@/types/streaming";

// 单例弹窗管理：跟踪已打开的弹窗类型
const openedModals = new Set<string>();

/**
 * 检查弹窗是否已打开，若已打开则显示提示
 * @param modalKey 弹窗唯一标识
 * @param warningMessage 已打开时的提示信息
 * @returns 是否已打开
 */
const isModalOpen = (modalKey: string, warningMessage?: string): boolean => {
  if (openedModals.has(modalKey)) {
    if (warningMessage) window.$message.warning(warningMessage);
    return true;
  }
  return false;
};

/**
 * 标记弹窗为打开状态
 */
const setModalOpen = (modalKey: string): void => {
  openedModals.add(modalKey);
};

/**
 * 标记弹窗为关闭状态
 */
const setModalClosed = (modalKey: string): void => {
  openedModals.delete(modalKey);
};

export const openUserAgreement = async () => {
  const settingStore = useSettingStore();
  // 检查是否需要重新同意协议
  const needReAgree = settingStore.userAgreementVersion !== CURRENT_AGREEMENT_VERSION;
  // 如果已经同意了当前版本，则不需要再弹窗
  if (!needReAgree) return;
  const { default: UserAgreement } = await import("@/components/Modal/UserAgreement.vue");
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
        },
      });
    },
    onEsc: () => {
      window.$message.warning("请先阅读并同意用户协议");
    },
  });
};

/** 打开歌单界面配置弹窗 */
export const openPlaylistPageManager = async () => {
  const { default: PlaylistPageManager } =
    await import("@/components/Modal/Setting/PlaylistPageManager.vue");
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "500px" },
    title: "歌单界面配置",
    content: () => {
      return h(PlaylistPageManager);
    },
  });
};

/** 打开全屏播放器配置弹窗 */
export const openFullscreenPlayerManager = async () => {
  const { default: FullscreenPlayerManager } =
    await import("@/components/Modal/Setting/FullscreenPlayerManager.vue");
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "500px" },
    title: "全屏播放器配置",
    content: () => {
      return h(FullscreenPlayerManager);
    },
  });
};

/** 打开右键菜单配置弹窗 */
export const openContextMenuManager = async () => {
  const { default: ContextMenuManager } =
    await import("@/components/Modal/Setting/ContextMenuManager.vue");
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "500px" },
    title: "右键菜单配置",
    content: () => {
      return h(ContextMenuManager);
    },
  });
};

// 用户登录
export const openUserLogin = async (
  showTip: boolean = false,
  force: boolean = false,
  onSuccess?: () => void,
  disableUid: boolean = false,
) => {
  if (showTip) window.$message.warning("请登录后使用");
  const { default: Login } = await import("@/components/Modal/Login/Login.vue");
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    maskClosable: false,
    closeOnEsc: false,
    closable: false,
    style: { width: "400px" },
    content: () => {
      return h(Login, {
        force,
        disableUid,
        onClose: () => modal.destroy(),
        onSuccess: () => {
          modal.destroy();
          if (onSuccess) onSuccess();
        },
      });
    },
  });
};

/**
 * 跳转到歌手
 * @param data 歌手信息
 * @param id 歌手 id
 * @returns
 */
export const openJumpArtist = async (data: SongType["artists"], id?: number) => {
  // 若 data 为数组且只有一个元素，则直接跳转
  if (isArray(data) && data.length <= 2 && id) {
    router.push({ name: "artist", query: { id } });
    return;
  }
  const { default: JumpArtist } = await import("@/components/Modal/JumpArtist.vue");
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
export const openSongInfoEditor = async (song: SongType) => {
  const { default: SongInfoEditor } = await import("@/components/Modal/SongInfoEditor.vue");
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    trapFocus: false,
    style: { width: "600px" },
    title: "编辑歌曲信息",
    content: () => {
      return h(SongInfoEditor, { song, onClose: () => modal.destroy() });
    },
  });
};

// 添加到歌单
export const openPlaylistAdd = async (data: SongType[], isLocal: boolean) => {
  if (!data.length) return window.$message.warning("请正确选择歌曲");
  if (!isLogin() && !isLocal) return openUserLogin();
  const { default: PlaylistAdd } = await import("@/components/Modal/PlaylistAdd.vue");
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
export const openBatchList = async (data: SongType[], isLocal: boolean, playListId?: number) => {
  const { default: BatchList } = await import("@/components/Modal/BatchList.vue");
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
export const openCloudMatch = async (id: number, index: number) => {
  const { default: CloudMatch } = await import("@/components/Modal/CloudMatch.vue");
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
export const openCreatePlaylist = async (isLocal: boolean = false) => {
  const { default: CreatePlaylist } = await import("@/components/Modal/CreatePlaylist.vue");
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

/**
 * 编辑歌单
 * @param id 歌单 id
 * @param data 歌单信息
 * @param func 回调函数
 * @param isLocal 是否为本地歌单
 */
export const openUpdatePlaylist = async (
  id: number,
  data: CoverType,
  func: () => Promise<void>,
  isLocal: boolean = false,
) => {
  const { default: UpdatePlaylist } = await import("@/components/Modal/UpdatePlaylist.vue");
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "600px" },
    title: isLocal ? "编辑本地歌单" : "编辑歌单",
    content: () => {
      return h(UpdatePlaylist, {
        id,
        data,
        isLocal,
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
export const openDownloadSong = async (song: SongType) => {
  const dataStore = useDataStore();
  if (!isLogin()) return openUserLogin();
  // 是否可下载
  if (!song) return window.$message.warning("请正确选择歌曲");
  if (song.free !== 0 && dataStore.userData.vipType === 0 && !song?.pc) {
    return window.$message.warning("账号会员等级不足，请提升权限");
  }
  const { default: DownloadModal } = await import("@/components/Modal/DownloadModal.vue");
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
export const openDownloadSongs = async (songs: SongType[]): Promise<void> => {
  if (!isLogin()) return openUserLogin();
  if (!songs || songs.length === 0) {
    window.$message.warning("请选择要下载的歌曲");
    return;
  }
  const { default: DownloadModal } = await import("@/components/Modal/DownloadModal.vue");
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

// 打开设置
export const openSetting = async (type: SettingType = "general", scrollTo?: string) => {
  if (isModalOpen("setting", "设置页面已打开")) return;
  setModalOpen("setting");
  const { default: MainSetting } = await import("@/components/Setting/MainSetting.vue");
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
      setModalClosed("setting");
    },
  });
};

// 软件更新
export const openUpdateApp = async (data: UpdateInfoType) => {
  const { default: UpdateApp } = await import("@/components/Modal/UpdateApp.vue");
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

/** 打开播放速度弹窗 */
export const openChangeRate = async () => {
  const { default: ChangeRate } = await import("@/components/Modal/ChangeRate.vue");
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
export const openAutoClose = async () => {
  const { default: AutoClose } = await import("@/components/Modal/AutoClose.vue");
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

/** 打开 AB 循环弹窗 */
export const openABLoop = async () => {
  const { default: ABLoop } = await import("@/components/Modal/ABLoop.vue");
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "500px" },
    title: "AB 循环",
    content: () => {
      return h(ABLoop);
    },
  });
};

/** 打开均衡器弹窗 */
export const openEqualizer = async () => {
  const { default: Equalizer } = await import("@/components/Modal/Equalizer.vue");
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
export const openSongUnlockManager = async () => {
  const { default: SongUnlockManager } =
    await import("@/components/Modal/Setting/SongUnlockManager.vue");
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
export const openSidebarHideManager = async () => {
  const { default: SidebarHideManager } =
    await import("@/components/Modal/Setting/SidebarHideManager.vue");
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

/** 打开封面隐藏配置弹窗 */
export const openCoverManager = async () => {
  const { default: CoverManager } = await import("@/components/Modal/Setting/CoverManager.vue");
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "500px" },
    title: "封面隐藏配置",
    content: () => {
      return h(CoverManager);
    },
  });
};

/** 打开首页栏目配置弹窗 */
export const openHomePageSectionManager = async () => {
  const { default: HomePageSectionManager } =
    await import("@/components/Modal/Setting/HomePageSectionManager.vue");
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
export const openCopyLyrics = async () => {
  const { default: CopyLyrics } = await import("@/components/Modal/CopyLyrics.vue");
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

/** 打开歌曲详情复制弹窗 */
export const openCopySongInfo = async (songId: number) => {
  const { default: CopySongInfo } = await import("@/components/Modal/CopySongInfo.vue");
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "500px" },
    title: "歌曲详情复制",
    content: () => {
      return h(CopySongInfo, {
        songId,
        onClose: () => modal.destroy(),
      });
    },
  });
};

/** 打开 AMLL 服务器配置弹窗 */
export const openAMLLServer = async () => {
  const { default: AMLLServer } = await import("@/components/Modal/Setting/AMLLServer.vue");
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
export const openFontManager = async () => {
  const { default: FontManager } = await import("@/components/Modal/Setting/FontManager.vue");
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
export const openCustomCode = async () => {
  const { default: CustomCode } = await import("@/components/Modal/Setting/CustomCode.vue");
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
export const openStreamingServerConfig = async (
  server: StreamingServerConfigType | null,
  onSave: (config: Omit<StreamingServerConfigType, "id">) => void,
) => {
  const { default: StreamingServerConfig } =
    await import("@/components/Modal/Setting/StreamingServerConfig.vue");
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

/** 打开主题配置弹窗 */
export const openThemeConfig = async () => {
  if (isModalOpen("themeConfig", "主题配置已打开")) return;
  setModalOpen("themeConfig");
  const { default: ThemeConfig } = await import("@/components/Modal/ThemeConfig.vue");
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    showMask: false,
    draggable: true,
    style: { width: "500px" },
    title: "主题配置",
    size: "small",
    content: () => {
      return h(ThemeConfig);
    },
    onAfterLeave: () => {
      setModalClosed("themeConfig");
    },
  });
};

/** 打开界面缩放调整弹窗 */
export const openScalingModal = async () => {
  const { default: ScalingModal } = await import("@/components/Modal/ScalingModal.vue");
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    size: "small",
    autoFocus: false,
    showMask: false,
    style: { width: "400px" },
    title: "界面缩放",
    content: () => {
      return h(ScalingModal);
    },
  });
};

/** 打开本地音乐目录管理弹窗 */
export const openLocalMusicDirectoryModal = async () => {
  const { default: LocalMusicDirectory } =
    await import("@/components/Modal/Setting/LocalMusicDirectory.vue");
  window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    maskClosable: false,
    closeOnEsc: false,
    style: { width: "600px" },
    title: "目录管理",
    content: () => {
      return h(LocalMusicDirectory);
    },
  });
};

/** 打开歌词排除弹窗 */
export const openExcludeLyric = async () => {
  const { default: ExcludeLyrics } = await import("@/components/Modal/Setting/ExcludeLyrics.vue");
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "600px" },
    title: "歌词排除",
    content: () => {
      return h(ExcludeLyrics, {
        onClose: () => modal.destroy(),
      });
    },
  });
};

/** 打开评论排除弹窗 */
export const openExcludeComment = async () => {
  const { default: ExcludeComment } = await import("@/components/Modal/Setting/ExcludeComment.vue");
  const modal = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "600px" },
    title: "评论排除",
    content: () => {
      return h(ExcludeComment, {
        onClose: () => modal.destroy(),
      });
    },
  });
};
