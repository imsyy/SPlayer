<!-- 首页 -->
<template>
  <div class="home">
    <!-- 欢迎 -->
    <div class="greetings">
      <n-h1 class="welcome">
        {{ getGreetings() }}
      </n-h1>
      <n-text depth="3">由此开启好心情 ~</n-text>
    </div>
    <!-- 专属推荐 -->
    <div class="rec-private">
      <n-grid class="rec-private" cols="1" x-gap="20" y-gap="20">
        <!-- 每日推荐 -->
        <n-gi>
          <SpecialCover
            :data="dailySongsCoverData"
            :showIcon="false"
            showDate
            @click="jumpPage('daily-songs')"
          />
        </n-gi>
        <!-- 喜欢的音乐 -->
        <n-gi>
          <SpecialCover
            :data="likeSongsCoverData"
            :showIcon="false"
            @click="jumpPage('like-songs')"
          />
        </n-gi>
      </n-grid>
      <PrivateFm class="rec-fm" />
    </div>
    <!-- 公共推荐 -->
    <div v-for="(item, index) in recommendData" :key="index" class="rec-public">
      <n-h3 class="title" prefix="bar" @click="item.to ? router.push(item.to) : null">
        <n-text class="name">{{ item.name }}</n-text>
        <n-icon class="more" depth="3">
          <SvgIcon icon="chevron-right" />
        </n-icon>
      </n-h3>
      <MainCover
        :data="item.data"
        :type="item.type"
        :loadingNum="item.loadingNum"
        :columns="item.columns"
      />
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { getGreetings } from "@/utils/timeTools";
import { getDailyRec, getPersonalized, getTopArtists, getNewAlbum } from "@/api/recommend";
import { getDjPersonalRec } from "@/api/dj";
import { siteData, siteSettings } from "@/stores";
import { getCacheData } from "@/utils/helper";
import { isLogin } from "@/utils/auth";
import formatData from "@/utils/formatData";

const data = siteData();
const router = useRouter();
const settings = siteSettings();
const { showSider } = storeToRefs(settings);
const { userLikeData, dailySongsData } = storeToRefs(data);

// 每日推荐
const dailySongsCoverData = computed(() => {
  const dailySongsCover = {
    name: "每日推荐",
    desc: "根据你的音乐口味 · 每日更新",
  };
  if (isLogin() && dailySongsData.value.data?.length) {
    const randomIndex = Math.floor(Math.random() * dailySongsData.value.data.length);
    dailySongsCover.cover =
      dailySongsData.value.data[randomIndex]?.coverSize?.s || "/images/pic/like.jpg";
    return dailySongsCover;
  }
  dailySongsCover.cover = "/images/pic/cover-2.jpg";
  return dailySongsCover;
});

// 喜欢的音乐
const likeSongsCoverData = computed(() => {
  const likeSongsCover = {
    name: "喜欢的音乐",
    desc: "发现你独特的音乐品味",
  };
  if (isLogin() && userLikeData.value.playlists?.length) {
    likeSongsCover.cover = userLikeData.value.playlists[0]?.coverSize?.s || "/images/pic/like.jpg";
    return likeSongsCover;
  }
  likeSongsCover.cover = "/images/pic/like.jpg";
  return likeSongsCover;
});

// 个性化推荐数据
const recommendData = ref({
  playlist: {
    name: "推荐歌单",
    loadingNum: 12,
    columns: showSider.value ? undefined : "2 s:3 m:4 l:5 xl:6",
    data: [],
    to: "/discover/playlists",
  },
  artist: {
    name: "歌手推荐",
    type: "artist",
    columns: showSider.value ? "3 s:4 m:5 l:6" : "3 sm:4 m:5 l:6",
    loadingNum: 6,
    data: [],
    to: "/discover/artists",
  },
  mv: {
    name: "推荐 MV",
    type: "mv",
    columns: "1 s:2 m:3 l:4 xl:5",
    loadingNum: 2,
    data: [],
  },
  dj: {
    name: "专属播客",
    type: "dj",
    loadingNum: 6,
    data: [],
    to: "/dj-hot",
  },
  album: {
    name: "新碟上架",
    type: "album",
    loadingNum: 12,
    data: [],
    to: "/discover/new",
  },
});

// 获取个性化推荐数据
const getRecommendData = async () => {
  try {
    const [playlistRes, artistRes, mvRes, djRes, albumRes] = await Promise.allSettled([
      // 歌单
      isLogin()
        ? getCacheData("recPl-P", 5, getDailyRec, "resource")
        : getCacheData("recPl", 5, getPersonalized),
      // 歌手
      getCacheData("recAr", 5, getTopArtists),
      // MV
      getCacheData("recMv", 5, getPersonalized, "mv"),
      // 电台
      getCacheData("recDj", 5, getDjPersonalRec),
      // 专辑
      getCacheData("recAl", 5, getNewAlbum),
    ]);
    // 检查请求状态
    playlistRes.status === "fulfilled" &&
      (recommendData.value.playlist.data = formatData(
        playlistRes.value.result || playlistRes.value.recommend,
      ));
    artistRes.status === "fulfilled" &&
      (recommendData.value.artist.data = formatData(artistRes.value.artists, "artist"));
    mvRes.status === "fulfilled" &&
      (recommendData.value.mv.data = formatData(mvRes.value.result, "mv"));
    djRes.status === "fulfilled" &&
      (recommendData.value.dj.data = formatData(djRes.value.data, "dj"));
    albumRes.status === "fulfilled" &&
      (recommendData.value.album.data = formatData(albumRes.value.albums, "album"));
    // 检查是否有任何请求失败
    const anyRejected = [playlistRes, artistRes, mvRes, albumRes].some(
      (res) => res.status === "rejected",
    );
    if (anyRejected) {
      throw new Error("一个或多个请求失败");
    }
  } catch (error) {
    $message.error("个性化推荐获取失败");
    console.error("个性化推荐获取失败：", error);
  }
};

// 页面跳转
const jumpPage = (key, id) => {
  switch (key) {
    case "playlist":
      router.push({
        path: "/playlist",
        query: { id },
      });
      break;
    case "like-songs":
      router.push("/like-songs");
      break;
    case "daily-songs":
      router.push("/daily-songs");
      break;
    default:
      break;
  }
};

onBeforeMount(() => {
  // 每日推荐
  data.setDailySongsData();
  // 个性化推荐
  getRecommendData();
});
</script>

<style lang="scss" scoped>
.home {
  max-width: 1400px;
  margin: 0 auto;
  .greetings {
    margin-bottom: 20px;
    .welcome {
      margin: 0;
      font-weight: bold;
    }
  }
  .title {
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-left: 2px;
    margin-top: 28px;
    padding-left: 16px;
    cursor: pointer;
    .more {
      font-size: 26px;
      opacity: 0;
      transform: translateX(4px);
      transition:
        opacity 0.3s,
        transform 0.3s;
    }
    &:hover {
      .more {
        opacity: 1;
        transform: translateX(0);
      }
    }
  }
  .rec-private {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    .rec-fm {
      width: 100%;
      height: 220px;
      margin-left: 20px;
      max-width: calc(50% - 10px);
    }
  }
}
</style>
