<template>
  <Transition mode="out-in">
    <div class="datalists" v-if="listData[0]">
      <n-card
        v-for="item in listData"
        :key="item"
        :class="
          music.getPlaySongData && music.getPlaySongData.id == item.id
            ? 'songs play'
            : 'songs'
        "
        :content-style="{
          padding: '16px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }"
        hoverable
        @dblclick="
          setting.listClickMode === 'dblclick' ? playSong(listData, item) : null
        "
        @click="checkCanClick(listData, item)"
        @contextmenu="openRightMenu($event, item)"
      >
        <n-avatar
          v-if="item.album?.picUrl"
          class="pic"
          :src="item.album.picUrl.replace(/^http:/, 'https:') + '?param=60y60'"
          fallback-src="/images/pic/default.png"
        />
        <div class="num" v-else-if="item.num">
          <n-text :depth="2" v-html="item.num" />
        </div>
        <div class="name">
          <div class="title">
            <n-text
              class="text-hidden"
              depth="2"
              v-html="item.name"
              @click.stop="jumpLink(item.id, 1)"
            />
            <n-tag
              v-if="item.fee == 1 || item.fee == 4"
              class="vip"
              round
              :bordered="false"
              size="small"
            >
              {{ item.fee == 1 ? "VIP" : "数字专辑" }}
            </n-tag>
            <n-tag
              v-if="item.pc"
              class="cloud"
              round
              type="info"
              size="small"
              :bordered="false"
            >
              云盘
            </n-tag>
            <n-tag
              v-if="item.mv"
              class="mv"
              round
              type="warning"
              size="small"
              :bordered="false"
              @click.stop="router.push(`/video?id=${item.mv}`)"
            >
              MV
            </n-tag>
          </div>
          <div class="meta">
            <AllArtists
              v-if="item.artist"
              class="text-hidden"
              :artistsData="item.artist"
            />
            <n-text
              class="alia text-hidden"
              depth="3"
              v-if="item.alia && item.alia[0]"
              v-html="item.alia[0]"
            />
          </div>
        </div>
        <div class="album" v-if="!hideAlbum && item.album">
          <n-text
            v-html="item.album.name"
            @click.stop="jumpLink(item.album.id, 10)"
          />
        </div>
        <div class="action">
          <n-icon
            class="like"
            size="20"
            @click.stop="
              music.getSongIsLike(item.id)
                ? music.changeLikeList(item.id, false)
                : music.changeLikeList(item.id, true)
            "
          >
            <Like
              :theme="music.getSongIsLike(item.id) ? 'filled' : 'outline'"
            />
          </n-icon>
          <n-icon
            class="download"
            size="20"
            @click.stop="downloadSongRef.openDownloadModel(item)"
          >
            <DownloadFour theme="filled" />
          </n-icon>
          <n-icon
            class="more"
            size="20"
            :component="More"
            @click.stop="openDrawer(item)"
          />
        </div>
        <n-text class="time" v-html="item.time" />
      </n-card>
      <!-- 右键菜单 -->
      <n-dropdown
        style="--n-font-size: 14px; --n-border-radius: 6px"
        placement="bottom-start"
        trigger="manual"
        size="large"
        :x="rightMenuX"
        :y="rightMenuY"
        :options="rightMenuOptions"
        :show="rightMenuShow"
        :on-clickoutside="onClickoutside"
        @select="rightMenuShow = false"
      />
      <!-- 移动端抽屉 -->
      <n-drawer
        class="drawer"
        v-model:show="drawerShow"
        placement="bottom"
        height="70vh"
        style="border-radius: 8px 8px 0 0"
      >
        <n-drawer-content
          v-if="drawerData"
          :native-scrollbar="false"
          body-content-style="padding: 0"
          closable
        >
          <template #header>
            <SmallSongData :songData="drawerData" notJump />
          </template>
          <div class="menu">
            <div
              class="item"
              @click="
                () => {
                  playSong(listData, drawerData);
                  drawerShow = false;
                }
              "
            >
              <n-icon size="20">
                <PlayOne theme="filled" />
              </n-icon>
              <n-text>立即播放</n-text>
            </div>
            <div
              v-if="
                !music.getPersonalFmMode &&
                music.getPlaySongData.id != drawerData.id
              "
              class="item"
              @click="
                () => {
                  music.addSongToNext(drawerData);
                  drawerShow = false;
                }
              "
            >
              <n-icon size="20">
                <AddMusic theme="filled" />
              </n-icon>
              <n-text>下一首播放</n-text>
            </div>
            <div
              class="item"
              @click="
                () => {
                  addPlayListRef.openAddToPlaylist(drawerData.id);
                  drawerShow = false;
                }
              "
            >
              <n-icon size="20">
                <ListAdd theme="filled" />
              </n-icon>
              <n-text>添加到歌单</n-text>
            </div>
            <div
              class="item"
              @click="
                () => {
                  downloadSongRef.openDownloadModel(drawerData);
                  drawerShow = false;
                }
              "
            >
              <n-icon size="20">
                <DownloadFour theme="filled" />
              </n-icon>
              <n-text>歌曲下载</n-text>
            </div>
            <div
              class="item"
              @click="router.push(`/comment?id=${drawerData.id}`)"
            >
              <n-icon size="20">
                <Comments theme="filled" />
              </n-icon>
              <n-text>前往评论区</n-text>
            </div>
            <div
              class="item"
              v-if="drawerData.mv"
              @click="router.push(`/video?id=${drawerData.mv}`)"
            >
              <n-icon size="20">
                <Video theme="filled" />
              </n-icon>
              <n-text>观看 MV</n-text>
            </div>
            <div
              class="item"
              @click="
                () => {
                  copySongData(drawerData.id);
                  drawerShow = false;
                }
              "
            >
              <n-icon size="20">
                <LinkTwo theme="filled" />
              </n-icon>
              <n-text>复制歌曲链接</n-text>
            </div>
            <div class="item">
              <n-icon size="20">
                <Voice theme="filled" />
              </n-icon>
              <n-text>
                歌手：
                <AllArtists
                  class="text-hidden"
                  :artistsData="drawerData.artist"
                />
              </n-text>
            </div>
            <div
              class="item"
              @click="router.push(`/album?id=${drawerData.album.id}`)"
            >
              <n-icon size="20">
                <RecordDisc theme="filled" />
              </n-icon>
              <n-text>专辑：{{ drawerData.album.name }}</n-text>
            </div>
            <div
              v-if="router.currentRoute.value.name === 'user-cloud'"
              class="item"
              @click="
                () => {
                  cloudMatchRef.openCloudMatch(drawerData);
                  drawerShow = false;
                }
              "
            >
              <n-icon size="20">
                <FileMusic theme="filled" />
              </n-icon>
              <n-text>歌曲信息纠正</n-text>
            </div>
            <div
              v-if="router.currentRoute.value.name === 'user-cloud'"
              class="item"
              @click="
                () => {
                  delCloudSong(drawerData);
                  drawerShow = false;
                }
              "
            >
              <n-icon size="20">
                <DeleteFour theme="filled" />
              </n-icon>
              <n-text>从云盘中删除</n-text>
            </div>
          </div>
        </n-drawer-content>
      </n-drawer>
      <!-- 歌曲信息纠正 -->
      <CloudMatch ref="cloudMatchRef" />
      <!-- 收藏到歌单 -->
      <AddPlaylist ref="addPlayListRef" />
      <!-- 歌曲下载 -->
      <DownloadSong ref="downloadSongRef" />
    </div>
    <n-spin class="loading" size="small" v-else />
  </Transition>
