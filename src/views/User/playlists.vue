<template>
  <div class="playlists">
    <div class="data">
      <n-button class="add" type="primary" strong secondary round>
        <template #icon>
          <n-icon :component="AddCircleRound" />
        </template>
        新建歌单
      </n-button>
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
import { getUserPlaylist } from "@/api";
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