<template>
  <div class="download-song">
    <n-collapse-transition :show="!songData">
      <n-text class="loading"> 正在加载歌曲信息... </n-text>
    </n-collapse-transition>
    <n-collapse-transition :show="!!songData">
      <n-alert
        :type="isCloudSong ? 'info' : 'warning'"
        :title="isCloudSong ? undefined : '请知悉'"
        closable
      >
        {{
          isCloudSong
            ? "当前为云盘歌曲，下载的文件均为上传时的源文件"
            : "本软件仅支持从官方途径合法合规的下载歌曲，并用于学习研究用途。本功能将严格按照相应账户的权限来提供基础的下载功能"
        }}
      </n-alert>
      <SongDataCard :data="songData" />
      <n-collapse :default-expanded-names="['path']" arrow-placement="right">
        <n-collapse-item title="音质选择" name="level">
          <!-- 音质选择 -->
          <n-radio-group v-model:value="songLevelChoosed" name="level">
            <n-flex>
              <n-radio v-for="(item, index) in songLevelRadioData" :key="index" :value="item.value">
                <n-flex>
                  <n-text class="name">{{ item.name }}</n-text>
                  <!-- 文件预估大小 -->
                  <n-text depth="3">{{ formatFileSize(item.size || 0) }}</n-text>
                </n-flex>
              </n-radio>
            </n-flex>
          </n-radio-group>
        </n-collapse-item>
        <n-collapse-item v-if="isElectron" title="下载路径" name="path">
          <n-input-group>
            <n-input :value="downloadPath || '未配置下载目录'" disabled>
              <template #prefix>
                <SvgIcon name="Folder" />
              </template>
            </n-input>
            <n-button type="primary" strong secondary @click="changeDownloadPath">
              <template #icon>
                <SvgIcon name="Folder" />
              </template>
            </n-button>
            <n-button type="primary" strong secondary @click="openSetting('local')">
              <template #icon>
                <SvgIcon name="Settings" />
              </template>
              更多设置
            </n-button>
          </n-input-group>
        </n-collapse-item>
      </n-collapse>
    </n-collapse-transition>
    <n-flex class="menu" justify="end">
      <n-button strong secondary @click="emit('close')"> 取消 </n-button>
      <n-button :loading="loading" type="primary" @click="download"> 下载歌曲 </n-button>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import type { SongLevelType, SongLevelDataType, SongType } from "@/types/main";
import { songDetail, songQuality, songDownloadUrl, songLyric } from "@/api/song";
import { useSettingStore } from "@/stores";
import { songLevelData, getLevelsUpTo } from "@/utils/meta";
import { formatSongsList } from "@/utils/format";
import { cloneDeep, reduce } from "lodash-es";
import { formatFileSize, isElectron } from "@/utils/helper";
import { openSetting } from "@/utils/modal";
import { saveAs } from "file-saver";
import player from "@/utils/player";

const props = defineProps<{ id: number }>();
const emit = defineEmits<{ close: [] }>();

const settingStore = useSettingStore();

// 歌曲数据
const songData = ref<SongType | null>(null);

// 下载数据
const loading = ref<boolean>(false);
const downloadPath = ref<string>(settingStore.downloadPath);
const songLevelChoosed = ref<SongLevelType>("h");
const songLevelRadioData = ref<SongLevelDataType[]>([]);

// 是否为云盘歌曲
const isCloudSong = computed(() => songData.value && songData.value?.pc);

// 获取歌曲详情
const getSongDetail = async (): Promise<any> => {
  if (!props.id) return;
  const result = await songDetail(props.id);
  songData.value = formatSongsList(result.songs)[0];
  // 获取音质信息
  const quality = await songQuality(props.id);
  console.log(quality);
  // 获取下载信息
  const level = getLevelsUpTo(result?.privileges?.[0]?.downloadMaxBrLevel);
  if (!level) return window.$message.error("获取下载信息失败，请重试");
  songLevelRadioData.value = getSongLevelsData(level, quality?.data);
};

// 获取音质列表
const getSongLevelsData = (
  level: Partial<typeof songLevelData>,
  quality: Record<string, any>,
): SongLevelDataType[] => {
  if (!level || !quality) return [];
  return reduce(
    level,
    (result, value, key) => {
      if (quality[key] && value) {
        result.push({
          name: value.name,
          level: value.level,
          value: key as SongLevelType,
          br: quality[key]?.br,
          size: quality[key]?.size,
        });
      }
      return result;
    },
    [] as SongLevelDataType[],
  );
};

// 更改下载路径
const changeDownloadPath = async () => {
  const path = await window.electron.ipcRenderer.invoke("choose-path");
  if (path) downloadPath.value = path;
};

// 下载歌曲
const download = async () => {
  if (!songData.value) return;
  loading.value = true;
  downloadPath.value = settingStore.downloadPath;
  try {
    // 获取下载链接
    const result = await songDownloadUrl(props.id, songLevelChoosed.value);
    if (result.code !== 200 || !result?.data?.url) {
      window.$message.error(result.message || "获取下载链接失败，请重试");
      return;
    }
    // 校验下载路径
    if (downloadPath.value === "" && isElectron) {
      window.$notification.warning({
        title: "缺少配置",
        description: "请前往设置页配置默认下载目录",
        duration: 5000,
      });
      return;
    }
    // 下载相关数据
    const { url, type = "mp3" } = result.data;
    const songName = player.getPlayerInfo(songData.value) || "未知曲目";
    // 区分设备下载
    if (isElectron) {
      await electronDownload(url, songName, type.toLowerCase());
    } else {
      saveAs(result.data.url, `${songName}.${result.data?.type || "mp3"}`);
    }
    emit("close");
    window.$message.success("歌曲下载成功");
  } catch (error) {
    console.error("Error downloading song:", error);
    window.$message.error("下载歌曲出现错误，请重试");
  } finally {
    loading.value = false;
  }
};

// 客户端下载
const electronDownload = async (url: string, songName: string, fileType: string) => {
  const { downloadMeta, downloadCover, downloadLyric, saveMetaFile } = settingStore;
  // 获取歌词
  let lyric = "";
  if (downloadLyric) {
    const lyricResult = await songLyric(props.id);
    lyric = lyricResult?.lrc?.lyric || "";
  }
  // 下载歌曲
  const config = {
    fileName: songName,
    fileType,
    path: downloadPath.value,
    downloadMeta,
    downloadCover,
    downloadLyric,
    saveMetaFile,
    songData: cloneDeep(songData.value),
    lyric,
  };
  // 开始下载
  const isSuccess = await window.electron.ipcRenderer.invoke("download-file", url, config);
  if (!isSuccess) throw new Error("下载歌曲出现错误，请重试");
};

onMounted(() => getSongDetail());
</script>

<style lang="scss" scoped>
.download-song {
  .n-alert {
    margin-bottom: 20px;
  }
  .n-collapse {
    margin-top: 20px;
  }
  .menu {
    margin-top: 20px;
  }
}
</style>