</template>

<script setup>
import {
  PlayOne,
  AddMusic,
  ListAdd,
  DownloadFour,
  Comments,
  Video,
  LinkTwo,
  Voice,
  RecordDisc,
  FileMusic,
  DeleteFour,
  Like,
  More,
  Search,
} from "@icon-park/vue-next";
import { musicStore, settingStore, userStore } from "@/store";
import { useRouter } from "vue-router";
import { setCloudDel } from "@/api/user";
import { NIcon } from "naive-ui";
import AllArtists from "./AllArtists.vue";
import AddPlaylist from "@/components/DataModal/AddPlaylist.vue";
import CloudMatch from "@/components/DataModal/CloudMatch.vue";
import DownloadSong from "@/components/DataModal/DownloadSong.vue";
import SmallSongData from "./SmallSongData.vue";

const router = useRouter();
const music = musicStore();
const setting = settingStore();
const user = userStore();
const addPlayListRef = ref(null);
const cloudMatchRef = ref(null);
const downloadSongRef = ref(null);

const props = defineProps({
  // 列表数据
  listData: {
    type: Array,
    default: [],
  },
  // 专辑隐藏
  hideAlbum: {
    type: Boolean,
    default: false,
  },
});

// 右键菜单数据
const rightMenuX = ref(0);
const rightMenuY = ref(0);
const rightMenuShow = ref(false);
const rightMenuOptions = ref(null);

