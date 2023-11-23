<!-- 云盘上传歌曲 -->
<template>
  <!-- 上传选择框 -->
  <input
    v-show="false"
    ref="fileChooseRef"
    type="file"
    accept="audio/*"
    multiple
    @change="fileListChange"
  />
  <!-- 打开上传进度 -->
  <Transition name="fade" mode="out-in">
    <div v-if="fileChooseData?.length" class="open-list" @click="upSongModalShow = true">
      <n-popover trigger="hover" placement="right">
        <template #trigger>
          <n-button size="large" round strong secondary>
            <template #icon>
              <n-icon>
                <SvgIcon icon="cloud-clock" />
              </n-icon>
            </template>
          </n-button>
        </template>
        <n-text>上传列表</n-text>
      </n-popover>
    </div>
  </Transition>
  <!-- 上传进度列表 -->
  <n-modal
    v-model:show="upSongModalShow"
    :auto-focus="false"
    :mask-closable="false"
    :bordered="false"
    :close-on-esc="false"
    class="up-song"
    title="上传歌曲"
    preset="card"
    transform-origin="center"
  >
    <n-list class="up-songs-list" hoverable clickable>
      <n-list-item v-for="(item, index) in fileChooseData" :key="index" class="song">
        <template #prefix>
          <n-icon size="20">
            <SvgIcon icon="music-note" />
          </n-icon>
        </template>
        <template #suffix>
          <Transition name="fade" mode="out-in">
            <n-button v-if="item.status === 'error'" quaternary @click="upSong([item])">
              <template #icon>
                <n-icon size="20">
                  <SvgIcon icon="refresh" />
                </n-icon>
              </template>
            </n-button>
          </Transition>
        </template>
        <n-thing :title="item.name">
          <template #description>
            <n-text depth="3" class="size">{{ item.size }}MB</n-text>
          </template>
          <!-- 上传进度 -->
          <div class="progress">
            <Transition name="fade" mode="out-in">
              <n-text v-if="item.status === 'wait'" depth="3">等待上传</n-text>
              <n-progress
                v-else-if="typeof item.status === 'number' && item.status !== 100"
                :percentage="item.status"
                :indicator-placement="'inside'"
                type="line"
                processing
              />
              <n-text v-else-if="item.status === 100" type="info" depth="3">
                正在校验及转码
              </n-text>
              <n-text v-else :type="item.status" depth="3">
                {{ item.status === "success" ? "上传成功" : "上传失败" }}
              </n-text>
            </Transition>
          </div>
        </n-thing>
      </n-list-item>
    </n-list>
  </n-modal>
</template>

<script setup>
import { upCloudSong } from "@/api/cloud";

// 弹窗数据
const upSongModalShow = ref(false);

// 上传数据
const fileChooseRef = ref(null);
const fileChooseData = ref([]);

// 发射事件
const emit = defineEmits(["getUserCloudData"]);

// 开启上传选择框
const openUpSongModal = () => {
  fileChooseRef.value.click();
};

// 文件列表改变
const fileListChange = (fileList) => {
  if (!fileList) return false;
  // 文件列表
  let listData = Array.from(fileList.target.files);
  console.log(listData);
  // 数量限制
  if (listData.length > 5) {
    listData = listData.slice(0, 5);
    $message.warning("最多只能同时上传 5 首歌曲");
  }
  fileChooseData.value = [];
  upSongModalShow.value = true;
  // 遍历选择的文件
  listData.map((v) => {
    fileChooseData.value.push({
      file: v,
      name: v.name,
      path: v.path,
      size: (v.size / (1024 * 1024)).toFixed(2),
      status: "wait",
    });
  });
  // 触发上传
  upSong(fileChooseData.value);
  // 清除选择
  fileChooseRef.value.value = null;
};

// 上传歌曲
const upSong = async (data) => {
  try {
    if (!data) return false;
    // 更改进度条
    const onUploadProgress = (progress, song) => {
      const { loaded, total } = progress;
      const completed = Math.round((loaded * 100) / total);
      console.log(completed, song);
      song.status = Number(completed);
    };
    // 成功个数
    let successCount = 0;
    // 逐项上传
    for (const song of data) {
      if (song && song.file) {
        console.log("请求上传：", song.file);
        const result = await upCloudSong(song.file, (progress) => onUploadProgress(progress, song));
        console.log(result);
        // 更改状态
        if (result.code === 200) successCount++;
        song.status = result.code === 200 ? "success" : "error";
      }
    }
    console.log("所有上传请求已完成", data.length, successCount);
    if (successCount === 0) {
      $message.error("全部歌曲上传失败");
    } else if (successCount < data.length) {
      $message.warning("歌曲上传已完成，部分歌曲上传失败");
    } else {
      $message.success("全部歌曲上传已完成");
    }
    // 更新列表
    if (successCount !== 0) emit("getUserCloudData", true);
  } catch (error) {
    console.error("上传歌曲出现错误:", error);
    $message.error("上传歌曲出现错误，请重试");
  }
};

defineExpose({
  openUpSongModal,
});
</script>

<style lang="scss" scoped>
.up-songs-list {
  :deep(.song) {
    border-radius: 8px;
    .size {
      font-size: 13px;
    }
    .progress {
      height: 28px;
      display: flex;
      flex-direction: row;
      align-items: center;
      .n-progress {
        --n-fill-color: var(--main-color);
      }
    }
    .n-thing-main__content {
      margin-top: 0;
    }
  }
}
</style>
