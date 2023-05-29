<template>
  <div class="coverlists">
    <Transition mode="out-in">
      <n-grid
        x-gap="20"
        y-gap="26"
        responsive="screen"
        :cols="columns"
        :collapsed="gridCollapsed"
        :collapsed-rows="gridCollapsedRows"
        v-if="listData[0]"
      >
        <n-gi
          class="item"
          v-for="item in listData"
          :key="item"
          @click="toLink(item.id)"
          @contextmenu="openRightMenu($event, item)"
        >
          <div class="cover">
            <n-image
              lazy
              class="coverImg"
              preview-disabled
              :src="getCoverUrl(item.cover, 300)"
              fallback-src="/images/pic/default.png"
            >
              <template #placeholder>
                <div class="cover-loading">
                  <n-spin size="small" />
                </div>
              </template>
            </n-image>
            <n-image
              lazy
              class="shadow"
              preview-disabled
              :src="getCoverUrl(item.cover, 300)"
              fallback-src="/images/pic/default.png"
            />
            <n-icon class="play" size="40">
              <PlayOne theme="filled" />
            </n-icon>
            <div class="description" v-if="listType != 'topList'">
              <div class="num" v-if="listType == 'playlist'">
                <n-icon>
                  <Headset theme="filled" />
                </n-icon>
                <span class="des">{{ item.playCount }}</span>
              </div>
              <div class="num" v-else>
                <span class="des">{{ item.time }}</span>
              </div>
            </div>
          </div>
          <div class="title">
            <span class="name text-hidden">{{ item.name }}</span>
            <span v-if="listType == 'playlist' && item.artist" class="by">
              By {{ item.artist.nickname }}
            </span>
            <span v-else-if="listType == 'topList' && item.update" class="by">
              {{ item.update }}
            </span>
            <AllArtists v-else class="text-hidden" :artistsData="item.artist" />
          </div>
        </n-gi>
      </n-grid>
      <n-grid
        v-else
        class="loading"
        x-gap="20"
        y-gap="26"
        :cols="columns"
        responsive="screen"
        :collapsed="gridCollapsed"
        :collapsed-rows="gridCollapsedRows"
      >
        <n-gi class="item" v-for="n in loadingNum" :key="n">
          <n-skeleton class="pic" :sharp="false" />
          <n-skeleton text :repeat="1" />
          <n-skeleton text style="width: 60%" />
        </n-gi>
      </n-grid>
    </Transition>
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
    <!-- 更新歌单弹窗 -->
    <PlaylistUpdate ref="playlistUpdateRef" />
  </div>
</template>

<script setup>
import { NIcon } from "naive-ui";
import {
  PlayOne,
  Headset,
  LinkTwo,
  Like,
  Unlike,
  Editor,
  DeleteFour,
} from "@icon-park/vue-next";
import { useI18n } from "vue-i18n";
import { delPlayList, likePlaylist } from "@/api/playlist";
import { likeAlbum } from "@/api/album";
import { musicStore, userStore, settingStore } from "@/store";
import { useRouter } from "vue-router";
import AllArtists from "./AllArtists.vue";
import PlaylistUpdate from "@/components/DataModal/PlaylistUpdate.vue";
import getCoverUrl from "@/utils/getCoverUrl";

const { t } = useI18n();
const router = useRouter();
const music = musicStore();
const user = userStore();
const setting = settingStore();
const props = defineProps({
  // 列表数据
  listData: {
    type: Array,
    default: [],
  },
  // 列表类型
  listType: {
    type: String,
    default: "playlist",
  },
  // 自定义列数
  columns: {
    type: String,
    default: "3 s:4 m:5 l:6",
  },
  // 折叠栅格
  gridCollapsed: {
    type: Boolean,
    default: false,
  },
  // 折叠后行数
  gridCollapsedRows: {
    type: Number,
    default: 2,
  },
  // 加载占位数量
  loadingNum: {
    type: Number,
    default: 30,
  },
});
const playlistUpdateRef = ref(null);

// 图标渲染
const renderIcon = (icon) => {
  return () => {
    return h(
      NIcon,
      { style: { transform: "translateX(2px)" } },
      {
        default: () => icon,
      }
    );
  };
};

// 右键菜单数据
const rightMenuX = ref(0);
const rightMenuY = ref(0);
const rightMenuShow = ref(false);
const rightMenuOptions = ref(null);

