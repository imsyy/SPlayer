<template>
  <div class="smallSongData">
    <n-avatar
      class="pic"
      :size="48"
      :src="
        songDetail && songDetail.album
          ? songDetail.album.picUrl.replace(/^http:/, 'https:') + '?param=60y60'
          : '/images/pic/default.png'
      "
      fallback-src="/images/pic/default.png"
    />
    <div class="name" :style="notJump ? 'pointer-events: none' : null">
      <n-text
        class="text-hidden"
        depth="2"
        v-html="songDetail ? songDetail.name : $t('general.name.unknownSong')"
        @click.stop="router.push(`/song?id=${songDetail.id}`)"
      />
      <AllArtists
        v-if="songDetail && songDetail.artist"
        class="text-hidden"
        :artistsData="songDetail.artist"
      />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { getMusicDetail } from "@/api/song";
import { useI18n } from "vue-i18n";
import AllArtists from "./AllArtists.vue";

const { t } = useI18n();
const router = useRouter();
const props = defineProps({
  // 歌曲数据
  songData: {
    type: Object,
    default: null,
  },
  // 不跳转
  notJump: {
    type: Boolean,
    default: false,
  },
  // 通过歌曲 ID 获取
  getDataByID: {
    type: String,
    default: null,
  },
});

// 歌曲数据
const songDetail = ref(props.songData);

// 获取歌曲详情
const getMusicDetailData = (id) => {
  getMusicDetail(id).then((res) => {
    if (res.songs[0]) {
      songDetail.value = {
        album: res.songs[0].al,
        artist: res.songs[0].ar,
        name: res.songs[0].name,
        id: res.songs[0].id,
      };
    } else {
      $message.error(t("general.message.acquisitionFailed"));
    }
  });
};

// 检查歌曲信息
const checkSongData = () => {
  return songDetail.value ? true : false;
};
defineExpose({
  checkSongData,
});

// 监听参数变化
watch(
  () => props.getDataByID,
  (val) => {
    getMusicDetailData(val);
  }
);
watch(
  () => props.songData,
  (val) => {
    songDetail.value = val;
  }
);

onMounted(() => {
  if (props.songData) songDetail.value = props.songData;
  if (props.getDataByID) getMusicDetailData(props.getDataByID);
});
</script>

<style lang="scss" scoped>
.smallSongData {
  display: flex;
  flex-direction: row;
  align-items: center;
  .pic {
    margin-right: 12px;
    border-radius: 8px;
    min-width: 48px;
  }
  .name {
    line-height: 1.6;
    .n-text {
      font-size: 18px;
      transition: all 0.3s;
      cursor: pointer;
      &:hover {
        color: var(--main-color);
      }
    }
    .artists {
      font-size: 12px;
    }
  }
}
</style>
