<template>
  <div class="playlist" v-if="albumDetail">
    <div class="left">
      <div class="cover">
        <n-avatar
          class="coverImg"
          :src="
            albumDetail.picUrl
              ? albumDetail.picUrl.replace(/^http:/, 'https:') +
                '?param=1024y1024'
              : null
          "
          fallback-src="/images/pic/default.png"
        />
        <img src="/images/pic/album.png" class="album" alt="album" />
      </div>
      <div class="intr">
        <span class="name">歌单简介</span>
        <span class="desc text-hidden">
          {{ albumDetail.description }}
        </span>
        <n-button
          block
          strong
          secondary
          v-if="albumDetail?.description.length > 70"
          @click="albumDescShow = true"
        >
          全部简介
        </n-button>
        <n-modal
          class="s-modal"
          v-model:show="albumDescShow"
          preset="card"
          title="歌单简介"
          :bordered="false"
        >
          <n-scrollbar>
            <n-text v-html="albumDetail.description.replace(/\n/g, '<br>')" />
          </n-scrollbar>
        </n-modal>
      </div>
      <div class="tag" v-if="albumDetail.tags">
        <n-tag
          class="tags"
          round
          :bordered="false"
          v-for="item in albumDetail.tags"
          :key="item"
        >
          {{ item }}
        </n-tag>
      </div>
    </div>
    <div class="right">
      <div class="meta">
        <span class="name">{{ albumDetail.name }}</span>
        <span
          class="creator"
          @click="router.push(`/artist/songs?id=${albumDetail.artist.id}`)"
        >
          {{ albumDetail.artist.name }}
        </span>
        <div class="time">
          <div class="createTime">
            <span class="num">发行时间：</span>
            {{ getLongTime(albumDetail.publishTime) }}
          </div>
          <div class="company" v-if="albumDetail.company">
            <span class="num">发行公司：</span>
            {{ albumDetail.company }}
          </div>
        </div>
      </div>
      <DataLists :listData="albumData" hideAlbum />
    </div>
  </div>
  <div class="title" v-else-if="!albumId">
    <span class="key">参数不完整</span>
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
import { getAlbum } from "@/api/album";
import { useRouter } from "vue-router";
import { getSongTime, getLongTime } from "@/utils/timeTools.js";
import DataLists from "@/components/DataList/DataLists.vue";
const router = useRouter();

// 歌单数据
const albumId = ref(router.currentRoute.value.query.id);
const albumDetail = ref(null);
const albumData = ref([]);
const albumDescShow = ref(false);

// 获取歌单信息
const getAlbumData = (id) => {
  getAlbum(id).then((res) => {
    console.log(res);
    // 专辑信息
    albumDetail.value = res.album;
    $setSiteTitle(res.album.name + " - 专辑");
    // 专辑歌曲
    if (res.songs) {
      albumData.value = [];
      res.songs.forEach((v, i) => {
        albumData.value.push({
          id: v.id,
          num: i + 1,
          name: v.name,
          artist: v.ar,
          album: v.al,
          alia: v.alia,
          time: getSongTime(v.dt),
          fee: v.fee,
          pc: v.pc ? v.pc : null,
          mv: v.mv ? v.mv : null,
        });
      });
    } else {
      $message.error("获取专辑歌曲失败");
    }
  });
};

onMounted(() => {
  if (albumId.value) {
    getAlbumData(albumId.value);
  }
});

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    albumId.value = val.query.id;
    if (val.name == "album") {
      getAlbumData(albumId.value);
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
      width: 100%;
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      .tags {
        margin-right: 8px;
        font-size: 13px;
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
          color: $mainColor;
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
      margin-bottom: 12px;
      position: static;
      width: 60vw;
      max-width: none;
      .intr {
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
