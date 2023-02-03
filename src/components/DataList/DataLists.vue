<template>
  <Transition mode="out-in">
    <div class="datalists" v-if="listData[0]">
      <n-card
        hoverable
        :class="
          music.getPlaySongData
            ? music.getPlaySongData.id == item.id
              ? 'songs play'
              : 'songs'
            : 'songs'
        "
        :content-style="{
          padding: '16px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }"
        v-for="item in listData"
        :key="item"
        @dblclick="
          setting.listClickMode === 'dblclick' ? playSong(listData, item) : null
        "
        @click="checkCanClick(listData, item)"
        @contextmenu="openRightMenu($event, item)"
      >
        <n-avatar
          class="pic"
          :src="
            item.album && item.album.picUrl
              ? item.album.picUrl.replace(/^http:/, 'https:') + '?param=60y60'
              : '/images/pic/default.png'
          "
          fallback-src="/images/pic/default.png"
        />
        <div class="name">
          <div class="title">
            <n-text
              class="text-hidden"
              depth="2"
              v-html="item.name"
              @click.stop="jumpLink(item.id, 1)"
            />
            <n-tag
              v-if="item.fee == 1"
              class="vip"
              round
              :bordered="false"
              size="small"
            >
              VIP
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
            :component="
              music.getSongIsLike(item.id) ? FavoriteRound : FavoriteBorderRound
            "
            @click.stop="
              music.getSongIsLike(item.id)
                ? music.changeLikeList(item.id, false)
                : music.changeLikeList(item.id, true)
            "
          />
          <n-icon
            class="more"
            size="20"
            :component="MoreHorizRound"
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
              <n-icon size="20" :component="PlayArrowRound" />
              <n-text>立即播放</n-text>
            </div>
            <div
              class="item"
              @click="
                () => {
                  music.addSongToNext(drawerData);
                  drawerShow = false;
                }
              "
            >
              <n-icon size="20" :component="SlowMotionVideoRound" />
              <n-text>下一首播放</n-text>
            </div>
            <div
              class="item"
              @click="router.push(`/comment?id=${drawerData.id}`)"
            >
              <n-icon size="20" :component="MessageFilled" />
              <n-text>前往评论区</n-text>
            </div>
            <div
              class="item"
              v-if="drawerData.mv"
              @click="router.push(`/video?id=${drawerData.mv}`)"
            >
              <n-icon size="20" :component="OndemandVideoRound" />
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
              <n-icon size="20" :component="InsertLinkRound" />
              <n-text>复制歌曲链接</n-text>
            </div>
            <div class="item">
              <n-icon size="20" :component="AccountCircleRound" />
              <n-text
                >歌手：
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
              <n-icon size="20" :component="AlbumRound" />
              <n-text>专辑：{{ drawerData.album.name }}</n-text>
            </div>
            <div
              v-if="router.currentRoute.value.name == 'cloud'"
              class="item"
              @click="
                () => {
                  cloudMatchValue.sid = drawerData.id;
                  cloudMatchBeforeData = drawerData;
                  cloudMatchModel = true;
                  drawerShow = false;
                }
              "
            >
              <n-icon size="20" :component="InsertPageBreakRound" />
              <n-text>歌曲信息纠正</n-text>
            </div>
            <div
              v-if="router.currentRoute.value.name == 'cloud'"
              class="item"
              @click="
                () => {
                  delCloudSong(drawerData);
                  drawerShow = false;
                }
              "
            >
              <n-icon size="20" :component="DeleteRound" />
              <n-text>从云盘中删除</n-text>
            </div>
          </div>
        </n-drawer-content>
      </n-drawer>
      <!-- 歌曲信息纠正 -->
      <n-modal
        style="width: 60vw; min-width: min(24rem, 100vw)"
        v-model:show="cloudMatchModel"
        preset="card"
        title="歌曲信息纠正"
        :bordered="false"
        :on-after-leave="closeCloudMatch"
      >
        <n-form class="cloud-match" :label-width="80" :model="cloudMatchValue">
          <n-form-item label="原歌曲信息">
            <n-card content-style="padding: 16px" :bordered="false" embedded>
              <SmallSongData :songData="cloudMatchBeforeData" notJump />
            </n-card>
          </n-form-item>
          <n-form-item label="匹配 ID" path="asid">
            <n-input-number
              v-model:value="cloudMatchValue.asid"
              placeholder="请输入要匹配的歌曲 ID"
              :show-button="false"
            />
            <n-button
              style="margin-left: 12px"
              :disabled="!cloudMatchValue.asid"
              @click="cloudMatchId = cloudMatchValue.asid"
            >
              检查
            </n-button>
          </n-form-item>
        </n-form>
        <n-card
          v-if="cloudMatchId"
          content-style="padding: 16px"
          :bordered="false"
          embedded
        >
          <SmallSongData
            ref="smallSongDataRef"
            :getDataByID="cloudMatchId"
            notJump
          />
        </n-card>
        <template #footer>
          <n-space justify="end">
            <n-button @click="closeCloudMatch"> 取消 </n-button>
            <n-button
              type="primary"
              @click="setCloudMatchBtn(cloudMatchValue)"
              :disabled="!cloudMatchValue.asid"
            >
              纠正歌曲
            </n-button>
          </n-space>
        </template>
      </n-modal>
    </div>
    <n-spin class="loading" size="small" v-else />
  </Transition>
