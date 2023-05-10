<template>
  <div class="playlist" v-if="playListDetail">
    <div class="left">
      <div class="cover">
        <n-avatar
          class="coverImg"
          :src="
            playListDetail.coverImgUrl
              ? playListDetail.coverImgUrl.replace(/^http:/, 'https:') +
                '?param=1024y1024'
              : null
          "
          fallback-src="/images/pic/default.png"
        />
        <n-avatar
          class="shadow"
          :src="
            playListDetail.coverImgUrl
              ? playListDetail.coverImgUrl.replace(/^http:/, 'https:') +
                '?param=1024y1024'
              : null
          "
          fallback-src="/images/pic/default.png"
        />
      </div>
      <div class="meta">
        <div class="title">
          <n-text class="name text-hidden">{{ playListDetail.name }}</n-text>
          <n-text class="creator">{{ playListDetail.creator.nickname }}</n-text>
        </div>
        <div class="intr">
          <span class="name">歌单简介</span>
          <span class="desc text-hidden">
            {{
              playListDetail.description
                ? playListDetail.description
                : "太懒了吧，连简介都不写"
            }}
          </span>
          <n-button
            class="all-desc"
            block
            strong
            secondary
            v-if="playListDetail?.description?.length > 70"
            @click="playListDescShow = true"
          >
            全部简介
          </n-button>
        </div>
        <n-space class="tag" v-if="playListDetail.tags">
          <n-tag
            class="tags"
            round
            :bordered="false"
            v-for="item in playListDetail.tags"
            :key="item"
            @click="router.push(`/discover/playlists?cat=${item}&page=1`)"
          >
            {{ item }}
          </n-tag>
        </n-space>
        <n-space class="control">
          <n-button strong secondary round type="primary" @click="playAllSong">
            <template #icon>
              <n-icon :component="MusicList" />
            </template>
            播放
          </n-button>
          <n-dropdown
            placement="right-start"
            trigger="click"
            :show-arrow="true"
            :options="dropdownOptions"
          >
            <n-button strong secondary circle>
              <template #icon>
                <n-icon :component="More" />
              </template>
            </n-button>
          </n-dropdown>
        </n-space>
      </div>
    </div>
    <div class="right">
      <div class="meta">
        <n-text class="name">{{ playListDetail.name }}</n-text>
        <n-text class="creator">{{ playListDetail.creator.nickname }}</n-text>
        <div class="time">
          <div class="createTime">
            <span class="num">创建时间：</span>
            {{ getLongTime(playListDetail.createTime) }}
          </div>
          <div class="updateTime">
            <span class="num">更新时间：</span>
            {{ getLongTime(playListDetail.updateTime) }}
          </div>
        </div>
      </div>
      <DataLists :listData="playListData" />
      <Pagination
        :totalCount="totalCount"
        :pageNumber="pageNumber"
        :showSizePicker="false"
        :showQuickJumper="false"
        @pageSizeChange="pageSizeChange"
        @pageNumberChange="pageNumberChange"
      />
      <!-- 歌单简介 -->
      <n-modal
        class="s-modal"
        v-model:show="playListDescShow"
        preset="card"
        title="歌单简介"
        :bordered="false"
      >
        <n-scrollbar>
          <n-text v-html="playListDetail.description.replace(/\n/g, '<br>')" />
        </n-scrollbar>
      </n-modal>
    </div>
  </div>
  <div class="title" v-else-if="!playListId || !loadingState">
    <span class="key">{{
      loadingState ? "参数不完整" : "歌单信息加载失败"
    }}</span>
    <br />
    <n-button strong secondary @click="router.go(-1)" style="margin-top: 20px">
      返回上一页
    </n-button>
  </div>
  <div class="loading" v-else>
    <div class="left">
      <n-skeleton class="pic" />
      <n-skeleton text :repeat="5" />
      <n-skeleton text style="width: 60%" />
    </div>
    <div class="right">
      <n-skeleton :sharp="false" height="80px" width="60%" />
      <n-skeleton height="100%" width="100%" />
    </div>
  </div>
</template>

