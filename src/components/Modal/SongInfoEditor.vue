<template>
  <div class="song-info-editor">
    <n-tabs type="segment" animated>
      <n-tab-pane name="info" tab="信息" display-directive="show">
        <!-- 在线匹配 -->
        <n-flex class="match" justify="space-between" align="center">
          <n-text>不想手动填写标签？</n-text>
          <n-button type="primary" strong secondary @click="onlineMatch">
            <template #icon>
              <SvgIcon name="AutoFix" />
            </template>
            自动匹配标签
          </n-button>
        </n-flex>
        <n-scrollbar class="scrollbar">
          <n-form ref="infoFormRef" :model="infoFormData" :rules="infoFormRules" class="phone-form">
            <n-form-item label="文件名" path="fileName">
              <n-input v-model:value="infoFormData.fileName" disabled />
            </n-form-item>
            <n-form-item label="歌曲名" path="name">
              <n-input v-model:value="infoFormData.name" placeholder="请输入歌曲名" clearable />
            </n-form-item>
            <n-form-item label="歌手" path="artist">
              <n-input v-model:value="infoFormData.artist" placeholder="请输入歌手名" clearable />
            </n-form-item>
            <n-form-item label="专辑" path="album">
              <n-input v-model:value="infoFormData.album" placeholder="请输入专辑名" clearable />
            </n-form-item>
            <n-form-item label="别名" path="alia">
              <n-input v-model:value="infoFormData.alia" placeholder="请输入别名" clearable />
            </n-form-item>
            <n-form-item label="歌词" path="lyric">
              <n-input
                v-model:value="infoFormData.lyric"
                :autosize="{ minRows: 3, maxRows: 6 }"
                placeholder="请输入歌词"
                type="textarea"
              />
            </n-form-item>
            <n-grid :cols="24" :x-gap="24">
              <n-form-item-gi :span="12" label="类型" path="type">
                <n-input v-model:value="infoFormData.type" disabled />
              </n-form-item-gi>
              <n-form-item-gi :span="12" label="码率" path="br">
                <n-input-number
                  v-model:value="infoFormData.br"
                  :show-button="false"
                  style="width: 100%"
                  disabled
                >
                  <template #suffix>
                    <n-text depth="3">kbps</n-text>
                  </template>
                </n-input-number>
              </n-form-item-gi>
              <n-form-item-gi :span="12" label="时长" path="duration">
                <n-input-number
                  v-model:value="infoFormData.duration"
                  :show-button="false"
                  style="width: 100%"
                  disabled
                >
                  <template #suffix>
                    <n-text depth="3">s</n-text>
                  </template>
                </n-input-number>
              </n-form-item-gi>
              <n-form-item-gi :span="12" label="频率" path="br">
                <n-input-number
                  v-model:value="infoFormData.frequency"
                  :show-button="false"
                  style="width: 100%"
                  disabled
                >
                  <template #suffix>
                    <n-text depth="3">Hz</n-text>
                  </template>
                </n-input-number>
              </n-form-item-gi>
              <n-form-item-gi :span="12" label="路径" path="path">
                <n-input-group>
                  <n-input :value="song.path" disabled />
                  <n-button type="primary" ghost @click="copyData(song.path)">
                    <template #icon>
                      <SvgIcon name="Copy" />
                    </template>
                  </n-button>
                </n-input-group>
              </n-form-item-gi>
              <n-form-item-gi :span="12" label="MD5" path="md5">
                <n-input-group>
                  <n-input :value="infoFormData.md5" disabled />
                  <n-button type="primary" ghost @click="copyData(infoFormData.md5)">
                    <template #icon>
                      <SvgIcon name="Copy" />
                    </template>
                  </n-button>
                </n-input-group>
              </n-form-item-gi>
            </n-grid>
          </n-form>
        </n-scrollbar>
      </n-tab-pane>
      <n-tab-pane name="cover" tab="封面" display-directive="show">
        <n-image
          :src="coverData"
          :preview-disabled="true"
          width="300"
          height="300"
          class="cover"
          @click="changeCover"
        />
        <n-flex class="menu" justify="center">
          <n-text depth="3">点击封面以更换</n-text>
        </n-flex>
      </n-tab-pane>
    </n-tabs>
    <n-flex class="menu" justify="center">
      <n-button class="btn" strong secondary @click="emit('close')">取消</n-button>
      <n-button class="btn" type="primary" @click="saveSongInfo(song)">保存修改</n-button>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import type { FormInst, FormRules } from "naive-ui";
import type { ICommonTagsResult, IFormat } from "music-metadata";
import { useMusicStore, useDataStore } from "@/stores";
import { textRule } from "@/utils/rules";
import { copyData } from "@/utils/helper";
import { matchSong, songLyric } from "@/api/song";
import { debounce, isArray, isEmpty, isObject } from "lodash-es";
import blob from "@/utils/blob";
import { formatSongsList } from "@/utils/format";

const props = defineProps<{
  song: SongType;
}>();

const emit = defineEmits<{
  close: [];
}>();

// 表单类型
interface InfoFormType {
  name: string;
  fileName: string;
  artist: string;
  album: string;
  alia?: string;
  lyric?: string;
  size?: number;
  cover?: string | null;
  // 时长
  duration?: number;
  // 类型
  type?: string;
  // 码率
  br?: number;
  // 频率
  frequency?: number;
  // 位置
  path?: string;
  // md5
  md5?: string;
}

