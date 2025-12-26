<!-- 歌曲列表 - 右键菜单 -->
<template>
  <n-dropdown
    :x="dropdownX"
    :y="dropdownY"
    :show="dropdownShow"
    :options="dropdownOptions"
    class="song-list-menu"
    placement="bottom-start"
    trigger="manual"
    size="large"
    @select="dropdownShow = false"
    @clickoutside="dropdownShow = false"
  >
  </n-dropdown>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import { NAlert, type DropdownOption } from "naive-ui";
import { useStatusStore, useDataStore, useMusicStore } from "@/stores";
import { useDownloadManager } from "@/core/resource/DownloadManager";
import { renderIcon, copyData } from "@/utils/helper";
import { deleteCloudSong, importCloudSong } from "@/api/cloud";
import {
  openCloudMatch,
  openDownloadSong,
  openPlaylistAdd,
  openSongInfoEditor,
} from "@/utils/modal";
import { deleteSongs, isLogin } from "@/utils/auth";
import { songUrl } from "@/api/song";
import { dailyRecommendDislike } from "@/api/rec";
import { formatSongsList } from "@/utils/format";
import { usePlayerController } from "@/core/player/PlayerController";
import { useI18n } from "vue-i18n";

const emit = defineEmits<{ removeSong: [index: number[]] }>();

const { t } = useI18n();
const router = useRouter();
const dataStore = useDataStore();
const musicStore = useMusicStore();
const statusStore = useStatusStore();

const player = usePlayerController();
const downloadManager = useDownloadManager();

// 右键菜单数据
const dropdownX = ref<number>(0);
const dropdownY = ref<number>(0);
const dropdownShow = ref<boolean>(false);
const dropdownOptions = ref<DropdownOption[]>([]);

