<!-- 主菜单 -->
<template>
  <n-menu
    ref="menuRef"
    v-model:value="menuActiveKey"
    :class="{ cover: settingStore.menuShowCover }"
    :indent="0"
    :root-indent="26"
    :collapsed="statusStore.menuCollapsed"
    :collapsed-width="64"
    :collapsed-icon-size="22"
    :default-expand-all="true"
    :options="menuOptions"
    :render-label="renderMenuLabel"
    @update:value="menuUpdate"
  />
</template>

<script setup lang="ts">
import {
  type MenuOption,
  type MenuGroupOption,
  type MenuInst,
  NText,
  NButton,
  NEllipsis,
  NAvatar,
} from "naive-ui";
import type { CoverType } from "@/types/main";
import { useStatusStore, useSettingStore, useDataStore, useMusicStore } from "@/stores";
import { useRouter, RouterLink } from "vue-router";
import { isElectron, renderIcon } from "@/utils/helper";
import { openCreatePlaylist } from "@/utils/modal";
import { debounce } from "lodash-es";
import player from "@/utils/player";
import { isLogin } from "@/utils/auth";

const router = useRouter();
const dataStore = useDataStore();
const musicStore = useMusicStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();

// 菜单数据
const menuRef = ref<MenuInst | null>(null);
const menuActiveKey = ref<string | number>((router.currentRoute.value.name as string) || "home");

// 菜单内容
const menuOptions = computed<MenuOption[] | MenuGroupOption[]>(() => {
  return settingStore.useOnlineService
    ? [
        {
          key: "home",
          link: "home",
          label: "为我推荐",
          icon: renderIcon("Home", {
            style: {
              transform: "translateY(-1px)",
            },
          }),
        },
        {
          key: "discover",
          link: "discover",
          label: "发现音乐",
          icon: renderIcon("Discover", {
            style: {
              transform: "translateY(-1px)",
            },
          }),
        },
        {
          key: "personal-fm",
          label: "私人漫游",
          show: isLogin(),
          icon: renderIcon("Radio", {
            style: {
              transform: "translateY(-1px)",
            },
          }),
        },
        {
          key: "radio-hot",
          link: "radio-hot",
          label: "播客电台",
          icon: renderIcon("Record", {
            style: {
              transform: "translateY(-1px)",
            },
          }),
        },
        {
          key: "divider",
          type: "divider",
        },
        {
          key: "like-songs",
          label: () =>
            h("div", { class: "user-liked" }, [
              h(NText, null, () => "我喜欢的音乐"),
              h(NButton, {
                type: "tertiary",
                round: true,
                strong: true,
                secondary: true,
                renderIcon: renderIcon("HeartBit"),
                onClick: (event: Event) => {
                  event.stopPropagation();
                  openHeartMode();
                },
              }),
            ]),
          icon: renderIcon("Favorite"),
        },
        {
          key: "like",
          link: "like",
          label: "我的收藏",
          icon: renderIcon("Star"),
        },
        {
          key: "cloud",
          link: "cloud",
          label: "我的云盘",
          show: isElectron,
          icon: renderIcon("Cloud"),
        },
        {
          key: "local",
          link: "local",
          label: "本地歌曲",
          show: isElectron,
          icon: renderIcon("FolderMusic"),
        },
        {
          key: "history",
          link: "history",
          label: "最近播放",
          icon: renderIcon("History"),
        },
        {
          key: "divider-two",
          type: "divider",
        },
        // 创建的歌单
        {
          key: "user-playlists",
          icon: statusStore.menuCollapsed ? renderIcon("PlaylistAdd") : undefined,
          label: () =>
            h("div", { class: "user-list" }, [
              h(NText, { depth: 3 }, () => ["创建的歌单"]),
              h(NButton, {
                type: "tertiary",
                round: true,
                strong: true,
                secondary: true,
                renderIcon: renderIcon("Add"),
                onclick: (event: Event) => {
                  event.stopPropagation();
                  openCreatePlaylist();
                },
              }),
            ]),
          children: [...createPlaylist.value],
        },
        // 收藏的歌单
        {
          key: "liked-playlists",
          icon: statusStore.menuCollapsed ? renderIcon("PlaylistAddCheck") : undefined,
          label: () =>
            h(
              "div",
              { class: "user-list" },
              h(NText, { depth: 3 }, () => ["收藏的歌单"]),
            ),
          children: [...likedPlaylist.value],
        },
      ]
    : [];
});

