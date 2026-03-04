<template>
  <div class="local-match">
    <n-form :model="matchFormData" :rules="matchFormRules">
      <n-form-item path="name" label="本地歌曲名称与路径">
        <n-input
          v-model:value="displayPath"
          disabled
        />
      </n-form-item>
      <n-form-item label="当前绑定的网易云 ID">
        <n-input
          :value="currentMatchedId ? String(currentMatchedId) : '暂无绑定'"
          disabled
          placeholder="未匹配到有效的网易云歌曲"
          :style="{ textAlign: 'center' }"
        >
          <template #prefix v-if="currentMatchedId">
            <SvgIcon name="Cloud" />
          </template>
        </n-input>
      </n-form-item>
      <n-form-item path="asid" label="重新匹配网易云 ID">
        <n-flex :size="12" :wrap="false" class="input">
          <n-input-number
            v-model:value="matchFormData.asid"
            :show-button="false"
            placeholder="请输入要匹配的网易云歌曲 ID"
            @input="isSongNormal = false"
          />
          <n-button
            :disabled="!matchFormData.asid || isSongNormal"
            :type="isSongNormal ? 'success' : 'primary'"
            @click="testSongId"
          >
            {{ isSongNormal ? '验证成功' : '验证' }}
          </n-button>
        </n-flex>
      </n-form-item>
    </n-form>
    <!-- 匹配信息 -->
    <n-collapse-transition :show="isSongNormal">
      <SongDataCard :data="matchSongData" />
    </n-collapse-transition>
    <n-flex class="menu" justify="end">
      <n-button strong secondary @click="emit('close')"> 取消 </n-button>
      <n-button type="primary" strong secondary @click="correctSong"> 确认纠正 </n-button>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import type { FormRules } from "naive-ui";
import { numberRule } from "@/utils/rules";
import { debounce } from "lodash-es";
import { songDetail } from "@/api/song";
import { formatSongsList } from "@/utils/format";
import { useCacheManager } from "@/core/resource/CacheManager";
import { useMusicStore } from "@/stores";
import { useLyricManager } from "@/core/player/LyricManager";

// 表单类型
interface MatchFormType {
  asid: number | null;
}

const props = defineProps<{
  song: SongType;
}>();

const emit = defineEmits<{
  close: [];
}>();

const displayPath = computed(() => {
  return props.song.path || props.song.name;
});

// 验证结果
const isSongNormal = ref<boolean>(false);
const matchSongData = ref<SongType | null>(null);

// 当前绑定状态
const currentMatchedId = ref<number | null>(null);

// 表单数据
const matchFormData = ref<MatchFormType>({ asid: null });
const matchFormRules: FormRules = { asid: { ...numberRule, message: "请输入网易云歌曲 ID" } };

onMounted(async () => {
  try {
    const cacheManager = useCacheManager();
    const result = await cacheManager.get("lyrics", `ncm-match:${props.song.path || props.song.name}`);
    if (result.success && result.data) {
      const decoder = new TextDecoder();
      const parsed = JSON.parse(decoder.decode(result.data));
      if (parsed.ncmId) {
        currentMatchedId.value = parsed.ncmId;
      }
    }
  } catch (e) {
    console.warn("读取本地歌曲绑定状态失败:", e);
  }
});

// 验证歌曲 ID
const testSongId = debounce(
  async () => {
    const asid = matchFormData.value.asid;
    if (!asid) {
      window.$message.warning("请输入网易云歌曲 ID");
      return;
    }
    // 获取歌曲详情
    const { songs } = await songDetail(asid);
    // 结果是否为空
    if (!songs?.length) {
      window.$message.warning("未找到该歌曲，请重试");
    } else {
      window.$message.success("验证成功");
      isSongNormal.value = true;
      matchSongData.value = formatSongsList(songs)[0];
    }
  },
  300,
  { leading: true, trailing: false },
);

// 歌曲纠正
const correctSong = debounce(
  async () => {
    if (!matchFormData.value.asid) {
      window.$message.warning("获取必要信息失败，请重试");
      return;
    }
    if (!isSongNormal.value) {
      window.$message.warning("歌曲未通过验证，请重试");
      return;
    }

    try {
      if (props.song.path && window.electron?.ipcRenderer) {
        const lastSlashIndex = Math.max(props.song.path.lastIndexOf("/"), props.song.path.lastIndexOf("\\"));
        const dirPath = lastSlashIndex >= 0 ? props.song.path.substring(0, lastSlashIndex) : "";
        const fileName = lastSlashIndex >= 0 ? props.song.path.substring(lastSlashIndex + 1) : props.song.path;
        
        await window.electron.ipcRenderer.invoke("save-local-match-index", dirPath, fileName, matchFormData.value.asid);
      }

      // 更新缓存
      const cacheManager = useCacheManager();
      const ncmId = matchFormData.value.asid;
      const dataStr = JSON.stringify({ ncmId });
      const encoded = new TextEncoder().encode(dataStr);
      await cacheManager.set("lyrics", `ncm-match:${props.song.path || props.song.name}`, encoded);
      
      const musicStore = useMusicStore();
      if (musicStore.playSong?.id === props.song.id) {
        // 如果当前正在播放这首歌，通知重新获取可能的外挂歌词
        window.$message.success("纠正成功，重新加载外挂歌词数据...");
        const lyricManager = useLyricManager();
        lyricManager.handleLyric(musicStore.playSong);
      } else {
        window.$message.success("本地歌曲匹配已更新");
      }
      
      emit("close");
    } catch (e) {
      console.error("纠正失败:", e);
      window.$message.error("纠正失败，请重试");
    }
  },
  300,
  { leading: true, trailing: false },
);
</script>

<style lang="scss" scoped>
.input {
  width: 100%;
}
.menu {
  margin-top: 20px;
}
</style>
