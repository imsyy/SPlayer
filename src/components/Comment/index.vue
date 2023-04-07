<template>
  <n-card class="comment" hoverable>
    <div class="user">
      <div class="avatar">
        <img
          class="avatarImg"
          :src="
            commentData.user.avatarUrl.replace(/^http:/, 'https:') +
            '?param=50y50'
          "
          alt="avatar"
        />
        <img
          class="musicPackage"
          v-if="commentData.user.vipRights?.redVipAnnualCount > 0"
          :src="commentData.user.vipRights.musicPackage.iconUrl"
          alt="vip"
        />
      </div>
      <div
        class="associator"
        v-if="commentData.user.vipRights?.redVipLevel > 0"
      >
        <img
          v-if="commentData.user.vipRights.associator"
          :src="commentData.user.vipRights.associator.iconUrl"
          alt="associator"
        />
      </div>
    </div>
    <div class="review">
      <div class="content">
        <n-text class="name">{{ commentData.user.nickname }}：</n-text>
        <n-text class="text" v-html="commentData.content" />
      </div>
      <div class="beReplied" v-if="commentData.beReplied[0]">
        <n-text class="name">
          @{{ commentData.beReplied[0].user.nickname }}：
        </n-text>
        <n-text class="text">{{ commentData.beReplied[0].content }}</n-text>
      </div>
      <div class="num">
        <n-text class="time">
          <n-icon :component="AccessTimeFilled" />
          {{ getCommentTime(commentData.time) }}
        </n-text>
        <n-text class="ip" v-if="commentData.ipLocation.location">
          <n-icon :component="FmdGoodOutlined" />
          {{ commentData.ipLocation.location }}
        </n-text>
        <n-text
          :class="commentData.liked ? 'like liked' : 'like'"
          @click="toLikeComment"
        >
          <n-icon
            :component="
              commentData.liked ? ThumbUpOffAltRound : ThumbUpAltOutlined
            "
          />
          {{ formatNumber(commentData.likedCount) }}
        </n-text>
      </div>
    </div>
  </n-card>
</template>

<script setup>
import { getCommentTime, formatNumber } from "@/utils/timeTools.js";
import { userStore } from "@/store";
import { useRouter } from "vue-router";
import { likeComment } from "@/api/comment";
import {
  AccessTimeFilled,
  FmdGoodOutlined,
  ThumbUpAltOutlined,
  ThumbUpOffAltRound,
} from "@vicons/material";

const user = userStore();
const router = useRouter();
const props = defineProps({
  // 评论 数据
  commentData: {
    type: Object,
    default: [],
  },
});

// 点赞评论
const toLikeComment = () => {
  if (user.userLogin) {
    const type = props.commentData.liked ? 0 : 1;
    likeComment(
      router.currentRoute.value.query.id,
      props.commentData.commentId,
      type
    ).then((res) => {
      if (res.code === 200) {
        $message.success(type ? "点赞成功" : "取消点赞成功");
        props.commentData.liked = !props.commentData.liked;
        props.commentData.likedCount += type ? 1 : -1;
      } else {
        $message.error("操作失败，请重试");
      }
    });
  } else {
    $message.error("请登录账号后使用");
  }
};
</script>

<style lang="scss" scoped>
.comment {
  margin-bottom: 12px;
  border-radius: 8px;
  :deep(.n-card__content) {
    display: flex;
    flex-direction: row;
    .user {
      min-width: 60px;
      width: 60px;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-right: 16px;
      .avatar {
        position: relative;
        width: 54px;
        height: 54px;
        border-radius: 50%;
        box-shadow: 0 6px 8px -2px rgb(0 0 0 / 16%);
        .avatarImg {
          border-radius: 50%;
          width: 100%;
          height: 100%;
        }
        .musicPackage {
          height: 16px;
          position: absolute;
          right: 0;
          bottom: 0;
          background-color: #fff;
          border-radius: 50%;
        }
      }
      .associator {
        display: flex;
        flex-direction: column;
        margin-top: 12px;
        justify-content: space-evenly;
        align-items: center;
        img {
          height: 16px;
          &:nth-of-type(1) {
            margin-bottom: 6px;
          }
        }
      }
      @media (max-width: 578px) {
        min-width: 48px;
        width: 48px;
        .avatar {
          width: 40px;
          height: 40px;
          .musicPackage {
            height: 12px;
          }
        }
      }
    }
    .review {
      width: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      .content {
        .name {
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
          &:hover {
            color: $mainColor;
          }
        }
      }
      .beReplied {
        width: 100%;
        padding: 4px 8px;
        border-radius: 8px;
        background-color: var(--n-border-color);
        font-size: 13px;
        margin-top: 6px;
        box-sizing: border-box;
        .name {
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
          &:hover {
            color: $mainColor;
          }
        }
      }
      .num {
        margin-top: 12px;
        display: flex;
        align-items: center;
        .time {
          margin-right: 12px;
          opacity: 0.6;
        }
        .ip {
          opacity: 0.6;
        }
        .like {
          margin-left: auto;
          cursor: pointer;
          transition: all 0.3s;
          opacity: 0.6;
          &:hover {
            color: $mainColor;
            opacity: 1;
          }
          &:active {
            transform: scale(0.95);
          }
          &.liked {
            color: $mainColor;
            opacity: 1;
          }
        }
        .n-icon {
          font-size: 16px;
          transform: translateY(3px);
        }
      }
    }
  }
}
</style>
