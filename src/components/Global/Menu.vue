<!-- 主菜单 -->
<template>
  <n-menu
    ref="mainMenuRef"
    v-model:value="menuActiveKey"
    class="main-menu"
    :root-indent="showSider ? 36 : 28"
    :indent="0"
    :collapsed="asideMenuCollapsed.value"
    :defaultExpandedKeys="['user-playlists', 'favorite-playlists']"
    :collapsed-width="64"
    :collapsed-icon-size="22"
    :options="menuOptions"
    @contextmenu="openSideDropdown($event)"
    @update:value="checkMenuItem"
  />
  <!-- 右键菜单 -->
  <CoverDropdown ref="coverDropdownRef" />
  <!-- 新建歌单 -->
  <CreatePlaylist ref="createPlaylistRef" />
</template>

<script setup>
import { storeToRefs } from "pinia";
import { siteStatus, siteData, musicData } from "@/stores";
import { NIcon, NText, NButton } from "naive-ui";
import { useRouter, RouterLink } from "vue-router";
import { getHeartRateList } from "@/api/playlist";
import { checkPlatform } from "@/utils/helper";
import { isLogin } from "@/utils/auth";
import { fadePlayOrPause, initPlayer } from "@/utils/Player";
import formatData from "@/utils/formatData";
import debounce from "@/utils/debounce";
import SvgIcon from "@/components/Global/SvgIcon";

const router = useRouter();
const data = siteData();
const music = musicData();
const status = siteStatus();
const { asideMenuCollapsed, showSider, showFullPlayer, playIndex, playMode, playHeartbeatMode } =
  storeToRefs(status);
const { userData, userLikeData, userLoginStatus } = storeToRefs(data);
const { playList, playListOld, playSongData, privateFmSong } = storeToRefs(music);

// 子组件
const coverDropdownRef = ref(null);
const createPlaylistRef = ref(null);

// 图标渲染
const renderIcon = (icon, size) => {
  return () => h(NIcon, { size }, { default: () => h(SvgIcon, { icon }, null) });
};

// 创建的歌单
const userPlaylists = ref({
  label: () =>
    h("div", { class: "user-list" }, [
      h("span", { class: "name" }, ["创建的歌单"]),
      isLogin()
        ? h(NButton, {
            class: "add",
            size: "small",
            type: "tertiary",
            round: true,
            strong: true,
            secondary: true,
            renderIcon: renderIcon("add"),
            onclick: (event) => {
              event.stopPropagation();
              createPlaylistRef.value?.openCreatePlaylist();
            },
          })
        : null,
    ]),
  key: "user-playlists",
  children: [],
});

// 收藏的歌单
const favoritePlaylists = ref({
  label: () => h("div", { class: "user-list" }, [h("span", { class: "name" }, ["收藏的歌单"])]),
  key: "favorite-playlists",
  children: [],
});

