<template>
  <!-- 废弃 -->
  <n-data-table
    class="table"
    id="table"
    row-class-name="table-list"
    :columns="listColumns"
    :data="listData"
    :row-props="rowProps"
    :loading="listData[0] ? false : true"
  />
</template>

<script setup>
import { NText, NIcon, NAvatar, NTag } from "naive-ui";
import {
  PlayCircleOutlineFilled,
  AddCircleOutlineFilled,
  PlayArrowRound,
} from "@vicons/material";
import AllArtists from "./AllArtists.vue";
import { musicStore } from "@/store/index";
import { useRouter } from "vue-router";

const router = useRouter();
const music = musicStore();

const props = defineProps({
  // 表格数据
  listData: {
    type: Object,
    default: [],
  },
  // 表格列隐藏
  hideArtist: {
    type: Boolean,
    default: false,
  },
  hideAlbum: {
    type: Boolean,
    default: false,
  },
});

// 表头设置
const createColumns = ({ jumpLink }) => {
  return [
    {
      title: "序号",
      key: "num",
      className: "num",
      render(row) {
        return music.getPlaySongData
          ? music.getPlaySongData.id == row.id
            ? h(NIcon, {
                size: "28px",
                component: PlayArrowRound,
              })
            : h(NText, null, { default: () => row.num })
          : h(NText, null, { default: () => row.num });
      },
    },
    {
      key: "pic",
      className: "pic",
      render(row) {
        return h(NAvatar, {
          lazy: true,
          intersectionObserverOptions: {
            root: "#table",
          },
          src:
            row.album.picUrl && row.album
              ? row.album.picUrl.replace(/^http:/, "https:") + "?param=60y60"
              : null,
          fallbackSrc: "/images/ico/user-filling.svg",
        });
      },
    },
    {
      title: "歌曲",
      key: "name",
      render(row) {
        return h("div", null, [
          h("div", { class: "song-name" }, [
            h(
              NText,
              {
                depth: 2,
                className: "jump",
                onClick: (e) => jumpLink(row.id, 1, e),
              },
              { default: () => row.name }
            ),
            h(
              NTag,
              {
                round: true,
                bordered: false,
                class: row.fee == 1 ? "" : "hide",
                size: "small",
                style: "margin-left:8px",
                color: { color: "#f55e55", textColor: "#ffffffd1" },
              },
              { default: () => "VIP" }
            ),
            h(
              NTag,
              {
                round: true,
                bordered: false,
                class: row.pc ? "" : "hide",
                size: "small",
                type: "info",
                style: "margin-left:8px",
              },
              { default: () => "云盘" }
            ),
          ]),
          h("div", { style: "font-size: 12px;" }, [
            h(NText, { depth: 3 }, { default: () => row.alia[0] }),
          ]),
        ]);
      },
    },
    {
      key: "controls",
      className: "controls",
      render(row) {
        return h("div", { class: "icon" }, [
          h(NIcon, {
            onClick: () => addPlaylists(props.listData, row),
            size: "28px",
            component: PlayCircleOutlineFilled,
          }),
          h(NIcon, {
            size: "28px",
            component: AddCircleOutlineFilled,
          }),
        ]);
      },
    },
    {
      title: "歌手",
      key: "artist",
      className: props.hideArtist ? "hide" : "",
      render(row) {
        return h(AllArtists, {
          artistsData: row.artist,
        });
      },
    },
    {
      title: "专辑",
      key: "album",
      className: props.hideAlbum ? "hide" : "",
      render(row) {
        return h(
          "span",
          {
            className: "jump",
            onClick: (e) => jumpLink(row.album.id, 10, e),
          },
          { default: () => row.album.name }
        );
      },
    },
    {
      title: "时长",
      key: "time",
      className: "time",
    },
  ];
};

// 生成表格
let listColumns = ref(
  createColumns({
    // 跳转链接
    jumpLink(id, type, e) {
      e.stopPropagation();
      console.log(id, type);
      switch (type) {
        case 1:
          router.push(`/song?id=${id}`);
          break;
        case 10:
          router.push(`/album?id=${id}`);
          break;
        default:
        break;
      }
    },
  })
);

// 行事件
const rowProps = (row) => {
  return {
    class: music.getPlaySongData
      ? music.getPlaySongData.id == row.id
        ? "table-list play"
        : "table-list"
      : "table-list",
    style: { cursor: "pointer" },
    // onClick: () => {
    //   console.log(row);
    // },
  };
};

// 添加歌单
const addPlaylists = (data, row) => {
  console.log(data, row);
  // music.setPlaySongLink(null);
  music.setPlaylists(data);
  music.addSongToPlaylists(row);
};
</script>

<style lang="scss" scoped>
.table {
  :deep(.n-data-table-wrapper) {
    .n-data-table-thead {
      .num,
      .time {
        text-align: center;
      }
    }
    .table-list {
      transition: all 0.3s;
      &:hover {
        .controls {
          .icon {
            opacity: 1;
            transform: scale(1);
          }
        }
      }
      &.play {
        td {
          color: $mainColor;
          background-color: #f55e5520;
          .n-text {
            color: $mainColor;
          }
        }
      }
      .controls {
        width: 80px;
        .icon {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          opacity: 0;
          transform: scale(0.8);
          transition: all 0.3s;
          .n-icon {
            opacity: 0.6;
            transition: all 0.3s;
            &:hover {
              transform: scale(1.1);
              opacity: 1;
              color: $mainColor;
            }
            &:active {
              transform: scale(1);
            }
          }
        }
      }
      .hide {
        display: none;
      }
      .pic {
        width: 60px;
        .n-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }
      .num {
        text-align: center;
        width: 60px;
        .n-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: auto;
        }
      }
      .time {
        text-align: center;
        width: 80px;
      }
      .song-name {
        display: flex;
        align-items: center;
        flex-direction: row;
        .n-tag {
          height: 18px;
          transform: translateY(-1px);
        }
      }
      .jump {
        cursor: pointer;
        transition: all 0.3s;
        &:hover {
          color: $mainColor;
        }
      }
    }
  }
}
</style>