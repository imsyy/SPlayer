<template>
  <div class="download">
    <div class="title">
      <n-text class="keyword">{{ t("menu.download") }}</n-text>
      <n-flex class="status">
        <n-text class="item">
          <SvgIcon name="Music" :depth="3" />
          <n-number-animation :from="0" :to="currentCount" /> {{ t("general.list.songUnit") }}
        </n-text>
        <n-text v-if="currentTab === 'download-downloaded'" class="item" depth="3">
          <SvgIcon name="Download" :depth="3" />
          <n-number-animation :from="0" :to="dataStore.downloadingSongs.length" /> {{ t("download.downloading") }}
        </n-text>
        <n-text v-else class="item" depth="3">
          <SvgIcon name="DownloadDone" :depth="3" />
          <n-number-animation :from="0" :to="listData.length" /> {{ t("download.completed") }}
        </n-text>
      </n-flex>
    </div>
    <n-flex class="menu" justify="space-between">
      <n-flex class="left" align="flex-end">
        <n-button
          :focusable="false"
          :disabled="currentTab !== 'download-downloaded'"
          type="primary"
          strong
          secondary
          round
          @click="player.updatePlayList(currentListData)"
        >
          <template #icon>
            <SvgIcon name="Play" />
          </template>
          {{ t("video.player.play") }}
        </n-button>
        <n-button
          :focusable="false"
          :disabled="
            currentTab === 'download-downloaded' ? false : dataStore.downloadingSongs.length === 0
          "
          :loading="loading"
          class="more"
          strong
          secondary
          circle
          @click="
            currentTab === 'download-downloaded'
              ? getDownloadMusic(true)
              : downloadManager.retryAllDownloads()
          "
        >
          <template #icon>
            <SvgIcon name="Refresh" />
          </template>
        </n-button>
      </n-flex>
      <n-flex class="right" justify="end">
        <n-tabs
          v-model:value="currentTab"
          class="tabs"
          type="segment"
          @update:value="handleTabChange"
        >
          <n-tab name="download-downloaded"> {{ t("download.completedTab") }} </n-tab>
          <n-tab name="download-downloading"> {{ t("download.downloadingTab") }} </n-tab>
        </n-tabs>
      </n-flex>
    </n-flex>
    <!-- Router View -->
    <RouterView v-slot="{ Component }">
      <Transition :name="`router-${settingStore.routeAnimation}`" mode="out-in">
        <component :is="Component" :data="listData" :loading="loading" class="router-view" />
      </Transition>
    </RouterView>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore, useDataStore } from "@/stores";
import type { SongType } from "@/types/main";
import { formatSongsList } from "@/utils/format";
import { usePlayerController } from "@/core/player/PlayerController";
import type { MessageReactive } from "naive-ui";
import { useDownloadManager } from "@/core/resource/DownloadManager";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const dataStore = useDataStore();
const settingStore = useSettingStore();

const player = usePlayerController();
const downloadManager = useDownloadManager();

const loading = ref<boolean>(false);
const loadingMsg = ref<MessageReactive | null>(null);
const listData = ref<SongType[]>([]);

const currentTab = ref<string>((route.name as string) || "download-downloaded");

// 当前标签页的歌曲列表
const currentListData = computed(() => {
  if (currentTab.value === "download-downloading") {
    return dataStore.downloadingSongs.map((item) => item.song);
  }
  return listData.value;
});

// 当前标签页的歌曲数量
const currentCount = computed(() => {
  if (currentTab.value === "download-downloading") {
    return dataStore.downloadingSongs.length;
  }
  return listData.value.length;
});

const handleTabChange = (name: string) => {
  router.push({ name });
};

watch(
  () => route.name,
  (newName) => {
    if (newName && (newName as string).startsWith("download-")) {
      currentTab.value = newName as string;
      if (newName === "download-downloaded") {
        getDownloadMusic();
      }
    }
  },
);

/**
 * 获取下载音乐
 * @param showTip 是否展示加载提示
 */
const getDownloadMusic = async (showTip: boolean = false) => {
  try {
    const path = settingStore.downloadPath;
    if (!path) {
      if (showTip) window.$message.warning(t("download.noPathSet"));
      return;
    }

    if (showTip) {
      loadingMsg.value = window.$message.loading(t("download.gettingDownloads"), {
        duration: 0,
      });
    }

    loading.value = true;
    const result = await downloadManager.getDownloadedSongs();

    if (result) {
      listData.value = formatSongsList(result);
      if (showTip) window.$message.success(`${t("download.found")} ${listData.value.length} ${t("general.list.songUnit")}`);
    } else {
      listData.value = [];
    }
  } catch (error) {
    console.error(t("download.getFailed"), error);
    window.$message.error(t("download.getFailed"));
  } finally {
    loading.value = false;
    loadingMsg.value?.destroy();
    loadingMsg.value = null;
  }
};

// 刷新列表
provide("getDownloadMusic", () => getDownloadMusic(false));

onMounted(() => {
  getDownloadMusic();
});

onActivated(() => {
  if (currentTab.value === "download-downloaded") {
    getDownloadMusic();
  }
});
</script>

<style lang="scss" scoped>
.download {
  display: flex;
  flex-direction: column;
  height: 100%;
  .title {
    display: flex;
    align-items: flex-end;
    line-height: normal;
    margin-top: 12px;
    margin-bottom: 20px;
    height: 40px;
    .keyword {
      font-size: 30px;
      font-weight: bold;
      margin-right: 12px;
      line-height: normal;
    }
    .status {
      font-size: 15px;
      font-weight: normal;
      line-height: 30px;
      .item {
        display: flex;
        align-items: center;
        opacity: 0.9;
        .n-icon {
          margin-right: 4px;
        }
      }
    }
  }
  .menu {
    width: 100%;
    margin-bottom: 20px;
    height: 40px;
    .n-button {
      height: 40px;
      transition: all 0.3s var(--n-bezier);
    }
    .more {
      width: 40px;
    }
    .n-tabs {
      width: 200px;
      --n-tab-border-radius: 25px !important;
      :deep(.n-tabs-rail) {
        outline: 1px solid var(--n-tab-color-segment);
      }
    }
  }
  .router-view {
    flex: 1;
    overflow: hidden;
    max-height: calc((var(--layout-height) - 132) * 1px);
  }
}
</style>