// 菜单数据
const mainMenuRef = ref(null);
const menuActiveKey = ref(router.currentRoute.value.name ?? "home");
const menuOptions = computed(() => [
  {
    type: "group",
    label: "在线音乐",
    key: "online",
    children: [],
    show: !asideMenuCollapsed.value,
  },
  {
    label: () =>
      h(
        RouterLink,
        {
          to: {
            name: "home",
          },
        },
        () => ["个性推荐"],
      ),
    key: "home",
    icon: renderIcon("home"),
  },
  {
    label: () =>
      h(
        RouterLink,
        {
          to: {
            name: "discover",
          },
        },
        () => ["发现音乐"],
      ),
    key: "discover",
    icon: renderIcon("discover-fill"),
  },
  {
    label: "私人漫游",
    key: "fm",
    icon: renderIcon("radio"),
  },
  {
    label: () =>
      h(
        RouterLink,
        {
          to: {
            name: "dj-hot",
          },
        },
        () => ["播客电台"],
      ),
    key: "dj-hot",
    icon: renderIcon("record"),
  },
  {
    key: "divider-1",
    type: "divider",
  },
  {
    type: "group",
    label: "我的音乐",
    key: "user",
    children: [],
    show: !asideMenuCollapsed.value,
  },
  {
    label: () =>
      h(
        RouterLink,
        {
          to: {
            path: "/like-songs",
          },
          class: "user-playlist",
          menuid: "like-songs",
        },
        () => [
          h(
            "div",
            {
              style: {
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              },
            },
            [
              h("span", null, ["喜欢的音乐"]),
              h(NButton, {
                size: "small",
                type: "tertiary",
                round: true,
                strong: true,
                secondary: true,
                class: asideMenuCollapsed.value ? "heart-rate-btn collapsed" : "heart-rate-btn",
                renderIcon: renderIcon("heartbit", "26"),
                onclick: () => {
                  startHeartRate();
                },
              }),
            ],
          ),
        ],
      ),
    key: "like-songs",
    icon: renderIcon("favorite-rounded"),
  },
  {
    label: () =>
      h(
        RouterLink,
        {
          to: {
            name: "like",
          },
        },
        () => ["我的收藏"],
      ),
    key: "like",
    icon: renderIcon("star"),
  },
  {
    label: () =>
      h(
        RouterLink,
        {
          to: {
            name: "local",
          },
        },
        () => ["本地歌曲"],
      ),
    key: "local",
    show: checkPlatform.electron(),
    icon: renderIcon("folder-open"),
  },
  {
    label: () =>
      h(
        RouterLink,
        {
          to: {
            name: "cloud",
          },
        },
        () => ["我的云盘"],
      ),
    key: "cloud",
    icon: renderIcon("cloud"),
  },
  {
    label: () =>
      h(
        RouterLink,
        {
          to: {
            name: "history",
          },
        },
        () => ["最近播放"],
      ),
    key: "history",
    icon: renderIcon("history"),
  },
  {
    key: "divider-2",
    type: "divider",
  },
  { ...userPlaylists.value, show: !asideMenuCollapsed.value },
  { ...favoritePlaylists.value, show: !asideMenuCollapsed.value },
]);

// 更改用户的歌单
const changeUserPlaylists = (data) => {
  // 未登录
  if (!isLogin() || !data?.length) {
    userPlaylists.value.children = [];
    favoritePlaylists.value.children = [];
    return false;
  }
  // 用户 id
  const userId = userData.value?.userId;
  // 创建的歌单
  const userPlaylistsData = data.filter((playlist) => playlist.userId === userId);
  // 收藏的歌单
  const favoritePlaylistsData = data.filter((playlist) => playlist.userId !== userId);
  // 更改数据
  userPlaylists.value.children = userPlaylistsData.slice(1).map((v) => {
    return {
      label: () =>
        h(
          RouterLink,
          {
            to: {
              path: "/playlist",
              query: {
                id: v.id,
              },
            },
            class: "user-playlist",
            menuId: v.id,
          },
          () => [h(NText, null, () => [v.name])],
        ),
      key: v.id,
      icon: renderIcon("queue-music-rounded"),
    };
  });
  favoritePlaylists.value.children = favoritePlaylistsData.map((v) => {
    return {
      label: () =>
        h(
          RouterLink,
          {
            to: {
              path: "/playlist",
              query: {
                id: v.id,
              },
            },
            class: "user-playlist",
            menuId: v.id,
          },
          () => [h(NText, null, () => [v.name])],
        ),
      key: v.id,
      icon: renderIcon("queue-music-rounded"),
    };
  });
};

// 选中菜单项
const checkMenuItem = async (key) => {
  // 例外路由
  const otherRouter = ["search", "videos-player", "playlist", "like-songs"];
  // 私人漫游
  if (key === "fm") {
    if (!privateFmSong.value || !Object.keys(privateFmSong.value)?.length) {
      return $message.error("开启私人漫游出错，请重试");
    }
    if (playMode.value === "fm") {
      fadePlayOrPause();
    } else {
      // 更改播放模式
      playMode.value = "fm";
      await initPlayer(true);
    }
    showFullPlayer.value = true;
    $message.info("已开启私人漫游", { icon: renderIcon("radio") });
  }
  // 特殊处理
  if (!key) {
    menuActiveKey.value = "home";
  } else if (otherRouter.includes(key)) {
    // 选中正确的歌单
    const choosePlaylist = () => {
      const id = Number(router.currentRoute.value.query.id || 0);
      const matchingPlaylist = userLikeData.value.playlists.find((playlist) => playlist.id === id);
      menuActiveKey.value = matchingPlaylist ? id : "discover";
    };
    switch (key) {
      case "videos-player": {
        menuActiveKey.value = "videos";
        break;
      }
      case "playlist": {
        choosePlaylist();
        break;
      }
      case "like-songs": {
        menuActiveKey.value = "like-songs";
        break;
      }
      default: {
        menuActiveKey.value = "discover";
        break;
      }
    }
  } else {
    menuActiveKey.value = key;
  }
  mainMenuRef.value?.showOption(key);
};