// 抽屉数据
const drawerShow = ref(false);
const drawerData = ref(null);

// 复制歌曲链接或ID
const copySongData = (id, url = true) => {
  if (navigator.clipboard) {
    try {
      navigator.clipboard.writeText(
        url ? `https://music.163.com/#/song?id=${id}` : id
      );
      $message.success(`歌曲${url ? "链接" : " ID "}复制成功`);
    } catch (err) {
      $message.error("复制失败：", err);
    }
  } else {
    $message.error("您的浏览器暂不支持该操作");
  }
};

// 图标渲染
const renderIcon = (icon, filled = true) => {
  return () => {
    return h(
      NIcon,
      { depth: 2, style: { transform: "translateX(2px)" } },
      {
        default: () => h(icon, { theme: filled ? "filled" : "outline" }),
      }
    );
  };
};

// 打开右键菜单
const openRightMenu = (e, data) => {
  e.preventDefault();
  rightMenuShow.value = false;
  nextTick().then(() => {
    rightMenuOptions.value = [
      {
        key: "play",
        label: "立即播放",
        icon: renderIcon(PlayOne),
        props: {
          onClick: () => {
            playSong(props.listData, data);
          },
        },
      },
      {
        key: "nextPlay",
        label: "下一首播放",
        icon: renderIcon(AddMusic),
        show:
          music.getPersonalFmMode || music.getPlaySongData.id == data.id
            ? false
            : true,
        props: {
          onClick: () => {
            music.addSongToNext(data);
          },
        },
      },
      {
        key: "add",
        label: "添加到歌单",
        icon: renderIcon(ListAdd),
        show: user.userLogin ? true : false,
        props: {
          onClick: () => {
            addPlayListRef.value.openAddToPlaylist(data.id);
          },
        },
      },
      {
        key: "download",
        label: "歌曲下载",
        icon: renderIcon(DownloadFour),
        props: {
          onClick: () => {
            downloadSongRef.value.openDownloadModel(data);
          },
        },
      },
      {
        key: "comment",
        label: "前往评论区",
        icon: renderIcon(Comments, false),
        props: {
          onClick: () => {
            router.push(`/comment?id=${data.id}`);
          },
        },
      },
      {
        key: "mv",
        label: "观看 MV",
        icon: renderIcon(Video, false),
        show: data.mv && data.mv != 0 ? true : false,
        props: {
          onClick: () => {
            router.push(`/video?id=${data.mv}`);
          },
        },
      },
      {
        key: "line1",
        type: "divider",
        show: router.currentRoute.value.name === "user-cloud" ? true : false,
      },
      {
        key: "delete",
        label: "从云盘中删除",
        icon: renderIcon(DeleteFour),
        show: router.currentRoute.value.name === "user-cloud" ? true : false,
        props: {
          onClick: () => {
            delCloudSong(data);
          },
        },
      },
      {
        key: "match",
        label: "歌曲信息纠正",
        icon: renderIcon(FileMusic),
        show: router.currentRoute.value.name === "user-cloud" ? true : false,
        props: {
          onClick: () => {
            cloudMatchRef.value.openCloudMatch(data);
          },
        },
      },
      {
        key: "line2",
        type: "divider",
      },
      {
        key: "search",
        label: "同名搜索",
        icon: renderIcon(Search, false),
        props: {
          onClick: () => {
            router.push({
              path: "/search/songs",
              query: {
                keywords: data.name,
                page: 1,
              },
            });
          },
        },
      },
      {
        key: "copyId",
        label: "复制歌曲 ID",
        icon: renderIcon(FileMusic, false),
        props: {
          onClick: () => {
            copySongData(data.id, false);
          },
        },
      },
      {
        key: "copy",
        label: "复制歌曲链接",
        icon: renderIcon(LinkTwo),
        props: {
          onClick: () => {
            copySongData(data.id);
          },
        },
      },
    ];
    rightMenuShow.value = true;
    rightMenuX.value = e.clientX;
    rightMenuY.value = e.clientY;
  });
};

// 点击菜单外部
const onClickoutside = () => {
  rightMenuShow.value = false;
};

// 云盘歌曲删除
const delCloudSong = (data) => {
  $dialog.warning({
    class: "s-dialog",
    title: "歌曲删除",
    content: "确认从云盘中删除歌曲 " + data.name + " ？",
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => {
      setCloudDel(data.id).then((res) => {
        if (res.code == 200) {
          $message.success("云盘歌曲删除成功");
          props.listData.forEach((v, i) => {
            if (v.id == data.id) props.listData.splice(i, 1);
          });
        } else {
          $message.error("云盘歌曲删除失败");
        }
      });
    },
  });
};

