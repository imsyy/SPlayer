<template>
  <div class="comment">
    <div class="title" v-if="songId">
      <span class="key">全部评论</span>
      <n-card
        class="goback"
        v-if="music.getPlaySongData && music.getPlaySongData.id != songId"
        @click="router.push(`/comment?id=${music.getPlaySongData.id}`)"
        content-style="padding: 6px"
        >前往当前歌曲评论
      </n-card>
      <div class="hotComments" v-if="commentData.hotComments[0]">
        <n-h6 prefix="bar"> 热门评论 </n-h6>
        <div class="loading" v-if="!commentData.hotComments[0]">
          <n-skeleton text :repeat="3" />
          <n-skeleton text style="width: 60%" />
        </div>
        <div class="content">
          <Comment
            v-for="item in commentData.hotComments"
            :key="item"
            :commentData="item"
          />
        </div>
      </div>
      <div class="allComments" ref="allCommentsRef">
        <n-h6 prefix="bar">
          全部评论
          <span class="count">{{ commentsCount }} 条</span>
        </n-h6>
        <div class="loading" v-if="!commentData.allComments[0]">
          <n-skeleton text :repeat="3" />
          <n-skeleton text style="width: 60%" />
        </div>
        <div class="content">
          <Comment
            v-for="item in commentData.allComments"
            :key="item"
            :commentData="item"
          />
        </div>
      </div>
      <Pagination
        :totalCount="commentsCount"
        :showSizePicker="false"
        @pageNumberChange="pageNumberChange"
      />
    </div>
    <div class="title" v-else>
      <span class="key">当前未播放歌曲</span>
      <br />
      <n-button
        strong
        secondary
        @click="router.go(-1)"
        style="margin-top: 20px"
      >
        返回上一级
      </n-button>
    </div>
  </div>
</template>

<script setup>
import { musicStore } from "@/store/index";
import { useRouter } from "vue-router";
import { getComment } from "@/api";
import AllArtists from "@/components/DataList/AllArtists.vue";
import Comment from "@/components/Comment/index.vue";
import Pagination from "@/components/Pagination/index.vue";
const router = useRouter();
const music = musicStore();

// 歌曲信息
let songId = ref(router.currentRoute.value.query.id);

// 评论数据
let commentData = reactive({
  hotComments: [], // 热门评论
  allComments: [], // 全部评论
});

// 评论总数
let commentsCount = ref(0);

// 获取评论数据
const getCommentData = (id, offset = 0) => {
  // 获取 before
  let before = null;
  if (commentData.allComments[0] && offset >= 5000) {
    before = commentData.allComments[commentData.allComments.length - 1].time;
  }
  getComment(id, offset, before).then((res) => {
    // 写入数据
    if (res.comments && res.comments[0]) {
      if (res.hotComments) {
        commentData.hotComments = res.hotComments;
      } else {
        commentData.hotComments = [];
      }
      commentData.allComments = res.comments;
      commentsCount.value = res.total;
    } else {
      $message.info("暂无评论");
      router.go(-1);
    }
    // 滚动至顶部
    if ($mainContent) $mainContent.scrollIntoView({ behavior: "smooth" });
  });
};

// 当前页数数据变化
const pageNumberChange = (val) => {
  getCommentData(songId.value, (val - 1) * 20);
};

onMounted(() => {
  // 获取评论数据
  getCommentData(songId.value);
});

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    if (val.name == "comment") {
      songId.value = val.query.id;
      getCommentData(val.query.id);
    }
  }
);
</script>

<style lang="scss" scoped>
.comment {
  .title {
    margin-top: 30px;
    margin-bottom: 20px;
    .key {
      font-size: 40px;
      font-weight: bold;
      margin-right: 8px;
    }
    .goback {
      cursor: pointer;
      position: absolute;
      top: 0;
      left: 0;
      text-align: center;
      z-index: 2;
      :hover {
        background-color: var(--n-border-color);
      }
      :deep(.n-card__content) {
        transition: all 0.3s;
        font-size: 12px;
      }
    }
  }
  .hotComments,
  .allComments {
    margin-top: 40px;
    .count {
      font-size: 13px;
      margin-left: 4px;
      opacity: 0.6;
    }
  }
}
</style>