// 开启右键菜单
const openDropdown = (
  e: MouseEvent,
  _data: SongType[],
  song: SongType,
  index: number,
  type: "song" | "radio",
  playListId?: number,
  isDailyRecommend: boolean = false,
) => {
  try {
    e.preventDefault();
    dropdownShow.value = false;
    // 用户歌单
    const userPlaylistsData = dataStore.userLikeData.playlists?.filter(
      (pl) => pl.userId === dataStore.userData.userId,
    );
    // 当前状态
    const isHasMv = !!song?.mv && song.mv !== 0;
    const isCloud = router.currentRoute.value.name === "cloud";
    const isLocal = !!song?.path;
    const isLoginNormal = isLogin() === 1;
    // 是否当前播放
    const isCurrent = statusStore.playIndex === index;
    // 是否为用户歌单
    const isUserPlaylist = !!playListId && userPlaylistsData.some((pl) => pl.id === playListId);
    // 是否正在下载或下载失败
    const isDownloading = dataStore.downloadingSongs.some((item) => item.song.id === song.id);
    // 生成菜单
    nextTick().then(() => {
      dropdownOptions.value = [
        {
          key: "play",
          label: t("player.playNow"),
          props: {
            onClick: () => player.addNextSong(song, true),
          },
          icon: renderIcon("Play", { size: 18 }),
        },
        {
          key: "play-next",
          label: t("player.playNext"),
          show: !isCurrent && !statusStore.personalFmMode,
          props: {
            onClick: () => player.addNextSong(song, false),
          },
          icon: renderIcon("PlayNext", { size: 18 }),
        },
        {
          key: "playlist-add",
          label: t("player.addToPlaylist"),
          props: {
            onClick: () => openPlaylistAdd([song], isLocal),
          },
          icon: renderIcon("AddList", { size: 18 }),
        },
        {
          key: "mv",
          label: t("player.watchMV"),
          show: type === "song" && isHasMv,
          props: {
            onClick: () => router.push({ name: "video", query: { id: song.mv, type: "mv" } }),
          },
          icon: renderIcon("Video", { size: 18 }),
        },
        {
          key: "line-1",
          type: "divider",
        },
        {
          key: "dislike",
          label: t("player.notInterested"),
          show: isDailyRecommend && isLoginNormal,
          props: {
            onClick: () => dislikeSong(song, index),
          },
          icon: renderIcon("HeartBroken"),
        },
        {
          key: "more",
          label: t("player.moreOptions"),
          icon: renderIcon("Menu", { size: 18 }),
          children: [
            {
              key: "code-name",
              label: `${t("player.copyName")} (${type === "song" ? t("player.song") : t("player.program")})`,
              props: {
                onClick: () => copyData(song.name),
              },
              icon: renderIcon("Copy", { size: 18 }),
            },
            {
              key: "code-id",
              label: `${t("player.copyId")} (${type === "song" ? t("player.song") : t("player.program")})`,
              show: !isLocal,
              props: {
                onClick: () => copyData(song.id),
              },
              icon: renderIcon("Copy", { size: 18 }),
            },
            {
              key: "share",
              label: `${t("player.shareLink")} (${type === "song" ? t("player.song") : t("player.program")})`,
              show: !isLocal,
              props: {
                onClick: () =>
                  copyData(
                    `https://music.163.com/#/${type}?id=${song.id}`,
                    t("general.copyShareLinkSuccess"),
                  ),
              },
              icon: renderIcon("Share", { size: 18 }),
            },
            {
              key: "line-2",
              type: "divider",
              show: isLocal,
            },
            {
              key: "meta-edit",
              label: t("player.metaEdit"),
              show: isLocal,
              props: {
                onClick: () => {
                  if (song.path) openSongInfoEditor(song);
                },
              },
              icon: renderIcon("EditNote", { size: 20 }),
            },
          ],
        },
        {
          key: "line-two",
          type: "divider",
        },
        {
          key: "cloud-import",
          label: t("player.importToCloud"),
          show: !isCloud && isLoginNormal && type === "song" && !isLocal,
          props: {
            onClick: () => importSongToCloud(song),
          },
          icon: renderIcon("Cloud"),
        },
        {
          key: "delete",
          label: t("player.deleteFromPlaylist"),
          show: isUserPlaylist && isLoginNormal && !isCloud,
          props: {
            onClick: () => deleteSongs(playListId!, [song.id], () => emit("removeSong", [song.id])),
          },
          icon: renderIcon("Delete"),
        },
        {
          key: "cloud-delete",
          label: t("player.deleteFromCloud"),
          show: isCloud,
          props: {
            onClick: () => deleteCloudSongData(song, index),
          },
          icon: renderIcon("Delete"),
        },
        {
          key: "delete",
          label: t("player.deleteFromLocal"),
          show: isLocal && !isCurrent,
          props: {
            onClick: () => deleteLocalSong(song),
          },
          icon: renderIcon("Delete"),
        },
        {
          key: "open-folder",
          label: t("player.openFolder"),
          show: isLocal,
          props: {
            onClick: () => window.electron.ipcRenderer.send("open-folder", song.path),
          },
          icon: renderIcon("SnippetFolder"),
        },
        {
          key: "cloud-match",
          label: t("player.cloudMatch"),
          show: isCloud,
          props: {
            onClick: () => openCloudMatch(song?.id, index),
          },
          icon: renderIcon("AutoFix"),
        },
        {
          key: "search",
          label: t("player.searchSameName"),
          props: {
            onClick: () => router.push({ name: "search", query: { keyword: song.name } }),
          },
          icon: renderIcon("Search"),
        },
        {
          key: "download",
          label: t("player.download"),
          show: statusStore.isDeveloperMode && !isLocal && type === "song" && !isDownloading,
          props: { onClick: () => openDownloadSong(song) },
          icon: renderIcon("Download"),
        },
        {
          key: "retry-download",
          label: t("player.retryDownload"),
          show: statusStore.isDeveloperMode && isDownloading,
          props: { onClick: () => downloadManager.retryDownload(song.id) },
          icon: renderIcon("Refresh"),
        },
      ];
      // 显示菜单
      dropdownX.value = e.clientX;
      dropdownY.value = e.clientY;
      dropdownShow.value = true;
    });
  } catch (error) {
    console.error(t("player.menuError"), error);
    window.$message.error(t("player.menuError"));
  }
};

