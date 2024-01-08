<template>
  <div v-if="artistId" class="artist">
    <Transition name="fade" mode="out-in">
      <div v-if="artistData && Object.keys(artistData)?.length" class="detail">
        <div class="cover">
          <!-- 头像 -->
          <n-image
            :src="artistData.coverSize.m"
            :previewed-img-props="{ style: { borderRadius: '8px' } }"
            :preview-src="artistData.cover"
            class="cover-img"
            show-toolbar-tooltip
            @load="
              (e) => {
                e.target.style.opacity = 1;
              }
            "
          >
            <template #placeholder>
              <div class="cover-loading">
                <img class="loading-img" src="/images/pic/avatar.jpg?assest" alt="avatar" />
              </div>
            </template>
          </n-image>
          <!-- 头像背板 -->
          <n-image :src="artistData.coverSize.s" class="cover-shadow" preview-disabled />
        </div>
        <div class="data">
          <!-- 名称 -->
          <div class="name">
            <n-text class="name-text">{{ artistData.name || "未知艺术家" }}</n-text>
            <n-text v-if="artistData?.alias?.length" class="name-alias" depth="3">
              {{ artistData.alias[0] }}
            </n-text>
          </div>
          <!-- 职业 -->
          <n-text v-if="artistData?.identify" class="identify" depth="3">
            {{ artistData.identify }}
          </n-text>
          <!-- 数量 -->
          <n-flex class="num">
            <div
              v-if="artistData.size?.music"
              class="num-item"
              @click="router.push(`/artist/songs?id=${artistId}`)"
            >
              <n-icon depth="3" size="18">
                <SvgIcon icon="music-note" />
              </n-icon>
              <n-text depth="3">{{ artistData.size.music }}</n-text>
            </div>
            <div
              v-if="artistData.size?.album"
              class="num-item"
              @click="router.push(`/artist/albums?id=${artistId}`)"
            >
              <n-icon depth="3" size="18">
                <SvgIcon icon="album" />
              </n-icon>
              <n-text depth="3">{{ artistData.size.album }}</n-text>
            </div>
            <div
              v-if="artistData.size?.mv"
              class="num-item"
              @click="router.push(`/artist/videos?id=${artistId}`)"
            >
              <n-icon depth="3" size="18">
                <SvgIcon icon="video" />
              </n-icon>
              <n-text depth="3">{{ artistData.size.mv }}</n-text>
            </div>
          </n-flex>
          <!-- 简介 -->
          <n-ellipsis
            v-if="artistData?.description"
            :tooltip="false"
            :line-clamp="artistData?.identify ? 2 : 3"
            class="description"
            expand-trigger="click"
          >
            <n-text depth="3">{{ artistData.description }}</n-text>
          </n-ellipsis>
          <n-text v-else class="description">哇！竟然没有简介</n-text>
          <!-- 功能区 -->
          <n-flex class="menu" justify="space-between">
            <n-button size="large" round strong secondary @click="likeOrDislike(artistId)">
              <template #icon>
                <n-icon>
                  <SvgIcon :icon="isLikeOrDislike(artistId) ? 'person-add' : 'person-remove'" />
                </n-icon>
              </template>
              {{ isLikeOrDislike(artistId) ? "关注歌手" : "取消关注" }}
            </n-button>
          </n-flex>
        </div>
      </div>
      <div v-else class="detail">
        <n-skeleton class="cover" />
        <div class="data">
          <n-skeleton :repeat="4" text />
        </div>
      </div>
    </Transition>
    <!-- 标签页 -->
    <n-tabs v-model:value="tabValue" class="tabs" type="segment" @update:value="tabChange">
      <n-tab name="ar-hot"> 热门 </n-tab>
      <n-tab name="ar-songs"> 单曲 </n-tab>
      <n-tab name="ar-albums"> 专辑 </n-tab>
      <n-tab name="ar-videos"> 视频 </n-tab>
    </n-tabs>
    <!-- 路由页面 -->
    <router-view v-slot="{ Component }" :mvSize="artistData ? artistData.size?.mv : null">
      <keep-alive>
        <Transition name="router" mode="out-in">
          <component :is="Component" />
        </Transition>
      </keep-alive>
    </router-view>
  </div>
  <div v-else class="title">
    <n-text class="key">参数不完整</n-text>
    <n-button class="back" strong secondary @click="router.go(-1)"> 返回上一页 </n-button>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { getArtistDetail, likeArtist } from "@/api/artist";
import { siteData } from "@/stores";
import { isLogin } from "@/utils/auth";
import formatData from "@/utils/formatData";
import debounce from "@/utils/debounce";

const router = useRouter();
const data = siteData();
const { userLikeData } = storeToRefs(data);

// 歌手数据
const artistId = ref(router.currentRoute.value.query.id);
const artistData = ref(null);

