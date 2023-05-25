<template>
  <div class="song" v-if="musicDetail">
    <div class="detail">
      <div class="pic">
        <n-image
          show-toolbar-tooltip
          class="coverImg"
          :previewed-img-props="{ style: { borderRadius: '8px' } }"
          :preview-src="getCoverUrl(musicDetail?.al.picUrl)"
          :src="getCoverUrl(musicDetail?.al.picUrl, 1024)"
          fallback-src="/images/pic/default.png"
        >
          <template #placeholder>
            <div class="cover-loading">
              <n-spin />
            </div>
          </template>
        </n-image>
        <n-image
          class="shadow"
          preview-disabled
          :src="getCoverUrl(musicDetail?.al.picUrl, 1024)"
          fallback-src="/images/pic/default.png"
        />
      </div>
      <div class="right">
        <div class="intr">
          <n-text class="name text-hidden" v-html="musicDetail.name" />
          <n-text
            depth="3"
            class="alia"
            v-if="musicDetail.alia[0]"
            v-html="musicDetail.alia[0]"
          />
          <n-space class="tag">
            <n-tag
              v-if="musicDetail.fee == 1 || musicDetail.fee == 4"
              class="vip"
              round
              :bordered="false"
            >
              {{ musicDetail.fee == 1 ? "VIP" : "EP" }}
            </n-tag>
            <n-tag
              v-if="musicDetail.pc"
              class="cloud"
              round
              type="info"
              :bordered="false"
            >
              {{ $t("general.name.cloud") }}
            </n-tag>
          </n-space>
          <div class="item">
            <n-icon :depth="3" :component="People" />
            <AllArtists
              v-if="musicDetail.ar"
              :artistsData="musicDetail.ar"
              :isDark="false"
            />
          </div>
          <div class="item">
            <n-icon :depth="3" :component="RecordDisc" />
            <n-text
              class="text"
              v-html="musicDetail.al.name"
              @click="router.push(`/album?id=${musicDetail.al.id}`)"
            />
          </div>
          <div class="item" v-if="musicDetail.publishTime">
            <n-icon :depth="3" :component="Time" />
            <n-text
              class="text"
              v-html="getLongTime(musicDetail.publishTime)"
            />
          </div>
        </div>
        <n-space class="button">
          <n-button
            type="primary"
            strong
            secondary
            @click="addSong(musicDetail)"
          >
            <template #icon>
              <n-icon :component="PlayOne" />
            </template>
            {{ $t("general.name.play") }}
          </n-button>
          <n-button
            strong
            secondary
            @click="addPlayListRef.openAddToPlaylist(musicId)"
          >
            <template #icon>
              <n-icon :component="ListAdd" />
            </template>
            {{ $t("general.name.add") }}
          </n-button>
          <n-button
            strong
            secondary
            @click="router.push(`/comment?id=${musicDetail.id}&page=1`)"
          >
            <template #icon>
              <n-icon :component="Comments" />
            </template>
            {{ $t("general.name.comment") }}
          </n-button>
          <n-button
            strong
            secondary
            v-if="musicDetail.mv"
            @click="router.push(`/video?id=${musicDetail.mv}`)"
          >
            <template #icon>
              <n-icon :component="Youtube" />
            </template>
            MV
          </n-button>
        </n-space>
      </div>
    </div>
    <div class="comments" v-if="commentData[0]">
      <n-h6 prefix="bar"> {{ $t("general.name.hotComments") }} </n-h6>
      <div class="content">
        <Comment v-for="item in commentData" :key="item" :commentData="item" />
      </div>
    </div>
    <div class="simiPlayList" v-if="simiPlayList[0]">
      <n-divider />
      <n-h6 prefix="bar"> {{ $t("other.containing") }} </n-h6>
      <CoverLists :listData="simiPlayList" />
    </div>
    <!-- 添加到歌单 -->
    <AddPlaylist ref="addPlayListRef" />
  </div>
</template>

<script setup>
import { getSimiPlayList, getMusicDetail } from "@/api/song";
import { getComment } from "@/api/comment";
import { useRouter } from "vue-router";
import { musicStore } from "@/store";
import { getLongTime } from "@/utils/timeTools";
import {
  PlayOne,
  Comments,
  ListAdd,
  Youtube,
  People,
  RecordDisc,
  Time,
} from "@icon-park/vue-next";
import { formatNumber } from "@/utils/timeTools";
import { useI18n } from "vue-i18n";
import AllArtists from "@/components/DataList/AllArtists.vue";
import CoverLists from "@/components/DataList/CoverLists.vue";
import AddPlaylist from "@/components/DataModal/AddPlaylist.vue";
import Comment from "@/components/Comment/index.vue";
import getCoverUrl from "@/utils/getCoverUrl";