// 打开右键菜单
const openRightMenu = (e, data) => {
  e.preventDefault();
  rightMenuShow.value = false;
  nextTick().then(() => {
    rightMenuOptions.value = [
      {
        key: "update",
        label: t("menu.update"),
        show:
          router.currentRoute.value.name === "user-playlists" ? true : false,
        props: {
          onClick: () => {
            playlistUpdateRef.value.openUpdateModal(data);
          },
        },
        icon: renderIcon(h(Editor)),
      },
      {
        key: "del",
        label: t("menu.del"),
        show:
          router.currentRoute.value.name === "user-playlists" ? true : false,
        props: {
          onClick: () => {
            toDelPlayList(data);
          },
        },
        icon: renderIcon(h(DeleteFour)),
      },
      {
        key: "likePlaylist",
        label: isLikeOrDislike(data.id)
          ? t("menu.collection", { name: t("general.name.playlist") })
          : t("menu.cancelCollection", { name: t("general.name.playlist") }),
        show:
          user.userLogin &&
          user.getUserPlayLists.has &&
          props.listType === "playlist" &&
          router.currentRoute.value.name !== "user-playlists"
            ? true
            : false,
        props: {
          onClick: () => {
            toChangeLike(data.id);
          },
        },
        icon: renderIcon(h(isLikeOrDislike(data.id) ? Like : Unlike)),
      },
      {
        key: "likeAlbum",
        label: isLikeOrDislike(data.id)
          ? t("menu.collection", { name: t("general.name.album") })
          : t("menu.cancelCollection", { name: t("general.name.album") }),
        show:
          user.userLogin &&
          user.getUserAlbumLists.has &&
          props.listType === "album"
            ? true
            : false,
        props: {
          onClick: () => {
            toChangeLike(data.id);
          },
        },
        icon: renderIcon(h(isLikeOrDislike(data.id) ? Like : Unlike)),
      },
      {
        key: "copy",
        label: t("menu.copy", {
          name:
            props.listType === "playlist"
              ? t("general.name.playlist")
              : t("general.name.album"),
          other: t("general.name.link"),
        }),
        props: {
          onClick: () => {
            if (navigator.clipboard) {
              try {
                navigator.clipboard.writeText(
                  `https://music.163.com/#/${
                    props.listType === "playlist" ? "playlist" : "album"
                  }?id=${data.id}`
                );
                $message.success(t("general.message.copySuccess"));
              } catch (err) {
                console.error(t("general.message.copyFailure"), err);
                $message.error(t("general.message.copyFailure"));
              }
            } else {
              $message.error(t("general.message.notSupported"));
            }
          },
        },
        icon: renderIcon(h(LinkTwo)),
      },
    ];
    rightMenuShow.value = true;
    rightMenuX.value = e.clientX;
    rightMenuY.value = e.clientY;
  });
};

// 点击右键菜单外部
const onClickoutside = () => {
  rightMenuShow.value = false;
};

// 链接跳转
const toLink = (id) => {
  if (props.listType === "playlist" || props.listType === "topList") {
    router.push({
      path: "/playlist",
      query: {
        id,
        page: 1,
      },
    });
  } else if (props.listType === "album") {
    router.push({
      path: "/album",
      query: {
        id,
      },
    });
  }
};

// 删除歌单
const toDelPlayList = (data) => {
  if (data.id === user.getUserPlayLists?.own[0].id) {
    $message.warning(t("menu.unableToDelete"));
    return false;
  }
  $dialog.warning({
    class: "s-dialog",
    title: t("general.dialog.delete"),
    content: t("menu.delQuestion", {
      name: data.name,
    }),
    positiveText: t("general.dialog.delete"),
    negativeText: t("general.dialog.cancel"),
    onPositiveClick: () => {
      delPlayList(data.id).then((res) => {
        if (res.code === 200) {
          $message.success(t("general.message.deleteSuccess"));
          user.setUserPlayLists();
        }
      });
    },
  });
};

// 判断收藏还是取消
const isLikeOrDislike = (id) => {
  const listType = props.listType;
  const playlists = user.getUserPlayLists.like;
  const albums = user.getUserAlbumLists.list;
  if (listType === "playlist" && playlists.length) {
    return !playlists.some((item) => item.id === Number(id));
  }
  if (listType === "album" && albums.length) {
    return !albums.some((item) => item.id === Number(id));
  }
  return true;
};

