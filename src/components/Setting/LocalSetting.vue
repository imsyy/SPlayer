<!-- 本地设置 -->
<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> 本地歌曲 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示本地歌曲封面</n-text>
          <n-text class="tip" :depth="3">当数量过多时请勿开启，会严重影响性能</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.showLocalCover" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">显示本地默认歌曲目录</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.showDefaultLocalPath" :round="false" />
      </n-card>
      <n-card class="set-item" id="local-list-choose" content-style="flex-direction: column">
        <n-flex justify="space-between">
          <div class="label">
            <n-text class="name">本地歌曲目录</n-text>
            <n-text class="tip" :depth="3">可在此增删本地歌曲目录，歌曲增删实时同步</n-text>
          </div>
          <n-button strong secondary @click="changeLocalMusicPath()">
            <template #icon>
              <SvgIcon name="Folder" />
            </template>
            更改
          </n-button>
        </n-flex>
        <n-collapse-transition :show="settingStore.localFilesPath.length > 0">
          <n-card
            v-for="(item, index) in settingStore.localFilesPath"
            :key="index"
            class="set-item"
          >
            <div class="label">
              <n-text class="name">{{ item }}</n-text>
            </div>
            <n-button strong secondary @click="changeLocalMusicPath(index)">
              <template #icon>
                <SvgIcon name="Delete" />
              </template>
            </n-button>
          </n-card>
        </n-collapse-transition>
      </n-card>
      <n-card class="set-item" id="local-list-choose" content-style="flex-direction: column">
        <n-flex justify="space-between">
          <div class="label">
            <n-text class="name">本地歌词覆盖在线歌词</n-text>
            <n-text class="tip" :depth="3">
              可在这些文件夹及其子文件夹内覆盖在线歌曲的歌词 <br />
              将歌词文件命名为 `歌曲ID.后缀名` 或者 `任意前缀.歌曲ID.后缀名` 即可 <br />
              支持 .lrc 和 .ttml 格式 <br />
              （提示：可以在前缀加上歌名等信息，也可以利用子文件夹分类管理）
            </n-text>
          </div>
          <n-button strong secondary @click="changeLocalLyricPath()">
            <template #icon>
              <SvgIcon name="Folder" />
            </template>
            更改
          </n-button>
        </n-flex>
        <n-collapse-transition :show="settingStore.localLyricPath.length > 0">
          <n-card
            v-for="(item, index) in settingStore.localLyricPath"
            :key="index"
            class="set-item"
          >
            <div class="label">
              <n-text class="name">{{ item }}</n-text>
            </div>
            <n-button strong secondary @click="changeLocalLyricPath(index)">
              <template #icon>
                <SvgIcon name="Delete" />
              </template>
            </n-button>
          </n-card>
        </n-collapse-transition>
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> 缓存配置 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">启用缓存</n-text>
          <n-text class="tip" :depth="3">开启缓存会加快资源加载速度，但会占用更多磁盘空间</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.cacheEnabled" :round="false" />
      </n-card>
      <n-collapse-transition :show="settingStore.cacheEnabled">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">缓存大小上限</n-text>
            <n-text class="tip" :depth="3">达到上限后将清理最旧的缓存</n-text>
          </div>
          <n-select
            v-model:value="cacheLimit"
            :options="cacheSizeOptions"
            class="set"
            @update:value="changeCacheLimit"
          />
        </n-card>
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">缓存目录</n-text>
            <n-text class="tip" :depth="3">
              {{ cachePath || "未配置时将使用默认缓存目录" }}
            </n-text>
          </div>
          <n-flex>
            <n-button strong secondary @click="confirmChangeCachePath">
              <template #icon>
                <SvgIcon name="Folder" />
              </template>
              更改
            </n-button>
          </n-flex>
        </n-card>
      </n-collapse-transition>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">缓存占用与清理</n-text>
          <n-text class="tip" :depth="3">当前缓存占用：{{ cacheSizeDisplay }}</n-text>
        </div>
        <n-button type="error" strong secondary @click="confirmClearCache"> 清空缓存 </n-button>
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> 下载配置 </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">默认下载目录</n-text>
          <n-text class="tip" :depth="3">
            {{ settingStore.downloadPath || "若不设置则无法进行下载" }}
          </n-text>
        </div>
        <n-flex>
          <Transition name="fade" mode="out-in">
            <n-button
              v-if="settingStore.downloadPath"
              type="primary"
              strong
              secondary
              @click="settingStore.downloadPath = ''"
            >
              清除选择
            </n-button>
          </Transition>
          <n-button strong secondary @click="choosePath">
            <template #icon>
              <SvgIcon name="Folder" />
            </template>
            更改
          </n-button>
        </n-flex>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">默认下载音质</n-text>
          <n-text class="tip" :depth="3">
            默认使用的音质，实际可用音质取决于账号权限和歌曲资源
          </n-text>
        </div>
        <n-select
          v-model:value="settingStore.downloadSongLevel"
          :options="downloadQualityOptions"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">下载歌曲元信息</n-text>
          <n-text class="tip" :depth="3">为当前下载歌曲附加封面及歌词等元信息</n-text>
        </div>
        <n-switch class="set" v-model:value="settingStore.downloadMeta" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">同时下载封面</n-text>
          <n-text class="tip" :depth="3">下载歌曲时同时下载封面</n-text>
        </div>
        <n-switch
          v-model:value="settingStore.downloadCover"
          :disabled="!settingStore.downloadMeta"
          :round="false"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">同时下载歌词</n-text>
          <n-text class="tip" :depth="3">下载歌曲时同时下载歌词</n-text>
        </div>
        <n-switch
          v-model:value="settingStore.downloadLyric"
          :disabled="!settingStore.downloadMeta"
          :round="false"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">同时下载歌词翻译</n-text>
          <n-text class="tip" :depth="3">下载歌词时同时包含翻译</n-text>
        </div>
        <n-switch
          v-model:value="settingStore.downloadLyricTranslation"
          :disabled="!settingStore.downloadMeta || !settingStore.downloadLyric"
          :round="false"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">同时下载歌词音译</n-text>
          <n-text class="tip" :depth="3">下载歌词时同时包含音译（罗马音）</n-text>
        </div>
        <n-switch
          v-model:value="settingStore.downloadLyricRomaji"
          :disabled="!settingStore.downloadMeta || !settingStore.downloadLyric"
          :round="false"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">音乐命名格式</n-text>
          <n-text class="tip" :depth="3"> 选择下载文件的命名方式，建议包含歌手信息便于区分 </n-text>
        </div>
        <n-select
          v-model:value="settingStore.fileNameFormat"
          :options="fileNameFormatOptions"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">文件智能分类</n-text>
          <n-text class="tip" :depth="3"> 自动按歌手或歌手与专辑创建子文件夹进行分类 </n-text>
        </div>
        <n-select
          v-model:value="settingStore.folderStrategy"
          :options="folderStrategyOptions"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">
            模拟播放下载
            <n-tag type="warning" size="small" round>Beta</n-tag>
          </n-text>
          <n-text class="tip" :depth="3">使用播放接口进行下载，可能解决部分下载失败问题</n-text>
        </div>
        <n-switch
          :value="settingStore.usePlaybackForDownload"
          :round="false"
          class="set"
          @update:value="handlePlaybackDownloadChange"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">保留元信息文件</n-text>
          <n-text class="tip" :depth="3">是否在下载目录中保留元信息文件</n-text>
        </div>
        <n-switch
          v-model:value="settingStore.saveMetaFile"
          :disabled="!settingStore.downloadMeta"
          :round="false"
          class="set"
        />
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
import { changeLocalLyricPath, changeLocalMusicPath, formatFileSize } from "@/utils/helper";
import { songLevelData, getSongLevelsData } from "@/utils/meta";
import { useCacheManager, type CacheResourceType } from "@/core/resource/CacheManager";
import { pick } from "lodash-es";

