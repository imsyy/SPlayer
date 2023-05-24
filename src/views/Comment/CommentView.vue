<template>
  <div class="comment">
    <Transition name="up">
      <n-card
        v-if="music.getPlaySongData && music.getPlaySongData.id != songId"
        class="goback"
        @click="router.push(`/comment?id=${music.getPlaySongData.id}&page=1`)"
        content-style="padding: 6px"
      >
        {{ $t("general.name.toCurrentlySong") }}
      </n-card>
    </Transition>
    <div class="title" v-if="songId">
      <span class="key">{{ $t("general.name.allComments") }}</span>
      <n-card class="song">
        <SmallSongData :getDataByID="songId" />
      </n-card>
    </div>
    <div class="title" v-else>
      <span class="key">{{ $t("general.name.noKeywords") }}</span>
      <br />
      <n-button
        strong
        secondary
        @click="router.go(-1)"
        style="margin-top: 20px"
      >
        {{ $t("general.name.goBack") }}
      </n-button>
    </div>
    <div class="commentData" v-if="songId && commentData.allComments[0]">
      <div class="hotComments" v-if="commentData.hotComments[0]">
        <n-h6 prefix="bar"> {{ $t("general.name.hotComments") }} </n-h6>
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
          {{ $t("general.name.allComments") }}
          <span class="count">{{ commentsCount }} +</span>
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
        :pageNumber="pageNumber"
        :showSizePicker="false"
        @pageNumberChange="pageNumberChange"
      />
    </div>
  </div>
</template>

<script setup>
import { musicStore } from "@/store";
import { useRouter } from "vue-router";
import { getComment } from "@/api/comment";
import { useI18n } from "vue-i18n";
import SmallSongData from "@/components/DataList/SmallSongData.vue";
import Comment from "@/components/Comment/index.vue";
import Pagination from "@/components/Pagination/index.vue";

const { t } = useI18n();
const router = useRouter();
const music = musicStore();

// 歌曲信息
const songId = ref(router.currentRoute.value.query.id);
const pageNumber = ref(
  router.currentRoute.value.query.page
    ? Number(router.currentRoute.value.query.page)
    : 1
);

// 评论数据
const commentData = reactive({
  hotComments: [], // 热门评论
  allComments: [], // 全部评论
});

// 评论总数
const commentsCount = ref(0);

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
      $message.error(t("general.message.acquisitionFailed"));
      router.go(-1);
    }
    // 请求后回顶
    if (typeof $scrollToTop !== "undefined") $scrollToTop();
  });
};

// 当前页数数据变化
const pageNumberChange = (val) => {
  router.push({
    path: "/comment",
    query: {
      id: songId.value,
      page: val,
    },
  });
};

onMounted(() => {
  $setSiteTitle(t("general.name.allComments"));
  // 获取评论数据
  if (songId.value) getCommentData(songId.value, (pageNumber.value - 1) * 20);
});

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    pageNumber.value = Number(val.query.page ? val.query.page : 1);
    if (val.name == "comment") {
      songId.value = val.query.id;
      getCommentData(val.query.id, (pageNumber.value - 1) * 20);
    }
  }
);
</script>

<style lang="scss" scoped>
.comment {
  .up-enter-active,
  .up-leave-active {
    transition: all 0.3s ease;
  }

  .up-enter-from,
  .up-leave-to {
    transform: translateY(-34px);
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
  .title {
    margin-top: 30px;
    margin-bottom: 20px;
    .key {
      font-size: 40px;
      font-weight: bold;
      margin-right: 8px;
    }
    .song {
      margin-top: 20px;
      border-radius: 8px;
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
