<!-- 歌曲列表 - 右键菜单 -->
<template>
  <n-dropdown
    :x="dropdownX"
    :y="dropdownY"
    :show="dropdownShow"
    :options="dropdownOptions"
    class="song-list-dropdown"
    placement="bottom-start"
    trigger="manual"
    size="large"
    @select="dropdownShow = false"
    @clickoutside="dropdownShow = false"
  >
  </n-dropdown>
  <!-- 添加到歌单 -->
  <AddPlaylist ref="addPlaylistRef" />
  <!-- 下载歌曲 -->
  <DownloadSong ref="downloadSongRef" />
</template>

<script setup>
import { NIcon, NImage, NText } from "naive-ui";
import { storeToRefs } from "pinia";
import { musicData, siteData } from "@/stores";
import { useRouter } from "vue-router";
import { addSongToNext } from "@/utils/Player";
import { setCloudDel } from "@/api/cloud";
import { addSongToPlayList } from "@/api/playlist";
import SvgIcon from "@/components/Global/SvgIcon";

const emit = defineEmits(["playSong"]);
const router = useRouter();
const music = musicData();
const data = siteData();
const { playSongData, playMode } = storeToRefs(music);
const { userData, userLikeData } = storeToRefs(data);

// 右键菜单数据
const dropdownX = ref(0);
const dropdownY = ref(0);
const dropdownShow = ref(false);
const dropdownOptions = ref(null);

// 子组件
const addPlaylistRef = ref(null);
const downloadSongRef = ref(null);

// 图标渲染
const renderIcon = (icon, size, translate = 0) => {
  return () =>
    h(
      NIcon,
      {
        size: size ?? "18",
        style: { transform: `translateX(2px) translateY(${translate}px)` },
      },
      () => h(SvgIcon, { icon }),
    );
};

// 歌曲信息
const renderSong = (song) => {
  return () =>
    h(
      "div",
      {
        className: "song-data",
      },
      [
        h(NImage, { src: song?.coverSize?.s || song?.cover, class: "cover" }),
        h("div", { class: "song-detail" }, [
          h(NText, { class: "name" }, () => [song?.name || "未知曲目"]),
          song.artists && Array.isArray(song.artists)
            ? h(
                "div",
                { class: "all-ar" },
                song.artists.map((ar) =>
                  h(NText, { key: ar.id, class: "ar", depth: 3 }, () => [ar.name]),
                ),
              )
            : h(
                "div",
                { class: "all-ar" },
                h(NText, { class: "ar", depth: 3 }, () => [song.artists || "未知艺术家"]),
              ),
        ]),
      ],
    );
};

