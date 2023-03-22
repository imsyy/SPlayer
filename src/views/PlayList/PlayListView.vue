<template>
  <div class="playlist" v-if="playListDetail">
    <div class="left">
      <div class="cover">
        <n-avatar
          class="coverImg"
          :src="
            playListDetail.coverImgUrl
              ? playListDetail.coverImgUrl.replace(/^http:/, 'https:') +
                '?param=500y500'
              : null
          "
          fallback-src="/images/pic/default.png"
        />
        <img src="/images/pic/album.png" class="album" alt="album" />
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
          block
          strong
          secondary
          v-if="playListDetail?.description.length > 70"
          @click="playListDescShow = true"
        >
          全部简介
        </n-button>
        <n-modal
          v-model:show="playListDescShow"
          preset="card"
          style="width: 60vw; min-width: min(24rem, 100vw)"
          title="歌单简介"
          :bordered="false"
        >
          <n-scrollbar style="max-height: 60vh">
            {{ playListDetail.description }}
          </n-scrollbar>
        </n-modal>
      </div>
      <n-space class="tag" v-if="playListDetail.tags">
        <n-tag
          class="tags"
          size="large"
          round
          :bordered="false"
          v-for="item in playListDetail.tags"
          :key="item"
          @click="router.push(`/discover/playlists?cat=${item}`)"
        >
          {{ item }}
        </n-tag>
      </n-space>
      <!-- <div class="control" v-if="playListControlShow">
        <n-space>
          <n-button strong secondary round>
            <template #icon>
              <n-icon :component="EditNoteRound" />
            </template>
            编辑
          </n-button>
          <n-button strong secondary round type="primary">
            <template #icon>
              <n-icon :component="DeleteRound" />
            </template>
          </n-button>
        </n-space>
      </div> -->
    </div>
    <div class="right">
      <div class="meta">
        <span class="name">{{ playListDetail.name }}</span>
        <span class="creator">{{ playListDetail.creator.nickname }}</span>
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
    </div>
  </div>
  <div class="title" v-else-if="!playListId">
    <span class="key">未提供所需数据</span>
    <br />
    <n-button strong secondary @click="router.go(-1)" style="margin-top: 20px">
      返回上一级
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
import { getPlayListDetail, getAllPlayList } from "@/api";
import { useRouter } from "vue-router";
import { userStore, musicStore } from "@/store";
import { getSongTime, getLongTime } from "@/utils/timeTools.js";
import { EditNoteRound, DeleteRound } from "@vicons/material";
import DataLists from "@/components/DataList/DataLists.vue";
import Pagination from "@/components/Pagination/index.vue";
const router = useRouter();
const user = userStore();
const music = musicStore();

// 歌单数据
const playListId = ref(router.currentRoute.value.query.id);
const playListDetail = ref(null);
const playListData = ref([]);
const playListDescShow = ref(false);
const pagelimit = ref(30);
const pageNumber = ref(
  router.currentRoute.value.query.page
    ? Number(router.currentRoute.value.query.page)
    : 1
);
const totalCount = ref(0);

// 获取歌单信息
const getPlayListDetailData = (id) => {
  getPlayListDetail(id).then((res) => {
    console.log(res);
    if (res.playlist) {
      // 歌单总数
      totalCount.value = res.playlist.trackCount;
      // 歌单信息
      playListDetail.value = res.playlist;
    } else {
      $message.error("获取歌单信息失败");
    }
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
          pc: v.pc ? v.pc : null,
        });
      });
    } else {
      $message.error("获取歌单内歌曲失败");
    }
    // 请求后回顶
    if ($mainContent) $mainContent.scrollIntoView({ behavior: "smooth" });
  });
};

onMounted(() => {
  if (playListId.value) {
    getPlayListDetailData(playListId.value);
    getAllPlayListData(
      playListId.value,
      pagelimit.value,
      (pageNumber.value - 1) * pagelimit.value
    );
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
    pageNumber.value = Number(val.query.page);
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
    .cover {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      // box-shadow: 0 0 16px 0px rgb(0 0 0 / 20%);
      .n-avatar {
        border-radius: 8px;
        width: 80%;
        height: 80%;
      }
      .album {
        height: 100%;
        position: absolute;
        top: 0;
        right: 4%;
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
        cursor: pointer;
        transition: all 0.3s;
        &:hover {
          background-color: $mainSecondaryColor;
          color: $mainColor;
        }
        &:active {
          transform: scale(0.95);
        }
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
      }
      .time {
        margin-top: 8px;
        display: flex;
        flex-direction: row;
        align-items: center;
        @media (max-width: 370px) {
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
      margin-bottom: 12px;
      position: static;
      width: 60vw;
      max-width: none;
      .intr,
      .tag {
        display: none;
      }
    }
    .right {
      .meta {
        .name {
          font-size: 26px;
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