<script setup>
import { NIcon, NAvatar, NText } from "naive-ui";
import {
  getPlayListDetail,
  getAllPlayList,
  delPlayList,
  likePlaylist,
} from "@/api/playlist";
import { useRouter } from "vue-router";
import { userStore, musicStore, settingStore } from "@/store";
import { getSongTime, getLongTime } from "@/utils/timeTools";
import {
  MusicList,
  LinkTwo,
  More,
  DeleteFour,
  Like,
  Unlike,
} from "@icon-park/vue-next";
import DataLists from "@/components/DataList/DataLists.vue";
import Pagination from "@/components/Pagination/index.vue";

const router = useRouter();
const user = userStore();
const music = musicStore();
const setting = settingStore();

// 歌单数据
const playListId = ref(router.currentRoute.value.query.id);
const playListDetail = ref(null);
const playListData = ref([]);
const playListDescShow = ref(false);
const pagelimit = ref(30);
const loadingState = ref(true);
const pageNumber = ref(
  router.currentRoute.value.query.page
    ? Number(router.currentRoute.value.query.page)
    : 1
);
const totalCount = ref(0);

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

// 判断收藏还是取消
const isLikeOrDislike = (id) => {
  const playlists = user.getUserPlayLists.like;
  if (playlists.length) {
    return !playlists.some((item) => item.id === Number(id));
  }
  return true;
};

// 判断是否可删除
const isCanDelete = (id) => {
  const playlists = user.getUserPlayLists.own;
  if (playlists.length) {
    return playlists.some((item) => item.id === Number(id));
  }
  return false;
};

// 歌单下拉菜单数据
const dropdownOptions = ref([]);

