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
  <!-- 云盘歌曲纠正 -->
  <CloudSongMatch ref="cloudSongMatchRef" />
</template>

<script setup>
import { NIcon, NImage, NText } from "naive-ui";
import { storeToRefs } from "pinia";
import { musicData, siteData, siteStatus } from "@/stores";
import { useRouter } from "vue-router";
import { addSongToNext } from "@/utils/Player";
import { copyData } from "@/utils/helper";
import SvgIcon from "@/components/Global/SvgIcon";

const emit = defineEmits(["playSong", "delCloudSong", "deletePlaylistSong", "delLocalSong"]);
const data = siteData();
const music = musicData();
const router = useRouter();
const status = siteStatus();
const { playMode } = storeToRefs(status);
const { userData, userLikeData } = storeToRefs(data);

// 右键菜单数据
const dropdownX = ref(0);
const dropdownY = ref(0);
const dropdownShow = ref(false);
const dropdownOptions = ref(null);

// 子组件
const addPlaylistRef = ref(null);
const downloadSongRef = ref(null);
const cloudSongMatchRef = ref(null);

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
const renderSong = (song, isSong) => {
  return () =>
    h(
      "div",
      {
        className: "song-data",
      },
      [
        h(NImage, {
          src: song?.coverSize?.s || song?.cover,
          class: "cover",
          previewDisabled: true,
        }),
        h("div", { class: "song-detail" }, [
          h(NText, { class: "name" }, () => [song?.name || "未知曲目"]),
          isSong
            ? song.artists && Array.isArray(song.artists)
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
                )
            : h(NText, { class: "ar", depth: 3 }, () => ["电台节目"]),
        ]),
      ],
    );
};

// 打开右键菜单
const openDropdown = (e, data, song, index, sourceId, type) => {
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
    const isFm = playMode.value === "fm";
    const isSong = type === "song";
    const isLocalSong = !!song?.path;
    const isHasMv = !!song?.mv && song.mv !== 0;
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
          render: renderSong(song, isSong),
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
          show: isSong && playMode.value !== "dj" && music.getPlaySongData?.id !== song.id && !isFm,
          props: {
            onClick: () => {
              playMode.value = "song";
              addSongToNext(song);
            },
          },
          icon: renderIcon("play-next"),
        },
        {
          key: "add-pl",
          label: "添加到歌单",
          show: isSong && !isLocalSong,
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
          show: isSong && !isLocalSong,
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
          show: isSong && isHasMv,
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
          label: "更多操作",
          key: "others",
          show: !isLocalSong,
          icon: renderIcon("more"),
          children: [
            {
              key: "copy",
              label: `复制${isSong ? "歌曲" : "节目"} ID`,
              props: {
                onClick: () => {
                  const songId = song?.id?.toString();
                  copyData(songId);
                },
              },
              icon: renderIcon("content-copy"),
            },
            {
              key: "share",
              label: `分享${isSong ? "歌曲" : "节目"}链接`,
              props: {
                onClick: () => {
                  const shareUrl = isSong
                    ? `https://music.163.com/song?id=${song?.id?.toString()}`
                    : `https://music.163.com/#/dj?id=${song?.id?.toString()}`;
                  copyData(shareUrl, `复制${isSong ? "歌曲" : "节目"}链接`);
                },
              },
              icon: renderIcon("share"),
            },
          ],
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
              emit("deletePlaylistSong", data, song, index);
            },
          },
          icon: renderIcon("delete"),
        },
        {
          key: "edit",
          label: "云盘歌曲纠正",
          show: isCloud,
          props: {
            onClick: () => {
              cloudSongMatchRef.value?.openCloudSongMatch(song, index);
            },
          },
          icon: renderIcon("edit"),
        },
        {
          key: "delete",
          label: "从云盘中删除",
          show: isCloud,
          props: {
            onClick: () => {
              emit("delCloudSong", data, song, index);
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
          show: isLocalSong && music.getPlaySongData?.id !== song.id,
          props: {
            onClick: () => {
              emit("delLocalSong", data, song, index);
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
          show: isSong && !isLocalSong,
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