const dataStore = useDataStore();
const musicStore = useMusicStore();

// 本地歌曲总线
const localEventBus = useEventBus("local");

// 表单数据
const infoFormRef = ref<FormInst | null>(null);
const infoFormData = ref<InfoFormType>({ name: "", fileName: "", artist: "", album: "" });
const infoFormRules: FormRules = { name: textRule, artist: textRule, album: textRule };

// 封面数据
const coverData = ref<string>("/images/song.jpg?assest");

// 获取音乐元信息
const getSongInfo = async () => {
  if (!props.song || !props.song.path) return;
  const path = props.song.path;
  const infoData: {
    fileName: string;
    fileSize: number;
    common: ICommonTagsResult;
    format: IFormat;
    md5: string;
  } = await window.electron.ipcRenderer.invoke("get-music-metadata", path);
  // console.log(infoData);
  // 解构数据
  const { fileName, fileSize, common, format, md5 } = infoData;
  // 更新数据
  infoFormData.value = {
    fileName,
    name: common.title || "",
    artist: common.artist || "",
    album: common.album || "",
    alia: common.comment?.[0] || "",
    lyric: common.lyrics?.[0] || "",
    type: format.codec,
    duration: format.duration ? Number(format.duration.toFixed(2)) : 0,
    size: fileSize,
    br: format.bitrate ? Math.floor(format.bitrate / 1000 || 0) : 0,
    frequency: format.sampleRate,
    md5,
  };
  // 获取封面
  const coverBuff = common.picture?.[0]?.data || "";
  const coverType = common.picture?.[0]?.format || "";
  if (coverBuff) coverData.value = blob.createBlobURL(coverBuff, coverType, path);
};

// 在线匹配
const onlineMatch = debounce(
  async () => {
    try {
      if (!props.song || !infoFormData.value.md5) return;
      const { result } = await matchSong(
        infoFormData.value.name || "",
        infoFormData.value.artist || "",
        infoFormData.value.album || "",
        infoFormData.value.duration || 0,
        infoFormData.value.md5,
      );
      const song = result.songs?.[0];
      if (isEmpty(song)) {
        window.$message.error("无法匹配，请修改信息后重试");
        return;
      } else {
        const songData = formatSongsList([song])[0];
        // console.log(songData);
        // 更新数据
        infoFormData.value = {
          ...infoFormData.value,
          name: songData.name,
          artist: isArray(songData.artists)
            ? songData.artists.map((ar: { name: string }) => ar.name).join(" / ")
            : songData.artists,
          album: isObject(songData.album) ? songData.album.name : songData.album,
          alia: songData.alia,
        };
        // 获取歌词
        const result = await songLyric(songData.id);
        infoFormData.value.lyric = result.lrc.lyric;
        window.$message.success("匹配成功");
      }
    } catch (error) {
      console.error("Error online matching:", error);
      window.$message.error("匹配出错，请重试");
    }
  },
  300,
  { leading: true, trailing: false },
);

// 修改封面
const changeCover = async () => {
  const newPath = await window.electron.ipcRenderer.invoke("choose-image");
  if (!newPath) return;
  coverData.value = newPath;
};

// 实时修改列表
const updatePlaySong = (metadata: InfoFormType) => {
  // 更新数据
  const updatedSong = {
    name: metadata.name,
    artists: metadata.artist,
    album: metadata.album,
    alia: metadata.alia,
    cover: coverData.value || "",
  };
  // 是否为当前播放
  if (musicStore.playSong?.id === props.song.id) {
    musicStore.playSong = { ...musicStore.playSong, ...updatedSong };
  }
  // 更改播放列表
  const index = dataStore.playList.findIndex((song) => song.id === props.song.id);
  if (index !== -1) {
    dataStore.playList[index] = { ...dataStore.playList[index], ...updatedSong };
  }
  // 更新列表
  localEventBus.emit();
};

// 保存修改
const saveSongInfo = debounce(async (song: SongType) => {
  try {
    if (!infoFormRef.value) return;
    // 校验表单
    await infoFormRef.value?.validate();
    // 保存修改
    const metadata = {
      ...infoFormData.value,
      cover:
        coverData.value.startsWith("blob:") || coverData.value === "/images/song.jpg?assest"
          ? null
          : coverData.value,
    };
    console.log(song.path, metadata);
    await window.electron.ipcRenderer.invoke("set-music-metadata", song.path, metadata);
    window.$message.success("歌曲信息修改成功");
    // 修改音乐信息
    updatePlaySong(metadata);
    emit("close");
  } catch (error) {
    console.error("Error saving song info:", error);
    window.$message.error("歌曲信息修改失败，请重试");
  }
}, 300);

onMounted(getSongInfo);
</script>

<style lang="scss" scoped>
.song-info-editor {
  :deep(.scrollbar) {
    max-height: 60vh;
  }
  .cover {
    display: flex;
    justify-content: center;
    border-radius: 16px;
    margin: 20px auto 0;
    cursor: pointer;
  }
  .match {
    margin-bottom: 12px;
    border: 1px solid rgba(var(--primary), 0.26);
    border-radius: 8px;
    padding: 12px 16px;
    background-color: rgba(var(--primary), 0.08);
  }
  .menu {
    width: 100%;
    margin-top: 20px;
  }
}
</style>
