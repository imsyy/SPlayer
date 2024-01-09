<!-- 本地歌曲 - 专辑 -->
<template>
  <Transition name="fade" mode="out-in">
    <div
      v-if="allAlbumData"
      :style="{
        height: `calc(100vh - ${
          Object.keys(music.playSongData)?.length && status.showPlayBar ? 445 : 365
        }px)`,
      }"
      class="local-album"
    >
      <n-scrollbar id="album-list" class="album-list" @scroll="albumListScroll">
        <n-card
          v-for="(item, index) in allAlbumData"
          :key="index"
          :class="chooseAlbum === item.album ? 'albums choose' : 'albums'"
          :content-style="{
            padding: '12px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
          }"
          @click="chooseAlbum = item.album"
        >
          <img class="cover" src="/images/pic/album.jpg?assest" alt="album-cover" />
          <div class="content">
            <span class="album">{{ item.album }}</span>
            <span class="artist">{{ item.artist }} · {{ item.num }} 首</span>
          </div>
        </n-card>
      </n-scrollbar>
      <n-divider class="divider" vertical />
      <n-scrollbar class="songs-list">
        <Transition name="fade" mode="out-in">
          <SongList :key="chooseAlbum" :data="filterByAlbumKeyword(songList, chooseAlbum)" />
        </Transition>
        <!-- 回顶 -->
        <n-back-top bottom="120">
          <n-icon size="26">
            <SvgIcon icon="chevron-up" />
          </n-icon>
        </n-back-top>
      </n-scrollbar>
    </div>
  </Transition>
</template>

<script setup>
import { musicData, siteStatus } from "@/stores";
import { getLocalCoverData } from "@/utils/helper";
import debounce from "@/utils/debounce";

const music = musicData();
const status = siteStatus();

// eslint-disable-next-line no-unused-vars
const props = defineProps({
  // 歌曲信息
  songList: {
    type: Array,
    default: () => [],
  },
});

// 歌手数据
const allAlbumData = ref(null);
const chooseAlbum = ref(null);

// 提取专辑信息为数组
const getAllAlbum = (data) => {
  const albumMap = new Map();
  // 遍历歌手
  data?.forEach((music) => {
    const artists = music.artists ? music.artists.split(/[/,&]/) : [];
    const album = music.album ? music.album.trim() : "";
    // 对歌手进行处理
    artists.forEach((artist) => {
      const trimmedArtist = artist.trim();
      if (albumMap.has(album)) {
        // 如果专辑已存在，追加当前歌手
        albumMap.get(album).artists.add(trimmedArtist);
        albumMap.get(album).num += 1;
      } else {
        // 如果专辑不存在，创建新的专辑信息
        albumMap.set(album, {
          artist: trimmedArtist,
          album,
          num: 1,
          artists: new Set([trimmedArtist]),
        });
      }
    });
  });
  // 将 Map 转为数组
  const albumArray = Array.from(albumMap.values());
  // 排序
  const sortedAlbumArray = albumArray.sort((a, b) => {
    return a.album.localeCompare(b.album, "zh-Hans-CN", { sensitivity: "base" });
  });
  // 默认选中
  chooseAlbum.value = sortedAlbumArray?.[0]?.album || null;
  // 歌手数据
  allAlbumData.value = sortedAlbumArray;
  nextTick().then(() => {
    albumListScroll();
  });
};

// 过滤包含关键字的专辑数组
const filterByAlbumKeyword = (data, keyword) => {
  return data.filter((item) => {
    if (item.album && item.album.includes(keyword)) {
      return item;
    }
    return false;
  });
};

// 获取专辑封面
const getAlbumCover = async (key) => {
  const path = filterByAlbumKeyword(props.songList, key)?.[0]?.path;
  const cover = await getLocalCoverData(path);
  return cover;
};

// 是否处于可视状态
const isInView = (element) => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
  );
};

// 专辑列表滚动
const albumListScroll = debounce(() => {
  try {
    // 正经人谁用 ref 呀
    const container = document.getElementById("album-list");
    const coverDom = container.querySelectorAll(".cover");
    coverDom.forEach(async (child, index) => {
      if (isInView(child) && !child.classList.contains("loaded")) {
        const coverUrl = await getAlbumCover(allAlbumData.value?.[index]?.album);
        if (coverUrl) {
          child.classList.add("loaded");
          child.src = coverUrl;
        }
      }
    });
  } catch (error) {
    console.error("专辑封面获取失败：", error);
  }
}, 100);

// 监听本地歌曲变化
watch(
  () => props.songList,
  (val) => getAllAlbum(val),
);

onMounted(() => {
  // 获取专辑列表
  getAllAlbum(props.songList);
});
</script>

<style lang="scss" scoped>
.local-album {
  display: flex;
  transition: height 0.3s;
  :deep(.album-list) {
    min-width: 100px;
    max-width: 240px;
    .albums {
      border-radius: 8px;
      margin-bottom: 6px;
      transition:
        transform 0.3s,
        border-color 0.3s,
        box-shadow 0.3s;
      cursor: pointer;
      &.choose {
        color: var(--main-color);
        background-color: var(--main-second-color);
        border-color: var(--main-color);
      }
      .cover {
        width: 50px;
        height: 50px;
        min-width: 50px;
        border-radius: 8px;
        margin-right: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .content {
        display: flex;
        flex-direction: column;
        .album {
          font-size: 15px;
          font-weight: bold;
        }
        .artist {
          opacity: 0.6;
          font-size: 13px;
        }
      }
    }
  }
  .divider {
    height: 100%;
  }
}
</style>