// 开启右键菜单
const openSideDropdown = (e) => {
  e.preventDefault();
  if (!e.target.classList.contains("user-playlist")) return false;
  // 获取 id
  const menuId = e.target.getAttribute("menuid");
  coverDropdownRef.value?.openDropdown(e, "playlist", menuId);
};

// 开启心动模式
const startHeartRate = debounce(async () => {
  try {
    if (!isLogin()) return false;
    if (playHeartbeatMode.value) return fadePlayOrPause();
    // 基础数据
    const likeSongs = userLikeData.value.songs;
    const songId = playSongData.value?.id;
    const pid = data.getUserLikePlaylistId;
    if (likeSongs?.length === 0 || !pid) {
      return $message.warning("心动模式开启失败，请先收藏一些歌曲");
    }
    // 获取歌曲 id
    const startId = likeSongs.findIndex((id) => id === songId) === -1 ? likeSongs[0] : songId;
    // 获取心动歌曲数据
    $message.loading("心动模式开启中");
    const result = await getHeartRateList(startId, pid);
    console.log(result);
    if (result.code === 200) {
      const heartRatelists = formatData(result.data, "song");
      // 更改模式
      playMode.value = "normal";
      playHeartbeatMode.value = true;
      // 储存旧播放列表
      playListOld.value = playList.value;
      // 更新播放列表
      playList.value = heartRatelists;
      playSongData.value = heartRatelists[0];
      playIndex.value = 0;
      // 初始化播放器
      initPlayer(true);
    } else {
      $message.error("心动模式开启出错，请重试");
    }
  } catch (error) {
    console.error("心动模式开启出错：", error);
    $message.error("心动模式开启出错");
  }
}, 300);

// 监听路由路径变化
watch(
  () => router.currentRoute.value,
  (val) => {
    // 取出路由父项
    const routerFather = val.matched[0]?.name ?? val?.name;
    // 高亮路由项
    checkMenuItem(routerFather);
  },
);

// 监听用户歌单变化
watch(
  () => userLikeData.value.playlists,
  (val) => {
    changeUserPlaylists(val);
  },
);
watch(
  () => userLoginStatus.value,
  () => changeUserPlaylists(userLikeData.value.playlists),
);

onMounted(() => {
  changeUserPlaylists(userLikeData.value.playlists);
});
</script>

<style lang="scss" scoped>
.main-menu {
  :deep(.n-menu-item) {
    .n-menu-item-content {
      &.n-menu-item-content--selected {
        &::before {
          border-left: 4px solid var(--n-item-text-color-active);
        }
      }
      .n-text {
        display: inline-block;
        text-overflow: ellipsis;
        overflow: hidden;
      }
      // 我喜欢的音乐
      .user-playlist {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
    }
  }
  // 折叠菜单
  :deep(.n-submenu) {
    .n-menu-item-content {
      &:hover {
        .n-base-icon {
          color: var(--n-group-text-color);
        }
      }
      .n-base-icon {
        color: var(--n-group-text-color);
        font-size: 0.93em;
      }
      .user-list {
        color: var(--n-group-text-color);
        font-size: 0.93em;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        padding-right: 20px;
        .add {
          height: 20px;
          width: 34px;
          .n-icon {
            font-size: 12px;
          }
        }
      }
    }
  }
}
</style>

<!-- 特殊样式 -->
<style lang="scss">
.heart-rate-btn {
  &:hover {
    background-color: var(--main-second-color) !important;
    color: var(--main-color) !important;
  }
  &.collapsed {
    margin-left: 12px;
    background-color: #efefef40;
    color: #efefef;
    &:hover {
      background-color: #efefef60 !important;
      color: #efefef !important;
    }
  }
}
</style>