// 默认选中
const tabValue = ref(router.currentRoute.value?.name ?? "ar-hot");

// 获取歌手详情
const getArtistDetailData = async (id) => {
  try {
    if (!id) return false;
    // 清空数据
    artistData.value = null;
    const result = await getArtistDetail(id);
    artistData.value = formatData(result.data.artist, "artist")[0];
    // 附加身份
    artistData.value.identify = result.data.identify?.imageDesc;
    console.log(result, artistData.value);
  } catch (error) {
    console.error("歌手数据获取失败：", error);
    $message.error("歌手数据获取失败");
  }
};

// 标签页切换
const tabChange = (val) => {
  const routerPath = val.replace(/^ar-/, "");
  router.push({
    path: `/artist/${routerPath}`,
    query: {
      id: artistId.value,
    },
  });
};

// 判断收藏还是取消
const isLikeOrDislike = (id) => {
  const artists = userLikeData.value.artists;
  if (artists.length) {
    return !artists.some((item) => item.id === Number(id));
  }
  return true;
};

// 关注 / 取消关注歌手
const likeOrDislike = debounce(async (id) => {
  try {
    if (!isLogin()) return $message.warning("请登录后使用");
    const type = isLikeOrDislike(id) ? 1 : 2;
    const result = await likeArtist(type, id);
    if (result.code === 200) {
      $message.success((type === 1 ? "关注" : "取消关注") + "成功");
      // 更新用户歌单
      await data.setUserLikeArtists();
    } else {
      $message.error((type === 1 ? "关注" : "取消关注") + "失败，请重试");
    }
  } catch (error) {
    console.error("关注出错：", error);
    $message.error("关注操作出现错误");
  }
}, 300);

// 监听路由变化
watch(
  () => router.currentRoute.value,
  async (val) => {
    tabValue.value = "ar-" + val.path.split("/")[2];
    if (val.path.split("/")[1] === "artist" && val.query.id !== artistId.value) {
      artistId.value = val.query.id;
      await getArtistDetailData(artistId.value);
    }
  },
);

onBeforeMount(async () => {
  await getArtistDetailData(artistId.value);
});
</script>

<style lang="scss" scoped>
.artist {
  .detail {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    margin-bottom: 20px;
    .cover {
      position: relative;
      display: flex;
      width: 240px;
      height: 240px;
      min-width: 240px;
      margin-right: 20px;
      border-radius: 50%;
      .cover-img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        z-index: 1;
        transition:
          filter 0.3s,
          transform 0.3s;
        :deep(img) {
          width: 100%;
          opacity: 0;
          transition: opacity 0.35s ease-in-out;
        }
        &:active {
          transform: scale(0.98);
        }
      }
      .cover-loading {
        border-radius: 50%;
      }
      .cover-shadow {
        position: absolute;
        top: 4px;
        height: 100%;
        width: 100%;
        filter: blur(16px) opacity(0.6);
        transform: scale(0.92, 0.96);
        z-index: 0;
        border-radius: 50%;
      }
    }
    .data {
      margin-top: 10px;
      width: 100%;
      .name {
        display: flex;
        flex-direction: row;
        align-items: center;
        font-size: 30px;
        font-weight: bold;
        .name-alias {
          &::before {
            content: "（";
            margin-right: 6px;
          }
          &::after {
            content: "）";
            margin-left: 6px;
          }
        }
      }
      .identify {
        margin-left: 2px;
        margin-top: 2px;
        font-size: 18px;
      }

      .num {
        margin-top: 8px;
        cursor: pointer;
        .num-item {
          display: flex;
          flex-direction: row;
          align-items: center;
          .n-icon {
            margin-right: 4px;
            // color: var(--main-color);
          }
        }
      }
      .description {
        margin-top: 12px;
        margin-left: 2px;
        .n-text {
          display: initial;
        }
      }
      .menu {
        margin-top: 12px;
      }
      :deep(.n-skeleton) {
        &:first-child {
          width: 60%;
          margin-top: 0;
          height: 40px;
        }
        height: 30px;
        margin-top: 12px;
        border-radius: 8px;
      }
    }
  }
  .tabs {
    margin-bottom: 20px;
  }

  @media (max-width: 700px) {
    .detail {
      display: flex;
      flex-direction: column;
      align-items: center;
      .cover {
        width: 200px;
        height: 200px;
        min-width: 200px;
        margin: 0;
      }
      .data {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 20px;
        .name {
          font-size: 26px;
        }
        .identify {
          font-size: 16px;
          margin-left: 0;
        }
      }
    }
  }
}
.title {
  display: flex;
  flex-direction: column;
  .key {
    margin: 10px 0;
    font-size: 36px;
    font-weight: bold;
    margin-right: 8px;
  }
  .back {
    width: 98px;
  }
}
</style>