// 更改歌单下拉菜单数据
const setDropdownOptions = () => {
  dropdownOptions.value = [
    {
      key: "copy",
      label: "复制歌单链接",
      props: {
        onClick: () => {
          if (navigator.clipboard) {
            try {
              navigator.clipboard.writeText(
                `https://music.163.com/#/playlist?id=${playListId.value}`
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
      icon: renderIcon(h(LinkTwo)),
    },
    {
      key: "del",
      label: "删除歌单",
      show: user.userLogin && isCanDelete(playListId.value),
      props: {
        onClick: () => {
          toDelPlayList(playListDetail.value);
        },
      },
      icon: renderIcon(h(DeleteFour)),
    },
    {
      key: "like",
      label: isLikeOrDislike(playListId.value) ? "收藏歌单" : "取消收藏歌单",
      show: user.userLogin && !isCanDelete(playListId.value),
      props: {
        onClick: () => {
          toChangeLike(playListId.value);
        },
      },
      icon: renderIcon(h(isLikeOrDislike(playListId.value) ? Like : Unlike)),
    },
  ];
};

// 获取歌单信息
const getPlayListDetailData = (id) => {
  getPlayListDetail(id)
    .then((res) => {
      console.log(res);
      // 歌单总数
      totalCount.value = res.playlist.trackCount;
      // 歌单信息
      playListDetail.value = res.playlist;
      $setSiteTitle(res.playlist.name + " - 歌单");
    })
    .catch((err) => {
      $setSiteTitle("歌单详情");
      loadingState.value = false;
      console.error("获取歌单信息失败：" + err);
    });
};

// 获取歌单所有歌曲
const getAllPlayListData = (id, limit = 30, offset = 0) => {
  getAllPlayList(id, limit, offset).then((res) => {
    console.log(res);
    if (res.songs) {
      playListData.value = [];
      res.songs.forEach((v, i) => {
        playListData.value.push({
          id: v.id,
          num: i + 1 + (pageNumber.value - 1) * pagelimit.value,
          name: v.name,
          artist: v.ar,
          album: v.al,
          alia: v.alia,
          time: getSongTime(v.dt),
          fee: v.fee,
          sourceId: id,
          pc: v.pc ? v.pc : null,
          mv: v.mv ? v.mv : null,
        });
      });
    } else {
      $message.error("获取歌单内歌曲失败");
    }
    // 请求后回顶
    if ($mainContent) $mainContent.scrollIntoView({ behavior: "smooth" });
  });
};

// 播放歌单所有歌曲
const playAllSong = () => {
  try {
    // 获取元素
    const songDom = document.getElementById("datalists").firstElementChild;
    const allSongDom = document.querySelectorAll("#datalists > *");
    // 是否有元素存在 play
    let isHasPlay = false;
    // 遍历
    allSongDom.forEach((child) => {
      if (child.classList.contains("play")) {
        isHasPlay = true;
      }
    });
    if (!isHasPlay) {
      // 双击操作
      const event = new MouseEvent("dblclick", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      // 双击或单击
      if (setting.listClickMode === "dblclick") {
        songDom.dispatchEvent(event);
      } else if (setting.listClickMode === "click") {
        songDom.click();
      }
    } else {
      music.setPlayState(true);
    }
  } catch (err) {
    console.error("播放全部歌曲失败：" + err);
    $message.error("播放全部歌曲失败，请重试");
  }
};

// 删除歌单
const toDelPlayList = (data) => {
  if (data.id === user.getUserPlayLists?.own[0].id) {
    $message.warning("默认歌单无法删除");
    return false;
  }
  $dialog.warning({
    class: "s-dialog",
    title: "删除歌单",
    content: "确认删除歌单 " + data.name + "？删除后将不可恢复！",
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => {
      delPlayList(data.id).then((res) => {
        if (res.code === 200) {
          $message.success("删除成功");
          user.setUserPlayLists();
          router.push("/user/playlists");
        }
      });
    },
  });
};

// 收藏/取消收藏
const toChangeLike = async (id) => {
  const type = isLikeOrDislike(id) ? 1 : 2;
  try {
    const res = await likePlaylist(type, id);
    if (res.code === 200) {
      $message.success(`歌单${type == 1 ? "收藏成功" : "取消收藏成功"}`);
      user.setUserPlayLists(() => {
        setDropdownOptions();
      });
    } else {
      $message.error(`歌单${type == 1 ? "收藏失败" : "取消收藏失败"}`);
    }
  } catch (err) {
    $message.error(`歌单${type == 1 ? "收藏失败" : "取消收藏失败"}`);
    console.error(`歌单${type == 1 ? "收藏失败：" : "取消收藏失败："}` + err);
  }
};

onMounted(() => {
  if (playListId.value) {
    getPlayListDetailData(playListId.value);
    getAllPlayListData(
      playListId.value,
      pagelimit.value,
      (pageNumber.value - 1) * pagelimit.value
    );
    if (
      user.userLogin &&
      !user.getUserPlayLists.has &&
      !user.getUserPlayLists.isLoading
    ) {
      user.setUserPlayLists(() => {
        setDropdownOptions();
      });
    } else {
      setDropdownOptions();
    }
  }
});

// 每页个数数据变化
const pageSizeChange = (val) => {
  console.log(val);
  pagelimit.value = val;
  getAllPlayListData(
    playListId.value,
    val,
    (pageNumber.value - 1) * pagelimit.value
  );
};

// 当前页数数据变化
const pageNumberChange = (val) => {
  router.push({
    path: "/playlist",
    query: {
      id: playListId.value,
      page: val,
    },
  });
};

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val, oldVal) => {
    playListId.value = val.query.id;
    pageNumber.value = Number(val.query.page ? val.query.page : 1);
    if (val.name == "playlist") {
      if (val.query.id != oldVal.query.id) {
        getPlayListDetailData(playListId.value);
        getAllPlayListData(
          playListId.value,
          pagelimit.value,
          (pageNumber.value - 1) * pagelimit.value
        );
      } else {
        getAllPlayListData(
          playListId.value,
          pagelimit.value,
          (pageNumber.value - 1) * pagelimit.value
        );
      }
    }
  }
);
</script>

<style lang="scss" scoped>
.playlist,
.loading {
  display: flex;
  flex-direction: row;
  .left {
    width: 40vw;
    height: 100%;
    max-width: 320px;
    min-width: 200px;
    margin-right: 20px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    position: sticky;
    top: 24px;
    @media (max-width: 990px) {
      margin-right: 0;
      width: 30vw;
    }
    .cover {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      width: 80%;
      height: 80%;
      .n-avatar {
        border-radius: 8px;
        width: 100%;
        height: 100%;
        z-index: 1;
      }
      .shadow {
        position: absolute;
        top: 12px;
        height: 100%;
        width: 100%;
        filter: blur(16px) opacity(0.6);
        transform: scale(0.92, 0.96);
        z-index: 0;
        background-size: cover;
        border-radius: 0.75em;
        aspect-ratio: 1/1;
      }
    }
    .meta {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      .title {
        display: none;
        flex-direction: column;
        margin-top: 0;
        .name {
          font-size: 28px;
          font-weight: bold;
          -webkit-line-clamp: 2;
        }
        .creator {
          margin-top: 6px;
          font-size: 16px;
          opacity: 0.8;
        }
      }
      .intr {
        margin-top: 24px;
        width: 80%;
        padding-left: 4px;
        .name {
          display: block;
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 12px;
          @media (max-width: 990px) {
            font-size: 18px;
          }
        }
        .desc {
          -webkit-line-clamp: 4;
          line-height: 26px;
          margin-bottom: 16px;
        }
      }
      .tag {
        margin-top: 20px;
        .tags {
          line-height: 0;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s;
          &:hover {
            background-color: var(--main-second-color);
            color: var(--main-color);
          }
          &:active {
            transform: scale(0.95);
          }
        }
      }
      .control {
        margin-top: 20px;
      }
    }
  }
  .right {
    flex: 1;
    .meta {
      display: flex;
      flex-direction: column;
      margin-top: 20px;
      margin-bottom: 20px;
      .name {
        font-size: 30px;
        font-weight: bold;
      }
      .creator {
        margin-top: 6px;
        font-size: 16px;
        opacity: 0.8;
        cursor: pointer;
        transition: all 0.3s;
        &:hover {
          opacity: 1;
          color: var(--main-color);
        }
      }
      .time {
        margin-top: 8px;
        display: flex;
        flex-direction: row;
        align-items: center;
        @media (max-width: 768px) {
          flex-direction: column;
          align-items: flex-start;
        }
        .num {
          color: #999;
        }
        div {
          margin-right: 12px;
        }
      }
    }
    .datalists {
      :deep(.songs) {
        @media (max-width: 990px) {
          .album,
          .time {
            display: none;
          }
        }
      }
    }
  }
  @media (max-width: 768px) {
    flex-direction: column;
    .left {
      position: relative;
      top: 0;
      width: 100%;
      height: 40vw;
      max-width: none;
      display: flex;
      flex-direction: row;
      .cover {
        height: 100%;
        min-width: 40vw;
        margin-right: 30px;
      }
      .meta {
        .title {
          display: flex;
          margin-bottom: 16px;
        }
        .intr {
          margin-top: 0;
          padding-left: 0;
          .name,
          .all-desc {
            display: none;
          }
          .desc {
            -webkit-line-clamp: 2;
            margin-bottom: 0;
          }
        }
        .control {
          position: absolute;
          left: 0;
          bottom: -60px;
        }
      }
    }
    .right {
      margin-top: 80px;
      .meta {
        display: none;
      }
    }
  }
  @media (max-width: 540px) {
    .left {
      .cover {
        margin-right: 20px;
      }
      .meta {
        .title {
          .name {
            font-size: 24px;
          }
          .creator {
            font-size: 14px;
          }
        }
        .intr,
        .tag {
          display: none !important;
        }
        .control {
          position: static;
        }
      }
    }
    .right {
      margin-top: 30px;
    }
  }
  @media (max-width: 520px) {
    .left {
      .meta {
        .title {
          .name {
            font-size: 20px;
          }
          .creator {
            font-size: 12px;
          }
        }
      }
    }
  }
}
.title {
  margin-top: 30px;
  margin-bottom: 20px;
  font-size: 24px;
  .key {
    font-size: 40px;
    font-weight: bold;
    margin-right: 8px;
  }
}
.loading {
  .left {
    display: block;
    .pic {
      padding-bottom: 100%;
      width: 100%;
      height: 0;
      border-radius: 8px !important;
      margin-bottom: 20px;
    }
  }
  .right {
    .n-skeleton {
      margin-bottom: 20px;
    }
  }
}
</style>
