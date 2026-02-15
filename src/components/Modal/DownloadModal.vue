<template>
  <div class="download-modal">
    <!-- 加载状态 -->
    <n-collapse-transition :show="loading">
      <n-text class="loading"> 正在加载歌曲信息... </n-text>
    </n-collapse-transition>
    <!-- 内容 -->
    <n-collapse-transition :show="!loading && songs.length > 0">
      <n-flex :size="20" vertical>
        <n-alert title="请知悉" type="info">
          {{
            isCloudSong && !isBatch
              ? "当前为云盘歌曲，下载的文件均为上传时的源文件"
              : "本软件仅支持从官方途径合法合规的下载歌曲，并用于学习研究用途。本功能将严格按照相应账户的权限来提供基础的下载功能"
          }}
        </n-alert>
        <!-- 歌曲信息卡片（单个下载时显示） -->
        <SongDataCard v-if="!isBatch && songs[0]" :data="songs[0]" />
      </n-flex>
      <n-collapse
        :default-expanded-names="['level', 'path']"
        arrow-placement="right"
        style="margin-top: 20px"
      >
        <n-collapse-item title="音质选择" name="level">
          <n-radio-group v-model:value="selectedQuality" name="quality">
            <n-flex>
              <n-radio v-for="(item, index) in qualityOptions" :key="index" :value="item.value">
                <n-flex>
                  <n-text class="name">{{ item.label }}</n-text>
                  <n-text v-if="item.size" depth="3">{{ formatFileSize(item.size) }}</n-text>
                </n-flex>
              </n-radio>
            </n-flex>
          </n-radio-group>
          <n-text depth="3" style="font-size: 12px; margin-top: 10px; display: block">
            注意：如果歌曲没有对应的音质，将自动下载最高可用音质
          </n-text>
        </n-collapse-item>
        <n-collapse-item v-if="isElectron" title="下载路径" name="path">
          <n-input-group>
            <n-input :value="downloadPath || '未配置下载目录'" disabled>
              <template #prefix>
                <SvgIcon name="Folder" />
              </template>
            </n-input>
            <n-button type="primary" strong secondary @click="openSetting('local')">
              <template #icon>
                <SvgIcon name="Settings" />
              </template>
              下载设置
            </n-button>
          </n-input-group>
        </n-collapse-item>
      </n-collapse>
      <template v-if="isBatch">
        <n-text depth="3" style="font-size: 12px; margin-top: 12px; display: block">
          已选择 {{ songs.length }} 首歌曲，将添加到下载队列
        </n-text>
      </template>
      <!-- 按钮 -->
      <n-flex class="menu" justify="end" style="margin-top: 20px">
        <n-button strong secondary @click="cancel"> 取消 </n-button>
        <n-button type="primary" :disabled="!canDownload" @click="handleConfirm">
          添加下载
        </n-button>
      </n-flex>
    </n-collapse-transition>
  </div>
</template>

<script setup lang="ts">
import type { SongType, SongLevelType } from "@/types/main";
import { useSettingStore } from "@/stores";
import { songLevelData, getSongLevelsData, AI_AUDIO_LEVELS } from "@/utils/meta";
import { formatFileSize } from "@/utils/helper";
import { openSetting } from "@/utils/modal";
import { isElectron } from "@/utils/env";
import { songDetail } from "@/api/song";
import { formatSongsList } from "@/utils/format";
import { pick } from "lodash-es";
import { useDownloadManager } from "@/core/resource/DownloadManager";

const props = defineProps<{
  songs?: SongType[];
  songId?: number;
  quality?: SongLevelType;
}>();

const emit = defineEmits<{
  close: [];
}>();

const settingStore = useSettingStore();
const downloadManager = useDownloadManager();
const loading = ref<boolean>(false);
const songs = ref<SongType[]>(props.songs || []);

const isBatch = computed(() => songs.value.length > 1);
const isCloudSong = computed(() => songs.value.some((song) => song.pc));

const selectedQuality = ref<SongLevelType>(props.quality || settingStore.downloadSongLevel || "h");
const downloadPath = computed(() => settingStore.downloadPath);

// 是否可以下载（需要配置下载目录）
const canDownload = computed(() => {
  if (!isElectron) return true;
  return !!downloadPath.value;
});

// 音质选项
const qualityOptions = computed(() => {
  const levels = pick(songLevelData, ["l", "m", "h", "sq", "hr", "je", "sk", "db", "jm"]);
  let allData = getSongLevelsData(levels);

  if (settingStore.disableAiAudio) {
    allData = allData.filter((item) => {
      if (item.level === "dolby") return true;
      return !AI_AUDIO_LEVELS.includes(item.level);
    });
  }

  return allData.map((item) => ({
    label: item.name,
    value: item.value,
    size: undefined,
  }));
});

// 获取歌曲详情（单个下载时）
const getSongDetail = async () => {
  if (!props.songId) return;
  loading.value = true;
  try {
    const result = await songDetail(props.songId);
    songs.value = formatSongsList(result.songs);
  } catch (error) {
    console.error("获取歌曲详情失败:", error);
    window.$message.error("获取歌曲详情失败");
  } finally {
    loading.value = false;
  }
};

// 确认下载
const handleConfirm = () => {
  if (!canDownload.value) {
    window.$message.warning("请先配置下载目录");
    return;
  }

  if (songs.value.length === 0) {
    window.$message.warning("没有可下载的歌曲");
    return;
  }

  // 添加到下载队列
  songs.value.forEach((song) => {
    downloadManager.addDownload(song, selectedQuality.value);
  });

  emit("close");
  window.$message.success(
    isBatch.value ? `已添加 ${songs.value.length} 首歌曲到下载队列` : "已添加到下载队列",
  );
};

// 取消
const cancel = () => {
  emit("close");
};

// 初始化
onMounted(() => {
  if (props.songId) {
    getSongDetail();
  }
});
</script>

<style lang="scss" scoped>
.download-modal {
  .loading {
    display: block;
    text-align: center;
    padding: 40px 0;
  }
  .menu {
    margin-top: 20px;
  }
}
</style>