// 删除歌曲
const deleteLocalSong = (song: SongType) => {
  if (!song.path) return;
  window.$dialog.warning({
    title: t("player.confirmDelete"),
    content: () =>
      h("div", { style: { marginTop: "20px" } }, [
        h(NAlert, { showIcon: false }, { default: () => song.path }),
        h("div", { style: { marginTop: "20px" } }, [
          `${t("player.confirmDelete")} `,
          h("strong", null, song.name),
          ` ${t("player.localDisk")}?`,
        ]),
      ]),
    positiveText: t("player.delete"),
    negativeText: t("general.dialog.cancel"),
    onPositiveClick: async () => {
      const result = await window.electron.ipcRenderer.invoke("delete-file", song.path);
      if (result) {
        // 通知父组件删除歌曲
        emit("removeSong", [song.id]);
        // 从播放列表中删除该歌曲
        const currentPlayList = dataStore.playList;
        const songToRemoveIndex = currentPlayList.findIndex((playSong) => playSong.id === song.id);
        if (songToRemoveIndex !== -1) {
          player.removeSongIndex(songToRemoveIndex);
        }
        window.$message.success(`${song.name} ${t("player.deleteSuccess")}`);
      } else {
        window.$message.error(`${song.name} ${t("player.deleteFail")}`);
      }
    },
  });
};

// 删除云盘歌曲
const deleteCloudSongData = (song: SongType, index: number) => {
  window.$dialog.warning({
    title: t("player.confirmDelete"),
    content: `${t("player.confirmDelete")} ${song.name} ${t("player.cloudDisk")}?`,
    positiveText: t("player.delete"),
    negativeText: t("general.dialog.cancel"),
    onPositiveClick: async () => {
      const result = await deleteCloudSong(song.id);
      if (result.code == 200) {
        dataStore.cloudPlayList.splice(index, 1);
        dataStore.setCloudPlayList(dataStore.cloudPlayList);
        // 从播放列表中删除该歌曲
        const currentPlayList = dataStore.playList;
        const songToRemoveIndex = currentPlayList.findIndex((playSong) => playSong.id === song.id);
        if (songToRemoveIndex !== -1) {
          player.removeSongIndex(songToRemoveIndex);
        }
        window.$message.success(t("player.deleteSuccess"));
      } else {
        window.$message.error(t("player.deleteFail"));
      }
    },
  });
};

// 导入至云盘
const importSongToCloud = async (song: SongType) => {
  if (!song?.id) return;
  // 获取歌曲下载信息
  const songData = await songUrl(song.id);
  const songDetail = songData?.data?.[0];
  // 开始尝试导入
  const { id, type, size, br, md5 } = songDetail;
  const result = await importCloudSong(song?.name, type, size, Math.floor(br / 1000), md5, id);
  if (result.code === 200) {
    const failed = result?.data?.failed?.[0];
    if (failed?.code !== -200) {
      window.$message.success(t("player.importSuccess"));
    } else {
      window.$message.error(failed?.msg || t("player.importFail"));
    }
  } else {
    window.$message.error(t("player.importFail"));
  }
};

// 每日推荐 - 不感兴趣
const dislikeSong = async (song: SongType, index: number) => {
  if (!song?.id) return;
  const loadingMessage = window.$message.loading(t("player.markingNotInterested"), { duration: 0 });
  try {
    const result = await dailyRecommendDislike(song.id);
    // 关闭 loading
    loadingMessage.destroy();
    if (result.code === 200) {
      // 创建新数组以触发响应式更新
      const currentList = [...musicStore.dailySongsData.list];
      // 从列表中移除当前歌曲
      currentList.splice(index, 1);
      // 替换原歌曲
      if (result.data) {
        const formattedSong = formatSongsList([result.data])[0];
        currentList.splice(index, 0, formattedSong);
      }
      // 更新列表（同时更新 timestamp 触发完整响应式更新）
      musicStore.dailySongsData = {
        list: currentList,
        timestamp: Date.now(),
      };
      window.$message.success(t("player.markedNotInterested"));
    } else {
      window.$message.error(t("player.operationFailed"));
    }
  } catch (error) {
    // 关闭 loading
    loadingMessage.destroy();
    window.$message.error(t("player.operationFailed"));
    console.error(t("player.operationFailed"), error);
  }
};

defineExpose({ openDropdown });
</script>

<style lang="scss">
.delete-mata {
  display: flex;
}
</style>
