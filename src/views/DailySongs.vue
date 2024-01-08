<!-- 每日推荐 -->
<template>
  <div class="daily-songs">
    <div class="title">
      <n-text class="name">每日推荐</n-text>
      <div class="tip">
        <Transition name="fade" mode="out-in">
          <n-text :key="showTime" depth="3">
            根据你的音乐口味 ·
            {{ showTime && updatedTime ? "更新于 " + updatedTime : "每日 6:00 更新" }}
          </n-text>
        </Transition>
      </div>
      <!-- 操作 -->
      <n-flex class="control">
        <n-button size="large" tag="div" round strong secondary @click="playAllSongs">
          <template #icon>
            <n-icon>
              <SvgIcon icon="play-arrow-rounded" />
            </n-icon>
          </template>
          播放全部
        </n-button>
        <n-dropdown :options="moreOptions" trigger="hover" placement="bottom-start">
          <n-button size="large" tag="div" circle strong secondary>
            <template #icon>
              <n-icon>
                <SvgIcon icon="format-list-bulleted" />
              </n-icon>
            </template>
          </n-button>
        </n-dropdown>
      </n-flex>
    </div>
    <!-- 列表 -->
    <SongList :data="dailySongsData.data" />
  </div>
</template>

<script setup>
import { NIcon } from "naive-ui";
import { storeToRefs } from "pinia";
import { musicData, siteData, siteStatus } from "@/stores";
import { fadePlayOrPause, initPlayer } from "@/utils/Player";
import SvgIcon from "@/components/Global/SvgIcon";

const data = siteData();
const music = musicData();
const status = siteStatus();
const { dailySongsData } = storeToRefs(data);
const { playList, playSongData } = storeToRefs(music);
const { playIndex, playMode, playHeartbeatMode } = storeToRefs(status);

const showTime = ref(false);
const showTimeOut = ref(null);

// 图标渲染
const renderIcon = (icon) => {
  return () => h(NIcon, null, { default: () => h(SvgIcon, { icon }, null) });
};

// 获取更新时间戳
const updatedTime = computed(() => {
  const timestamp = dailySongsData.value.timestamp;
  if (!timestamp) return null;
  const date = new Date(timestamp);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
});

// 更多操作数据
const moreOptions = computed(() => [
  {
    label: "更新日推",
    key: "refresh",
    props: {
      onclick: async () => {
        await data.setDailySongsData(true);
      },
    },
    icon: renderIcon("refresh"),
  },
]);

// 播放歌单全部歌曲
const playAllSongs = async () => {
  if (!dailySongsData.value.data) return false;
  // 关闭心动模式
  playHeartbeatMode.value = false;
  // 更改模式和歌单
  playMode.value = "normal";
  playList.value = dailySongsData.value.data.slice();
  // 是否处于歌单内
  const songId = music.getPlaySongData?.id;
  const existingIndex = dailySongsData.value.data.findIndex((song) => song.id === songId);
  // 若不处于
  if (existingIndex === -1 || !songId) {
    console.log("不在歌单内");
    playSongData.value = dailySongsData.value.data[0];
    playIndex.value = 0;
    // 初始化播放器
    await initPlayer(true);
  } else {
    console.log("处于歌单内");
    playSongData.value = dailySongsData.value.data[existingIndex];
    playIndex.value = existingIndex;
    // 播放
    fadePlayOrPause();
  }
  $message.info("已开始播放", { showIcon: false });
};

onMounted(() => {
  showTimeOut.value = setTimeout(() => {
    showTime.value = true;
  }, 1500);
});

onBeforeUnmount(() => {
  clearTimeout(showTimeOut.value);
});
</script>

<style lang="scss" scoped>
.daily-songs {
  .title {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    height: 30vh;
    margin-bottom: 20px;
    .name {
      font-size: 55px;
      font-weight: bold;
      animation: fade-spacing 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    .tip {
      font-size: 16px;
      margin-top: 6px;
      opacity: 0;
      animation: fade-down 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      animation-delay: 0.5s;
    }
    .control {
      margin-top: 30px;
    }
  }
}
</style>
