<template>
  <div class="playlists">
    <div class="data">
      <n-button
        class="add"
        type="primary"
        strong
        secondary
        round
        @click="createModelShow = true"
      >
        <template #icon>
          <n-icon :component="AddCircleRound" />
        </template>
        新建歌单
      </n-button>
      <n-modal
        class="create"
        v-model:show="createModelShow"
        style="width: 60vw; min-width: min(24rem, 100vw)"
        preset="card"
        title="新建歌单"
        :bordered="false"
        :on-after-leave="createClose"
      >
        <n-input
          style="margin-bottom: 12px"
          v-model:value="createName"
          type="text"
          placeholder="请输入新歌单标题"
        />
        <n-checkbox v-model:checked="createPrivacy">
          设置为隐私歌单
        </n-checkbox>
        <template #footer>
          <n-space justify="end">
            <n-button @click="createClose"> 取消 </n-button>
            <n-button
              type="primary"
              @click="createPlaylistBtn(createName, createPrivacy)"
            >
              新建
            </n-button>
          </n-space>
        </template>
      </n-modal>
    </div>
    <CoverLists :listData="music.getUserPlayLists" />
    <Pagination
      :totalCount="totalCount"
      :pageNumber="pageNumber"
      @pageSizeChange="pageSizeChange"
      @pageNumberChange="pageNumberChange"
    />
  </div>
</template>

<script setup>
import { getUserPlaylist, createPlaylist } from "@/api";
import { AddCircleRound } from "@vicons/material";
import { useRouter } from "vue-router";
import { musicStore, userStore } from "@/store";
import { formatNumber } from "@/utils/timeTools.js";
import CoverLists from "@/components/DataList/CoverLists.vue";
import Pagination from "@/components/Pagination/index.vue";

const router = useRouter();
const music = musicStore();
const user = userStore();

// 歌单数据
let pagelimit = ref(30);
let pageNumber = ref(
  router.currentRoute.value.query.page
    ? Number(router.currentRoute.value.query.page)
    : 1
);
let totalCount = ref(0);

// 新建歌单数据
let createModelShow = ref(false);
let createPrivacy = ref(false);
let createName = ref(null);

// 获取歌单数据
const getUserPlaylistData = (limit = 30, offset = 0) => {
  getUserPlaylist(user.getUserData.userId, limit, offset).then((res) => {
    console.log(res);
    totalCount.value =
      user.getUserData.subcount.createdPlaylistCount +
      user.getUserData.subcount.subPlaylistCount;
    let data = [];
    if (res.playlist) {
      res.playlist.forEach((v) => {
        data.push({
          id: v.id,
          cover: v.coverImgUrl,
          name: v.name,
          artist: v.creator,
          playCount: formatNumber(v.playCount),
        });
        music.setUserPlayLists(data);
      });
    } else {
      $message.error("搜索内容为空");
    }
    // 请求后回顶
    if ($mainContent) $mainContent.scrollIntoView({ behavior: "smooth" });
  });
};

// 新建歌单
const createPlaylistBtn = (name, privacy = false) => {
  createPlaylist(name, privacy ? "10" : null).then((res) => {
    if (res.code === 200) {
      createClose();
      $message.success("歌单新建成功");
      getUserPlaylistData(
        pagelimit.value,
        (pageNumber.value - 1) * pagelimit.value
      );
    } else {
      $message.error("歌单新建失败，请重试");
    }
  });
};

// 取消新建歌单
const createClose = () => {
  createName.value = null;
  createPrivacy.value = false;
  createModelShow.value = false;
};

// 每页个数数据变化
const pageSizeChange = (val) => {
  console.log(val);
  pagelimit.value = val;
  getUserPlaylistData(val, (pageNumber.value - 1) * pagelimit.value);
};

// 当前页数数据变化
const pageNumberChange = (val) => {
  router.push({
    path: "/user/playlists",
    query: {
      page: val,
    },
  });
};

onMounted(() => {
  if (!music.getUserPlayLists[0])
    getUserPlaylistData(
      pagelimit.value,
      (pageNumber.value - 1) * pagelimit.value
    );
});
</script>

<style lang="scss" scoped>
.playlists {
  .data {
    width: 100%;
    margin: 20px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}
</style>