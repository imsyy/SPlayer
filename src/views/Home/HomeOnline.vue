<template>
  <div class="home-online">
    <!-- 登录功能 -->
    <n-grid v-if="isLogin()" :cols="2" :x-gap="20" class="main-rec">
      <n-gi>
        <n-flex :size="20" class="rec-list" justify="space-between" vertical>
          <!-- 每日推荐 -->
          <SongListCard
            :data="musicStore.dailySongsData.list"
            :title="dailySongsTitle"
            :height="90"
            description="根据你的音乐口味 · 每日更新"
            size="small"
            @click="router.push({ name: 'daily-songs' })"
          />
          <!-- 我喜欢的音乐 -->
          <SongListCard
            :data="dataStore.likeSongsList.data"
            :height="90"
            title="我喜欢的音乐"
            description="发现你独特的音乐品味"
            size="small"
            @click="router.push({ name: 'like-songs' })"
          />
        </n-flex>
      </n-gi>
      <!-- 私人FM -->
      <n-gi>
        <PersonalFM />
      </n-gi>
    </n-grid>
    <!-- 公共推荐 -->
    <div v-for="(item, index) in recData" :key="index" class="rec-public">
      <n-flex class="title" align="center" justify="space-between">
        <n-h3 prefix="bar">
          <n-text>{{ item.name }}</n-text>
          <SvgIcon v-if="item.path" :size="26" name="Right" />
        </n-h3>
      </n-flex>
      <!-- 列表 -->
      <ArtistList v-if="item.type === 'artist'" :data="item.list" :loading="true" />
      <CoverList v-else :data="item.list" :type="item.type" :cols="item.cols" :loading="true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ArtistType, CoverType } from "@/types/main";
import { NText } from "naive-ui";
import { useDataStore, useMusicStore } from "@/stores";
import { newAlbumsAll, personalized, radarPlaylist, topArtists } from "@/api/rec";
import { allMv } from "@/api/video";
import { radioRecommend } from "@/api/radio";
import { getCacheData } from "@/utils/cache";
import { formatArtistsList, formatCoverList } from "@/utils/format";
import { sleep } from "@/utils/helper";
import { isLogin } from "@/utils/auth";
import SvgIcon from "@/components/Global/SvgIcon.vue";

interface RecItemType {
  name: string;
  list: ArtistType[] | CoverType[];
  type: "playlist" | "artist" | "video" | "radio" | "album";
  path?: string;
  cols?: string;
}

interface RecDataType {
  playlist: RecItemType;
  radar: RecItemType;
  artist: RecItemType;
  video: RecItemType;
  radio: RecItemType;
  album: RecItemType;
}

const router = useRouter();
const dataStore = useDataStore();
const musicStore = useMusicStore();

// 日推标题
const dailySongsTitle = computed(() => {
  const day = new Date().getDate();
  return h("div", { class: "date" }, [
    h("div", { class: "date-icon" }, [
      h(SvgIcon, { name: "Calendar-Empty", size: 30, depth: 2 }),
      h(NText, null, () => day),
    ]),
    h(NText, { class: "name" }, () => ["每日推荐"]),
  ]);
});

// 推荐数据
const recData = ref<RecDataType>({
  playlist: {
    name: isLogin() ? "专属歌单" : "推荐歌单",
    list: [] as CoverType[],
    type: "playlist",
    path: "/discover/playlists",
  },
  radar: {
    name: "雷达歌单",
    list: [] as CoverType[],
    type: "playlist",
  },
  artist: {
    name: "歌手推荐",
    list: [] as ArtistType[],
    type: "artist",
    path: "/discover/artists",
  },
  video: {
    name: "推荐 MV",
    list: [] as CoverType[],
    type: "video",
    cols: "2 600:2 800:3 900:4 1200:5 1400:6",
  },
  radio: {
    name: "推荐播客",
    list: [] as CoverType[],
    type: "radio",
  },
  album: {
    name: "新碟上架",
    list: [] as CoverType[],
    type: "album",
    path: "/discover/new",
  },
});

// 获取全部推荐
const getAllRecData = async () => {
  try {
    // 延时 50ms
    await sleep(50);

    // 歌单
    try {
      const playlistRes = await getCacheData(
        personalized,
        { key: "playlistRec", time: 10 },
        "playlist",
        isLogin() ? 21 : 20,
      );
      recData.value.playlist.list = formatCoverList(
        playlistRes.result?.filter((pl: any) => !pl.name.includes("私人雷达")),
      );
    } catch (error) {
      console.error("Error getting playlist:", error);
    }

    // 雷达
    try {
      const radarRes = await getCacheData(radarPlaylist, { key: "radarRec", time: 30 });
      recData.value.radar.list = formatCoverList(radarRes);
    } catch (error) {
      console.error("Error getting radar:", error);
    }

    // 歌手
    try {
      const artistRes = await getCacheData(topArtists, { key: "artistRec", time: 10 }, 6);
      recData.value.artist.list = formatArtistsList(artistRes.artists);
    } catch (error) {
      console.error("Error getting artist:", error);
    }

    // MV
    try {
      const videoRes = await getCacheData(allMv, { key: "videoRec", time: 10 });
      recData.value.video.list = formatCoverList(videoRes.data);
    } catch (error) {
      console.error("Error getting video:", error);
    }

    // 播客
    try {
      const radioRes = await getCacheData(radioRecommend, { key: "radioRec", time: 10 });
      recData.value.radio.list = formatCoverList(radioRes.djRadios);
    } catch (error) {
      console.error("Error getting radio:", error);
    }

    // 新碟
    try {
      const albumRes = await getCacheData(newAlbumsAll, { key: "albumRec", time: 10 });
      recData.value.album.list = formatCoverList(albumRes.albums);
    } catch (error) {
      console.error("Error getting album:", error);
    }
  } catch (error) {
    window.$message.error("个性化推荐获取出错");
    console.error("Error getting personalized data:", error);
  }
};

onActivated(getAllRecData);
</script>

<style lang="scss" scoped>
.main-rec {
  .date {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
    .date-icon {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 4px;
      .n-text {
        position: absolute;
        font-size: 12px;
        color: var(--primary-hex);
        line-height: normal;
        margin-top: 4px;
        transform: scale(0.8);
      }
    }
    .name {
      font-size: 18px;
      font-weight: bold;
    }
  }
}
.title {
  margin-top: 28px;
  padding: 0 4px;
  .n-h {
    margin: 0;
    display: flex;
    align-items: center;
    cursor: pointer;
    .n-icon {
      opacity: 0;
      transform: translateX(4px);
      transition:
        opacity 0.3s,
        transform 0.3s;
    }
    &:hover {
      .n-icon {
        opacity: 1;
        transform: translateX(0);
      }
    }
  }
}
</style>
