<!-- 本地设置 -->
<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar"> {{ t("settings.local.title") }} </n-h3>
      <n-card class="set-item">

        <div class="label">
          <n-text class="name">{{ t("settings.local.showCover") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.local.showCoverTip") }}</n-text>
        </div>

        <n-switch class="set" v-model:value="settingStore.showLocalCover" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.local.showDefaultPath") }}</n-text>
        </div>

        <n-switch class="set" v-model:value="settingStore.showDefaultLocalPath" :round="false" />
      </n-card>
      <n-card class="set-item" id="local-list-choose" content-style="flex-direction: column">
        <n-flex justify="space-between">
          <div class="label">
            <n-text class="name">{{ t("settings.local.pathTitle") }}</n-text>
            <n-text class="tip" :depth="3">{{ t("settings.local.pathTip") }}</n-text>
          </div>
          <n-button strong secondary @click="changeLocalMusicPath()">
            <template #icon>
              <SvgIcon name="Folder" />
            </template>
            {{ t("settings.local.add") }}
          </n-button>

        </n-flex>
        <n-collapse-transition :show="settingStore.localFilesPath.length > 0">
          <n-card
            v-for="(item, index) in settingStore.localFilesPath"
            :key="index"
            class="set-item"
            content-style="padding: 4px 16px"
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
            <n-text class="name">{{ t("settings.local.lyricOverride") }}</n-text>
            <n-text class="tip" :depth="3" v-html="t('settings.local.lyricOverrideTip')"></n-text>
          </div>
          <n-button strong secondary @click="changeLocalLyricPath()">
            <template #icon>
              <SvgIcon name="Folder" />
            </template>
            {{ t("settings.local.add") }}
          </n-button>

        </n-flex>
        <n-collapse-transition :show="settingStore.localLyricPath.length > 0">
          <n-card
            v-for="(item, index) in settingStore.localLyricPath"
            :key="index"
            class="set-item"
            content-style="padding: 4px 16px"
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
      <n-h3 prefix="bar"> {{ t("settings.local.cacheTitle") }} </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.local.enableCache") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.local.enableCacheTip") }}</n-text>
        </div>

        <n-switch class="set" v-model:value="settingStore.cacheEnabled" :round="false" />
      </n-card>
      <n-collapse-transition :show="settingStore.cacheEnabled">
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.local.cacheLimit") }}</n-text>
            <n-text class="tip" :depth="3">{{ t("settings.local.cacheLimitTip") }}</n-text>
          </div>

          <n-input-group class="set">
            <n-input-number
              :value="cacheLimit"
              :update-value-on-input="false"
              :min="2"
              :max="9999"
              :style="{
                width: cacheLimited ? '55%' : '0%',
                transition: 'width 0.3s',
              }"
              @update:value="
                (value) => {
                  cacheLimit = value ?? 2;
                  changeCacheLimit(cacheLimit);
                }
              "
            />
            <n-select
              v-model:value="cacheLimited"
              :options="[
                { label: t('settings.local.unlimited'), value: 0 },
                { label: cacheLimited === 0 ? t('settings.local.customSize') : 'GB', value: 1 },
              ]"

              :style="{
                width: cacheLimited ? '45%' : '100%',
                transition: 'width 0.3s',
              }"
              @update:value="
                (value) => {
                  if (value === 0) {
                    changeCacheLimit(0);
                  } else {
                    if (cacheLimit === 0) cacheLimit = 2;
                    changeCacheLimit(cacheLimit);
                  }
                }
              "
            />
          </n-input-group>
        </n-card>
        <n-card class="set-item">
          <div class="label">
            <n-text class="name">{{ t("settings.local.cachePath") }}</n-text>
            <n-text class="tip" :depth="3">
              {{ cachePath || t("settings.local.defaultCachePath") }}
            </n-text>
          </div>
          <n-flex>
            <n-button strong secondary @click="confirmChangeCachePath">
              <template #icon>
                <SvgIcon name="Folder" />
              </template>
              {{ t("settings.local.change") }}
            </n-button>

          </n-flex>
        </n-card>
      </n-collapse-transition>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.local.cacheUsage") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.local.currentUsage", { size: cacheSizeDisplay }) }}</n-text>
        </div>
        <n-button type="error" strong secondary @click="confirmClearCache"> {{ t("settings.local.clearCache") }} </n-button>
      </n-card>

    </div>
    <div v-if="statusStore.isDeveloperMode" class="set-list">
      <n-h3 prefix="bar"> {{ t("settings.local.downloadTitle") }} </n-h3>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.local.defaultDownloadPath") }}</n-text>
          <n-text class="tip" :depth="3">
            {{ settingStore.downloadPath || t("settings.local.noDownloadPath") }}
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
              {{ t("settings.local.clearSelection") }}
            </n-button>
          </Transition>
          <n-button strong secondary @click="choosePath">
            <template #icon>
              <SvgIcon name="Folder" />
            </template>
            {{ t("settings.local.change") }}
          </n-button>

        </n-flex>
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.local.defaultDownloadQuality") }}</n-text>
          <n-text class="tip" :depth="3">
            {{ t("settings.local.defaultDownloadQualityTip") }}
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
          <n-text class="name">{{ t("settings.local.downloadMeta") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.local.downloadMetaTip") }}</n-text>
        </div>

        <n-switch class="set" v-model:value="settingStore.downloadMeta" :round="false" />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.local.downloadCover") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.local.downloadCoverTip") }}</n-text>
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
          <n-text class="name">{{ t("settings.local.downloadLyric") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.local.downloadLyricTip") }}</n-text>
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
          <n-text class="name">{{ t("settings.local.downloadLyricTrans") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.local.downloadLyricTransTip") }}</n-text>
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
          <n-text class="name">{{ t("settings.local.downloadLyricRoma") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.local.downloadLyricRomaTip") }}</n-text>
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
          <n-text class="name">{{ t("settings.local.namingFormat") }}</n-text>
          <n-text class="tip" :depth="3"> {{ t("settings.local.namingFormatTip") }} </n-text>
        </div>

        <n-select
          v-model:value="settingStore.fileNameFormat"
          :options="fileNameFormatOptions"
          class="set"
        />
      </n-card>
      <n-card class="set-item">
        <div class="label">
          <n-text class="name">{{ t("settings.local.smartClassify") }}</n-text>
          <n-text class="tip" :depth="3"> {{ t("settings.local.smartClassifyTip") }} </n-text>
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
            {{ t("settings.local.simulateDownload") }}
            <n-tag type="warning" size="small" round>Beta</n-tag>
          </n-text>
          <n-text class="tip" :depth="3">{{ t("settings.local.simulateDownloadTip") }}</n-text>
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
          <n-text class="name">{{ t("settings.local.keepMetaFile") }}</n-text>
          <n-text class="tip" :depth="3">{{ t("settings.local.keepMetaFileTip") }}</n-text>
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
import { useSettingStore, useStatusStore } from "@/stores";
import { changeLocalLyricPath, changeLocalMusicPath, formatFileSize } from "@/utils/helper";
import { songLevelData, getSongLevelsData } from "@/utils/meta";
import { useCacheManager, type CacheResourceType } from "@/core/resource/CacheManager";
import { pick } from "lodash-es";
import { useI18n } from "vue-i18n";

const statusStore = useStatusStore();
const settingStore = useSettingStore();
const cacheManager = useCacheManager();
const { t } = useI18n();

const cachePath = ref<string>("");
const cacheSizeDisplay = ref<string>("--");
const cacheLimit = ref<number>(10); // 本地状态
const cacheLimited = ref<number>(1); // 是否限制缓存 (1 为限制)

// 默认下载音质选项
const downloadQualityOptions = computed(() => {
  const levels = pick(songLevelData, ["l", "m", "h", "sq", "hr", "je", "sk", "db", "jm"]);
  return getSongLevelsData(levels).map((item) => ({
    label: t(`settings.play.qualityLabel.${item.level}`),
    value: item.value,
  }));
});


const fileNameFormatOptions = computed(() => [
  {
    label: t("settings.local.namingTitle"),
    value: "title",
  },
  {
    label: t("settings.local.namingArtistTitle"),
    value: "artist-title",
  },
  {
    label: t("settings.local.namingTitleArtist"),
    value: "title-artist",
  },
]);

const folderStrategyOptions = computed(() => [
  {
    label: t("settings.local.classifyNone"),
    value: "none",
  },
  {
    label: t("settings.local.classifyArtist"),
    value: "artist",
  },
  {
    label: t("settings.local.classifyArtistAlbum"),
    value: "artist-album",
  },
]);


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
    title: t("settings.local.changeCachePathTitle"),
    content: t("settings.local.changeCachePathContent"),
    positiveText: t("settings.local.confirmChange"),
    negativeText: t("general.dialog.cancel"),
    onPositiveClick: () => {
      return changeCachePath();
    },
  });
};


// 更改缓存大小限制
const changeCacheLimit = async (value: number) => {
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
  await loadCacheSize();
  if (hasError) {
    window.$message.error(t("settings.local.clearCacheFail"));
  } else {
    window.$message.success(t("settings.local.clearCacheSuccess"));
  }
};


// 确认清空缓存
const confirmClearCache = () => {
  window.$dialog.warning({
    title: t("settings.local.clearCache"),
    content: t("settings.local.clearCacheContent"),
    positiveText: t("settings.local.clearCache"),
    negativeText: t("general.dialog.cancel"),
    onPositiveClick: () => {
      return clearCache();
    },
  });
};


// 模拟播放下载开关
const handlePlaybackDownloadChange = (value: boolean) => {
  if (value) {
    window.$dialog.warning({
      title: t("settings.local.enablePrompt"),
      content: t("settings.local.simulateDownloadWarning"),
      positiveText: t("settings.local.confirmOpen"),
      negativeText: t("general.dialog.cancel"),
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
    if (typeof limit === "number") {
      cacheLimit.value = limit;
      if (limit === 0) cacheLimited.value = 0;
    }
  } catch (error) {
    console.error(t("settings.local.readCacheFail"), error);
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
