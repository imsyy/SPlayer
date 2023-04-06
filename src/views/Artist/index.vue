<template>
  <div class="artist">
    <div class="artistData" v-if="artistData">
      <div class="cover">
        <n-avatar
          round
          class="coverImg"
          :src="artistData.cover.replace(/^http:/, 'https:') + '?param=300y300'"
          fallback-src="/images/pic/default.png"
        />
      </div>
      <div class="data">
        <n-text class="name">{{ artistData.name }}</n-text>
        <n-text class="occupation" :depth="3">
          {{ artistData.occupation }}
        </n-text>
        <div class="num">
          <n-text class="musicSize" @click="tabChange('songs')">
            <n-icon :component="MusicNoteFilled" />
            {{ artistData.musicSize }} 首歌
          </n-text>
          <n-text class="albumSize" @click="tabChange('albums')">
            <n-icon :component="AlbumFilled" />
            {{ artistData.albumSize }} 张专辑
          </n-text>
          <n-text class="mvSize" @click="tabChange('videos')">
            <n-icon :component="VideocamRound" />
            {{ artistData.mvSize }} 个 MV
          </n-text>
        </div>
        <n-text class="desc text-hidden" @click="artistDescShow = true">
          {{ artistData.desc }}
        </n-text>
        <n-modal
          class="s-modal"
          v-model:show="artistDescShow"
          preset="card"
          title="歌手介绍"
          :bordered="false"
        >
          <n-scrollbar>
            <n-text v-html="artistData.desc.replace(/\n/g, '<br>')" />
          </n-scrollbar>
        </n-modal>
      </div>
    </div>
    <n-tabs
      class="main-tab"
      type="segment"
      @update:value="tabChange"
      v-model:value="tabValue"
      v-if="artistId"
    >
      <n-tab name="songs"> 热门单曲 </n-tab>
      <n-tab name="albums"> 专辑 </n-tab>
      <n-tab name="videos"> MV </n-tab>
    </n-tabs>
    <main class="content" v-if="artistData">
      <router-view
        v-slot="{ Component }"
        :mvSize="artistData ? artistData.mvSize : null"
      >
        <keep-alive>
          <Transition name="move" mode="out-in">
            <component :is="Component" />
          </Transition>
        </keep-alive>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { getArtistDetail } from "@/api/artist";
import { MusicNoteFilled, AlbumFilled, VideocamRound } from "@vicons/material";
const router = useRouter();

// 歌手数据
const artistId = ref(router.currentRoute.value.query.id);
const artistData = ref(null);
const artistDescShow = ref(false);

// Tab 默认选中
const tabValue = ref(router.currentRoute.value.path.split("/")[2]);

// 获取歌手数据
const getArtistDetailData = (id) => {
  if (id) {
    getArtistDetail(id).then((res) => {
      console.log(res);
      artistData.value = {
        name: res.data.artist.name,
        occupation: res.data.identify ? res.data.identify.imageDesc : null,
        cover: res.data.artist.cover,
        desc: res.data.artist.briefDesc,
        albumSize: res.data.artist.albumSize,
        musicSize: res.data.artist.musicSize,
        mvSize: res.data.artist.mvSize,
      };
    });
  } else {
    $message.error("请提供歌手id");
  }
};

// Tab 选项卡变化
const tabChange = (value) => {
  console.log(value);
  router.push({
    path: `/artist/${value}`,
    query: {
      id: artistId.value,
      page: 1,
    },
  });
};

onMounted(() => {
  getArtistDetailData(artistId.value);
});

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    artistId.value = val.query.id;
    tabValue.value = val.path.split("/")[2];
    if (val.path.split("/")[1] == "artist") {
      getArtistDetailData(artistId.value);
    }
  }
);
</script>

<style lang="scss" scoped>
.artist {
  margin-top: 30px;
  .artistData {
    display: flex;
    align-items: center;
    margin-bottom: 40px;
    @media (max-width: 768px) {
      flex-direction: column;
      margin-bottom: 30px;
      .cover {
        margin-right: 0 !important;
        margin-bottom: 20px;
        .n-avatar {
          height: 200px !important;
          width: 200px !important;
        }
      }
      .data {
        align-items: center;
        .name {
          font-size: 26px !important;
          margin-bottom: 10px !important;
        }
        .occupation {
          font-size: 16px !important;
        }
        .num {
          margin-top: 8px !important;
        }
      }
    }
    .cover {
      margin-right: 40px;
      .n-avatar {
        height: 240px;
        width: 240px;
        box-shadow: 0 0 16px 0px rgb(0 0 0 / 20%);
      }
    }
    .data {
      display: flex;
      flex-direction: column;
      .name {
        font-size: 40px;
        font-weight: bold;
        margin-bottom: 8px;
        margin-left: 2px;
      }
      .occupation {
        font-size: 18px;
        margin-left: 4px;
      }
      .num {
        margin-top: 12px;
        display: flex;
        align-items: center;
        span {
          display: flex;
          align-items: center;
          margin-right: 16px;
          cursor: pointer;
          transition: all 0.3s;
          .n-icon {
            color: $mainColor;
            transform: translateY(-1px);
            font-size: 16px;
            margin-right: 4px;
          }
          &:hover {
            color: $mainColor;
          }
        }
      }
      .desc {
        margin-top: 12px;
        -webkit-line-clamp: 3;
        cursor: pointer;
        transition: all 0.3s;
        &:hover {
          opacity: 0.8;
        }
      }
    }
  }
  .content {
    margin-top: 20px;
  }
}
// 路由跳转动画
.move-enter-active,
.move-leave-active {
  transition: all 0.2s ease;
}

.move-enter-from,
.move-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
