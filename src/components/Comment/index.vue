<template>
  <n-card class="comment" hoverable>
    <div class="user">
      <div class="avatar">
        <img
          class="avatarImg"
          :src="commentData.user.avatarUrl.replace(/^http:/, 'https:') + '?param=50y50'"
          alt="avatar"
        />
        <img
          class="musicPackage"
          v-if="
            commentData.user.vipRights &&
            commentData.user.vipRights.musicPackage
          "
          :src="commentData.user.vipRights.musicPackage.iconUrl"
          alt="vip"
        />
      </div>
      <div
        class="associator"
        v-if="
          commentData.user.vipRights && commentData.user.vipRights.redVipLevel
        "
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
        <span class="name">{{ commentData.user.nickname }}：</span>
        <span class="text">{{ commentData.content }}</span>
      </div>
      <div class="beReplied" v-if="commentData.beReplied[0]">
        <span class="name">
          @{{ commentData.beReplied[0].user.nickname }}：
        </span>
        <span class="text">{{ commentData.beReplied[0].content }}</span>
      </div>
      <div class="num">
        <span class="time">
          <n-icon :component="AccessTimeFilled" />
          {{ getCommentTime(commentData.time) }}
        </span>
        <span class="ip" v-if="commentData.ipLocation.location">
          <n-icon :component="FmdGoodOutlined" />
          {{ commentData.ipLocation.location }}
        </span>
        <span class="like">
          <n-icon :component="ThumbUpAltOutlined" />
          {{ formatNumber(commentData.likedCount) }}
        </span>
      </div>
    </div>
  </n-card>
</template>

<script setup>
import { getCommentTime, formatNumber } from "@/utils/timeTools.js";
import {
  AccessTimeFilled,
  FmdGoodOutlined,
  ThumbUpAltOutlined,
} from "@vicons/material";

const props = defineProps({
  // 评论 数据
  commentData: {
    type: Object,
    default: [],
  },
});
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
        opacity: 0.6;
        .time {
          margin-right: 12px;
        }
        .like {
          margin-left: auto;
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