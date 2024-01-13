<!-- 歌曲列表 - 移动端菜单 -->
<template>
  <n-drawer
    v-model:show="drawerShow"
    :auto-focus="false"
    height="calc(100vh - 200px)"
    placement="bottom"
    class="song-list-drawer"
    @after-leave="drawerShow = false"
    @mask-click="drawerShow = false"
  >
    <n-drawer-content :native-scrollbar="false" :body-content-style="{ padding: 0 }" closable>
      <template #header>
        <div v-if="!songData?.path" class="song-data">
          <n-image
            :src="songData?.coverSize?.s || songData?.cover"
            class="cover"
            preview-disabled
          />
          <div class="song-detail">
            <n-text class="name">{{ songData?.name || "未知曲目" }}</n-text>
            <template v-if="songType === 'song'">
              <div v-if="songData?.artists && Array.isArray(songData.artists)" class="all-ar">
                <n-text v-for="ar in songData.artists" :key="ar.id" class="ar" depth="3">
                  {{ ar.name }}
                </n-text>
              </div>
              <div v-else class="all-ar">
                <n-text class="ar" depth="3">
                  {{ songData.artists || "未知艺术家" }}
                </n-text>
              </div>
            </template>
            <n-text v-else class="ar">
              {{ songData?.artists || "未知艺术家" }}
            </n-text>
          </div>
        </div>
        <n-text v-else>更多操作</n-text>
      </template>
      <div class="all-menu">
        <div
          class="menu-item"
          @click="
            () => {
              drawerShow = false;
              emit('playSong', playlistData, songData, songIndex);
            }
          "
        >
          <n-icon size="22">
            <SvgIcon icon="play" />
          </n-icon>
          <n-text class="name"> 立即播放 </n-text>
        </div>
        <div
          v-if="isSong && playMode !== 'dj' && music.getPlaySongData?.id !== songData.id && !isFm"
          class="menu-item"
          @click="
            () => {
              drawerShow = false;
              playMode = 'normal';
              addSongToNext(songData);
            }
          "
        >
          <n-icon size="22">
            <SvgIcon icon="play-next" />
          </n-icon>
          <n-text class="name"> 下一首播放 </n-text>
        </div>
        <div
          v-if="isSong && !isLocalSong"
          class="menu-item"
          @click="
            () => {
              drawerShow = false;
              addPlaylistRef?.openAddToPlaylist(songData?.id);
            }
          "
        >
          <n-icon size="22">
            <SvgIcon icon="playlist-add" />
          </n-icon>
          <n-text class="name"> 添加到歌单 </n-text>
        </div>
        <div
          v-if="isSong && !isLocalSong"
          class="menu-item"
          @click="
            () => {
              drawerShow = false;
              router.push({
                path: '/comment',
                query: {
                  id: songData.id,
                },
              });
            }
          "
        >
          <n-icon size="20">
            <SvgIcon icon="comment-text" />
          </n-icon>
          <n-text class="name"> 查看评论 </n-text>
        </div>
        <div
          v-if="isSong && isHasMv"
          class="menu-item"
          @click="
            () => {
              drawerShow = false;
              router.push({
                path: '/videos-player',
                query: {
                  id: songData.mv,
                },
              });
            }
          "
        >
          <n-icon size="22">
            <SvgIcon icon="video" />
          </n-icon>
          <n-text class="name"> 观看 MV </n-text>
        </div>
        <div
          v-if="!isCloud && isUserPlaylist"
          class="menu-item"
          @click="
            () => {
              drawerShow = false;
              emit('deletePlaylistSong', songSourceId, songData, playlistData, songIndex);
            }
          "
        >
          <n-icon size="22">
            <SvgIcon icon="delete" />
          </n-icon>
          <n-text class="name"> 从歌单中删除 </n-text>
        </div>
        <div
          v-if="isCloud"
          class="menu-item"
          @click="
            () => {
              drawerShow = false;
              emit('delCloudSong', playlistData, songData, songIndex);
            }
          "
        >
          <n-icon size="22">
            <SvgIcon icon="delete" />
          </n-icon>
          <n-text class="name"> 从云盘中删除 </n-text>
        </div>
        <div
          v-if="isCloud"
          class="menu-item"
          @click="
            () => {
              drawerShow = false;
              cloudSongMatchRef?.openCloudSongMatch(songData, songIndex);
            }
          "
        >
          <n-icon size="22">
            <SvgIcon icon="edit" />
          </n-icon>
          <n-text class="name"> 云盘歌曲纠正 </n-text>
        </div>
        <div
          v-if="isSong && !isLocalSong"
          class="menu-item"
          @click="
            () => {
              drawerShow = false;
              downloadSongRef?.openDownloadModal(songData);
            }
          "
        >
          <n-icon size="22">
            <SvgIcon icon="download" />
          </n-icon>
          <n-text class="name"> 下载歌曲 </n-text>
        </div>
      </div>
    </n-drawer-content>
  </n-drawer>
  <!-- 添加到歌单 -->
  <AddPlaylist ref="addPlaylistRef" />
  <!-- 下载歌曲 -->
  <DownloadSong ref="downloadSongRef" />
  <!-- 云盘歌曲纠正 -->
  <CloudSongMatch ref="cloudSongMatchRef" />
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { addSongToNext } from "@/utils/Player";
import { musicData, siteData, siteStatus } from "@/stores";