const settingStore = useSettingStore();
const cacheManager = useCacheManager();
const cachePath = ref<string>("");
const cacheSizeDisplay = ref<string>("--");
const cacheLimit = ref<number>(10); // 本地状态

// 默认下载音质选项
const downloadQualityOptions = computed(() => {
  const levels = pick(songLevelData, ["l", "m", "h", "sq", "hr", "je", "sk", "db", "jm"]);
  return getSongLevelsData(levels).map((item) => ({
    label: item.name,
    value: item.value,
  }));
});

const fileNameFormatOptions = [
  {
    label: "歌曲名",
    value: "title",
  },
  {
    label: "歌手 - 歌曲名",
    value: "artist-title",
  },
  {
    label: "歌曲名 - 歌手",
    value: "title-artist",
  },
];

const folderStrategyOptions = [
  {
    label: "不分文件夹",
    value: "none",
  },
  {
    label: "按歌手分文件夹",
    value: "artist",
  },
  {
    label: "按 歌手 \\ 专辑 分文件夹",
    value: "artist-album",
  },
];

const cacheSizeOptions = [
  {
    label: "不限制",
    value: 0,
  },
  {
    label: "5G",
    value: 5,
  },
  {
    label: "10G",
    value: 10,
  },
  {
    label: "15G",
    value: 15,
  },
  {
    label: "20G",
    value: 20,
  },
  {
    label: "25G",
    value: 25,
  },
  {
    label: "30G",
    value: 30,
  },
  {
    label: "50G",
    value: 50,
  },
];