// 生成歌单列表
const renderPlaylist = (playlist: CoverType[], showCover: boolean) => {
  return playlist.map((playlist) => ({
    key: playlist.id,
    label: () =>
      showCover
        ? h("div", { class: "pl-cover" }, [
            h(NAvatar, {
              src: playlist.coverSize?.s || playlist.cover,
              fallbackSrc: "/images/album.jpg?assest",
              lazy: true,
            }),
            h(NEllipsis, null, () => playlist.name),
          ])
        : h(NEllipsis, null, () => playlist.name),
    icon: showCover ? undefined : renderIcon("PlayList"),
  }));
};

// 创建的歌单
const createPlaylist = computed<MenuOption[]>(() => {
  const userId = dataStore.userData.userId;
  const list = dataStore.userLikeData.playlists
    .filter((playlist) => playlist?.userId === userId)
    .slice(1);
  return renderPlaylist(list, settingStore.menuShowCover);
});

// 收藏的歌单
const likedPlaylist = computed<MenuOption[]>(() => {
  const userId = dataStore.userData.userId;
  const list = dataStore.userLikeData.playlists.filter((playlist) => playlist?.userId !== userId);
  return renderPlaylist(list, settingStore.menuShowCover);
});

// 渲染菜单路由
const renderMenuLabel = (option: MenuOption) => {
  // 路由链接
  if ("link" in option) {
    return h(RouterLink, { to: { name: option.link as string } }, () => option.label as string);
  }
  return typeof option.label === "function" ? option.label() : (option.label as string);
};

// 菜单项更改
const menuUpdate = (key: string, item: MenuOption) => {
  // 私人漫游
  if (key === "personal-fm") {
    if (!musicStore.personalFMSong?.id) {
      window.$message.error("开启私人漫游出错，请重试");
      return;
    }
    if (statusStore.personalFmMode) {
      player.play();
    } else {
      // 更改播放模式
      statusStore.personalFmMode = true;
      statusStore.playHeartbeatMode = false;
      player.resetStatus();
      player.initPlayer();
    }
    statusStore.showFullPlayer = true;
    window.$message.info("已开启私人漫游", { icon: renderIcon("Radio") });
    return;
  }
  if (typeof key === "number") {
    router.push({
      name: "playlist",
      query: { id: item.key },
    });
  } else {
    switch (key) {
      case "like-songs":
        router.push({
          name: "like-songs",
        });
        break;
      default:
        break;
    }
  }
};

// 选中菜单项
const checkMenuItem = () => {
  // 当前路由名称
  const routerName =
    (router.currentRoute.value.matched?.[0]?.name as string) ||
    (router.currentRoute.value?.name as string);
  if (!routerName) return;
  // 显示菜单
  menuRef.value?.showOption(routerName);
  // 高亮菜单
  switch (routerName) {
    case "playlist": {
      // 获取歌单 id
      const playlistId = Number(router.currentRoute.value.query.id || 0);
      // 是否处于用户歌单
      const isUserPlaylist = dataStore.userLikeData.playlists.some(
        (playlist) => playlist?.id === playlistId,
      );
      if (playlistId) menuActiveKey.value = isUserPlaylist ? Number(playlistId) : "home";
      menuRef.value?.showOption(playlistId);
      break;
    }
    default:
      menuActiveKey.value = routerName;
      break;
  }
};

// 开启心动模式
const openHeartMode = debounce(() => player.toggleHeartMode(), 1000, {
  leading: true,
  trailing: false,
});

// 监听路由
watch(
  () => [router.currentRoute.value, dataStore.userLikeData.playlists],
  () => checkMenuItem(),
);
</script>

<style lang="scss" scoped>
.n-menu {
  padding-bottom: 14px;
  :deep(.n-menu-item) {
    .n-menu-item-content {
      &::before {
        border-left: 4px solid transparent;
        transition:
          border 0.3s var(--n-bezier),
          background-color 0.3s var(--n-bezier);
      }
      &.n-menu-item-content--selected {
        .n-text {
          color: var(--primary-hex);
        }
        &::before {
          border-left-color: var(--n-item-text-color-active);
        }
      }
    }
  }
  &.cover {
    :deep(.n-submenu-children) {
      --n-item-height: 50px;
    }
  }
}
</style>

<style lang="scss">
.user-liked {
  display: flex;
  align-items: center;
  justify-content: space-between;
  .n-button {
    margin-left: 12px;
    --n-height: 30px;
    --n-padding: 0 16px;
    --n-icon-size: 20px;
  }
}
.user-list {
  display: flex;
  align-items: center;
  .n-text {
    font-size: 0.93em;
  }
  .n-button {
    margin-left: 12px;
    --n-height: 22px;
    --n-padding: 0 12px;
    --n-icon-size: 12px;
  }
}
.pl-cover {
  display: flex;
  align-items: center;
  .n-avatar {
    width: 34px;
    height: 34px;
    min-width: 34px;
    margin-right: 12px;
    border-radius: 8px;
  }
}
</style>