</template>

<script setup>
import {
  PlayArrowRound,
  SlowMotionVideoRound,
  FavoriteBorderRound,
  FavoriteRound,
  MoreHorizRound,
  MessageFilled,
  InsertLinkRound,
  AccountCircleRound,
  AlbumRound,
  OndemandVideoRound,
  InsertPageBreakRound,
  DeleteRound,
} from "@vicons/material";
import { musicStore, settingStore, userStore } from "@/store/index";
import { useRouter } from "vue-router";
import { setCloudDel, setCloudMatch } from "@/api";
import AllArtists from "./AllArtists.vue";
import SmallSongData from "./SmallSongData.vue";

const router = useRouter();
const music = musicStore();
const setting = settingStore();
const user = userStore();

// 父组件方法
const emit = defineEmits(["cloudDataLoad"]);

const props = defineProps({
  // 表格数据
  listData: {
    type: Object,
    default: [],
  },
  // 专辑隐藏
  hideAlbum: {
    type: Boolean,
    default: false,
  },
});

// 弹窗数据
let rightMenuX = ref(0);
let rightMenuY = ref(0);
let rightMenuShow = ref(false);
const rightMenuOptions = ref(null);

// 抽屉数据
let drawerShow = ref(false);
let drawerData = ref(null);

// 歌曲信息纠正数据
let smallSongDataRef = ref(null);
let cloudMatchModel = ref(false);
let cloudMatchBeforeData = ref(null);
let cloudMatchId = ref(null);
let cloudMatchValue = ref({
  uid: user.getUserData.userId,
  sid: null,
  asid: null,
});

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

// 打开右侧菜单
const openRightMenu = (e, data) => {
  e.preventDefault();
  rightMenuShow.value = false;
  nextTick().then(() => {
    rightMenuOptions.value = [
      {
        key: "play",
        label: "立即播放",
        props: {
          onClick: () => {
            playSong(props.listData, data);
          },
        },
      },
      {
        key: "nextPlay",
        label: "下一首播放",
        disabled: music.getPersonalFmMode ? true : false,
        props: {
          onClick: () => {
            music.addSongToNext(data);
          },
        },
      },
      {
        key: "comment",
        label: "前往评论区",
        props: {
          onClick: () => {
            router.push(`/comment?id=${data.id}`);
          },
        },
      },
      {
        key: "mv",
        label: "观看 MV",
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
        show: router.currentRoute.value.name == "cloud" ? true : false,
      },
      {
        key: "delete",
        label: "从云盘中删除",
        show: router.currentRoute.value.name == "cloud" ? true : false,
        props: {
          onClick: () => {
            delCloudSong(data);
          },
        },
      },
      {
        key: "match",
        label: "歌曲信息纠正",
        show: router.currentRoute.value.name == "cloud" ? true : false,
        props: {
          onClick: () => {
            cloudMatchValue.value.sid = data.id;
            cloudMatchBeforeData.value = data;
            cloudMatchModel.value = true;
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
        props: {
          onClick: () => {
            router.push(`/search/songs?keywords=${data.name}`);
          },
        },
      },
      {
        key: "copyId",
        label: "复制歌曲 ID",
        props: {
          onClick: () => {
            copySongData(data.id, false);
          },
        },
      },
      {
        key: "copy",
        label: "复制链接",
        props: {
          onClick: () => {
            copySongData(data.id);
          },
        },
      },
      {
        key: "line2",
        type: "divider",
      },
      {
        label: data.name,
        key: "name",
        disabled: true,
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

// 歌曲纠正
const setCloudMatchBtn = (data) => {
  if (data.sid == data.asid) {
    $message.error("与原歌曲 ID 一致，无需纠正");
  } else {
    if (!smallSongDataRef.value) {
      $message.error("请先检查");
    } else if (smallSongDataRef.value.checkSongData()) {
      setCloudMatch(data.uid, data.sid, data.asid).then((res) => {
        console.log(res);
        if (res.data) {
          closeCloudMatch();
          $message.success("歌曲纠正成功");
          emit("cloudDataLoad");
        } else {
          $message.error("歌曲纠正失败，请重试");
        }
      });
    } else {
      $message.error("非正常歌曲 ID，无法匹配");
    }
  }
};

// 关闭歌曲纠正
const closeCloudMatch = () => {
  cloudMatchBeforeData.value = null;
  cloudMatchId.value = null;
  cloudMatchValue.value.asid = null;
  cloudMatchModel.value = false;
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
  music.setPlaylists(data);
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
        .like {
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
    .pic {
      width: 50px;
      height: 50px;
      min-width: 50px;
      border-radius: 8px;
      margin-right: 16px;
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
      width: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      @media (max-width: 768px) {
        .like {
          display: none;
        }
      }
      @media (min-width: 768px) {
        .more {
          display: none;
        }
      }
      .like {
        cursor: pointer;
        opacity: 0;
        transform: scale(0.8);
        color: $mainColor;
        transition: all 0.3s;
        &:hover {
          transform: scale(1.2);
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
      }
      .n-text {
        transform: translateY(1px);
        display: flex;
        flex-direction: row;
      }
    }
  }
}
.cloud-match {
  :deep(.n-input-number) {
    width: 100%;
  }
}
</style>