// 选择下载路径
const choosePath = async () => {
  const path = await window.electron.ipcRenderer.invoke("choose-path");
  if (path) settingStore.downloadPath = path;
};

// 选择缓存路径并写回主进程 Store
const changeCachePath = async () => {
  const path = await window.electron.ipcRenderer.invoke("choose-path");
  if (path) {
    cachePath.value = path;
    await window.api.store.set("cachePath", path);
  }
};

// 确认更改缓存目录
const confirmChangeCachePath = () => {
  window.$dialog.warning({
    title: "更改缓存目录",
    content: "更改缓存目录不会自动移动已有缓存文件，建议在清空缓存后再更改目录。确定要继续吗？",
    positiveText: "确定更改",
    negativeText: "取消",
    onPositiveClick: () => {
      return changeCachePath();
    },
  });
};

// 更改缓存大小限制
const changeCacheLimit = async (value: number) => {
  cacheLimit.value = value;
  await window.api.store.set("cacheLimit", value);
};

// 统计全部缓存目录占用大小
const loadCacheSize = async () => {
  const res = await cacheManager.getSize();
  if (res.success && res.data !== undefined) {
    cacheSizeDisplay.value = formatFileSize(res.data);
  } else {
    cacheSizeDisplay.value = "--";
  }
};

// 清空所有缓存目录
const clearCache = async () => {
  const types: CacheResourceType[] = ["music", "lyrics", "local-data", "playlist-data"];
  let hasError = false;
  for (const type of types) {
    const res = await cacheManager.clear(type);
    if (!res.success) {
      hasError = true;
    }
  }
  await loadCacheSize();
  if (hasError) {
    window.$message.error("部分缓存清理失败");
  } else {
    window.$message.success("缓存已清空");
  }
};

// 确认清空缓存
const confirmClearCache = () => {
  window.$dialog.warning({
    title: "清空缓存",
    content: "将删除所有缓存的音乐、歌词和本地数据，此操作不可恢复，确定要继续吗？",
    positiveText: "清空缓存",
    negativeText: "取消",
    onPositiveClick: () => {
      return clearCache();
    },
  });
};

// 模拟播放下载开关
const handlePlaybackDownloadChange = (value: boolean) => {
  if (value) {
    window.$dialog.warning({
      title: "开启提示",
      content:
        "模拟播放下载可能导致部分音质歌词嵌入异常且未经完整测试可能有不稳定情况，确认要打开吗？",
      positiveText: "确认打开",
      negativeText: "取消",
      onPositiveClick: () => {
        settingStore.usePlaybackForDownload = true;
      },
    });
  } else {
    settingStore.usePlaybackForDownload = false;
  }
};

onMounted(async () => {
  try {
    const path = await window.api.store.get("cachePath");
    cachePath.value = path || "";
    const limit = await window.api.store.get("cacheLimit");
    if (typeof limit === "number") cacheLimit.value = limit;
  } catch (error) {
    console.error("读取缓存路径失败:", error);
  }
  await loadCacheSize();
});
</script>

<style lang="scss" scoped>
#local-list-choose {
  .n-flex {
    width: 100%;
  }
  .n-collapse-transition {
    margin-top: 12px;
  }
}
</style>
