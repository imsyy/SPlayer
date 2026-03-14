<!-- 评论页 -->
<template>
  <div class="comment-page">
    <!-- 歌曲信息 -->
    <n-flex :wrap="false" align="center" class="song-data">
      <n-image :src="coverUrl" class="cover-img" preview-disabled @load="coverLoaded">
        <template #placeholder>
          <div class="cover-loading">
            <img src="/images/song.jpg?asset" class="loading-img" alt="loading" />
          </div>
        </template>
      </n-image>
      <n-flex :size="2" class="song-info" vertical>
        <span class="title text-hidden">{{ songName }}</span>
        <span class="artist text-hidden">{{ songArtists }}</span>
      </n-flex>
      <div class="actions">
        <n-flex class="close" align="center" justify="center" @click="openExcludeComment">
          <SvgIcon name="Tag" :size="20" />
        </n-flex>
        <n-flex class="close" align="center" justify="center" @click="handlePlay">
          <SvgIcon name="Music" :size="24" />
        </n-flex>
      </div>
    </n-flex>
    <!-- 评论列表 -->
    <ListComment :id="commentId" :type="commentType" height="auto" />
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import { useMusicStore, useSettingStore } from "@/stores";
import { usePlayerController } from "@/core/player/PlayerController";
import { songDetail } from "@/api/song";
import { radioProgramDetail } from "@/api/radio";
import { formatSongsList, removeBrackets } from "@/utils/format";
import { coverLoaded } from "@/utils/helper";
import { openExcludeComment } from "@/utils/modal";
import ListComment from "@/components/List/ListComment.vue";

const router = useRouter();
const musicStore = useMusicStore();
const settingStore = useSettingStore();
const player = usePlayerController();

// 路由参数
const commentId = computed(() => Number(router.currentRoute.value.query.id));
const commentType = computed(
  () => (Number(router.currentRoute.value.query.type) || 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
);

// 歌曲信息（进入页面时快照，不跟随播放变化）
const songSnapshot = ref<SongType | null>(null);

const songName = computed(() => {
  const name = songSnapshot.value?.name ?? "";
  return settingStore.hideBracketedContent ? removeBrackets(name) : name;
});

const songArtists = computed(() => {
  const song = songSnapshot.value;
  if (!song) return "";
  // 电台节目显示主播名
  if (song.type === "radio" && song.dj?.creator) return song.dj.creator;
  const artists = song.artists;
  if (!artists) return "";
  return Array.isArray(artists) ? artists.map((a) => a.name).join(" / ") : String(artists);
});

const coverUrl = computed(() => {
  const song = songSnapshot.value;
  if (!song) return "";
  // 优先使用 coverSize.s，与 musicStore.songCover 逻辑一致
  const cover = song.coverSize?.s || song.cover || "";
  return cover ? cover.replace(/\?param=\d+y\d+$/, "") + "?param=200y200" : "";
});

// 播放歌曲
const handlePlay = () => {
  if (songSnapshot.value) player.addNextSong(songSnapshot.value, true);
};

// 初始化歌曲信息：优先从 musicStore 快照，否则请求接口
const initSongData = async (id: number, type: number) => {
  if (!id) return;
  // 当前正在播放的就是这首歌，直接快照
  if (musicStore.playSong.id === id) {
    songSnapshot.value = {
      ...musicStore.playSong,
      // 确保封面数据完整
      coverSize: musicStore.playSong.coverSize ? { ...musicStore.playSong.coverSize } : undefined,
    } as SongType;
    return;
  }
  // 否则请求接口
  try {
    if (type === 4) {
      // 电台节目使用节目详情接口
      const result = await radioProgramDetail(id);
      if (!result.program) return;
      const programs = formatSongsList([result.program]);
      songSnapshot.value = programs[0];
    } else {
      // 普通歌曲
      const result = await songDetail(id);
      if (!result.songs?.length) return;
      const songs = formatSongsList(result.songs);
      songSnapshot.value = songs[0];
    }
  } catch (error) {
    console.error("获取歌曲信息失败:", error);
  }
};

watch(
  [commentId, commentType],
  ([id, type]) => {
    if (id) {
      songSnapshot.value = null;
      initSongData(id, type);
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.comment-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  .song-data {
    height: 90px;
    margin-bottom: 20px;
    padding: 0 16px;
    border-radius: 12px;
    background-color: rgba(var(--primary), 0.08);
    .cover-img {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      margin-right: 4px;
    }
    .song-info {
      overflow: hidden;
    }
    .title {
      font-size: 20px;
      font-weight: bold;
    }
    .artist {
      opacity: 0.8;
    }
    .actions {
      margin-left: auto;
      display: flex;
      gap: 12px;
      .close {
        width: 40px;
        height: 40px;
        background-color: rgba(var(--primary), 0.08);
        border-radius: 8px;
        transition: background-color 0.3s;
        cursor: pointer;
        &:hover {
          background-color: rgba(var(--primary), 0.2);
        }
      }
    }
  }
}
</style>
