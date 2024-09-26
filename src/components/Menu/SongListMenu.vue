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
import { useStatusStore, useSettingStore, useLocalStore, useDataStore } from "@/stores";
import { renderIcon, copyData } from "@/utils/helper";
import { deleteCloudSong } from "@/api/cloud";
import {
  openCloudMatch,
  openDownloadSong,
  openPlaylistAdd,
  openSongInfoEditor,
} from "@/utils/modal";
import player from "@/utils/player";

const router = useRouter();

const dataStore = useDataStore();
const localStore = useLocalStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();

// 右键菜单数据
const dropdownX = ref<number>(0);
const dropdownY = ref<number>(0);
const dropdownShow = ref<boolean>(false);
const dropdownOptions = ref<DropdownOption[]>([]);

// 开启右键菜单
const openDropdown = (
  e: MouseEvent,
  data: SongType[],
  song: SongType,
  index: number,
  type: "song" | "radio",
) => {
  try {
    e.preventDefault();
    dropdownShow.value = false;
    // 当前状态
    const isHasMv = !!song?.mv && song.mv !== 0;
    const isCloud = router.currentRoute.value.name === "cloud";
    const isSong = song.type === "song";
    const isLocal = !!song?.path;
    // 是否当前播放
    const isCurrent = statusStore.playIndex === index;
    console.log(isHasMv, isCloud, isLocal, data, index, settingStore.showTran);

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
          show: isSong && isHasMv,
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
            onClick: () => deleteLocalSong(song, data, index),
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
          show: !isLocal && isSong,
          props: { onClick: () => openDownloadSong(song) },
          icon: renderIcon("Download"),
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
const deleteLocalSong = (song: SongType, data: SongType[], index: number) => {
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
        data.splice(index, 1);
        localStore.deleteLocalSong(index);
        player.removeSongIndex(index);
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
        if (statusStore.playIndex === index) {
          player.nextOrPrev("next");
        }
        window.$message.success("删除成功");
      } else {
        window.$message.error("删除失败，请重试");
      }
    },
  });
};

defineExpose({ openDropdown });
</script>

<style lang="scss">
.delete-mata {
  display: flex;
}
</style>
