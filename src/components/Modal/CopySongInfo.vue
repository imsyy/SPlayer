<template>
  <div class="copy-song-info">
    <n-spin :show="loading" description="获取歌曲详情中">
      <n-scrollbar style="max-height: 70vh">
        <n-form :size="'small'" ref="formRef">
          <n-form-item label="歌曲名称">
            <n-input-group>
              <n-input :value="songInfo?.name" readonly placeholder="暂无歌曲名称" />
              <n-button
                type="primary"
                strong
                secondary
                @click="copyText(songInfo?.name, '歌曲名称')"
              >
                <template #icon>
                  <SvgIcon name="Copy" />
                </template>
              </n-button>
            </n-input-group>
          </n-form-item>
          <n-form-item label="别名" v-if="songInfo?.alia">
            <n-input-group>
              <n-input :value="songInfo?.alia" readonly placeholder="暂无别名" />
              <n-button type="primary" strong secondary @click="copyText(songInfo?.alia, '别名')">
                <template #icon>
                  <SvgIcon name="Copy" />
                </template>
              </n-button>
            </n-input-group>
          </n-form-item>
          <n-divider class="divider"> 制作人员 </n-divider>
          <template v-for="(artist, index) in artistsList" :key="index">
            <n-grid :cols="24" :x-gap="12">
              <n-form-item-gi
                :span="14"
                :label="artistsList.length > 1 ? `歌手 ${index + 1}` : '歌手'"
              >
                <n-input-group>
                  <n-input :value="artist.name" readonly />
                  <n-button
                    type="primary"
                    strong
                    secondary
                    @click="copyText(artist.name, '歌手名称')"
                  >
                    <template #icon>
                      <SvgIcon name="Copy" />
                    </template>
                  </n-button>
                </n-input-group>
              </n-form-item-gi>
              <n-form-item-gi :span="10" label="ID" v-if="artist.id">
                <n-input-group>
                  <n-input :value="String(artist.id)" readonly />
                  <n-button
                    type="primary"
                    strong
                    secondary
                    @click="copyText(String(artist.id), '歌手ID')"
                  >
                    <template #icon>
                      <SvgIcon name="Copy" />
                    </template>
                  </n-button>
                </n-input-group>
              </n-form-item-gi>
            </n-grid>
          </template>
          <n-grid :cols="24" :x-gap="12" v-if="albumData">
            <n-form-item-gi :span="14" label="专辑">
              <n-input-group>
                <n-input :value="albumData.name" readonly placeholder="暂无专辑信息" />
                <n-button
                  type="primary"
                  strong
                  secondary
                  @click="copyText(albumData.name, '专辑名称')"
                >
                  <template #icon>
                    <SvgIcon name="Copy" />
                  </template>
                </n-button>
              </n-input-group>
            </n-form-item-gi>
            <n-form-item-gi :span="10" label="ID" v-if="albumData.id">
              <n-input-group>
                <n-input :value="String(albumData.id)" readonly />
                <n-button
                  type="primary"
                  strong
                  secondary
                  @click="copyText(String(albumData.id), '专辑ID')"
                >
                  <template #icon>
                    <SvgIcon name="Copy" />
                  </template>
                </n-button>
              </n-input-group>
            </n-form-item-gi>
          </n-grid>
          <n-divider class="divider"> 歌曲信息 </n-divider>
          <n-grid :cols="24" :x-gap="12">
            <n-form-item-gi :span="12" label="歌曲 ID">
              <n-input-group>
                <n-input :value="String(songInfo?.id || '')" readonly />
                <n-button
                  type="primary"
                  strong
                  secondary
                  @click="copyText(String(songInfo?.id), '歌曲ID')"
                >
                  <template #icon>
                    <SvgIcon name="Copy" />
                  </template>
                </n-button>
              </n-input-group>
            </n-form-item-gi>
            <n-form-item-gi :span="12" label="时长">
              <n-input-group>
                <n-input :value="duration" readonly />
                <n-button type="primary" strong secondary @click="copyText(duration, '时长')">
                  <template #icon>
                    <SvgIcon name="Copy" />
                  </template>
                </n-button>
              </n-input-group>
            </n-form-item-gi>
          </n-grid>
          <n-grid :cols="24" :x-gap="12">
            <n-form-item-gi :span="24" label="发布时间" v-if="publishTime">
              <n-input-group>
                <n-input :value="publishTime" readonly />
                <n-button
                  type="primary"
                  strong
                  secondary
                  @click="copyText(publishTime, '发布时间')"
                >
                  <template #icon>
                    <SvgIcon name="Copy" />
                  </template>
                </n-button>
              </n-input-group>
            </n-form-item-gi>
          </n-grid>
          <n-form-item label="歌曲链接">
            <n-input-group>
              <n-input :value="songLink" readonly placeholder="暂无链接" />
              <n-button type="primary" strong secondary @click="copyText(songLink, '链接')">
                <template #icon>
                  <SvgIcon name="Copy" />
                </template>
              </n-button>
            </n-input-group>
          </n-form-item>
        </n-form>
      </n-scrollbar>
    </n-spin>
    <n-button block @click="handleCopyAll" :disabled="!songInfo" type="primary" secondary>
      复制全部信息
    </n-button>
  </div>
