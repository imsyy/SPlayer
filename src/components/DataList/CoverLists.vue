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
            <n-avatar
              class="coverImg"
              :src="item.cover.replace(/^http:/, 'https:') + '?param=300y300'"
              fallback-src="/images/pic/default.png"
            />
            <n-icon class="play" :component="PlayArrowRound" />
            <div class="description" v-if="listType != 'topList'">
              <div class="num" v-if="listType == 'playList'">
                <n-icon :component="HeadsetFilled" />
                <span class="des">{{ item.playCount }}</span>
              </div>
              <div class="num" v-else>
                <span class="des">{{ item.time }}</span>
              </div>
            </div>
          </div>
          <div class="title">
            <span class="name text-hidden">{{ item.name }}</span>
            <span v-if="listType == 'playList' && item.artist" class="by">
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
    <n-modal
      style="width: 60vw; min-width: min(24rem, 100vw)"
      v-model:show="playlistUpdateModel"
      preset="card"
      title="歌单编辑"
      :bordered="false"
      :on-after-leave="closeUpdateModel"
    >
      <n-form
        ref="playlistUpdateRef"
        :rules="playlistUpdateRules"
        :label-width="80"
        :model="playlistUpdateValue"
      >
        <n-form-item label="歌单名称" path="name">
          <n-input
            v-model:value="playlistUpdateValue.name"
            placeholder="请输入歌单名称"
          />
        </n-form-item>
        <n-form-item label="歌单描述" path="desc">
          <n-input
            v-model:value="playlistUpdateValue.desc"
            placeholder="请输入歌单描述"
            type="textarea"
            :autosize="{
              minRows: 3,
              maxRows: 5,
            }"
          />
        </n-form-item>
        <n-form-item label="歌单标签" path="tags">
          <n-select
            multiple
            v-model:value="playlistUpdateValue.tags"
            placeholder="请输入歌单标签"
            :options="playlistTags"
            @click="openSelect"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="closeUpdateModel"> 取消 </n-button>
          <n-button type="primary" @click="toUpdatePlayList"> 编辑 </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { PlayArrowRound, HeadsetFilled } from "@vicons/material";
import { delPlayList, playlistUpdate, likePlaylist } from "@/api";
import { musicStore, userStore } from "@/store";
import { useRouter } from "vue-router";
import { formRules } from "@/utils/formRules.js";
import AllArtists from "./AllArtists.vue";

