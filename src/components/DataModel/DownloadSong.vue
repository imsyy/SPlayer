<template>
  <n-modal
    class="s-modal"
    v-model:show="downloadModel"
    preset="card"
    title="歌曲下载"
    :bordered="false"
    :on-after-leave="closeDownloadModel"
  >
    <template v-if="songData">
      <SmallSongData ref="smallSongDataRef" :songData="songData" notJump />
      <n-radio-group
        class="downloadGroup"
        v-model:value="downloadCheck"
        name="downloadGroup"
      >
        <n-space vertical>
          <n-radio
            v-for="item in downloadLevel"
            :key="item"
            :value="item.value"
            :disabled="checkLevel(item.value)"
          >
            {{ item.label }}
          </n-radio>
        </n-space>
      </n-radio-group>
    </template>
    <template v-else>
      <n-text>正在获取歌曲下载数据</n-text>
    </template>
    <template #footer>
      <n-space justify="end">
        <n-button @click="closeDownloadModel"> 取消 </n-button>
        <n-button
          :disabled="!downloadCheck"
          :loading="downloadStatus"
          type="primary"
          @click="
            toSongDownload(
              songId,
              downloadCheck,
              songData.artist[0].name + '-' + songData.name
            )
          "
        >
          {{ downloadStatus ? "正在下载" : "下载" }}
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
import { userStore } from "@/store";
import { getMusicDetail, getSongDownload } from "@/api/song";
import SmallSongData from "@/components/DataList/SmallSongData.vue";

const user = userStore();

// 歌曲下载数据
const songId = ref(null);
const songData = ref(null);
const downloadStatus = ref(false);
const downloadModel = ref(false);
const downloadCheck = ref(null);
const downloadLevel = [
  {
    value: "128000",
    label: "标准音质",
  },
  {
    value: "192000",
    label: "较高音质",
  },
  {
    value: "320000",
    label: "极高音质",
  },
  {
    value: "flac",
    label: "无损音质",
  },
  {
    value: "999000",
    label: "Hi-Res",
  },
];

// 歌曲下载
const toSongDownload = (id, br, name) => {
  downloadStatus.value = true;
  getSongDownload(id, br).then((res) => {
    console.log(name, res);
    if (res.data.url) {
      const type = res.data.type.toLowerCase();
      const songName = name ? name : "未知曲目";
      fetch(res.data.url)
        .then((response) => response.blob())
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${songName}.${type}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          closeDownloadModel();
          downloadStatus.value = false;
          $message.success(name + " 下载完成");
        });
    } else {
      downloadStatus.value = false;
      $message.error("下载失败，请尝试其他音质");
    }
  });
};

// 获取歌曲详情
const getMusicDetailData = (id) => {
  getMusicDetail(id).then((res) => {
    if (res.songs[0] && res.privileges[0]) {
      songData.value = {
        album: res.songs[0].al,
        artist: res.songs[0].ar,
        name: res.songs[0].name,
        id: res.songs[0].id,
        br: res.privileges[0].downloadMaxbr,
      };
    } else {
      $message.error("歌曲信息获取失败");
    }
  });
};

// 判断音质是否可以下载
const checkLevel = (val) => {
  if (val !== "flac") {
    const level = Number(val);
    return level <= songData.value?.br ? false : true;
  }
  return false;
};

// 开启歌曲下载
const openDownloadModel = (data) => {
  if (user.userLogin) {
    if (user.userData?.vipType || data?.fee === 0 || data?.pc) {
      songId.value = data.id;
      downloadModel.value = true;
      getMusicDetailData(data.id);
    } else {
      $message.error("请开通黑胶会员后使用该功能");
    }
  } else {
    $message.error("请登录后使用该功能");
  }
};

// 关闭歌曲下载
const closeDownloadModel = () => {
  downloadModel.value = false;
  downloadCheck.value = null;
};

// 暴露方法
defineExpose({
  openDownloadModel,
});
</script>

<style lang="scss" scoped>
.downloadGroup {
  margin-top: 20px;
}
</style>
