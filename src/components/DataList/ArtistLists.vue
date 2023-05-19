<template>
  <div class="artistlists">
    <Transition mode="out-in">
      <n-grid
        x-gap="30"
        y-gap="34"
        cols="3 mb:4 s:5 l:6"
        responsive="screen"
        :collapsed="gridCollapsed"
        :collapsed-rows="gridCollapsedRows"
        v-if="listData[0]"
      >
        <n-gi
          class="item"
          v-for="item in listData"
          :key="item"
          @click="router.push(`/artist/songs?id=${item.id}&page=1`)"
          @contextmenu="openRightMenu($event, item)"
        >
          <div class="cover">
            <n-avatar
              lazy
              round
              class="coverImg"
              :src="item.cover.replace(/^http:/, 'https:') + '?param=200y200'"
              fallback-src="/images/pic/default.png"
            >
              <template #placeholder>
                <div class="cover-loading">
                  <n-spin size="small" />
                </div>
              </template>
            </n-avatar>
            <n-avatar
              lazy
              round
              class="shadow"
              :src="item.cover.replace(/^http:/, 'https:') + '?param=200y200'"
              fallback-src="/images/pic/default.png"
            />
            <n-icon size="40" :component="PeopleSearchOne" />
          </div>
          <n-text class="name text-hidden">{{ item.name }}</n-text>
          <n-text class="size" :depth="3" v-if="item.size">
            {{
              $t("general.name.songSize", {
                size: item.size,
              })
            }}
          </n-text>
        </n-gi>
      </n-grid>
      <n-grid
        v-else
        class="loading"
        x-gap="20"
        y-gap="26"
        cols="3 mb:4 s:5 l:6"
        responsive="screen"
        :collapsed="gridCollapsed"
        :collapsed-rows="gridCollapsedRows"
      >
        <n-gi class="item" v-for="n in loadingNum" :key="n">
          <n-skeleton class="pic" :sharp="false" />
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
  </div>
</template>

<script setup>
import { NIcon } from "naive-ui";
import { PeopleSearchOne, LinkTwo, Like, Unlike } from "@icon-park/vue-next";
import { likeArtist } from "@/api/artist";
import { useRouter } from "vue-router";
import { userStore, settingStore } from "@/store";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const user = userStore();
const setting = settingStore();
const router = useRouter();
const props = defineProps({
  // 列表数据
  listData: {
    type: Array,
    default: [],
  },
  // 折叠栅格
  gridCollapsed: {
    type: Boolean,
    default: false,
  },
  // 折叠后行数
  gridCollapsedRows: {
    type: Number,
    default: 1,
  },
  // 加载占位数量
  loadingNum: {
    type: Number,
    default: 6,
  },
});

// 弹窗数据
const rightMenuX = ref(0);
const rightMenuY = ref(0);
const rightMenuShow = ref(false);
const rightMenuOptions = ref(null);

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

// 打开右键菜单
const openRightMenu = (e, data) => {
  e.preventDefault();
  rightMenuShow.value = false;
  nextTick().then(() => {
    rightMenuOptions.value = [
      {
        key: "like",
        label: isLikeOrDislike(data.id)
          ? t("menu.collection", { name: t("general.name.artists") })
          : t("menu.cancelCollection", { name: t("general.name.artists") }),
        show: user.userLogin && user.getUserArtistLists.has ? true : false,
        icon: renderIcon(h(isLikeOrDislike(data.id) ? Like : Unlike)),
        props: {
          onClick: () => {
            toLikeArtist(data);
          },
        },
      },
      {
        key: "copy",
        label: t("menu.copy", {
          name: t("general.name.artists"),
          other: t("general.name.link"),
        }),
        icon: renderIcon(h(LinkTwo)),
        props: {
          onClick: () => {
            if (navigator.clipboard) {
              try {
                navigator.clipboard.writeText(
                  `https://music.163.com/#/artist?id=${data.id}`
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

// 收藏/取消收藏歌手
const toLikeArtist = (data) => {
  const type = isLikeOrDislike(data.id) ? 1 : 2;
  const isThereASpace = setting.language === "zh-CN" ? "" : " ";
  likeArtist(type, data.id).then((res) => {
    if (res.code === 200) {
      $message.success(
        `${data.name + isThereASpace}${
          type == 1
            ? t("menu.collection", { name: t("general.dialog.success") })
            : t("menu.cancelCollection", { name: t("general.dialog.success") })
        }`
      );
      user.setUserArtistLists();
    } else {
      $message.error(
        `${data.name + isThereASpace}${
          type == 1
            ? t("menu.collection", { name: t("general.dialog.failed") })
            : t("menu.cancelCollection", { name: t("general.dialog.failed") })
        }`
      );
    }
  });
};

// 判断收藏还是取消
const isLikeOrDislike = (id) => {
  if (!user.getUserArtistLists.list[0]) {
    return true;
  }
  return !user.getUserArtistLists.list.some((item) => item.id === id);
};

onMounted(() => {
  if (
    user.userLogin &&
    !user.getUserArtistLists.has &&
    !user.getUserArtistLists.isLoading
  )
    user.setUserArtistLists();
});
</script>

<style lang="scss" scoped>
.artistlists {
  padding-top: 20px;
  .v-enter-active,
  .v-leave-active {
    transition: opacity 0.3s ease;
  }

  .v-enter-from,
  .v-leave-to {
    opacity: 0;
  }
  .item {
    text-align: center;
    cursor: pointer;
    .cover {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px 0 #00000020;
      border-radius: 50%;
      transition: all 0.3s;
      .coverImg {
        filter: brightness(1);
        transform: scale(1);
        width: 100%;
        height: 100%;
        transition: all 0.3s;
        z-index: 1;
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
      .n-icon {
        opacity: 0;
        transform: scale(0.8);
        position: absolute;
        color: #fff;
        transition: all 0.3s;
        z-index: 1;
      }
      &:hover {
        box-shadow: 0 4px 16px 0 #00000040;
        .n-icon {
          opacity: 1;
          transform: scale(1);
        }
        .coverImg {
          filter: brightness(0.8);
          transform: scale(1.05);
        }
        .shadow {
          opacity: 1;
        }
      }
      &:active {
        .n-avatar {
          transform: scale(1);
        }
      }
    }
    .name {
      margin-top: 14px;
      font-size: 16px;
      transition: all 0.3s;
      cursor: pointer;
      &:hover {
        color: var(--main-color);
      }
    }
  }
  .loading {
    .pic {
      padding-bottom: 100%;
      width: 100%;
      height: 0;
      border-radius: 50% !important;
      margin-bottom: 20px;
    }
  }
}
</style>