// 开启抽屉
const openDrawer = (data) => {
  console.log(data);
  drawerData.value = data;
  drawerShow.value = true;
};

// 播放并添加
const playSong = (data, song) => {
  console.log(data, song);
  music.setPersonalFmMode(false);
  if (router.currentRoute.value.name !== "history") music.setPlaylists(data);
  // 检查是否为云盘歌曲
  if (router.currentRoute.value.name === "user-cloud") {
    music.setPlayListMode("cloud");
  } else {
    music.setPlayListMode("list");
  }
  music.addSongToPlaylists(song);
};

// 检查是否可执行双击
const checkCanClick = (listData, item) => {
  window.innerWidth > 768
    ? setting.listClickMode === "click"
      ? playSong(listData, item)
      : null
    : playSong(listData, item);
};

// 跳转链接
const jumpLink = (id, type) => {
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
};
</script>

<style lang="scss" scoped>
.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
.datalists {
  .songs {
    border-radius: 8px;
    margin-bottom: 12px;
    overflow: hidden;
    transition: all 0.3s;
    cursor: pointer;
    &:hover {
      border-color: $mainColor;
      box-shadow: 0 1px 2px -2px #f55e5526, 0 3px 6px 0 #f55e5530,
        0 5px 12px 4px #f55e5505;
      .action {
        .like,
        .download {
          opacity: 1;
          transform: scale(1);
        }
      }
    }
    // &:active {
    //   transform: scale(0.99);
    // }
    &.play {
      background-color: $mainSecondaryColor;
      border-color: $mainColor;
      a,
      span,
      .n-icon {
        color: $mainColor;
      }
      .artists {
        :deep(.artist) {
          .name,
          .line {
            color: $mainColor;
          }
        }
      }
    }
    @media (max-width: 768px) {
      .album,
      .time {
        display: none;
      }
    }
    .pic,
    .num {
      width: 50px;
      height: 50px;
      min-width: 50px;
      border-radius: 8px;
      margin-right: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: bold;
    }
    .name {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding-right: 20px;
      .title {
        font-size: 16px;
        display: flex;
        align-items: center;
        flex-direction: row;
        .n-text {
          -webkit-line-clamp: 2;
          font-weight: bold;
          transition: all 0.3s;
          &:hover {
            color: $mainColor;
          }
        }
        .n-tag {
          transform: translateY(-1px);
          margin-left: 8px;
          height: 18px;
        }
        .vip {
          color: $mainColor;
          background-color: $mainSecondaryColor;
        }
        .mv {
          cursor: pointer;
        }
      }
      .meta {
        display: flex;
        font-size: 13px;
        flex-direction: column;
        .artists {
          margin-top: 2px;
          -webkit-line-clamp: 2;
        }
        .alia {
          margin-top: 2px;
          font-size: 12px;
          opacity: 0.8;
          // &::before {
          //   content: "·";
          //   margin: 0 4px;
          // }
        }
      }
    }
    .album {
      flex: 1;
      padding-right: 20px;
      .n-text {
        transition: all 0.3s;
        &:hover {
          color: $mainColor;
        }
      }
    }
    .action {
      width: 80px;
      display: flex;
      align-items: center;
      justify-content: space-evenly;
      @media (max-width: 768px) {
        width: 40px;
        .like,
        .download {
          display: none;
        }
      }
      @media (min-width: 768px) {
        .more {
          display: none;
        }
      }
      .like,
      .download {
        cursor: pointer;
        opacity: 0;
        transform: scale(0.8);
        color: $mainColor;
        transition: all 0.3s;
        &:hover {
          transform: scale(1.1);
        }
        &:active {
          transform: scale(1);
        }
      }
    }
    .time {
      width: 40px;
      text-align: center;
    }
  }
}
.loading {
  margin: 40px 0;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}
.drawer {
  .menu {
    .item {
      padding: 12px 24px;
      display: flex;
      align-items: center;
      flex-direction: row;
      cursor: pointer;
      transition: all 0.3s;
      &:hover {
        background-color: var(--n-close-color-hover);
      }
      .n-icon {
        margin-right: 8px;
        transform: translateY(1.5px);
      }
      .n-text {
        transform: translateY(1px);
        display: flex;
        flex-direction: row;
      }
    }
  }
}
</style>
