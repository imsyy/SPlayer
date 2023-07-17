<template>
  <Transition mode="out-in">
    <div class="datalists" id="datalists" v-if="listData[0]">
      <n-card
        v-for="(item, index) in listData"
        :key="item"
        :id="'song' + index"
        :class="
          music.getPlaySongData && music.getPlaySongData?.id == item?.id
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
          lazy
          class="pic"
          :src="item.album.picUrl.replace(/^http:/, 'https:') + '?param=60y60'"
          fallback-src="/images/pic/default.png"
        />
        <div class="num" v-else-if="item?.num">
          <n-text :depth="2" v-html="item?.num" />
        </div>
        <div class="name">
          <div class="title">
            <n-text
              class="text-hidden"
              depth="2"
              v-html="item?.name"
              @click.stop="jumpLink(item?.id, 1)"
            />
            <n-tag
              v-if="item?.fee == 1 || item?.fee == 4"
              class="vip"
              round
              :bordered="false"
              size="small"
            >
              {{ item?.fee == 1 ? "VIP" : "EP" }}
            </n-tag>
            <n-tag
              v-if="item?.pc"
              class="cloud"
              round
              type="info"
              size="small"
              :bordered="false"
            >
              {{ $t("general.name.cloud") }}
            </n-tag>
            <n-tag
              v-if="item?.mv"
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
              v-if="item?.artist"
              class="text-hidden"
              :artistsData="item?.artist"
            />
            <n-text
              class="alia text-hidden"
              depth="3"
              v-if="item?.alia[0]"
              v-html="item.alia[0]"
            />
          </div>
        </div>
        <div class="album" v-if="!hideAlbum && item?.album">
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
              music.getSongIsLike(item?.id)
                ? music.changeLikeList(item?.id, false)
                : music.changeLikeList(item?.id, true)
            "
          >
            <Like
              :theme="music.getSongIsLike(item?.id) ? 'filled' : 'outline'"
            />
          </n-icon>
          <n-icon
            class="download"
            size="20"
            @click.stop="downloadSongRef.openDownloadModal(item)"
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
              <n-text>{{ $t("menu.play") }}</n-text>
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
              <n-text>{{ $t("menu.nextPlay") }}</n-text>
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
              <n-text>{{ $t("menu.add") }}</n-text>
            </div>
            <div
              class="item"
              @click="
                () => {
                  downloadSongRef.openDownloadModal(drawerData);
                  drawerShow = false;
                }
              "
            >
              <n-icon size="20">
                <DownloadFour theme="filled" />
              </n-icon>
              <n-text>{{ $t("menu.download") }}</n-text>
            </div>
            <div
              class="item"
              @click="router.push(`/comment?id=${drawerData.id}`)"
            >
              <n-icon size="20">
                <Comments theme="filled" />
              </n-icon>
              <n-text>{{ $t("menu.comment") }}</n-text>
            </div>
            <div
              class="item"
              v-if="drawerData.mv"
              @click="router.push(`/video?id=${drawerData.mv}`)"
            >
              <n-icon size="20">
                <Video theme="filled" />
              </n-icon>
              <n-text>{{ $t("menu.mv") }}</n-text>
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
              <n-text>{{ $t("menu.copy") }}</n-text>
            </div>
            <div class="item">
              <n-icon size="20">
                <Voice theme="filled" />
              </n-icon>
              <n-text>
                {{ $t("general.name.artists") }}:
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
              <n-text>
                {{ $t("general.name.album") }}: {{ drawerData.album.name }}
              </n-text>
            </div>
            <div
              v-if="router.currentRoute.value.name === 'user-cloud'"
              class="item"
              @click="
                () => {
                  router.push({
                    path: '/search/songs',
                    query: {
                      keywords: drawerData.name,
                      page: 1,
                    },
                  });
                  drawerShow = false;
                }
              "
            >
              <n-icon size="20">
                <Search theme="filled" />
              </n-icon>
              <n-text>{{ $t("menu.search") }}</n-text>
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
              <n-text>{{ $t("menu.match") }}</n-text>
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
              <n-text>{{ $t("menu.delete") }}</n-text>
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
import { soundStop } from "@/utils/Player";
import { useI18n } from "vue-i18n";
import AllArtists from "./AllArtists.vue";
import AddPlaylist from "@/components/DataModal/AddPlaylist.vue";
import CloudMatch from "@/components/DataModal/CloudMatch.vue";
import DownloadSong from "@/components/DataModal/DownloadSong.vue";
import SmallSongData from "./SmallSongData.vue";

