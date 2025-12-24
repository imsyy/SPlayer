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

const emit = defineEmits<{ removeSong: [index: number[]] }>();

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
          label: "立即播放",
          props: {
            onClick: () => player.addNextSong(song, true),
          },
          icon: renderIcon("Play", { size: 18 }),
        },
        {
          key: "play-next",
          label: "下一首播放",
          show: !isCurrent && !statusStore.personalFmMode,
          props: {
            onClick: () => player.addNextSong(song, false),
          },
          icon: renderIcon("PlayNext", { size: 18 }),
        },
        {
          key: "playlist-add",
          label: "添加到歌单",
          props: {
            onClick: () => openPlaylistAdd([song], isLocal),
          },
          icon: renderIcon("AddList", { size: 18 }),
        },
        {
          key: "mv",
          label: "观看 MV",
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
          label: "不感兴趣",
          show: isDailyRecommend && isLoginNormal,
          props: {
            onClick: () => dislikeSong(song, index),
          },
          icon: renderIcon("HeartBroken"),
        },
        {
          key: "more",
          label: "更多操作",
          icon: renderIcon("Menu", { size: 18 }),
          children: [
            {
              key: "code-name",
              label: `复制${type === "song" ? "歌曲" : "节目"}名称`,
              props: {
                onClick: () => copyData(song.name),
              },
              icon: renderIcon("Copy", { size: 18 }),
            },
            {
              key: "code-id",
              label: `复制${type === "song" ? "歌曲" : "节目"} ID`,
              show: !isLocal,
              props: {
                onClick: () => copyData(song.id),
              },
              icon: renderIcon("Copy", { size: 18 }),
            },
            {
              key: "share",
              label: `分享${type === "song" ? "歌曲" : "节目"}链接`,
              show: !isLocal,
              props: {
                onClick: () =>
                  copyData(
                    `https://music.163.com/#/${type}?id=${song.id}`,
                    "已复制分享链接到剪切板",
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
              label: "音乐标签编辑",
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
          label: "导入至云盘",
          show: !isCloud && isLoginNormal && type === "song" && !isLocal,
          props: {
            onClick: () => importSongToCloud(song),
          },
          icon: renderIcon("Cloud"),
        },
        {
          key: "delete",
          label: "从歌单中删除",
          show: isUserPlaylist && isLoginNormal && !isCloud,
          props: {
            onClick: () => deleteSongs(playListId!, [song.id], () => emit("removeSong", [song.id])),
          },
          icon: renderIcon("Delete"),
        },
        {
          key: "cloud-delete",
          label: "从云盘中删除",
          show: isCloud,
          props: {
            onClick: () => deleteCloudSongData(song, index),
          },
          icon: renderIcon("Delete"),
        },
        {
          key: "delete",
          label: "从本地磁盘中删除",
          show: isLocal && !isCurrent,
          props: {
            onClick: () => deleteLocalSong(song),
          },
          icon: renderIcon("Delete"),
        },
        {
          key: "open-folder",
          label: "打开歌曲所在目录",
          show: isLocal,
          props: {
            onClick: () => window.electron.ipcRenderer.send("open-folder", song.path),
          },
          icon: renderIcon("SnippetFolder"),
        },
        {
          key: "cloud-match",
          label: "云盘歌曲纠正",
          show: isCloud,
          props: {
            onClick: () => openCloudMatch(song?.id, index),
          },
          icon: renderIcon("AutoFix"),
        },
        {
          key: "search",
          label: "同名搜索",
          props: {
            onClick: () => router.push({ name: "search", query: { keyword: song.name } }),
          },
          icon: renderIcon("Search"),
        },
        {
          key: "download",
          label: "下载歌曲",
          show: statusStore.isDeveloperMode && !isLocal && type === "song" && !isDownloading,
          props: { onClick: () => openDownloadSong(song) },
          icon: renderIcon("Download"),
        },
        {
          key: "retry-download",
          label: "重试下载",
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
    console.error("右键菜单出现异常：", error);
    window.$message.error("右键菜单出现异常");
  }
};

// 删除歌曲
const deleteLocalSong = (song: SongType) => {
  if (!song.path) return;
  window.$dialog.warning({
    title: "确认删除",
    content: () =>
      h("div", { style: { marginTop: "20px" } }, [
        h(NAlert, { showIcon: false }, { default: () => song.path }),
        h("div", { style: { marginTop: "20px" } }, [
          `确认从本地磁盘中删除 `,
          h("strong", null, song.name),
          `？该操作无法撤销！`,
        ]),
      ]),
    positiveText: "删除",
    negativeText: "取消",
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
        window.$message.success(`${song.name} 删除成功`);
      } else {
        window.$message.error(`${song.name} 删除失败，请重试`);
      }
    },
  });
};

// 删除云盘歌曲
const deleteCloudSongData = (song: SongType, index: number) => {
  window.$dialog.warning({
    title: "确认删除",
    content: `确认从云盘中删除 ${song.name}？该操作无法撤销！`,
    positiveText: "删除",
    negativeText: "取消",
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
        window.$message.success("删除成功");
      } else {
        window.$message.error("删除失败，请重试");
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
      window.$message.success("导入成功");
    } else {
      window.$message.error(failed?.msg || "导入失败，请重试");
    }
  } else {
    window.$message.error("导入失败，请重试");
  }
};

// 每日推荐 - 不感兴趣
const dislikeSong = async (song: SongType, index: number) => {
  if (!song?.id) return;
  const loadingMessage = window.$message.loading("正在不感兴趣...", { duration: 0 });
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
      window.$message.success("已标记为不感兴趣");
    } else {
      window.$message.error("操作失败，请重试");
    }
  } catch (error) {
    // 关闭 loading
    loadingMessage.destroy();
    window.$message.error("操作失败，请重试");
    console.error("不感兴趣操作失败：", error);
  }
};

defineExpose({ openDropdown });
</script>

<style lang="scss">
.delete-mata {
  display: flex;
}
</style>