// 打开右键菜单
const openDropdown = (e, data, song, index, sourceId) => {
  try {
    e.preventDefault();
    dropdownShow.value = false;
    // 用户 id
    const userId = userData.value?.userId;
    // 用户歌单
    const userPlaylistsData = userLikeData.value.playlists?.filter(
      (playlist) => playlist.userId === userId,
    );
    // 当前状态
    const isLocalSong = song?.path ? true : false;
    const isCloud = router.currentRoute.value.name === "cloud";
    const isUserPlaylist = sourceId !== 0 && userPlaylistsData.some((pl) => pl.id == sourceId);
    // 生成菜单
    nextTick().then(() => {
      // 右键菜单数据
      dropdownOptions.value = [
        {
          key: "song-data",
          type: "render",
          show: !isLocalSong,
          render: renderSong(song),
        },
        {
          key: "line-song",
          type: "divider",
          show: !isLocalSong,
        },
        {
          key: "play",
          label: "立即播放",
          props: {
            onClick: () => {
              emit("playSong", data, song, index);
            },
          },
          icon: renderIcon("play", 20),
        },
        {
          key: "next-play",
          label: "下一首播放",
          show: playSongData.value?.id === song.id || playMode.value === "fm" ? false : true,
          props: {
            onClick: () => {
              addSongToNext(song);
            },
          },
          icon: renderIcon("play-next"),
        },
        {
          key: "add-pl",
          label: "添加到歌单",
          show: song?.path ? false : true,
          props: {
            onClick: () => {
              addPlaylistRef.value?.openAddToPlaylist(song?.id);
            },
          },
          icon: renderIcon("playlist-add", 20),
        },
        {
          key: "comment",
          label: "查看评论",
          show: song?.path ? false : true,
          props: {
            onClick: () => {
              router.push({
                path: "/comment",
                query: {
                  id: song.id,
                },
              });
            },
          },
          icon: renderIcon("comment-text", 18, 1),
        },
        {
          key: "mv",
          label: "观看 MV",
          show: song.mv && song.mv !== 0 ? true : false,
          props: {
            onClick: () => {
              router.push({
                path: "/videos-player",
                query: {
                  id: song.mv,
                },
              });
            },
          },
          icon: renderIcon("video"),
        },
        {
          key: "line-cloud",
          type: "divider",
          show: isCloud || isUserPlaylist || isLocalSong,
        },
        {
          key: "delete",
          label: "从歌单中删除",
          show: !isCloud && isUserPlaylist,
          props: {
            onClick: () => {
              deletePlaylistSong(sourceId, song, data, index);
            },
          },
          icon: renderIcon("delete"),
        },
        {
          key: "delete",
          label: "从云盘中删除",
          show: isCloud,
          props: {
            onClick: () => {
              delCloudSong(data, song, index);
            },
          },
          icon: renderIcon("delete"),
        },
        {
          key: "open-local",
          label: "打开歌曲所在目录",
          show: isLocalSong,
          props: {
            onClick: () => {
              electron.ipcRenderer.send("openSongLocal", song?.path);
            },
          },
          icon: renderIcon("folder-music"),
        },
        {
          key: "delete",
          label: "从本地磁盘中删除",
          show: isLocalSong,
          props: {
            onClick: () => {
              delLocalSong(data, song, index);
            },
          },
          icon: renderIcon("delete"),
        },
        {
          key: "line-search",
          type: "divider",
        },
        {
          key: "search",
          label: "同名搜索",
          props: {
            onClick: () => {
              router.push({
                path: "/search/songs",
                query: {
                  keywords: song.name,
                },
              });
            },
          },
          icon: renderIcon("search-rounded", 20, 1),
        },
        {
          key: "download",
          label: "下载歌曲",
          show: !isLocalSong,
          props: {
            onClick: () => {
              downloadSongRef.value?.openDownloadModal(song);
            },
          },
          icon: renderIcon("download", 20, 1),
        },
      ];
      // 右键菜单状态
      dropdownShow.value = true;
      dropdownX.value = e.clientX;
      dropdownY.value = e.clientY;
    });
  } catch (error) {
    console.error("右键菜单出现异常：", error);
    $message.warning("右键菜单出现异常");
  }
};

// 云盘歌曲删除
const delCloudSong = (data, song, index) => {
  console.log(data, song, index);
  $dialog.warning({
    title: "确认删除",
    content: `确认从云盘中删除 ${song.name}？该操作无法撤销！`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: async () => {
      const result = await setCloudDel(song.id);
      if (result.code == 200) {
        data.splice(index, 1);
        $message.success("删除成功");
      } else {
        $message.error("删除失败，请重试");
      }
    },
  });
};

// 歌单歌曲删除
const deletePlaylistSong = (pid, song, data, index) => {
  $dialog.warning({
    title: "确认删除",
    content: `确认从歌单中移除 ${song.name}？该操作无法撤销！`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: async () => {
      const result = await addSongToPlayList(pid, song?.id, "del");
      if (result.status === 200) {
        data.length === 1 ? data.splice(0, 1, "empty") : data.splice(index, 1);
        $message.success("歌曲删除成功");
      } else {
        $message.error("歌曲删除失败，请重试");
      }
    },
  });
};

// 本地歌曲删除
const delLocalSong = (data, song, index) => {
  $dialog.warning({
    title: "确认删除",
    content: `确认从本地磁盘中删除 ${song.name}？该操作无法撤销！`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: async () => {
      console.log(data, song, index);
      const result = await electron.ipcRenderer.invoke("deleteFile", song?.path);
      if (result) {
        data.length === 1 ? data.splice(0, 1, "empty") : data.splice(index, 1);
        $message.success("歌曲删除成功");
      } else {
        $message.error("歌曲删除失败，请重试");
      }
    },
  });
};

defineExpose({
  openDropdown,
});
</script>

<style lang="scss">
.song-list-dropdown {
  .song-data {
    max-width: 300px;
    margin: 10px 16px 16px 16px;
    display: flex;
    flex-direction: row;
    align-items: center;
    .cover {
      margin-right: 12px;
      width: 60px;
      height: 60px;
      border-radius: 8px;
    }
    .song-detail {
      padding-right: 20px;
      .name {
        font-size: 16px;
      }
      .all-ar {
        margin-top: 4px;
        font-size: 13px;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
        overflow: hidden;
        word-break: break-all;
        .ar {
          display: inline-flex;
          &::after {
            content: "/";
            margin: 0 4px;
          }
          &:last-child {
            &::after {
              display: none;
            }
          }
        }
      }
    }
  }
}
</style>
