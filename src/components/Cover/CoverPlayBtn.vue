<!-- 封面列表 - 播放按钮 -->
<template>
  <div class="play-btn" @click.stop>
    <n-button
      :loading="playLoading"
      color="#efefefde"
      tag="div"
      type="primary"
      class="play"
      size="large"
      strong
      secondary
      circle
      @click.stop="playAllSongs"
    >
      <template #icon>
        <Transition name="fade" mode="out-in">
          <n-icon :key="`${isHasSongs}-${playState}`" size="50">
            <SvgIcon :icon="isHasSongs !== -1 && playState ? 'pause-circle' : 'play-circle'" />
          </n-icon>
        </Transition>
      </template>
    </n-button>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { getAllPlayList } from "@/api/playlist";
import { getAlbumDetail } from "@/api/album";
import { getDjProgram } from "@/api/dj";
import { musicData, siteStatus } from "@/stores";
import { playOrPause, initPlayer } from "@/utils/Player";
import formatData from "@/utils/formatData";

const router = useRouter();
const music = musicData();
const status = siteStatus();
const { playList, playSongData } = storeToRefs(music);
const { playIndex, playMode, playHeartbeatMode, playState } = storeToRefs(status);

const props = defineProps({
  // id
  id: {
    type: Number,
    required: true,
  },
  // 歌单类型
  type: {
    type: String,
    default: "playlist",
  },
});
// 播放按钮数据
const playLoading = ref(false);
const playListData = ref(null);

// 是否处于当前歌单
const isHasSongs = computed(() => {
  if (!playListData.value) return -1;
  const songId = music.getPlaySongData?.id;
  const existingIndex = playListData.value.findIndex((song) => song.id === songId);
  return existingIndex;
});

// 获取歌单数据
const getPlaylistData = async () => {
  // 为了播放速度，仅加载列表前 500 首
  console.log(props.type, props.id);
  // 按列表类别获取数据
  switch (props.type) {
    case "playlist": {
      const result = await getAllPlayList(props.id, 500);
      return formatData(result.songs, "song");
    }
    case "album": {
      const result = await getAlbumDetail(props.id);
      return formatData(result.songs, "song");
    }
    case "dj": {
      const result = await getDjProgram(props.id, 500);
      return formatData(result.programs, "dj");
    }
    default:
      return null;
  }
};

// 播放歌单
const playAllSongs = async () => {
  try {
    if (!props.id) return false;
    // 开启加载状态
    if (props.type !== "mv") {
      // 若不处于歌单内
      if (isHasSongs.value === -1) {
        playLoading.value = true;
        // 获取歌单数据
        playListData.value = await getPlaylistData();
        console.log(playListData.value);
        if (!playListData.value) {
          playLoading.value = false;
          return $message.error("获取播放列表时出现错误");
        }
        console.log("不在歌单内");
        // 更改模式和歌单
        playHeartbeatMode.value = false;
        playMode.value = props.type === "dj" ? "dj" : "normal";
        playList.value = playListData.value.slice();
        playSongData.value = playListData.value[0];
        playIndex.value = 0;
        // 初始化播放器
        await initPlayer(true);
        playLoading.value = false;
        $message.info("已开始播放", { showIcon: false });
      }
      // 若处于歌单内
      else {
        console.log("处于歌单内");
        playSongData.value = playListData.value[isHasSongs.value];
        playIndex.value = isHasSongs.value;
        // 播放
        playOrPause();
      }
    } else {
      // 跳转播放器
      router.push({
        path: "/videos-player",
        query: {
          id: props.id,
        },
      });
    }
  } catch (error) {
    console.error("获取播放列表时出现错误：", error);
    $message.error("获取播放列表时出现错误");
  }
};
</script>

<style lang="scss" scoped>
.play-btn {
  backdrop-filter: blur(20px);
}
</style>
