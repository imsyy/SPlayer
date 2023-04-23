<template>
  <n-modal
    class="s-modal downloadModel"
    v-model:show="downloadModel"
    preset="card"
    title="歌曲下载"
    :bordered="false"
    :on-after-leave="closeDownloadModel"
  >
    <Transition mode="out-in">
      <div v-if="songData">
        <SmallSongData ref="smallSongDataRef" :songData="songData" notJump />
        <n-alert v-if="songData.pc" class="tip" type="info" :show-icon="false">
          当前为云盘歌曲，下载的文件均为最高音质
        </n-alert>
        <n-radio-group
          class="downloadGroup"
          v-model:value="downloadChoose"
          name="downloadGroup"
        >
          <n-space vertical>
            <n-radio
              v-for="item in downloadLevel"
              :key="item"
              :value="item.value"
              :disabled="item.disabled"
            >
              <div :class="item.disabled ? 'text disabled' : 'text'">
                <n-text class="name">{{ item.label }}</n-text>
                <n-text v-if="item.size" class="size" :depth="3">
                  {{ item.size }}
                </n-text>
                <n-text v-else-if="!item.disabled" class="error" :depth="3">
                  无法获取
                </n-text>
              </div>
            </n-radio>
          </n-space>
        </n-radio-group>
      </div>
      <n-text v-else>正在获取歌曲下载数据</n-text>
    </Transition>
    <template #footer>
      <n-space justify="end">
        <n-button @click="closeDownloadModel"> 取消 </n-button>
        <n-button
          :disabled="!downloadChoose"
          :loading="downloadStatus"
          type="primary"
          @click="
            toSongDownload(
              songId,
              downloadChoose,
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
import { useRouter } from "vue-router";
import { getMusicDetail, getSongDownload } from "@/api/song";
import SmallSongData from "@/components/DataList/SmallSongData.vue";

const user = userStore();
const router = useRouter();

// 歌曲下载数据
const songId = ref(null);
const songData = ref(null);
const downloadStatus = ref(false);
const downloadModel = ref(false);
const downloadChoose = ref(null);
const downloadLevel = ref(null);

// 歌曲下载
const toSongDownload = (id, br, name) => {
  downloadStatus.value = true;
  getSongDownload(id, br)
    .then((res) => {
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
    })
    .catch((err) => {
      closeDownloadModel();
      console.error("下载出现错误：" + err);
      $message.error("下载出现错误，请重试");
    });
};

// 获取歌曲详情
const getMusicDetailData = (id) => {
  getMusicDetail(id)
    .then((res) => {
      if (res.songs[0] && res.privileges[0]) {
        songData.value = {
          album: res.songs[0].al,
          artist: res.songs[0].ar,
          name: res.songs[0].name,
          id: res.songs[0].id,
          pc: res.songs[0]?.pc,
        };
        // 生成音质列表
        generateLists(res);
      } else {
        $message.error("歌曲信息获取失败");
      }
    })
    .catch((err) => {
      closeDownloadModel();
      console.error("歌曲信息获取出现错误：" + err);
      $message.error("歌曲信息获取出现错误，请重试");
    });
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
const openDownloadModel = (data) => {
  if (user.userLogin) {
    if (
      router.currentRoute.value.name === "user-cloud" ||
      user.userData?.vipType ||
      data?.fee === 0 ||
      data?.pc
    ) {
      songId.value = data.id;
      downloadModel.value = true;
      getMusicDetailData(data.id);
    } else {
      $message.error("该歌曲需使用黑胶会员下载");
    }
  } else {
    $message.error("请登录后使用该功能");
  }
};

// 关闭歌曲下载
const closeDownloadModel = () => {
  songId.value = null;
  songData.value = null;
  downloadStatus.value = false;
  downloadModel.value = false;
  downloadChoose.value = null;
};

// 暴露方法
defineExpose({
  openDownloadModel,
});
</script>

<style lang="scss" scoped>
.downloadModel {
  .v-enter-active,
  .v-leave-active {
    transition: opacity 0.3s ease;
  }

  .v-enter-from,
  .v-leave-to {
    opacity: 0;
  }
  .tip {
    margin-top: 20px;
  }
  .downloadGroup {
    margin-top: 20px;
    .text {
      &.disabled {
        span {
          color: var(--n-text-color-disabled);
        }
      }
      .size {
        font-size: 13px;
        &::before {
          content: "-";
          margin: 0 4px;
        }
        &::after {
          content: "Mb";
          margin-left: 4px;
        }
      }
      .error {
        font-size: 13px;
        &::before {
          content: "-";
          transform: translateY(-1.5px);
          display: inline-block;
          margin: 0 4px;
        }
      }
    }
  }
}
</style>