const router = useRouter();
const data = siteData();
const music = musicData();
const status = siteStatus();
const { playMode } = storeToRefs(status);
const { userData, userLikeData } = storeToRefs(data);
const emit = defineEmits(["playSong", "delCloudSong", "deletePlaylistSong", "delLocalSong"]);

// 子组件
const addPlaylistRef = ref(null);
const downloadSongRef = ref(null);
const cloudSongMatchRef = ref(null);

// 菜单数据
const drawerShow = ref(false);
const songType = ref("song");
const songData = ref(null);
const songIndex = ref(null);
const songSourceId = ref(null);
const playlistData = ref(null);

// 歌曲状态
const isFm = computed(() => playMode.value === "fm");
const isSong = computed(() => songType.value === "song");
const isLocalSong = computed(() => !!songData.value?.path);
const isHasMv = computed(() => !!songData.value?.mv && songData.value.mv !== 0);
const isCloud = computed(() => router.currentRoute.value.name === "cloud");
const isUserPlaylist = computed(() => {
  // 用户 id
  const userId = userData.value?.userId;
  // 用户歌单
  const userPlaylistsData = userLikeData.value.playlists?.filter(
    (playlist) => playlist.userId === userId,
  );
  return songSourceId.value !== 0 && userPlaylistsData.some((pl) => pl.id == songSourceId.value);
});

// 开启菜单
const drawerOpen = (data, song, index, sourceId, type) => {
  console.log(song, type);
  drawerShow.value = true;
  songData.value = song;
  songType.value = type;
  songIndex.value = index;
  songSourceId.value = sourceId;
  playlistData.value = data;
};

defineExpose({
  drawerOpen,
});
</script>

<style lang="scss" scoped>
.song-data {
  display: flex;
  flex-direction: row;
  align-items: center;
  .cover {
    margin-right: 12px;
    width: 50px;
    height: 50px;
    border-radius: 8px;
  }
  .song-detail {
    .name {
      font-size: 16px;
      margin-bottom: 8px;
    }
    .all-ar {
      margin-top: 4px;
      font-size: 13px;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
      overflow: hidden;
      word-break: break-all;
      .ar {
        display: inline-flex;
        &::after {
          content: "/";
          margin: 0 4px;
        }
        &:last-child {
          &::after {
            display: none;
          }
        }
      }
    }
  }
}
.all-menu {
  .menu-item {
    padding: 12px 24px;
    display: flex;
    align-items: center;
    flex-direction: row;
    transition: background-color 0.3s;
    cursor: pointer;
    .n-icon {
      margin-right: 8px;
    }
    .name {
      transform: translateY(1px);
      display: flex;
      flex-direction: row;
    }
    &:hover {
      background-color: var(--n-close-color-hover);
    }
  }
}
</style>

<style lang="scss">
.song-list-drawer {
  border-radius: 8px 8px 0 0;
}
</style>
