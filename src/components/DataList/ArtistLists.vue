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
          @click="router.push(`/artist?id=${item.id}`)"
          @contextmenu="openRightMenu($event, item)"
        >
          <div class="cover">
            <n-avatar
              round
              class="coverImg"
              :src="item.cover.replace(/^http:/, 'https:') + '?param=200y200'"
              fallback-src="/images/pic/default.png"
            />
            <n-icon :component="PersonSearchFilled" />
          </div>
          <n-text class="name text-hidden">{{ item.name }}</n-text>
          <n-text class="size" :depth="3" v-if="item.size">
            {{ item.size }}首
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
import { PersonSearchFilled } from "@vicons/material";
import { likeArtist } from "@/api";
import { useRouter } from "vue-router";
import { musicStore, userStore } from "@/store";

const music = musicStore();
const user = userStore();
const router = useRouter();
const props = defineProps({
  // 列表数据
  listData: {
    type: Object,
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

// 打开右键菜单
const openRightMenu = (e, data) => {
  e.preventDefault();
  rightMenuShow.value = false;
  nextTick().then(() => {
    rightMenuOptions.value = [
      {
        key: "like",
        label: isLikeOrDislike(data.id) ? "收藏歌手" : "取消收藏歌手",
        show: user.userLogin && music.getUserArtistlists.has ? true : false,
        props: {
          onClick: () => {
            toLikeArtist(data);
          },
        },
      },
      {
        key: "copy",
        label: "复制歌手链接",
        props: {
          onClick: () => {
            if (navigator.clipboard) {
              try {
                navigator.clipboard.writeText(
                  `https://music.163.com/#/artist?id=${data.id}`
                );
                $message.success("歌手链接复制成功");
              } catch (err) {
                $message.error("复制失败：", err);
              }
            } else {
              $message.error("您的浏览器暂不支持该操作");
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
  likeArtist(type, data.id).then((res) => {
    if (res.code === 200) {
      $message.success(
        `${data.name}${type == 1 ? "收藏成功" : "取消收藏成功"}`
      );
      music.setUserArtistLists();
    } else {
      $message.error(`${data.name}${type == 1 ? "收藏失败" : "取消收藏失败"}`);
    }
  });
};

// 判断收藏还是取消
const isLikeOrDislike = (id) => {
  if (music.getUserArtistlists.list[0]) {
    const index = music.getUserArtistlists.list.findIndex(
      (item) => item.id === id
    );
    if (index !== -1) {
      return false;
    }
    return true;
  } else {
    return true;
  }
};

onMounted(() => {
  if (user.userLogin && !music.getUserArtistlists.has)
    music.setUserArtistLists();
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
      .n-avatar {
        filter: brightness(1);
        transform: scale(1);
        width: 100%;
        height: 100%;
        transition: all 0.3s;
      }
      .n-icon {
        opacity: 0;
        transform: scale(0.8);
        position: absolute;
        color: #fff;
        font-size: 5vh;
        transition: all 0.3s;
      }
      &:hover {
        box-shadow: 0 4px 16px 0 #00000040;
        .n-icon {
          opacity: 1;
          transform: scale(1);
        }
        .n-avatar {
          filter: brightness(0.8);
          transform: scale(1.05);
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
        color: $mainColor;
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
