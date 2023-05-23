<template>
  <div class="artist">
    <div class="artistData" v-if="artistId && artistData">
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
            {{ $t("general.name.songSize", { size: artistData.musicSize }) }}
          </n-text>
          <n-text class="albumSize" @click="tabChange('albums')">
            <n-icon :component="AlbumFilled" />
            {{ $t("general.name.albumSize", { size: artistData.albumSize }) }}
          </n-text>
          <n-text class="mvSize" @click="tabChange('videos')">
            <n-icon :component="VideocamRound" />
            {{ $t("general.name.mvSize", { size: artistData.mvSize }) }}
          </n-text>
        </div>
        <n-text class="desc text-hidden" @click="artistDescShow = true">
          {{ artistData.desc }}
        </n-text>
        <n-space class="button" v-if="user.userLogin">
          <!-- <n-button type="primary" strong secondary>
            <template #icon>
              <n-icon :component="PlayArrowRound" />
            </template>
            播放热门歌曲
          </n-button> -->
          <n-button
            :type="artistLikeBtn ? 'primary' : 'default'"
            strong
            secondary
            @click="toLikeArtist(artistData)"
          >
            <template #icon>
              <n-icon
                :component="
                  artistLikeBtn ? PersonAddAlt1Round : PersonRemoveAlt1Round
                "
              />
            </template>
            {{
              artistLikeBtn
                ? $t("menu.collection", { name: $t("general.name.artists") })
                : $t("menu.cancelCollection", {
                    name: $t("general.name.artists"),
                  })
            }}
          </n-button>
        </n-space>
        <!-- 歌手介绍 -->
        <n-modal
          class="s-modal"
          v-model:show="artistDescShow"
          preset="card"
          :title="$t('general.name.artistDesc')"
          :bordered="false"
        >
          <n-scrollbar>
            <n-text v-html="artistData.desc.replace(/\n/g, '<br>')" />
          </n-scrollbar>
        </n-modal>
      </div>
    </div>
    <div class="error" v-else-if="!artistId">
      <n-text>{{ $t("general.name.noKeywords") }}</n-text>
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
    <n-tabs
      class="main-tab"
      type="segment"
      @update:value="tabChange"
      v-model:value="tabValue"
      v-if="artistData"
    >
      <n-tab name="songs"> {{ $t("general.name.hotSong") }} </n-tab>
      <n-tab name="albums"> {{ $t("general.name.album") }} </n-tab>
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
import { userStore } from "@/store";
import { getArtistDetail, likeArtist } from "@/api/artist";
import {
  MusicNoteFilled,
  AlbumFilled,
  VideocamRound,
  PersonAddAlt1Round,
  PersonRemoveAlt1Round,
} from "@vicons/material";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const router = useRouter();
const user = userStore();

// 歌手数据
const artistId = ref(router.currentRoute.value.query.id);
const artistData = ref(null);
const artistDescShow = ref(false);
const artistLikeBtn = ref(false);

// Tab 默认选中
const tabValue = ref(router.currentRoute.value.path.split("/")[2]);

// 获取歌手数据
const getArtistDetailData = (id) => {
  if (id) {
    getArtistDetail(id)
      .then((res) => {
        console.log(res);
        artistData.value = {
          id: res.data.artist.id,
          name: res.data.artist.name,
          occupation: res.data.identify ? res.data.identify.imageDesc : null,
          cover: res.data.artist.cover,
          desc: res.data.artist.briefDesc,
          albumSize: res.data.artist.albumSize,
          musicSize: res.data.artist.musicSize,
          mvSize: res.data.artist.mvSize,
        };
        $setSiteTitle(res.data.artist.name + " - " + t("general.name.artists"));
        // 请求后回顶
        if (typeof $scrollToTop !== "undefined") $scrollToTop();
      })
      .catch((err) => {
        router.go(-1);
        console.error(t("general.message.acquisitionFailed"), err);
        $message.error(t("general.message.acquisitionFailed"));
      });
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

// 判断收藏还是取消
const isLikeOrDislike = (id) => {
  if (user.getUserArtistLists.list[0]) {
    const index = user.getUserArtistLists.list.findIndex(
      (item) => item.id === Number(id)
    );
    if (index !== -1) {
      return false;
    }
    return true;
  } else {
    return true;
  }
};

// 收藏/取消收藏歌手
const toLikeArtist = (data) => {
  const type = isLikeOrDislike(data.id) ? 1 : 2;
  likeArtist(type, data.id).then((res) => {
    if (res.code === 200) {
      $message.success(
        `${data.name} ${
          type == 1
            ? t("menu.collection", { name: t("general.dialog.success") })
            : t("menu.cancelCollection", { name: t("general.dialog.success") })
        }`
      );
      user.setUserArtistLists(() => {
        artistLikeBtn.value = isLikeOrDislike(artistId.value);
      });
    } else {
      $message.error(
        `${data.name} ${
          type == 1
            ? t("menu.collection", { name: t("general.dialog.failed") })
            : t("menu.cancelCollection", { name: t("general.dialog.failed") })
        }`
      );
    }
  });
};

onMounted(() => {
  getArtistDetailData(artistId.value);
  artistLikeBtn.value = isLikeOrDislike(artistId.value);
  if (
    user.userLogin &&
    !user.getUserArtistLists.has &&
    !user.getUserArtistLists.isLoading
  ) {
    user.setUserArtistLists(() => {
      console.log("执行回调", artistId.value, isLikeOrDislike(artistId.value));
      artistLikeBtn.value = isLikeOrDislike(artistId.value);
    });
  }
});

// 监听路由参数变化
watch(
  () => router.currentRoute.value,
  (val) => {
    artistId.value = val.query.id;
    tabValue.value = val.path.split("/")[2];
    artistLikeBtn.value = isLikeOrDislike(artistId.value);
    if (val.path.split("/")[1] == "artist") {
      getArtistDetailData(artistId.value);
    }
  }
);
</script>

<style lang="scss" scoped>
.artist {
  margin-top: 30px;
  .error {
    margin-top: 30px;
    margin-bottom: 20px;
    .n-text {
      font-size: 40px;
      font-weight: bold;
      margin-right: 8px;
    }
  }
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
      display: flex;
      align-items: center;
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
        margin-bottom: 4px;
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
            color: var(--main-color);
            transform: translateY(-1px);
            font-size: 16px;
            margin-right: 4px;
          }
          &:hover {
            color: var(--main-color);
          }
        }
      }
      .desc {
        margin-top: 12px;
        -webkit-line-clamp: 2;
        cursor: pointer;
        transition: all 0.3s;
        &:hover {
          opacity: 0.8;
        }
      }
      .button {
        margin-top: 18px;
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