</template>

<script setup lang="ts">
import type { SongType, MetaData } from "@/types/main";
import { songDetail } from "@/api/song";
import { formatSongsList } from "@/utils/format";
import { copyData, getShareUrl } from "@/utils/helper";
import { msToTime, formatTimestamp } from "@/utils/time";

const props = defineProps<{ songId: number; onClose: () => void }>();

const loading = ref(true);
const songInfo = ref<SongType | null>(null);

const artistsList = computed<MetaData[]>(() => {
  if (!songInfo.value) return [];
  if (Array.isArray(songInfo.value.artists)) return songInfo.value.artists;
  if (typeof songInfo.value.artists === "string") {
    return [{ name: songInfo.value.artists, id: 0 }];
  }
  return [];
});

const albumData = computed<MetaData | null>(() => {
  if (!songInfo.value) return null;
  if (typeof songInfo.value.album === "object") return songInfo.value.album;
  if (typeof songInfo.value.album === "string") {
    return { name: songInfo.value.album, id: 0 };
  }
  return null;
});

const duration = computed(() => {
  return songInfo.value?.duration ? msToTime(songInfo.value.duration) : "";
});

const publishTime = computed(() => {
  return songInfo.value?.createTime ? formatTimestamp(songInfo.value.createTime, "YYYY-MM-DD") : "";
});

const songLink = computed(() => {
  return songInfo.value?.id ? getShareUrl("song", songInfo.value.id) : "";
});

// 获取歌曲详情
const fetchSongDetail = async () => {
  try {
    loading.value = true;
    const result = await songDetail(props.songId);
    const songs = formatSongsList(result?.songs);
    if (!songs || songs.length === 0) {
      window.$message.error("获取歌曲详情失败");
      return;
    }
    songInfo.value = songs[0];
  } catch (error) {
    console.error("获取歌曲详情失败：", error);
    window.$message.error("获取歌曲详情失败");
  } finally {
    loading.value = false;
  }
};

const copyText = (text: string | undefined, label: string) => {
  if (text) copyData(text, `已复制${label}`);
};

// 复制全部
const handleCopyAll = () => {
  if (!songInfo.value) return;
  const lines = [
    `歌曲：${songInfo.value.name}`,
    songInfo.value.alia ? `别名：${songInfo.value.alia}` : "",
    `歌手：${artistsList.value.map((a) => `${a.name}${a.id ? ` (ID: ${a.id})` : ""}`).join(" / ")}`,
    albumData.value
      ? `专辑：${albumData.value.name}${albumData.value.id ? ` (ID: ${albumData.value.id})` : ""}`
      : "",
    `歌曲ID：${songInfo.value.id}`,
    duration.value ? `时长：${duration.value}` : "",
    publishTime.value ? `发布时间：${publishTime.value}` : "",
    `链接：${songLink.value}`,
  ].filter((line) => line);

  copyData(lines, "已复制全部信息");
};

onMounted(() => {
  fetchSongDetail();
});
</script>

<style lang="scss" scoped>
.copy-song-info {
  display: flex;
  flex-direction: column;
  width: 100%;
  .divider {
    font-size: 14px;
    margin: 16px 0 12px 0;
  }
}
</style>
