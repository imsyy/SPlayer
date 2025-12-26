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
            :description="t('home.recommend.dailyDesc')"
            size="small"
            @click="router.push({ name: 'daily-songs' })"
          />
          <!-- 我喜欢的音乐 -->
          <SongListCard
            :data="dataStore.likeSongsList.data"
            :height="90"
            :title="t('home.recommend.private')"
            :description="t('home.recommend.privateDesc')"
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
    <div v-for="(item, index) in sortedRecData" :key="index" class="rec-public">
      <n-flex
        class="title"
        align="center"
        justify="space-between"
        @click="router.push({ path: item.path ?? undefined })"
      >
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
import { useDataStore, useMusicStore, useSettingStore } from "@/stores";
import { newAlbumsAll, personalized, radarPlaylist, topArtists } from "@/api/rec";
import { allMv } from "@/api/video";
import { radioRecommend } from "@/api/radio";
import { getCacheData } from "@/utils/cache";
import { formatArtistsList, formatCoverList } from "@/utils/format";
import { sleep } from "@/utils/helper";
import { isLogin } from "@/utils/auth";
import SvgIcon from "@/components/Global/SvgIcon.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

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
const settingStore = useSettingStore();

// 日推标题
const dailySongsTitle = computed(() => {
  const day = new Date().getDate();
  return h("div", { class: "date" }, [
    h("div", { class: "date-icon" }, [
      h(SvgIcon, { name: "Calendar-Empty", size: 30, depth: 2 }),
      h(NText, null, () => day),
    ]),
    h(NText, { class: "name" }, () => [t("home.recommend.daily")]),
  ]);
});

// 推荐数据
const recData = computed<RecDataType>(() => ({
  playlist: {
    name: isLogin() ? t("home.recommend.myPlaylist") : t("home.recommend.playlist"),
    list: [] as CoverType[],
    type: "playlist",
    path: "/discover/playlists",
  },
  radar: {
    name: t("home.recommend.radar"),
    list: [] as CoverType[],
    type: "playlist",
  },
  artist: {
    name: t("home.recommend.artist"),
    list: [] as ArtistType[],
    type: "artist",
    path: "/discover/artists",
  },
  video: {
    name: t("home.recommend.video"),
    list: [] as CoverType[],
    type: "video",
    cols: "2 600:2 800:3 900:4 1200:5 1400:6",
  },
  radio: {
    name: t("home.recommend.radio"),
    list: [] as CoverType[],
    type: "radio",
  },
  album: {
    name: t("home.recommend.album"),
    list: [] as CoverType[],
    type: "album",
    path: "/discover/new",
  },
}));

// 推荐数据 Ref (to hold the list data)
// We need to separate the dynamic lists from the translated static data
// OR we can make the whole thing computed, but lists need to be mutable or ref.
// Better approach: Keep recData as ref but update names in a watcher or computed that returns the structure.
// However, recData strucutre is used for both v-for and data storage.
// Let's keep recData as ref but initialize names with t(). The issue is if language changes, names won't update.
// To support dynamic language change, the names in v-for should be reactive.
// Let's make `recData` a reactive object where `name` is a computed property? No, that's hard in a plain object.
// We can use a computed for the `sortedRecData` mapping and apply `t()` there?
// But `recData` is the source of truth for lists.
// Let's refactor `sortedRecData` to be the primary place where structure is assembled.

const recLists = reactive({
  playlist: [] as CoverType[],
  radar: [] as CoverType[],
  artist: [] as ArtistType[],
  video: [] as CoverType[],
  radio: [] as CoverType[],
  album: [] as CoverType[],
});

// 根据设置过滤和排序推荐数据
const sortedRecData = computed(() => {
  const allData: RecDataType = {
    playlist: {
      name: isLogin() ? t("home.recommend.myPlaylist") : t("home.recommend.playlist"),
      list: recLists.playlist,
      type: "playlist",
      path: "/discover/playlists",
    },
    radar: {
      name: t("home.recommend.radar"),
      list: recLists.radar,
      type: "playlist",
    },
    artist: {
      name: t("home.recommend.artist"),
      list: recLists.artist,
      type: "artist",
      path: "/discover/artists",
    },
    video: {
      name: t("home.recommend.video"),
      list: recLists.video,
      type: "video",
      cols: "2 600:2 800:3 900:4 1200:5 1400:6",
    },
    radio: {
      name: t("home.recommend.radio"),
      list: recLists.radio,
      type: "radio",
    },
    album: {
      name: t("home.recommend.album"),
      list: recLists.album,
      type: "album",
      path: "/discover/new",
    },
  };

  return settingStore.homePageSections
    .filter((section) => section.visible)
    .sort((a, b) => a.order - b.order)
    .map((section) => {
      const key = section.key as keyof RecDataType;
      return allData[key];
    })
    .filter((item) => item);
});


// 获取全部推荐
const getAllRecData = async () => {
  try {
    // 延时
    await sleep(300);

    // 歌单
    try {
      const playlistRes = await getCacheData(
        personalized,
        { key: "playlistRec", time: 10 },
        "playlist",
        isLogin() ? 21 : 20,
      );
      recLists.playlist = formatCoverList(
        playlistRes.result?.filter((pl: any) => !pl.name.includes("私人雷达")),
      );
    } catch (error) {
      console.error("Error getting playlist:", error);
    }

    // 雷达
    try {
      const radarRes = await getCacheData(radarPlaylist, { key: "radarRec", time: 30 });
      recLists.radar = formatCoverList(radarRes);
    } catch (error) {
      console.error("Error getting radar:", error);
    }

    // 歌手
    try {
      const artistRes = await getCacheData(topArtists, { key: "artistRec", time: 10 }, 6);
      recLists.artist = formatArtistsList(artistRes.artists);
    } catch (error) {
      console.error("Error getting artist:", error);
    }

    // MV
    try {
      const videoRes = await getCacheData(allMv, { key: "videoRec", time: 10 });
      recLists.video = formatCoverList(videoRes.data);
    } catch (error) {
      console.error("Error getting video:", error);
    }

    // 播客
    try {
      const radioRes = await getCacheData(radioRecommend, { key: "radioRec", time: 10 });
      recLists.radio = formatCoverList(radioRes.djRadios);
    } catch (error) {
      console.error("Error getting radio:", error);
    }

    // 新碟
    try {
      const albumRes = await getCacheData(newAlbumsAll, { key: "albumRec", time: 10 });
      recLists.album = formatCoverList(albumRes.albums);
    } catch (error) {
      console.error("Error getting album:", error);
    }
  } catch (error) {
    window.$message.error(t("home.recommend.error"));
    console.error("Error getting personalized data:", error);
  }
};


onActivated(getAllRecData);

onMounted(() => {
  getAllRecData();
});
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
  width: max-content;
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