const { t } = useI18n();
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
        label: t("menu.play"),
        icon: renderIcon(PlayOne),
        props: {
          onClick: () => {
            playSong(props.listData, data);
          },
        },
      },
      {
        key: "nextPlay",
        label: t("menu.nextPlay"),
        icon: renderIcon(AddMusic),
        show:
          music.getPersonalFmMode || music.getPlaySongData?.id == data.id
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
        label: t("menu.add"),
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
        label: t("menu.download"),
        icon: renderIcon(DownloadFour),
        props: {
          onClick: () => {
            downloadSongRef.value.openDownloadModal(data);
          },
        },
      },
      {
        key: "comment",
        label: t("menu.comment"),
        icon: renderIcon(Comments, false),
        props: {
          onClick: () => {
            router.push(`/comment?id=${data.id}`);
          },
        },
      },
      {
        key: "mv",
        label: t("menu.mv"),
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
        label: t("menu.delete"),
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
        label: t("menu.match"),
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
        label: t("menu.search"),
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
        label: t("menu.copy", {
          name: t("general.name.song"),
          other: "ID",
        }),
        icon: renderIcon(FileMusic, false),
        props: {
          onClick: () => {
            copySongData(data.id, false);
          },
        },
      },
      {
        key: "copy",
        label: t("menu.copy", {
          name: t("general.name.song"),
          other: t("general.name.link"),
        }),
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

// 复制歌曲链接或ID
const copySongData = (id, url = true) => {
  if (navigator.clipboard) {
    try {
      navigator.clipboard.writeText(
        url ? `https://music.163.com/#/song?id=${id}` : id
      );
      $message.success(t("general.message.copySuccess"));
    } catch (err) {
      console.error(t("general.message.copyFailure"), err);
      $message.error(t("general.message.copyFailure"));
    }
  } else {
    $message.error(t("general.message.notSupported"));
  }
};

// 云盘歌曲删除
const delCloudSong = (data) => {
  $dialog.warning({
    class: "s-dialog",
    title: t("general.dialog.delete"),
    content: t("menu.deleteQuestion", {
      name: data.name,
    }),
    positiveText: t("general.dialog.delete"),
    negativeText: t("general.dialog.cancel"),
    onPositiveClick: () => {
      setCloudDel(data.id).then((res) => {
        if (res.code == 200) {
          $message.success(t("general.message.deleteSuccess"));
          props.listData.forEach((v, i) => {
            if (v.id == data.id) props.listData.splice(i, 1);
          });
        } else {
          $message.error(t("general.message.deleteFailure"));
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
  if (music.getPersonalFmMode && typeof $player !== "undefined") {
    soundStop($player);
    music.setPersonalFmMode(false);
  }
  music.setPlayState(true);
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
      border-color: var(--main-color);
      box-shadow: 0 1px 2px -2px var(--main-boxshadow-color),
        0 3px 6px 0 var(--main-boxshadow-color),
        0 5px 12px 4px var(--main-boxshadow-hover-color);
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
      background-color: var(--main-second-color);
      border-color: var(--main-color);
      a,
      span,
      .n-icon {
        color: var(--main-color);
      }
      .artists {
        :deep(.artist) {
          .name,
          .line {
            color: var(--main-color);
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
            color: var(--main-color);
          }
        }
        .n-tag {
          transform: translateY(-1px);
          margin-left: 8px;
          height: 18px;
        }
        .vip {
          color: var(--main-color);
          background-color: var(--main-second-color);
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
          color: var(--main-color);
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
        color: var(--main-color);
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
