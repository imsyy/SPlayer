<template>
  <div class="song" v-if="musicDetail">
    <div class="detail">
      <div class="pic">
        <n-avatar
          class="coverImg"
          :src="
            musicDetail.al.picUrl
              ? musicDetail.al.picUrl.replace(/^http:/, 'https:') +
                '?param=1024y1024'
              : '/images/pic/default.png'
          "
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
          <div class="all-artist">
            <n-text class="tip" depth="3">歌手：</n-text>
            <AllArtists v-if="musicDetail.ar" :artistsData="musicDetail.ar" />
          </div>
          <div class="album">
            <n-text class="tip" depth="3">专辑：</n-text>
            <n-text
              class="text"
              v-html="musicDetail.al.name"
              @click="router.push(`/album?id=${musicDetail.al.id}`)"
            />
          </div>
          <div class="time" v-if="musicDetail.publishTime">
            <n-text class="tip" depth="3">发行日期：</n-text>
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
              <n-icon :component="PlayArrowRound" />
            </template>
            播放
          </n-button>
          <n-button
            strong
            secondary
            @click="addPlayListRef.openAddToPlaylist(musicId)"
          >
            <template #icon>
              <n-icon :component="PlaylistAddRound" />
            </template>
            添加
          </n-button>
          <n-button
            strong
            secondary
            @click="router.push(`/comment?id=${musicDetail.id}&page=1`)"
          >
            <template #icon>
              <n-icon :component="MessageFilled" />
            </template>
            评论
          </n-button>
          <n-button
            strong
            secondary
            v-if="musicDetail.mv"
            @click="router.push(`/video?id=${musicDetail.mv}`)"
          >
            <template #icon>
              <n-icon :component="VideocamRound" />
            </template>
            MV
          </n-button>
        </n-space>
      </div>
    </div>
    <n-divider />
    <div class="simiPlayList" v-if="simiPlayList[0]">
      <n-h6 prefix="bar"> 包含这首歌的歌单 </n-h6>
      <CoverLists :listData="simiPlayList" />
    </div>
    <!-- 添加到歌单 -->
    <AddPlaylist ref="addPlayListRef" />
  </div>
</template>

<script setup>
import { getSimiPlayList, getMusicDetail } from "@/api/song";
import { useRouter } from "vue-router";
import { musicStore } from "@/store";
import { getLongTime } from "@/utils/timeTools.js";
import {
  PlayArrowRound,
  MessageFilled,
  VideocamRound,
  PlaylistAddRound,
} from "@vicons/material";
import { formatNumber } from "@/utils/timeTools.js";
import AllArtists from "@/components/DataList/AllArtists.vue";
import CoverLists from "@/components/DataList/CoverLists.vue";
import AddPlaylist from "@/components/DataModal/AddPlaylist.vue";

const router = useRouter();
const music = musicStore();
const addPlayListRef = ref(null);

// 歌曲数据
const musicId = ref(router.currentRoute.value.query.id);
const musicDetail = ref(null);

// 相似数据
const simiPlayList = ref([]);

// 获取歌曲数据
const getMusicDetailData = (id) => {
  getMusicDetail(id).then((res) => {
    console.log(res);
    if (res.songs[0]) {
      musicDetail.value = res.songs[0];
      $setSiteTitle(
        res.songs[0].name + " - " + res.songs[0].ar[0].name + " - 单曲"
      );
      // 获取相似数据
      getSimiData(id);
    } else {
      $message.error("歌曲信息获取失败");
    }
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
      overflow: hidden;
      margin-right: 40px;
      .n-avatar {
        width: 100%;
        height: inherit;
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
        .all-artist {
          margin-top: 12px;
          display: flex;
          flex-direction: row;
          align-items: center;
        }
        .album {
          margin: 4px 0;
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
}
</style>