const { t } = useI18n();
const router = useRouter();
const music = musicStore();
const addPlayListRef = ref(null);

// 歌曲数据
const musicId = ref(router.currentRoute.value.query.id);
const musicDetail = ref(null);

// 评论数据
const commentData = ref([]);

// 相似数据
const simiPlayList = ref([]);

// 获取歌曲数据
const getMusicDetailData = (id) => {
  getMusicDetail(id).then((res) => {
    console.log(res);
    if (res.songs[0]) {
      musicDetail.value = res.songs[0];
      $setSiteTitle(
        res.songs[0].name +
          " - " +
          res.songs[0].ar[0].name +
          " - " +
          t("general.name.song")
      );
      // 获取热门评论
      getCommentData(id);
      // 获取相似数据
      getSimiData(id);
      // 请求后回顶
      if (typeof $scrollToTop !== "undefined") $scrollToTop();
    } else {
      $message.error(t("general.message.acquisitionFailed"));
    }
  });
};

// 获取评论数据
const getCommentData = (id) => {
  getComment(id)
    .then((res) => {
      // 写入数据
      if (res.total > 0) {
        commentData.value = res.hotComments;
      }
    })
    .catch((err) => {
      console.error(t("general.message.acquisitionFailed"), err);
      $message.error(t("general.message.acquisitionFailed"));
    });
};

// 获取相似数据
const getSimiData = (id) => {
  getSimiPlayList(id).then((res) => {
    console.log(res);
    simiPlayList.value = [];
    res.playlists.forEach((v) => {
      simiPlayList.value.push({
        id: v.id,
        cover: v.coverImgUrl,
        name: v.name,
        artist: v.creator,
        playCount: formatNumber(v.playCount),
      });
    });
  });
};

// 添加歌曲并播放
const addSong = (data) => {
  const song = {
    album: data.al,
    artist: data.ar,
    fee: data.fee,
    id: data.id,
    name: data.name,
  };
  console.log(song);
  music.setPersonalFmMode(false);
  music.addSongToPlaylists(song);
};

onMounted(() => {
  if (musicId.value) {
    getMusicDetailData(musicId.value);
  }
});

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    musicId.value = val.query.id;
    if (val.name == "song") {
      getMusicDetailData(musicId.value);
    }
  }
);
</script>

<style lang="scss" scoped>
.song {
  .detail {
    width: 80vw;
    display: flex;
    flex-direction: row;
    .pic {
      height: auto;
      display: flex;
      min-width: 180px;
      align-items: center;
      justify-content: center;
      max-width: 280px;
      border-radius: 8px;
      margin-right: 40px;
      position: relative;
      transition: transform 0.3s;
      &:active {
        transform: scale(0.95);
      }
      .coverImg {
        border-radius: 8px;
        width: 100%;
        height: 100%;
        overflow: hidden;
        z-index: 1;
        :deep(img) {
          width: 100%;
        }
        .cover-loading {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 0;
          padding-bottom: 100%;
          background-color: #0001;
          .n-spin-body {
            position: absolute;
            top: 0;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
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
        aspect-ratio: 1/1;
        :deep(img) {
          width: 100%;
        }
      }
    }
    .right {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      .intr {
        display: flex;
        flex-direction: column;
        .name {
          -webkit-line-clamp: 2;
          font-size: 40px;
          font-weight: bold;
        }
        .alia {
          font-size: 20px;
        }
        .tag {
          margin: 12px 0;
        }
        .item {
          font-size: 16px;
          display: flex;
          align-items: center;
          margin-bottom: 4px;
          .n-icon {
            margin-right: 6px;
          }
          .text {
            cursor: pointer;
            transition: all 0.3s;
            &:hover {
              color: var(--main-color);
            }
          }
        }
      }
      .button {
        margin-top: 16px;
        gap: 12px !important;
      }
    }
    @media (max-width: 768px) {
      flex-direction: column;
      width: 100%;
      .pic {
        margin-bottom: 20px;
      }
      .right {
        .intr {
          .name {
            font-size: 24px;
          }
          .alia {
            font-size: 16px;
          }
        }
      }
    }
  }
  .comments {
    margin-top: 40px;
  }
}
</style>
