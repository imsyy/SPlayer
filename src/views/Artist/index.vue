<template>
  <div class="artist">
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
        <n-text class="name">{{ artistData.name || "未知艺术家" }}</n-text>
        <!-- 别名 -->
        <div class="alias">
          <n-text v-if="artistData?.alias?.length" class="alias-text">
            {{ artistData.alias[0] }}
          </n-text>
          <n-text v-if="artistData?.identify" class="identify">{{ artistData.identify }}</n-text>
        </div>
        <!-- 数量 -->
        <n-space class="num">
          <div v-if="artistData.size?.music" class="num-item">
            <n-icon depth="3" size="18">
              <SvgIcon icon="music-note" />
            </n-icon>
            <n-text depth="3">{{ artistData.size.music }}</n-text>
          </div>
          <div v-if="artistData.size?.album" class="num-item">
            <n-icon depth="3" size="18">
              <SvgIcon icon="album" />
            </n-icon>
            <n-text depth="3">{{ artistData.size.album }}</n-text>
          </div>
          <div v-if="artistData.size?.mv" class="num-item">
            <n-icon depth="3" size="18">
              <SvgIcon icon="video" />
            </n-icon>
            <n-text depth="3">{{ artistData.size.mv }}</n-text>
          </div>
        </n-space>
        <!-- 简介 -->
        <n-ellipsis
          v-if="artistData?.description"
          :tooltip="false"
          class="description"
          expand-trigger="click"
          line-clamp="2"
        >
          <n-text depth="3">{{ artistData.description }}</n-text>
        </n-ellipsis>
        <n-text v-else class="description">哇！竟然没有简介</n-text>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { getArtistDetail } from "@/api/artist";
import formatData from "@/utils/formatData";

const router = useRouter();

// 歌手数据
const artistId = ref(router.currentRoute.value.query.id);
const artistData = ref(null);

// 获取歌手详情
const getArtistDetailData = async () => {
  try {
    const result = await getArtistDetail(artistId.value);
    artistData.value = formatData(result.data.artist, "artist")[0];
    // 附加身份
    artistData.value.identify = result.data.identify?.imageDesc;
    console.log(result, artistData.value);
  } catch (error) {
    console.error("歌手数据获取失败：", error);
    $message.error("歌手数据获取失败");
  }
};

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
      width: 260px;
      height: 260px;
      min-width: 260px;
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
      width: 100%;
      .name {
        font-size: 30px;
        font-weight: bold;
        margin-bottom: 12px;
      }
      .num {
        margin-top: 12px;
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
}
</style>
