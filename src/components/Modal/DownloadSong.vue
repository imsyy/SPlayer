<!-- 歌曲下载 -->
<template>
  <n-modal
    v-model:show="downloadSongShow"
    :bordered="false"
    :close-on-esc="false"
    :auto-focus="false"
    :mask-closable="!downloadStatus"
    :on-after-leave="closeDownloadModal"
    class="download-song"
    preset="card"
    title="歌曲下载"
  >
    <Transition name="fade" mode="out-in">
      <div v-if="songData">
        <n-alert v-if="songData.pc" :show-icon="false" class="tip">
          当前为云盘歌曲，下载的文件均为最高音质
        </n-alert>
        <n-radio-group v-model:value="downloadChoose" class="download-group" name="downloadGroup">
          <n-flex vertical>
            <n-radio
              v-for="item in downloadLevel"
              :key="item"
              :value="item.value"
              :disabled="item.disabled"
            >
              <div class="song-data">
                <n-text class="name" :depth="item.disabled ? 3 : 0">{{ item.label }}</n-text>
                <n-text v-if="item.size" depth="3" class="size"> {{ item.size }} MB </n-text>
                <n-text v-else-if="!item.disabled" depth="3" class="size">
                  文件大小获取失败
                </n-text>
              </div>
            </n-radio>
          </n-flex>
        </n-radio-group>
      </div>
      <n-text v-else>歌曲信息获取中</n-text>
    </Transition>
    <template #footer>
      <n-flex justify="end">
        <n-button @click="closeDownloadModal"> 关闭 </n-button>
        <n-button
          :disabled="!downloadChoose"
          :loading="downloadStatus"
          type="primary"
          @click="toSongDownload(songData, downloadChoose)"
        >
          下载
        </n-button>
      </n-flex>
    </template>
  </n-modal>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { isLogin } from "@/utils/auth";
import { useRouter } from "vue-router";
import { siteData, siteSettings } from "@/stores";
import { getSongDetail, getSongDownload } from "@/api/song";
import { downloadFile, checkPlatform } from "@/utils/helper";
import formatData from "@/utils/formatData";

const router = useRouter();
const data = siteData();
const settings = siteSettings();
const { userData } = storeToRefs(data);
const { downloadPath } = storeToRefs(settings);

// 歌曲下载数据
const songId = ref(null);
const songData = ref(null);
const downloadStatus = ref(false);
const downloadSongShow = ref(false);
const downloadChoose = ref(null);
const downloadLevel = ref(null);

// 获取歌曲详情
const getMusicDetailData = async (id) => {
  try {
    const result = await getSongDetail(id);
    // 获取歌曲详情
    songData.value = formatData(result?.songs?.[0], "song")[0];
    // 生成音质列表
    generateLists(result);
  } catch (error) {
    closeDownloadModal();
    console.error("歌曲信息获取失败：", error);
  }
};

// 歌曲下载
const toSongDownload = async (song, br) => {
  console.log(song, br);
  downloadStatus.value = true;
  // 获取下载数据
  const result = await getSongDownload(song?.id, br);
  // 开始下载
  if (!downloadPath.value && checkPlatform.electron()) {
    $notification["warning"]({
      content: "缺少配置",
      meta: "请前往设置页配置默认下载目录",
      duration: 3000,
    });
  }
  const isDownloaded = await downloadFile(result.data, song, downloadPath.value);
  if (isDownloaded) {
    $message.success("下载完成");
    closeDownloadModal();
  } else {
    downloadStatus.value = false;
    $message.error("下载失败，请重试");
  }
};

// 生成可下载列表
const generateLists = (data) => {
  const br = data.privileges[0].downloadMaxbr;
  downloadLevel.value = [
    {
      value: "128000",
      label: "标准音质",
      disabled: br >= 128000 ? false : true,
      size: getSongSize(data, "l"),
    },
    {
      value: "192000",
      label: "较高音质",
      disabled: br >= 192000 ? false : true,
      size: getSongSize(data, "m"),
    },
    {
      value: "320000",
      label: "极高音质",
      disabled: br >= 320000 ? false : true,
      size: getSongSize(data, "h"),
    },
    {
      value: "420000",
      label: "无损音质",
      disabled: [128000, 192000, 320000].includes(parseInt(br)),
      size: getSongSize(data, "sq"),
    },
    {
      value: "999000",
      label: "Hi-Res",
      disabled: br >= 999000 ? false : true,
      size: getSongSize(data, "hr"),
    },
  ];
  console.log(downloadLevel.value);
};

// 获取下载大小
const getSongSize = (data, type) => {
  let fileSize = 0;
  // 转换文件大小
  const convertSize = (num) => {
    if (!num) return 0;
    return (num / (1024 * 1024)).toFixed(2);
  };
  if (type === "l") {
    fileSize = convertSize(data.songs[0]?.l?.size);
  } else if (type === "m") {
    fileSize = convertSize(data.songs[0]?.m?.size);
  } else if (type === "h") {
    fileSize = convertSize(data.songs[0]?.h?.size);
  } else if (type === "sq") {
    fileSize = convertSize(data.songs[0]?.sq?.size);
  } else if (type === "hr") {
    fileSize = convertSize(data.songs[0]?.hr?.size);
  }
  return fileSize;
};

// 开启歌曲下载
const openDownloadModal = (data) => {
  console.log(data);
  // 执行下载
  const toDownload = () => {
    songId.value = data.id.toString();
    downloadSongShow.value = true;
    getMusicDetailData(songId.value);
  };
  if (isLogin()) {
    // 普通歌曲或为云盘歌曲
    if (
      router.currentRoute.value.name === "cloud" ||
      data?.fee === 0 ||
      data?.pc ||
      userData.value.detail?.profile?.vipType !== 0
    ) {
      return toDownload();
    }
    // 权限不足
    if (data?.fee !== 0 && userData.value.detail?.profile?.vipType !== 11 && !data?.pc) {
      return $message.warning("账号会员等级不足，请提升权限");
    }
    $message.warning("账号会员等级不足，请提升权限");
  } else {
    $message.warning("请登录后使用");
  }
};

// 关闭歌曲下载
const closeDownloadModal = () => {
  songId.value = null;
  songData.value = null;
  downloadStatus.value = false;
  downloadSongShow.value = false;
  downloadChoose.value = null;
};

// 暴露方法
defineExpose({
  openDownloadModal,
});
</script>

<style lang="scss" scoped>
.download-song {
  .tip {
    border-radius: 8px;
    margin-bottom: 20px;
  }
  .download-group {
    .song-data {
      .size {
        font-size: 13px;
      }
    }
  }
}
</style>