const router = useRouter();
const music = musicStore();
const user = userStore();
const { textRule } = formRules();
const props = defineProps({
  // 列表数据
  listData: {
    type: Object,
    default: [],
  },
  // 列表类型
  listType: {
    type: String,
    default: "playList",
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

// 弹窗数据
let rightMenuX = ref(0);
let rightMenuY = ref(0);
let rightMenuShow = ref(false);
const rightMenuOptions = ref(null);

// 更新歌单数据
let playlistUpdateId = ref(null);
let playlistUpdateRef = ref(null);
let playlistUpdateModel = ref(false);
let playlistUpdateRules = {
  name: textRule,
};
let playlistUpdateValue = ref({
  name: null,
  desc: null,
  tags: null,
});

// 打开右键菜单
const openRightMenu = (e, data) => {
  e.preventDefault();
  rightMenuShow.value = false;
  nextTick().then(() => {
    rightMenuOptions.value = [
      {
        key: "update",
        label: "编辑歌单",
        show: router.currentRoute.value.name == "playlists" ? true : false,
        props: {
          onClick: () => {
            playlistUpdateId.value = data.id;
            playlistUpdateModel.value = true;
            playlistUpdateValue.value = {
              name: data.name,
              desc: data.desc,
              tags: data.tags,
            };
          },
        },
      },
      {
        key: "del",
        label: "删除歌单",
        show: router.currentRoute.value.name == "playlists" ? true : false,
        props: {
          onClick: () => {
            toDelPlayList(data);
          },
        },
      },
      {
        key: "like",
        label: isLikeOrDislike(data.id) ? "收藏歌单" : "取消收藏歌单",
        show:
          user.userLogin &&
          music.getUserPlayLists.has &&
          router.currentRoute.value.name != "playlists"
            ? true
            : false,
        props: {
          onClick: () => {
            toLikePlaylist(data.id);
          },
        },
      },
      {
        key: "copy",
        label: "复制歌单链接",
        props: {
          onClick: () => {
            if (navigator.clipboard) {
              try {
                navigator.clipboard.writeText(
                  `https://music.163.com/#/playlist?id=${data.id}`
                );
                $message.success("歌单链接复制成功");
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

// 更新歌单
const toUpdatePlayList = (e) => {
  e.preventDefault();
  playlistUpdateRef.value?.validate((errors) => {
    if (!errors) {
      console.log("通过");
      playlistUpdate(
        playlistUpdateId.value,
        playlistUpdateValue._value.name,
        playlistUpdateValue._value.desc,
        playlistUpdateValue._value.tags.join(";")
      ).then((res) => {
        console.log(res);
        if (res.code === 200) {
          $message.success("编辑成功");
          closeUpdateModel();
          music.setUserPlayLists();
        } else {
          $message.error("编辑失败，请重试");
        }
      });
    } else {
      $loadingBar.error();
      $message.error("请检查您的输入");
    }
  });
};

// 链接跳转
const toLink = (id) => {
  if (props.listType == "playList" || props.listType == "topList") {
    router.push({
      path: "/playlist",
      query: {
        id,
      },
    });
  } else if (props.listType == "album") {
    router.push({
      path: "/album",
      query: {
        id,
      },
    });
  }
};

// 关闭更新歌单弹窗
const closeUpdateModel = () => {
  playlistUpdateModel.value = false;
  playlistUpdateId.value = null;
};

// 删除歌单
const toDelPlayList = (data) => {
  $dialog.warning({
    title: "删除歌单",
    content: "确认删除歌单 " + data.name + "？",
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => {
      delPlayList(data.id).then((res) => {
        if (res.code === 200) {
          $message.success("删除成功");
          music.setUserPlayLists();
        }
      });
    },
  });
};

// 歌单分类标签
let playlistTags = ref([]);
const openSelect = () => {
  if (music.catList.sub) {
    playlistTags.value = music.catList.sub.map((v) => ({
      label: v.name,
      value: v.name,
    }));
  } else {
    music.setCatList();
  }
};

// 判断收藏还是取消
const isLikeOrDislike = (id) => {
  if (music.getUserPlayLists.like[0]) {
    const index = music.getUserPlayLists.like.findIndex(
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

// 收藏/取消收藏歌单
const toLikePlaylist = (id) => {
  let type = isLikeOrDislike(id) ? 1 : 2;
  likePlaylist(type, id).then((res) => {
    if (res.code === 200) {
      $message.success(`歌单${type == 1 ? "收藏成功" : "取消收藏成功"}`);
      music.setUserPlayLists();
    } else {
      $message.error(`歌单${type == 1 ? "收藏失败" : "取消收藏失败"}`);
    }
  });
};

onMounted(() => {
  if (router.currentRoute.value.name == "playlists" && !music.catList.sub)
    music.setCatList();
  if (user.userLogin && !music.getUserPlayLists.has) music.setUserPlayLists();
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
      overflow: hidden;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      position: relative;
      .coverImg {
        border-radius: 8px;
        width: 100%;
        height: 100%;
        transition: all 0.3s;
      }
      .play {
        opacity: 0;
        position: absolute;
        font-size: 5vh;
        color: #fff;
        padding: 0.5vw;
        background-color: #00000010;
        backdrop-filter: blur(10px);
        border-radius: 50%;
        transform: scale(0.8);
        transition: all 0.3s;
      }
      .description {
        position: absolute;
        right: 0;
        bottom: 0;
        color: #fff;
        background-color: #00000030;
        font-size: 12px;
        backdrop-filter: blur(4px);
        padding: 6px;
        border-top-left-radius: 8px;
        transition: all 0.3s;
        .num {
          display: flex;
          flex-direction: row;
          align-items: center;
          .n-icon {
            margin-right: 2px;
          }
          .des {
            line-height: normal;
          }
        }
      }
      &:hover {
        box-shadow: 0 15px 30px rgb(0 0 0 / 10%);
        .coverImg {
          filter: brightness(0.8);
          transform: scale(1.1);
        }
        .play {
          transform: scale(1);
          opacity: 1;
        }
        .description {
          opacity: 0;
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
          color: $mainColor;
        }
      }
      .by {
        font-size: 12px;
        opacity: 0.6;
        transition: all 0.3s;
        cursor: pointer;
        &:hover {
          opacity: 1;
          color: $mainColor;
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
}
</style>