// 收藏/取消收藏
const toChangeLike = async (id) => {
  const listType = props.listType;
  const type = isLikeOrDislike(id) ? 1 : 2;
  const likeFn = listType === "playlist" ? likePlaylist : likeAlbum;
  const likeMsg =
    listType === "playlist"
      ? t("general.name.playlist")
      : t("general.name.album");
  const isThereASpace = setting.language === "zh-CN" ? "" : " ";
  try {
    const res = await likeFn(type, id);
    if (res.code === 200) {
      $message.success(
        `${likeMsg + isThereASpace}${
          type == 1
            ? t("menu.collection", { name: t("general.dialog.success") })
            : t("menu.cancelCollection", { name: t("general.dialog.success") })
        }`
      );
      listType === "playlist"
        ? user.setUserPlayLists()
        : user.setUserAlbumLists();
    } else {
      $message.error(
        `${likeMsg + isThereASpace}${
          type == 1
            ? t("menu.collection", { name: t("general.dialog.failed") })
            : t("menu.cancelCollection", { name: t("general.dialog.failed") })
        }`
      );
    }
  } catch (err) {
    $message.error(
      `${likeMsg + isThereASpace}${
        type == 1
          ? t("menu.collection", { name: t("general.dialog.failed") })
          : t("menu.cancelCollection", { name: t("general.dialog.failed") })
      }`
    );
    console.error(
      `${likeMsg + isThereASpace}${
        type == 1
          ? t("menu.collection", { name: t("general.dialog.failed") })
          : t("menu.cancelCollection", { name: t("general.dialog.failed") })
      }`,
      err
    );
  }
};

onMounted(() => {
  if (
    router.currentRoute.value.name === "user-playlists" &&
    !music.catList.sub
  ) {
    music.setCatList();
  }
  if (
    user.userLogin &&
    !user.getUserPlayLists.has &&
    !user.getUserPlayLists.isLoading &&
    props.listType === "playlist"
  ) {
    user.setUserPlayLists();
  }
  if (
    user.userLogin &&
    !user.getUserAlbumLists.has &&
    !user.getUserAlbumLists.isLoading &&
    props.listType === "album"
  ) {
    user.setUserAlbumLists();
  }
});
</script>

<style lang="scss" scoped>
.coverlists {
  .v-enter-active,
  .v-leave-active {
    transition: opacity 0.3s ease;
  }

  .v-enter-from,
  .v-leave-to {
    opacity: 0;
  }
  .item {
    width: 100%;
    height: 100%;
    .cover {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      // overflow: hidden;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      position: relative;
      .coverImg {
        border-radius: 8px;
        width: 100%;
        height: 100%;
        overflow: hidden;
        transition: filter 0.3s;
        z-index: 1;
        :deep(img) {
          width: 100%;
          transition: transform 0.3s;
        }
        .cover-loading {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 0;
          padding-bottom: 100%;
          background-color: #0001;
          .n-spin-body {
            position: absolute;
            top: 0;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
      }
      .shadow {
        opacity: 0;
        position: absolute;
        top: 12px;
        height: 100%;
        width: 100%;
        filter: blur(16px) opacity(0.6);
        transform: scale(0.92, 0.96);
        z-index: 0;
        background-size: cover;
        aspect-ratio: 1/1;
        transition: opacity 0.3s;
      }
      .play {
        opacity: 0;
        position: absolute;
        color: #fff;
        padding: 0.5vw;
        background-color: #00000010;
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
        border-radius: 50%;
        transform: scale(0.8);
        transition: all 0.3s;
        z-index: 1;
      }
      .description {
        position: absolute;
        right: 0;
        bottom: 0;
        color: #fff;
        background-color: #00000030;
        font-size: 12px;
        -webkit-backdrop-filter: blur(4px);
        backdrop-filter: blur(4px);
        padding: 6px;
        border-top-left-radius: 8px;
        border-bottom-right-radius: 8px;
        transition: all 0.3s;
        z-index: 1;
        .num {
          display: flex;
          flex-direction: row;
          align-items: center;
          .n-icon {
            margin-right: 4px;
          }
          .des {
            line-height: normal;
          }
        }
      }
      &:hover {
        .coverImg {
          filter: brightness(0.8);
          :deep(img) {
            transform: scale(1.1);
          }
        }
        .play {
          transform: scale(1);
          opacity: 1;
        }
        .description {
          opacity: 0;
        }
        .shadow {
          opacity: 1;
        }
      }
      &:active {
        transform: scale(0.98);
      }
    }
    .title {
      display: flex;
      flex-direction: column;
      margin-top: 12px;
      .name {
        // font-size: 2vh;
        font-size: 15px;
        -webkit-line-clamp: 2;
        transition: all 0.3s;
        cursor: pointer;
        &:hover {
          opacity: 1;
          color: var(--main-color);
        }
      }
      .by {
        font-size: 12px;
        opacity: 0.6;
        transition: all 0.3s;
        cursor: pointer;
        &:hover {
          opacity: 1;
          color: var(--main-color);
        }
      }
      .artists {
        font-size: 12px;
      }
    }
  }
  .loading {
    .pic {
      padding-bottom: 100%;
      width: 100%;
      height: 0;
      border-radius: 8px !important;
      margin-bottom: 12px;
    }
  }
  @media (max-width: 450px) {
    :deep(.n-grid) {
      gap: 18px 10px;
    }
    .item {
      .title {
        margin-top: 8px;
        .name {
          font-size: 13px;
        }
      }
    }
  }
}
</style>
